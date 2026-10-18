/** OASIS V2 - Registro e controle de capacidade dos workers. */
import { estado } from '../core/estado.js';
import { info } from '../logs/logger.js';

export function registrarWorker(worker) {
  const { id, tipo = 'real', especializacao = 'geral', capacidade = 1 } = worker;
  if (!id || typeof id !== 'string') return { sucesso: false, erro: 'Worker exige id textual' };
  if (tipo !== 'real') return { sucesso: false, erro: 'Somente workers reais sao aceitos' };
  if (!Number.isInteger(capacidade) || capacidade < 1) return { sucesso: false, erro: 'Capacidade deve ser inteiro positivo' };
  const anterior = estado.workers.get(id);
  const atribuicoes = anterior?.processosAtribuidos || [];
  const estadoBloqueado = worker.status || anterior?.status;
  const bloqueado = ['BLOQUEADO', 'ERRO', 'INATIVO'].includes(estadoBloqueado);
  const w = {
    ...worker,
    id, tipo, especializacao, capacidade,
    processosAtribuidos: atribuicoes,
    processosAtivos: atribuicoes.length,
    status: bloqueado ? estadoBloqueado : (atribuicoes.length >= capacidade ? 'OCUPADO' : 'DISPONIVEL'),
    criadoEm: anterior?.criadoEm || new Date().toISOString(),
  };
  estado.workers.set(id, w);
  info('WORKER_REGISTRADO', `Worker ${id} registrado`, { id, tipo, especializacao });
  return w;
}

export function obterWorker(id) {
  return estado.workers.get(id) || null;
}

export function listarWorkers(tipo = null) {
  const workers = Array.from(estado.workers.values());
  return tipo ? workers.filter(worker => worker.tipo === tipo) : workers;
}

export function obterWorkerDisponivel(especializacao = null, tipo = null) {
  return Array.from(estado.workers.values()).find(worker => {
    const possuiVaga = (worker.processosAtribuidos || []).length < worker.capacidade;
    const tipoPermitido = !tipo || worker.tipo === tipo;
    const especialidadePermitida = !especializacao || worker.especializacao === especializacao || worker.especializacao === 'geral';
    return possuiVaga && ['DISPONIVEL', 'OCUPADO'].includes(worker.status) && tipoPermitido && especialidadePermitida;
  }) || null;
}

export function alocarWorker(workerId, processoId) {
  const worker = obterWorker(workerId);
  if (!worker) return { sucesso: false, erro: 'Worker nao encontrado' };
  if (!processoId || typeof processoId !== 'string') return { sucesso: false, erro: 'Processo invalido' };
  const processo = estado.processos.get(processoId);
  if (!processo) return { sucesso: false, erro: 'Processo nao encontrado para atribuicao' };
  if (processo.workerId) return { sucesso: false, erro: 'Processo ja possui worker atribuido' };
  worker.processosAtribuidos ||= [];
  if (worker.processosAtribuidos.includes(processoId)) {
    return { sucesso: false, erro: 'Processo ja atribuido a este worker' };
  }
  if (!['DISPONIVEL', 'OCUPADO'].includes(worker.status) || worker.processosAtribuidos.length >= worker.capacidade) {
    return { sucesso: false, erro: 'Worker sem capacidade disponivel' };
  }
  worker.processosAtribuidos.push(processoId);
  worker.processosAtivos = worker.processosAtribuidos.length;
  worker.status = worker.processosAtivos >= worker.capacidade ? 'OCUPADO' : 'DISPONIVEL';
  worker.atualizadoEm = new Date().toISOString();
  info('WORKER_ALOCADO', `Worker ${workerId} alocado ao processo ${processoId}`, { workerId, processoId });
  return { sucesso: true, worker };
}

export function liberarWorker(workerId, processoId) {
  const worker = obterWorker(workerId);
  if (!worker) return { sucesso: false, erro: 'Worker nao encontrado' };
  worker.processosAtribuidos ||= [];
  if (processoId && !worker.processosAtribuidos.includes(processoId)) {
    return { sucesso: false, erro: 'Processo nao esta atribuido a este worker' };
  }
  if (processoId) worker.processosAtribuidos = worker.processosAtribuidos.filter(id => id !== processoId);
  else worker.processosAtribuidos.pop();
  worker.processosAtivos = worker.processosAtribuidos.length;
  worker.status = worker.processosAtivos >= worker.capacidade ? 'OCUPADO' : 'DISPONIVEL';
  worker.atualizadoEm = new Date().toISOString();
  return { sucesso: true, worker };
}

export function garantirWorkersPadrao() {
  return { sucesso: true, total: estado.workers.size };
}

export default { registrarWorker, obterWorker, listarWorkers, obterWorkerDisponivel, alocarWorker, liberarWorker, garantirWorkersPadrao };
