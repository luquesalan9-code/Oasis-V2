/** OASIS V2 - Ledger financeiro; recebimentos exigem aprovacao e comprovante. */
import { info } from '../logs/logger.js';

const lancamentos = new Map();
const chavesIdempotencia = new Map();
let ledgerIdCounter = 0;

export function registrarLancamento(lancamento) {
  if (!lancamento || !['credito', 'debito'].includes(lancamento.tipo || 'debito')) {
    return { sucesso: false, erro: 'Tipo de lancamento invalido' };
  }
  if (lancamento.status && lancamento.status !== 'PENDENTE') {
    return { sucesso: false, erro: 'Novo lancamento deve iniciar PENDENTE' };
  }
  if (lancamento.idempotencyKey && chavesIdempotencia.has(lancamento.idempotencyKey)) {
    const existente = lancamentos.get(chavesIdempotencia.get(lancamento.idempotencyKey));
    return { sucesso: false, erro: 'Chave de idempotencia duplicada', existente };
  }

  const valor = Number(lancamento.valor);
  if (!Number.isFinite(valor) || valor <= 0) return { sucesso: false, erro: 'Valor do lancamento deve ser positivo' };
  const id = lancamento.id || `led-${++ledgerIdCounter}`;
  if (lancamentos.has(id)) return { sucesso: false, erro: 'ID duplicado', existente: lancamentos.get(id) };

  const registro = {
    ...lancamento,
    id,
    tipo: lancamento.tipo || 'debito',
    conta: lancamento.conta,
    counterpartia: lancamento.counterpartia || null,
    moeda: lancamento.moeda || 'USD',
    valor,
    valorBase: Number(lancamento.valorBase) || valor,
    origem: lancamento.origem || 'sistema',
    referencia: lancamento.referencia || null,
    idempotencyKey: lancamento.idempotencyKey || null,
    criadoEm: new Date().toISOString(),
    aprovadoEm: null,
    aprovadoPor: null,
    status: 'PENDENTE',
    evidencia: null,
  };
  lancamentos.set(id, registro);
  if (registro.idempotencyKey) chavesIdempotencia.set(registro.idempotencyKey, id);
  info('LEDGER_LANCAMENTO', 'Lancamento registrado', { id, tipo: registro.tipo, valor: registro.valor });
  return { sucesso: true, lancamento: registro };
}

export function aprovarLancamento(id, aprovador) {
  const lancamento = lancamentos.get(id);
  if (!lancamento) return { sucesso: false, erro: 'Lancamento nao encontrado' };
  if (lancamento.status !== 'PENDENTE') return { sucesso: false, erro: `Lancamento ja esta ${lancamento.status}` };
  if (typeof aprovador !== 'string' || !aprovador.trim()) return { sucesso: false, erro: 'Aprovador obrigatorio' };
  lancamento.status = 'APROVADO';
  lancamento.aprovadoEm = new Date().toISOString();
  lancamento.aprovadoPor = aprovador.trim();
  info('LEDGER_APROVADO', 'Lancamento aprovado', { id, aprovador: lancamento.aprovadoPor });
  return { sucesso: true, lancamento };
}

export function confirmarRecebimento(id, evidencia) {
  const lancamento = lancamentos.get(id);
  if (!lancamento) return { sucesso: false, erro: 'Lancamento nao encontrado' };
  if (lancamento.status !== 'APROVADO') return { sucesso: false, erro: 'Lancamento precisa estar APROVADO antes da confirmacao' };
  const evidenciaValida = evidencia && typeof evidencia === 'object'
    && evidencia.fonteOficial === true
    && evidencia.verificada === true
    && typeof evidencia.verificadaPor === 'string'
    && evidencia.verificadaPor.trim().length > 0
    && typeof evidencia.referencia === 'string'
    && /^https:\/\//i.test(evidencia.referencia);
  if (!evidenciaValida) return { sucesso: false, erro: 'Evidencia oficial verificada obrigatoria' };
  lancamento.status = 'CONFIRMADO';
  lancamento.evidencia = { ...evidencia, verificadaPor: evidencia.verificadaPor.trim() };
  lancamento.confirmadoEm = new Date().toISOString();
  info('LEDGER_CONFIRMADO', 'Recebimento confirmado', { id });
  return { sucesso: true, lancamento };
}

export function obterLancamento(id) {
  return lancamentos.get(id) || null;
}

export function listarLancamentos(filtro = {}) {
  let lista = Array.from(lancamentos.values());
  if (filtro.tipo) lista = lista.filter(item => item.tipo === filtro.tipo);
  if (filtro.status) lista = lista.filter(item => item.status === filtro.status);
  if (filtro.conta) lista = lista.filter(item => item.conta === filtro.conta);
  return lista;
}

export function obterSaldo(conta, moeda = 'USD') {
  return listarLancamentos({ conta, status: 'CONFIRMADO' }).reduce((saldo, item) => {
    if (item.moeda !== moeda || item.evidencia?.verificada !== true || !item.confirmadoEm) return saldo;
    return saldo + (item.tipo === 'credito' ? item.valor : -item.valor);
  }, 0);
}

export function conciliar() {
  const todos = Array.from(lancamentos.values());
  return {
    total: todos.length,
    pendentes: todos.filter(item => item.status === 'PENDENTE').length,
    aprovados: todos.filter(item => item.status === 'APROVADO').length,
    confirmados: todos.filter(item => item.status === 'CONFIRMADO' && item.evidencia?.verificada === true && item.confirmadoEm).length,
  };
}

export function limparLedger() {
  lancamentos.clear();
  chavesIdempotencia.clear();
  ledgerIdCounter = 0;
  return { sucesso: true };
}

export function snapshotLedger() {
  return { lancamentos: Array.from(lancamentos.values()), contador: ledgerIdCounter };
}

export function restaurarLedger(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.lancamentos)) return { sucesso: false, erro: 'Snapshot do ledger invalido' };
  const ids = new Set();
  const chaves = new Set();
  for (const item of snapshot.lancamentos) {
    if (!item?.id || ids.has(item.id)) return { sucesso: false, erro: 'Snapshot do ledger contem ID ausente ou duplicado' };
    if (item.idempotencyKey && chaves.has(item.idempotencyKey)) return { sucesso: false, erro: 'Snapshot do ledger contem chave de idempotencia duplicada' };
    ids.add(item.id);
    if (item.idempotencyKey) chaves.add(item.idempotencyKey);
  }
  lancamentos.clear();
  chavesIdempotencia.clear();
  snapshot.lancamentos.forEach(item => {
    lancamentos.set(item.id, item);
    if (item.idempotencyKey) chavesIdempotencia.set(item.idempotencyKey, item.id);
  });
  ledgerIdCounter = Number(snapshot.contador) || 0;
  return { sucesso: true, total: lancamentos.size };
}

export default {
  registrarLancamento, aprovarLancamento, confirmarRecebimento,
  obterLancamento, listarLancamentos, obterSaldo, conciliar, limparLedger,
  snapshotLedger, restaurarLedger,
};
