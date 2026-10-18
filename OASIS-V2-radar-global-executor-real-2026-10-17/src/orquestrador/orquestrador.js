/**
 * OASIS V2 - Orquestração de descoberta e fila.
 * O ciclo real é somente leitura: busca oportunidades e as coloca para revisão.
 * Nenhuma candidatura, contrato ou execução externa é iniciada por este módulo.
 */
import { estado } from '../core/estado.js';
import { config } from '../core/config.js';
import { info, aviso } from '../logs/logger.js';
import radar from '../radar/radarGlobal.js';
import { atualizarStatusProcesso, criarProcessoDeOportunidade } from '../processos/processManager.js';
import GerenciadorConectores from '../conectores/gerenciador.js';
import { persistirEstado } from '../persistencia/persistencia.js';
import { validarOportunidade } from '../validacao/validador.js';
import { supervisionarOportunidade } from '../agentes/supervisao.js';
import { executarProcessoReal } from '../executores/executorReal.js';

const conectores = new GerenciadorConectores();

export function adicionarOportunidadeAoSistema(oportunidade) {
  const resultado = radar.adicionarOportunidade(oportunidade);
  if (!resultado.sucesso && resultado.duplicada) {
    return { sucesso: false, duplicada: true, oportunidade: resultado.existente };
  }

  const processo = criarProcessoDeOportunidade(resultado.oportunidade);
  info('OPORTUNIDADE_ADICIONADA', `Oportunidade ${processo.id} adicionada`, {
    id: processo.id,
    fonte: processo.fonte,
  });
  return processo;
}

export function processarOportunidades(lote = []) {
  if (!Array.isArray(lote)) {
    return { sucesso: false, erro: 'Lote deve ser um array', total: 0, processos: [] };
  }

  const processos = [];
  let vagasRemotasRegistradas = 0;
  for (const oportunidade of lote) {
    if (oportunidade?.tipoOportunidade === 'VAGA_REMOTA') {
      const descoberta = radar.adicionarOportunidade(oportunidade);
      if (descoberta.sucesso) vagasRemotasRegistradas++;
      continue;
    }
    const processo = adicionarOportunidadeAoSistema(oportunidade);
    if (processo && !processo.duplicada) processos.push(processo);
  }
  return { sucesso: true, total: processos.length, processos, vagasRemotasRegistradas };
}

function combinarDescobertasPorFonte(resultados, limite) {
  const fontes = resultados.map(resultado => resultado.oportunidades || []);
  const descobertas = [];
  for (let indice = 0; descobertas.length < limite; indice++) {
    let encontrou = false;
    for (const oportunidadesFonte of fontes) {
      if (oportunidadesFonte[indice]) {
        descobertas.push(oportunidadesFonte[indice]);
        encontrou = true;
        if (descobertas.length >= limite) break;
      }
    }
    if (!encontrou) break;
  }
  return descobertas;
}

/** Processa apenas oportunidades recebidas de fontes de dados. */
export function executarCicloOrquestrador() {
  estado.contadores.ciclosExecutados++;
  const fila = radar.buscarEEnfileirar({ limite: config.radar.oportunidadesPorCiclo });
  let enfileirados = 0;
  let emQuarentena = 0;
  for (const oportunidade of fila.oportunidades) {
    const processo = Array.from(estado.processos.values()).find(item => item.externalId === oportunidade.externalId);
    if (processo?.status !== 'CRIADO') continue;
    processo.validacao = validarOportunidade(processo.dadosOportunidade || oportunidade);
    processo.supervisao = supervisionarOportunidade(processo.dadosOportunidade || oportunidade, processo.validacao);
    const destino = processo.supervisao.aprovadaParaFila ? 'NA_FILA' : 'QUARENTENA';
    const transicao = atualizarStatusProcesso(processo.id, destino, {
      origem: 'orquestrador',
      motivo: processo.supervisao.aprovadaParaFila
        ? 'Supervisao deterministica aprovada; item registrado somente na fila local'
        : `Supervisao encaminhou para quarentena: ${processo.supervisao.motivos.join(', ')}`,
    });
    if (transicao.sucesso && destino === 'NA_FILA') enfileirados++;
    if (transicao.sucesso && destino === 'QUARENTENA') emQuarentena++;
  }
  const resumo = obterResumoOrquestrador();
  const resultado = {
    sucesso: true,
    ciclo: estado.contadores.ciclosExecutados,
    radar: fila,
    alocados: [],
    enfileirados,
    emQuarentena,
    resumo,
  };
  info('ORQUESTRADOR_CICLO', 'Ciclo da fila local concluído', {
    ciclo: resultado.ciclo,
    oportunidades: fila.total,
  });
  return resultado;
}

/** Consulta fontes ao vivo e separa itens elegiveis de descobertas em quarentena. */
export async function executarCicloReal() {
  if (config.operacao.operacao !== 'REAL') {
    return {
      sucesso: false,
      erro: 'CICLO_REAL_BLOQUEADO: configure OASIS_OPERACAO=REAL',
    };
  }
  if (!config.radar.ativo) {
    return { sucesso: false, erro: 'RADAR_DESATIVADO' };
  }

  const consulta = await conectores.consultarTodos({ limite: config.radar.oportunidadesPorCiclo });
  if (consulta.total === 0) {
    return {
      sucesso: false,
      erro: 'Nenhuma fonte conseguiu responder',
      falhas: consulta.falhas,
    };
  }
  const descobertas = combinarDescobertasPorFonte(consulta.resultados, config.radar.oportunidadesPorCiclo);
  const processados = processarOportunidades(descobertas);
  const ciclo = executarCicloOrquestrador();
  const filaAutorizada = Array.from(estado.processos.values()).filter(processo => (
    processo.status === 'NA_FILA' && processo.autorizacaoExecucao?.aprovada === true
  ));
  const execucoes = [];
  for (const processo of filaAutorizada) {
    execucoes.push(await executarProcessoReal(processo.id));
  }
  const persistencia = persistirEstado();

  return {
    ...ciclo,
    sucesso: persistencia.sucesso,
    ...(persistencia.sucesso ? {} : { erro: 'PERSISTENCIA_OBRIGATORIA_FALHOU', detalhePersistencia: persistencia.erro }),
    persistencia: { sucesso: persistencia.sucesso, arquivo: persistencia.arquivo || null },
    modo: 'REAL_DESCOBERTA',
    fontesConsultadas: consulta.total,
    falhas: consulta.falhas,
    descobertas: descobertas.length,
    novosProcessos: processados.total,
    novasVagasRemotas: processados.vagasRemotasRegistradas,
    processos: processados.processos,
    execucoes,
  };
}

export function obterFontesRadar() {
  const fontes = conectores.listarStatus();
  fontes.forEach(fonte => {
    const cadastrada = radar.obterFonte(fonte.id) || {};
    radar.registrarFonte({ ...cadastrada, ...fonte, tipo: cadastrada.tipo || 'oportunidades', modo: 'leitura' });
  });
  return fontes;
}

export function obterResumoOrquestrador() {
  return {
    ciclosExecutados: estado.contadores.ciclosExecutados,
    processosAtivos: estado.processos.size,
    workersAtivos: estado.workers.size,
    radar: radar.obterResumoRadar(),
  };
}

export default {
  executarCicloOrquestrador,
  executarCicloReal,
  processarOportunidades,
  obterResumoOrquestrador,
  obterFontesRadar,
  adicionarOportunidadeAoSistema,
};
