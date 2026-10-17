/**
 * OASIS V2 - Workers
 * Capacidade, carga, especialização, separar simulação/real
 */
import { estado } from '../core/estado.js';
import { info } from '../logs/logger.js';

export function registrarWorker(worker) {
  const { id, tipo = 'simulacao', especializacao = 'geral', capacidade = 5 } = worker;
  const w = {
    id,
    tipo,
    especializacao,
    capacidade,
    processosAtivos: 0,
    status: 'DISPONIVEL',
    criadoEm: new Date().toISOString(),
    ...worker,
  };
  estado.workers.set(id, w);
  info('WORKER_REGISTRADO', `Worker ${id} registrado`, { id, tipo, especializacao });
  return w;
}

export function obterWorker(id) {
  return estado.workers.get(id) || null;
}

export function listarWorkers(tipo = null) {
  const todos = Array.from(estado.workers.values());
  return tipo ? todos.filter(w => w.tipo === tipo) : todos;
}

export function obterWorkerDisponivel(especializacao = null) {
  for (const w of estado.workers.values()) {
    if (w.status === 'DISPONIVEL' && w.processosAtivos < w.capacidade) {
      if (!especializacao || w.especializacao === especializacao) return w;
    }
  }
  return null;
}

export function alocarWorker(workerId, processoId) {
  const w = estado.workers.get(workerId);
  if (!w || w.processosAtivos >= w.capacidade) return { sucesso: false, erro: 'Worker não disponível' };
  w.processosAtivos++;
  w.status = 'OCUPADO';
  info('WORKER_ALOCADO', `Worker ${workerId} alocado ao processo ${processoId}`, { workerId, processoId });
  return { sucesso: true, worker: w };
}

export function liberarWorker(workerId) {
  const w = estado.workers.get(workerId);
  if (!w) return { sucesso: false, erro: 'Worker não encontrado' };
  w.processosAtivos = Math.max(0, w.processosAtivos - 1);
  w.status = w.processosAtivos < w.capacidade ? 'DISPONIVEL' : 'OCUPADO';
  return { sucesso: true, worker: w };
}

export function garantirWorkersPadrao() {
  const existentes = new Set(estado.workers.keys());
  const padroes = [
    { id: 'worker-real-1', tipo: 'real', especializacao: 'geral', capacidade: 1 },
    { id: 'worker-sim-1', tipo: 'simulacao', especializacao: 'geral', capacidade: 5 },
    { id: 'worker-sim-2', tipo: 'simulacao', especializacao: 'coding', capacidade: 5 },
    { id: 'worker-sim-3', tipo: 'simulacao', especializacao: 'research', capacidade: 5 },
  ];
  for (const p of padroes) {
    if (!existentes.has(p.id)) registrarWorker(p);
  }
  return { sucesso: true, total: estado.workers.size };
}

export default { registrarWorker, obterWorker, listarWorkers, obterWorkerDisponivel, alocarWorker, liberarWorker, garantirWorkersPadrao };