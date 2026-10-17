/**
 * OASIS V2 - Gerenciador de Processos
 * Portado de processManager.js V1 com idempotência e estados
 */
import { estado } from '../core/estado.js';
import { info } from '../logs/logger.js';

const processos = new Map();
const ESTADOS = ['CRIADO', 'FILA', 'ALOCADO', 'EXECUTANDO', 'CONCLUIDO', 'FALHA', 'CANCELADO', 'AGUARDANDO', 'BLOQUEADO', 'REVISAO', 'REJEITADO', 'EXPIRADO', 'RECUPERADO'];

export function criarProcesso(dados) {
  const id = `proc-${++estado.contadores.processosCriados}`;
  const processo = {
    id,
    status: 'CRIADO',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    externalId: dados.externalId || null,
    ...dados,
  };
  if (processo.executorId || processo.workerId || processo.executor) {
    if (!processo.executorId) processo.executorId = processo.workerId || processo.executor;
    if (!processo.workerId) processo.workerId = processo.executorId;
    if (!processo.executor) processo.executor = processo.executorId;
  }
  processos.set(id, processo);
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
    executor: oportunidade.executor,
    executorId: oportunidade.executorId,
    workerId: oportunidade.workerId,
  });
}

export function obterProcesso(id) {
  return processos.get(id) || null;
}

export function atualizarStatusProcesso(id, status) {
  const processo = processos.get(id);
  if (!processo) return { sucesso: false, erro: 'Processo não encontrado' };
  if (!ESTADOS.includes(status)) return { sucesso: false, erro: 'Status inválido' };
  processo.status = status;
  processo.atualizadoEm = new Date().toISOString();
  info('PROCESSO_STATUS', `Processo ${id} → ${status}`, { id, status });
  return { sucesso: true, processo };
}

export function processarOportunidadeParaProcesso(oportunidade) {
  const processo = criarProcessoDeOportunidade(oportunidade);
  return { sucesso: true, processo };
}

export function processarLote(oportunidades) {
  const criados = [];
  for (const o of oportunidades) {
    const resultado = processarOportunidadeParaProcesso(o);
    if (resultado.sucesso) criados.push(resultado.processo);
  }
  return { sucesso: true, total: criados.length, processos: criados };
}

export function obterResumoProcessos() {
  const porStatus = {};
  for (const p of processos.values()) {
    porStatus[p.status] = (porStatus[p.status] || 0) + 1;
  }
  return {
    total: processos.size,
    porStatus,
    criados: estado.contadores.processosCriados,
    concluidos: estado.contadores.processosConcluidos,
    falhados: estado.contadores.processosFalhados,
  };
}

export function limparProcessos() {
  processos.clear();
  estado.processos.clear();
  return { sucesso: true };
}

export default { criarProcesso, criarProcessoDeOportunidade, obterProcesso, atualizarStatusProcesso, processarOportunidadeParaProcesso, processarLote, obterResumoProcessos, limparProcessos };
