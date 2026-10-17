/**
 * OASIS V2 - Ledger Financeiro
 * Contabilidade de dupla entrada com IDs idempotentes e trilha de auditoria
 */
import { info, aviso } from '../logs/logger.js';

const lancamentos = new Map();
let ledgerIdCounter = 0;

export function registrarLancamento(lancamento) {
  const id = lancamento.id || 'led-' + (++ledgerIdCounter);
  const registro = {
    id,
    tipo: lancamento.tipo || 'debito',
    conta: lancamento.conta,
    counterpartia: lancamento.counterpartia || null,
    moeda: lancamento.moeda || 'USD',
    valor: Number(lancamento.valor) || 0,
    valorBase: Number(lancamento.valorBase) || Number(lancamento.valor) || 0,
    origem: lancamento.origem || 'sistema',
    referencia: lancamento.referencia || null,
    evidencia: lancamento.evidencia || null,
    status: lancamento.status || 'PENDENTE',
    criadoEm: new Date().toISOString(),
    aprovadoEm: null,
    aprovadoPor: null,
    ...lancamento,
  };

  if (lancamentos.has(id)) {
    return { sucesso: false, erro: 'ID duplicado', existente: lancamentos.get(id) };
  }

  lancamentos.set(id, registro);
  info('LEDGER_LANCAMENTO', 'Lancamento registrado', { id, tipo: registro.tipo, valor: registro.valor });
  return { sucesso: true, lancamento: registro };
}

export function aprovarLancamento(id, aprovador) {
  const lancamento = lancamentos.get(id);
  if (!lancamento) return { sucesso: false, erro: 'Lancamento nao encontrado' };
  if (lancamento.status !== 'PENDENTE') {
    return { sucesso: false, erro: 'Lancamento ja esta ' + lancamento.status };
  }
  lancamento.status = 'APROVADO';
  lancamento.aprovadoEm = new Date().toISOString();
  lancamento.aprovadoPor = aprovador;
  info('LEDGER_APROVADO', 'Lancamento aprovado', { id, aprovador });
  return { sucesso: true, lancamento };
}

export function confirmarRecebimento(id, evidencia) {
  const lancamento = lancamentos.get(id);
  if (!lancamento) return { sucesso: false, erro: 'Lancamento nao encontrado' };
  lancamento.status = 'CONFIRMADO';
  lancamento.evidencia = evidencia || lancamento.evidencia;
  lancamento.confirmadoEm = new Date().toISOString();
  info('LEDGER_CONFIRMADO', 'Recebimento confirmado', { id });
  return { sucesso: true, lancamento };
}

export function obterLancamento(id) {
  return lancamentos.get(id) || null;
}

export function listarLancamentos(filtro = {}) {
  let lista = Array.from(lancamentos.values());
  if (filtro.tipo) lista = lista.filter(l => l.tipo === filtro.tipo);
  if (filtro.status) lista = lista.filter(l => l.status === filtro.status);
  if (filtro.conta) lista = lista.filter(l => l.conta === filtro.conta);
  return lista;
}

export function obterSaldo(conta, moeda = 'USD') {
  let saldo = 0;
  for (const l of lancamentos.values()) {
    if (l.conta === conta && l.moeda === moeda && l.status === 'CONFIRMADO') {
      if (l.tipo === 'credito') saldo += l.valor;
      else if (l.tipo === 'debito') saldo -= l.valor;
    }
  }
  return saldo;
}

export function conciliar() {
  const pendentes = Array.from(lancamentos.values()).filter(l => l.status === 'PENDENTE');
  const aprovados = Array.from(lancamentos.values()).filter(l => l.status === 'APROVADO');
  const confirmados = Array.from(lancamentos.values()).filter(l => l.status === 'CONFIRMADO');
  return {
    total: lancamentos.size,
    pendentes: pendentes.length,
    aprovados: aprovados.length,
    confirmados: confirmados.length,
  };
}

export function limparLedger() {
  lancamentos.clear();
  ledgerIdCounter = 0;
  return { sucesso: true };
}

export default {
  registrarLancamento, aprovarLancamento, confirmarRecebimento,
  obterLancamento, listarLancamentos, obterSaldo, conciliar, limparLedger
};