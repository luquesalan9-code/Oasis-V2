/** OASIS V2 - Snapshot atomico, restauração e reconciliacao segura. */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { estado } from '../core/estado.js';
import { mineradora } from '../core/mineradora.js';
import { info, aviso } from '../logs/logger.js';
import { config } from '../core/config.js';
import { snapshotLedger, restaurarLedger } from '../financeiro/ledger.js';
import { snapshotRadar, restaurarRadar } from '../radar/radarGlobal.js';
import { snapshotAprovacoes, restaurarAprovacoes } from '../aprovacao/fluxoAprovacao.js';

const VERSAO_SNAPSHOT = 1;
const PROCESSOS_INCERTOS_APOS_REINICIO = new Set(['DISTRIBUIDO', 'EXECUTANDO', 'VALIDANDO']);

function sanitizar(valor, chave = '') {
  if (/(token|secret|password|senha|credential|authorization|api[_-]?key)/i.test(chave)) return '[REDACTED]';
  if (Array.isArray(valor)) return valor.map(item => sanitizar(item));
  if (!valor || typeof valor !== 'object') return valor;
  return Object.fromEntries(Object.entries(valor).map(([key, value]) => [key, sanitizar(value, key)]));
}

export function snapshotEstado() {
  return sanitizar({
    schemaVersion: VERSAO_SNAPSHOT,
    contadores: { ...estado.contadores },
    processos: Array.from(estado.processos.values()),
    workers: Array.from(estado.workers.values()),
    financeiro: { ...mineradora.financeiro },
    operacao: { ...mineradora.operacao },
    ledger: snapshotLedger(),
    radar: snapshotRadar(),
    aprovacoes: snapshotAprovacoes(),
    salvoEm: new Date().toISOString(),
  });
}

export function reconciliarEstadoRestaurado() {
  let emQuarentena = 0;
  for (const worker of estado.workers.values()) {
    worker.processosAtribuidos = [];
    worker.processosAtivos = 0;
    if (!['BLOQUEADO', 'ERRO', 'INATIVO'].includes(worker.status)) worker.status = 'DISPONIVEL';
  }

  for (const processo of estado.processos.values()) {
    const estadoAnterior = processo.status;
    const workerIdAnterior = processo.workerId || null;
    if (PROCESSOS_INCERTOS_APOS_REINICIO.has(estadoAnterior)) {
      processo.status = 'QUARENTENA';
      processo.atualizadoEm = new Date().toISOString();
      processo.eventos ||= [];
      processo.eventos.push({
        tipo: 'RECUPERACAO_QUARENTENA',
        processoId: processo.id,
        de: estadoAnterior,
        para: 'QUARENTENA',
        workerId: workerIdAnterior,
        em: processo.atualizadoEm,
        motivo: 'Resultado de processo ativo e atribuicao nao podem ser confirmados apos reinicio',
        origem: 'reconciliacao',
      });
      emQuarentena++;
    }
    processo.workerId = null;
    processo.executorId = null;
  }

  return { sucesso: true, emQuarentena };
}

function validarSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return 'Snapshot invalido';
  if (snapshot.schemaVersion !== undefined && snapshot.schemaVersion !== VERSAO_SNAPSHOT) return 'Versao de snapshot nao suportada';
  if (snapshot.processos !== undefined && !Array.isArray(snapshot.processos)) return 'Lista de processos invalida';
  if (snapshot.workers !== undefined && !Array.isArray(snapshot.workers)) return 'Lista de workers invalida';
  const processoIds = new Set();
  for (const processo of snapshot.processos || []) {
    if (!processo?.id || processoIds.has(processo.id)) return 'Snapshot contem ID de processo ausente ou duplicado';
    processoIds.add(processo.id);
  }
  const workerIds = new Set();
  for (const worker of snapshot.workers || []) {
    if (!worker?.id || workerIds.has(worker.id)) return 'Snapshot contem ID de worker ausente ou duplicado';
    workerIds.add(worker.id);
  }
  if (snapshot.ledger && !Array.isArray(snapshot.ledger.lancamentos)) return 'Snapshot do ledger invalido';
  if (snapshot.aprovacoes && !Array.isArray(snapshot.aprovacoes.solicitacoes)) return 'Snapshot de aprovacoes invalido';
  if (snapshot.ledger) {
    const ids = new Set();
    const chaves = new Set();
    for (const lancamento of snapshot.ledger.lancamentos) {
      if (!lancamento?.id || ids.has(lancamento.id)) return 'Snapshot do ledger contem ID ausente ou duplicado';
      ids.add(lancamento.id);
      if (lancamento.idempotencyKey && chaves.has(lancamento.idempotencyKey)) return 'Snapshot do ledger contem chave de idempotencia duplicada';
      if (lancamento.idempotencyKey) chaves.add(lancamento.idempotencyKey);
    }
  }
  if (snapshot.aprovacoes) {
    const ids = new Set();
    for (const solicitacao of snapshot.aprovacoes.solicitacoes) {
      if (!solicitacao?.id || ids.has(solicitacao.id)) return 'Snapshot de aprovacoes contem ID ausente ou duplicado';
      ids.add(solicitacao.id);
    }
  }
  if (snapshot.radar && (!Array.isArray(snapshot.radar.fontes) || !Array.isArray(snapshot.radar.oportunidades))) {
    return 'Snapshot do radar invalido';
  }
  return null;
}

export function restaurarEstado(snapshot) {
  const erroValidacao = validarSnapshot(snapshot);
  if (erroValidacao) return { sucesso: false, erro: erroValidacao };

  estado.processos.clear();
  estado.workers.clear();
  (snapshot.processos || []).forEach(processo => estado.processos.set(processo.id, processo));
  (snapshot.workers || []).forEach(worker => estado.workers.set(worker.id, worker));

  if (snapshot.contadores) {
    for (const chave of Object.keys(estado.contadores)) {
      const valor = snapshot.contadores[chave];
      if (Number.isInteger(valor) && valor >= 0) estado.contadores[chave] = valor;
    }
  }
  if (snapshot.financeiro) Object.assign(mineradora.financeiro, snapshot.financeiro);
  if (snapshot.operacao) Object.assign(mineradora.operacao, snapshot.operacao);
  if (snapshot.ledger) restaurarLedger(snapshot.ledger);
  else restaurarLedger({ lancamentos: [], contador: 0 });
  if (snapshot.radar) restaurarRadar(snapshot.radar);
  else restaurarRadar({ fontes: new Map(), oportunidades: new Map(), lotesProcessados: 0 });
  if (snapshot.aprovacoes) restaurarAprovacoes(snapshot.aprovacoes);
  else restaurarAprovacoes({ solicitacoes: [], contador: 0 });

  const recuperacao = reconciliarEstadoRestaurado();
  info('ESTADO_RESTORED', 'Estado restaurado e reconciliado', recuperacao);
  return { sucesso: true, snapshot, recuperacao };
}

export function persistirEstado() {
  if (!config.persistencia.ativo) return { sucesso: false, erro: 'Persistencia desativada' };
  const arquivo = path.resolve(config.persistencia.arquivo);
  const temporario = `${arquivo}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(temporario, JSON.stringify(snapshotEstado(), null, 2), { encoding: 'utf-8', flag: 'wx' });
    fs.renameSync(temporario, arquivo);
    info('ESTADO_PERSISTIDO', `Estado salvo atomicamente em ${arquivo}`);
    return { sucesso: true, arquivo };
  } catch (error) {
    try { if (fs.existsSync(temporario)) fs.unlinkSync(temporario); } catch { /* limpeza best-effort */ }
    aviso('ESTADO_ERRO_PERSISTENCIA', error.message);
    return { sucesso: false, erro: error.message };
  }
}

export function carregarEstado() {
  if (!config.persistencia.ativo) return { sucesso: false, erro: 'Persistencia desativada' };
  const arquivo = path.resolve(config.persistencia.arquivo);
  if (!fs.existsSync(arquivo)) return { sucesso: false, erro: 'Arquivo de estado nao encontrado', ausente: true };
  try {
    const snapshot = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
    return restaurarEstado(snapshot);
  } catch (error) {
    aviso('ESTADO_ERRO_CARREGAMENTO', error.message);
    return { sucesso: false, erro: error.message };
  }
}

export default { snapshotEstado, restaurarEstado, reconciliarEstadoRestaurado, persistirEstado, carregarEstado };
