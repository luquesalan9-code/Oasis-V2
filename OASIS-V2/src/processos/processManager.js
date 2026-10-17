/**
 * OASIS V2 - Ciclo de vida auditavel de processos.
 * O estado global e a fonte unica para que snapshots possam restaurar processos.
 */
import { estado } from '../core/estado.js';
import { info } from '../logs/logger.js';
import { alocarWorker, liberarWorker, obterWorker } from '../workers/workerManager.js';

export const ESTADOS_PROCESSO = Object.freeze([
  'CRIADO', 'NA_FILA', 'DISTRIBUIDO', 'EXECUTANDO', 'VALIDANDO',
  'CONCLUIDO', 'FALHOU', 'QUARENTENA', 'PAUSADO', 'CANCELADO',
]);

const TRANSICOES = Object.freeze({
  CRIADO: ['NA_FILA', 'QUARENTENA', 'CANCELADO'],
  NA_FILA: ['DISTRIBUIDO', 'QUARENTENA', 'PAUSADO', 'CANCELADO'],
  DISTRIBUIDO: ['EXECUTANDO', 'NA_FILA', 'QUARENTENA', 'PAUSADO', 'CANCELADO'],
  EXECUTANDO: ['VALIDANDO', 'FALHOU', 'QUARENTENA', 'PAUSADO'],
  VALIDANDO: ['CONCLUIDO', 'FALHOU', 'QUARENTENA'],
  FALHOU: ['NA_FILA', 'QUARENTENA', 'CANCELADO'],
  QUARENTENA: ['NA_FILA', 'CANCELADO'],
  PAUSADO: ['NA_FILA', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
});

function registrarEvento(processo, tipo, detalhes = {}) {
  const evento = {
    tipo,
    processoId: processo.id,
    em: new Date().toISOString(),
    motivo: detalhes.motivo || tipo,
    origem: detalhes.origem || 'processManager',
    ...detalhes,
  };
  processo.eventos ||= [];
  processo.eventos.push(evento);
  return evento;
}

function atualizarStatus(processo, status, detalhes = {}) {
  const anterior = processo.status;
  processo.status = status;
  processo.atualizadoEm = new Date().toISOString();
  registrarEvento(processo, 'TRANSICAO_STATUS', {
    de: anterior,
    para: status,
    motivo: detalhes.motivo || `Transicao ${anterior} -> ${status}`,
    origem: detalhes.origem || 'processManager',
    workerId: processo.workerId || null,
  });
  info('PROCESSO_STATUS', `Processo ${processo.id}: ${anterior} → ${status}`, {
    id: processo.id, anterior, status,
  });
}

export function criarProcesso(dados = {}) {
  if (dados.externalId) {
    const existente = Array.from(estado.processos.values()).find(p => p.externalId === dados.externalId);
    if (existente) return existente;
  }

  const agora = new Date().toISOString();
  const id = `proc-${++estado.contadores.processosCriados}`;
  const processo = {
    ...dados,
    id,
    status: 'CRIADO',
    criadoEm: agora,
    atualizadoEm: agora,
    externalId: dados.externalId || null,
    workerId: null,
    tentativas: 0,
    eventos: [],
  };
  registrarEvento(processo, 'PROCESSO_CRIADO', { origem: dados.origem || 'processManager' });
  estado.processos.set(id, processo);
  info('PROCESSO_CRIADO', `Processo ${id} criado`, { id, status: processo.status });
  return processo;
}

export function criarProcessoDeOportunidade(oportunidade) {
  return criarProcesso({
    externalId: oportunidade.externalId || oportunidade.id,
    dadosOportunidade: oportunidade,
    valorBrutoEstimado: oportunidade.valor || 0,
    custoEstimado: oportunidade.custo || 0,
    fonte: oportunidade.fonte,
    origem: oportunidade.origem,
    plataforma: oportunidade.plataforma,
    fonteAutorizada: oportunidade.fonteAutorizada || false,
    automacaoPermitida: oportunidade.automacaoPermitida || false,
    execucaoPermitida: oportunidade.execucaoPermitida || false,
    execucaoAutonoma: oportunidade.execucaoAutonoma || false,
  });
}

export function obterProcesso(id) {
  return estado.processos.get(id) || null;
}

export function atualizarStatusProcesso(id, status, detalhes = {}) {
  const processo = obterProcesso(id);
  if (!processo) return { sucesso: false, erro: 'Processo nao encontrado' };
  if (!ESTADOS_PROCESSO.includes(status)) return { sucesso: false, erro: 'Status invalido' };
  if (!TRANSICOES[processo.status]?.includes(status)) {
    return { sucesso: false, erro: `Transicao invalida: ${processo.status} -> ${status}` };
  }
  if (status === 'EXECUTANDO') {
    const worker = processo.workerId && obterWorker(processo.workerId);
    if (!worker || !worker.processosAtribuidos?.includes(processo.id)) {
      return { sucesso: false, erro: 'EXECUTANDO exige worker valido e atribuicao persistida' };
    }
    if (typeof worker.executar !== 'function') {
      return { sucesso: false, erro: 'Worker sem executor implementado; execucao real bloqueada' };
    }
    processo.tentativas++;
  }
  atualizarStatus(processo, status, detalhes);
  if (['CONCLUIDO', 'FALHOU', 'QUARENTENA', 'PAUSADO', 'CANCELADO'].includes(status) && processo.workerId) {
    encerrarAtribuicaoProcesso(id, { motivo: `Processo entrou em ${status}`, origem: detalhes.origem || 'processManager' });
  }
  if (status === 'CONCLUIDO') estado.contadores.processosConcluidos++;
  if (status === 'FALHOU') estado.contadores.processosFalhados++;
  return { sucesso: true, processo };
}

export function distribuirProcesso(id, workerId, detalhes = {}) {
  const processo = obterProcesso(id);
  if (!processo) return { sucesso: false, erro: 'Processo nao encontrado' };
  if (!['CRIADO', 'NA_FILA', 'FALHOU'].includes(processo.status)) {
    return { sucesso: false, erro: `Processo nao pode ser distribuido no estado ${processo.status}` };
  }
  const worker = obterWorker(workerId);
  if (!worker) return { sucesso: false, erro: 'Worker nao encontrado' };
  const alocacao = alocarWorker(workerId, id);
  if (!alocacao.sucesso) return alocacao;

  processo.workerId = workerId;
  processo.executorId = workerId;
  processo.atualizadoEm = new Date().toISOString();
  registrarEvento(processo, 'WORKER_ATRIBUIDO', {
    workerId,
    motivo: detalhes.motivo || 'Worker atribuido antes do inicio',
    origem: detalhes.origem || 'distribuidor',
  });
  if (processo.status !== 'NA_FILA') atualizarStatus(processo, 'NA_FILA', detalhes);
  atualizarStatus(processo, 'DISTRIBUIDO', detalhes);
  return { sucesso: true, processo, worker };
}

export function encerrarAtribuicaoProcesso(id, detalhes = {}) {
  const processo = obterProcesso(id);
  if (!processo?.workerId) return { sucesso: false, erro: 'Processo sem worker atribuido' };
  const workerId = processo.workerId;
  const liberacao = liberarWorker(workerId, id);
  if (!liberacao.sucesso) return liberacao;
  registrarEvento(processo, 'WORKER_LIBERADO', {
    workerId, motivo: detalhes.motivo || 'Atribuicao encerrada', origem: detalhes.origem || 'processManager',
  });
  processo.workerId = null;
  processo.executorId = null;
  return { sucesso: true, processo, worker: liberacao.worker };
}

export function processarOportunidadeParaProcesso(oportunidade) {
  const processo = criarProcessoDeOportunidade(oportunidade);
  return { sucesso: true, processo };
}

export function processarLote(oportunidades) {
  const processos = oportunidades.map(oportunidade => processarOportunidadeParaProcesso(oportunidade).processo);
  return { sucesso: true, total: processos.length, processos };
}

export function obterResumoProcessos() {
  const porStatus = {};
  for (const processo of estado.processos.values()) {
    porStatus[processo.status] = (porStatus[processo.status] || 0) + 1;
  }
  return {
    total: estado.processos.size,
    porStatus,
    criados: estado.contadores.processosCriados,
    concluidos: estado.contadores.processosConcluidos,
    falhados: estado.contadores.processosFalhados,
  };
}

export function limparProcessos() {
  estado.processos.clear();
  return { sucesso: true };
}

export default {
  criarProcesso, criarProcessoDeOportunidade, obterProcesso, atualizarStatusProcesso,
  distribuirProcesso, encerrarAtribuicaoProcesso, processarOportunidadeParaProcesso,
  processarLote, obterResumoProcessos, limparProcessos,
};
