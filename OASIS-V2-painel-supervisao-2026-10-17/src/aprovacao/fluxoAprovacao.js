/**
 * OASIS V2 - Fluxo de Aprovação Humana
 * 
 * REGRA: NUNCA envia proposta, cria conta, abre PR, reivindica recompensa,
 * aceita contrato, compromete dinheiro ou executa ações externas sem aprovação explícita.
 */
import { info, aviso } from '../logs/logger.js';

const filaAprovacao = new Map();
let aprovacaoIdCounter = 0;

export function criarSolicitacaoAprovacao(tipo, dados) {
  const id = `aprov-${++aprovacaoIdCounter}`;
  const solicitacao = {
    id,
    tipo,
    dados,
    status: 'PENDENTE',
    criadoEm: new Date().toISOString(),
    aprovadoEm: null,
    aprovadoPor: null,
    motivos: [],
  };
  filaAprovacao.set(id, solicitacao);
  info('APROVACAO_SOLICITADA', `Solicitação ${id} criada para aprovação`, { id, tipo });
  return solicitacao;
}

export function aprovarSolicitacao(id, aprovador, motivos = []) {
  const solicitacao = filaAprovacao.get(id);
  if (!solicitacao) return { sucesso: false, erro: 'Solicitação não encontrada' };
  if (solicitacao.status !== 'PENDENTE') {
    return { sucesso: false, erro: `Solicitação já está ${solicitacao.status}` };
  }
  solicitacao.status = 'APROVADA';
  solicitacao.aprovadoEm = new Date().toISOString();
  solicitacao.aprovadoPor = aprovador;
  solicitacao.motivos = motivos;
  info('APROVACO_APROVADA', `Solicitação ${id} aprovada por ${aprovador}`, { id, aprovador });
  return { sucesso: true, solicitacao };
}

export function rejeitarSolicitacao(id, rejeitador, motivos = []) {
  const solicitacao = filaAprovacao.get(id);
  if (!solicitacao) return { sucesso: false, erro: 'Solicitação não encontrada' };
  if (solicitacao.status !== 'PENDENTE') {
    return { sucesso: false, erro: `Solicitação já está ${solicitacao.status}` };
  }
  solicitacao.status = 'REJEITADA';
  solicitacao.aprovadoEm = new Date().toISOString();
  solicitacao.aprovadoPor = rejeitador;
  solicitacao.motivos = motivos;
  info('APROVACAO_REJEITADA', `Solicitação ${id} rejeitada por ${rejeitador}`, { id, rejeitador });
  return { sucesso: true, solicitacao };
}

export function obterSolicitacao(id) {
  return filaAprovacao.get(id) || null;
}

export function listarSolicitacoesPendentes() {
  return Array.from(filaAprovacao.values()).filter(s => s.status === 'PENDENTE');
}

export function avaliarRiscoAcao(acao) {
  const motivos = [];
  const acoesIrreversiveis = ['enviar_proposta', 'criar_conta', 'abrir_pr', 'reivindicar_recompensa', 'aceitar_contrato', 'comprometer_dinheiro'];
  
  if (acoesIrreversiveis.includes(acao.tipo)) {
    motivos.push('ACAO_IRREVERSIVEL');
  }
  if (acao.valor && acao.valor > 100) {
    motivos.push('VALOR_ALTO');
  }
  if (acao.risco && acao.risco > 0.7) {
    motivos.push('RISCO_ALTO');
  }

  return {
    requerAprovacao: motivos.length > 0,
    motivos,
    acao: acao.tipo,
  };
}

export function snapshotAprovacoes() {
  return { solicitacoes: Array.from(filaAprovacao.values()), contador: aprovacaoIdCounter };
}

export function restaurarAprovacoes(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.solicitacoes)) {
    return { sucesso: false, erro: 'Snapshot de aprovacoes invalido' };
  }
  const ids = new Set();
  for (const item of snapshot.solicitacoes) {
    if (!item?.id || ids.has(item.id)) return { sucesso: false, erro: 'Snapshot de aprovacoes contem ID ausente ou duplicado' };
    ids.add(item.id);
  }
  filaAprovacao.clear();
  snapshot.solicitacoes.forEach(item => filaAprovacao.set(item.id, item));
  aprovacaoIdCounter = Number(snapshot.contador) || 0;
  return { sucesso: true, total: filaAprovacao.size };
}

export default {
  criarSolicitacaoAprovacao,
  aprovarSolicitacao,
  rejeitarSolicitacao,
  obterSolicitacao,
  listarSolicitacoesPendentes,
  avaliarRiscoAcao,
  snapshotAprovacoes,
  restaurarAprovacoes,
};
