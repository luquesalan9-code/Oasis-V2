/**
 * Executor de trabalho real com gates de autorização, idempotência e comprovação.
 * Só chama adaptadores oficiais instalados e workers explicitamente registrados.
 */
import { estado } from '../core/estado.js';
import { config } from '../core/config.js';
import { obterProcesso, atualizarStatusProcesso, distribuirProcesso } from '../processos/processManager.js';
import { obterWorker, obterWorkerDisponivel } from '../workers/workerManager.js';
import { exportarAdaptadorExecucaoOficial, listarIntegracoesExecucaoOficial } from '../integracoes/execucaoOficial.js';
import { persistirEstado } from '../persistencia/persistencia.js';
import { info, aviso } from '../logs/logger.js';

const execucoesAtivas = new Set();
const TEMPO_MAXIMO_MS = 5 * 60 * 1000;

function autorizadoParaExecucao(processo, adaptador, agora = Date.now()) {
  const oportunidade = processo.dadosOportunidade || {};
  const autorizacao = processo.autorizacaoExecucao;
  return Boolean(
    processo.supervisao?.aprovadaParaFila === true
    && oportunidade.fonteAutorizada === true
    && oportunidade.automacaoPermitida === true
    && oportunidade.execucaoPermitida === true
    && oportunidade.execucaoAutonoma === true
    && autorizacao?.aprovada === true
    && typeof autorizacao.aprovadaPor === 'string'
    && autorizacao.aprovadaPor.trim()
    && autorizacao.escopo === 'submit_work'
    && Number.isFinite(Date.parse(autorizacao.expiraEm))
    && Date.parse(autorizacao.expiraEm) > agora
    && autorizacao.integracaoId === adaptador.id
  );
}

function persistirAntesDeAcao() {
  const resultado = persistirEstado();
  if (!resultado.sucesso) {
    return { sucesso: false, erro: 'PERSISTENCIA_OBRIGATORIA_FALHOU', detalhe: resultado.erro };
  }
  return { sucesso: true };
}

async function comTempoLimite(promessa, timeoutMs, controller) {
  let timer;
  try {
    return await Promise.race([
      promessa,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort(new Error('TEMPO_MAXIMO_DE_EXECUCAO_EXCEDIDO'));
          reject(new Error('TEMPO_MAXIMO_DE_EXECUCAO_EXCEDIDO'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function obterStatusExecutorReal() {
  const integracoesOficiais = listarIntegracoesExecucaoOficial();
  return {
    implementado: true,
    integracoesOficiais,
    execucoesEmAndamento: execucoesAtivas.size,
    pronto: integracoesOficiais.length > 0
      && Array.from(estado.workers.values()).some(worker => worker.tipo === 'real' && typeof worker.executar === 'function'),
  };
}

export async function executarProcessoReal(processoId, { timeoutMs = TEMPO_MAXIMO_MS } = {}) {
  if (config.operacao.operacao !== 'REAL') return { sucesso: false, erro: 'MODO_REAL_NAO_CONFIGURADO' };
  const processo = obterProcesso(processoId);
  if (!processo) return { sucesso: false, erro: 'PROCESSO_NAO_ENCONTRADO' };
  if (execucoesAtivas.has(processoId) || processo.execucaoIdempotencyKey) {
    return { sucesso: false, erro: 'EXECUCAO_DUPLICADA_BLOQUEADA' };
  }
  if (!['NA_FILA', 'DISTRIBUIDO'].includes(processo.status)) {
    return { sucesso: false, erro: 'PROCESSO_FORA_DA_FILA' };
  }

  const adaptador = exportarAdaptadorExecucaoOficial(processo.plataforma);
  if (!adaptador) return { sucesso: false, erro: 'INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA' };
  if (!autorizadoParaExecucao(processo, adaptador)) {
    return { sucesso: false, erro: 'AUTORIZACAO_EXTERNA_EXPLICITA_AUSENTE_OU_EXPIRADA' };
  }

  let worker = processo.workerId ? obterWorker(processo.workerId) : null;
  if (!worker) {
    worker = obterWorkerDisponivel(processo.especializacao || 'geral', 'real');
    if (!worker) return { sucesso: false, erro: 'WORKER_REAL_DISPONIVEL_NAO_ENCONTRADO' };
    const alocacao = distribuirProcesso(processo.id, worker.id, {
      origem: 'executor-real',
      motivo: 'Atribuição validada antes da execução',
    });
    if (!alocacao.sucesso) return alocacao;
    worker = alocacao.worker;
  }
  if (worker.tipo !== 'real' || typeof worker.executar !== 'function') {
    return { sucesso: false, erro: 'WORKER_SEM_EXECUTOR_REAL' };
  }

  const idempotencyKey = adaptador.id + ':' + (processo.externalId || processo.id) + ':' + worker.id;
  if (processo.chavesExecucao?.includes(idempotencyKey)) {
    return { sucesso: false, erro: 'EXECUCAO_DUPLICADA_BLOQUEADA' };
  }
  processo.chavesExecucao ||= [];
  processo.chavesExecucao.push(idempotencyKey);
  processo.execucaoIdempotencyKey = idempotencyKey;
  processo.workerId = worker.id;
  processo.executorId = worker.id;
  execucoesAtivas.add(processoId);

  const inicio = atualizarStatusProcesso(processo.id, 'EXECUTANDO', {
    origem: 'executor-real',
    motivo: 'Worker real atribuído; integração oficial e autorização conferidas',
    idempotencyKey,
  });
  if (!inicio.sucesso) {
    execucoesAtivas.delete(processoId);
    return inicio;
  }

  const antesDaAcao = persistirAntesDeAcao();
  if (!antesDaAcao.sucesso) {
    atualizarStatusProcesso(processo.id, 'FALHOU', { origem: 'executor-real', motivo: antesDaAcao.erro });
    execucoesAtivas.delete(processoId);
    return antesDaAcao;
  }

  const controller = new AbortController();
  const limite = Math.max(1000, Math.min(TEMPO_MAXIMO_MS, Number(timeoutMs) || TEMPO_MAXIMO_MS));
  let envioExternoIniciado = false;
  try {
    const trabalho = await comTempoLimite(
      Promise.resolve().then(() => worker.executar({
        processo: {
          id: processo.id,
          externalId: processo.externalId,
          plataforma: processo.plataforma,
          fonte: processo.fonte,
          dadosOportunidade: processo.dadosOportunidade,
        },
        idempotencyKey,
        signal: controller.signal,
      })),
      limite,
      controller,
    );
    if (!trabalho || trabalho.sucesso !== true || !Array.isArray(trabalho.entregaveis) || trabalho.entregaveis.length === 0) {
      processo.resultadoExecucao = { status: 'SEM_ENTREGAVEL_VALIDAVEL', workerId: worker.id };
      atualizarStatusProcesso(processo.id, 'QUARENTENA', {
        origem: 'executor-real',
        motivo: 'Worker não retornou entregáveis verificáveis; nenhuma submissão foi considerada concluída',
      });
      persistirEstado();
      return { sucesso: false, erro: 'ENTREGAVEIS_NAO_VALIDAVEIS' };
    }

    processo.resultadoExecucao = {
      status: 'PRONTO_PARA_ENVIO',
      workerId: worker.id,
      entregaveis: trabalho.entregaveis.map(item => ({
        tipo: String(item?.tipo || 'arquivo').slice(0, 40),
        nome: String(item?.nome || '').slice(0, 160),
        sha256: typeof item?.sha256 === 'string' ? item.sha256.slice(0, 128) : null,
      })),
      preparadoEm: new Date().toISOString(),
    };
    const antesDoEnvio = persistirAntesDeAcao();
    if (!antesDoEnvio.sucesso) {
      atualizarStatusProcesso(processo.id, 'QUARENTENA', {
        origem: 'executor-real',
        motivo: 'Persistência indisponível antes da submissão externa',
      });
      return antesDoEnvio;
    }

    envioExternoIniciado = true;
    const envio = await comTempoLimite(
      Promise.resolve().then(() => adaptador.enviarResultado({
        processo: processo.dadosOportunidade,
        entregaveis: trabalho.entregaveis,
        idempotencyKey,
        autorizacao: processo.autorizacaoExecucao,
        signal: controller.signal,
      })),
      limite,
      controller,
    );
    if (!envio || envio.sucesso !== true || typeof envio.idExterno !== 'string' || !envio.idExterno) {
      processo.resultadoExecucao.status = 'ENVIO_NAO_CONFIRMADO';
      atualizarStatusProcesso(processo.id, 'QUARENTENA', {
        origem: 'executor-real',
        motivo: 'Integração oficial não confirmou a submissão; envio não será repetido automaticamente',
      });
      persistirEstado();
      return { sucesso: false, erro: 'SUBMISSAO_EXTERNA_NAO_CONFIRMADA' };
    }

    processo.resultadoExecucao.status = 'VALIDANDO';
    processo.resultadoExecucao.idExterno = envio.idExterno;
    const transicao = atualizarStatusProcesso(processo.id, 'VALIDANDO', {
      origem: 'executor-real',
      motivo: 'Submissão oficial confirmada; aguardando prova verificável',
    });
    if (!transicao.sucesso) throw new Error(transicao.erro);

    const verificacao = await comTempoLimite(
      Promise.resolve().then(() => adaptador.verificarResultado({
        idExterno: envio.idExterno,
        idempotencyKey,
        processo: processo.dadosOportunidade,
        signal: controller.signal,
      })),
      limite,
      controller,
    );
    const prova = verificacao?.evidencia;
    if (verificacao?.sucesso !== true
      || !prova?.fonteOficial
      || !prova?.verificada
      || typeof prova.url !== 'string'
      || !prova.url.startsWith('https://')) {
      processo.resultadoExecucao.status = 'EVIDENCIA_NAO_COMPROVADA';
      atualizarStatusProcesso(processo.id, 'QUARENTENA', {
        origem: 'executor-real',
        motivo: 'A integração não comprovou oficialmente o resultado',
      });
      persistirEstado();
      return { sucesso: false, erro: 'RESULTADO_SEM_PROVA_OFICIAL' };
    }

    processo.resultadoExecucao = {
      ...processo.resultadoExecucao,
      status: 'COMPROVADO',
      evidencia: {
        url: prova.url,
        tipo: String(prova.tipo || 'confirmacao_oficial').slice(0, 60),
        verificadaEm: new Date().toISOString(),
      },
      concluidoEm: new Date().toISOString(),
    };
    const concluido = atualizarStatusProcesso(processo.id, 'CONCLUIDO', {
      origem: 'executor-real',
      motivo: 'Resultado confirmado por evidência HTTPS da integração oficial',
    });
    if (!concluido.sucesso) throw new Error(concluido.erro);
    const persistencia = persistirEstado();
    if (!persistencia.sucesso) {
      return { sucesso: false, erro: 'PERSISTENCIA_POS_EXECUCAO_FALHOU', requerReconciliacao: true };
    }
    info('EXECUCAO_REAL_COMPROVADA', 'Processo ' + processo.id + ' confirmado pela integração oficial', {
      processoId: processo.id,
      workerId: worker.id,
      integracaoId: adaptador.id,
    });
    return { sucesso: true, processoId: processo.id, workerId: worker.id, integracaoId: adaptador.id, resultado: processo.resultadoExecucao };
  } catch (error) {
    processo.resultadoExecucao = {
      status: error.message === 'TEMPO_MAXIMO_DE_EXECUCAO_EXCEDIDO' ? 'TEMPO_EXCEDIDO' : 'FALHA',
      workerId: worker.id,
      falha: String(error.message || error).slice(0, 300),
      ocorridoEm: new Date().toISOString(),
    };
    const status = processo.status === 'VALIDANDO' || envioExternoIniciado ? 'QUARENTENA' : 'FALHOU';
    atualizarStatusProcesso(processo.id, status, {
      origem: 'executor-real',
      motivo: envioExternoIniciado
        ? 'Envio ou verificação teve resultado incerto; processo em quarentena sem retentativa automática'
        : 'Falha do worker sem retentativa automática para evitar duplicidade',
    });
    persistirEstado();
    aviso('EXECUCAO_REAL_FALHOU', String(error.message || error), { processoId: processo.id, workerId: worker.id });
    return { sucesso: false, erro: 'EXECUCAO_REAL_FALHOU', motivo: String(error.message || error) };
  } finally {
    execucoesAtivas.delete(processoId);
    if (processo.status !== 'EXECUTANDO' && processo.status !== 'VALIDANDO') {
      processo.execucaoIdempotencyKey = null;
    }
  }
}

export default { executarProcessoReal, obterStatusExecutorReal };
