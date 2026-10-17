/**
 * OASIS V2 - Fluxo de Seleção e Candidatura
 * 
 * REGRA: Nunca envia proposta, cria conta, abre PR, reivindica recompensa,
 * aceita contrato, compromete dinheiro ou executa ações externas sem aprovação explícita.
 */
import { info, aviso } from '../logs/logger.js';
import radar from '../radar/radarGlobal.js';
import { criarSolicitacaoAprovacao, avaliarRiscoAcao } from '../aprovacao/fluxoAprovacao.js';
import { decidirOportunidade } from '../decisao/decisor.js';

export function selecionarMelhoresOportunidades(limite = 5) {
  const todas = Array.from(radar.oportunidades.values());
  const analisadas = todas
    .map(o => {
      const decisao = decidirOportunidade({
        id: o.externalId,
        valorBrutoEstimado: o.valor || 0,
        custoEstimado: o.custo || 0,
        tempoEstimadoMinutos: o.tempoMinutos || 60,
        probabilidadeSucesso: o.probabilidade || 0.5,
        fonteAutorizada: o.fonteAutorizada || false,
        automacaoPermitida: o.automacaoPermitida || false,
        execucaoPermitida: o.execucaoPermitida || false,
        execucaoAutonoma: o.execucaoAutonoma || false,
        dadosOportunidade: o,
      });
      return { oportunidade: o, decisao };
    })
    .filter(item => item.decisao.sucesso)
    .sort((a, b) => b.decisao.score - a.decisao.score);

  return analisadas.slice(0, limite);
}

export function prepararCandidatura(oportunidade) {
  const solicitacao = criarSolicitacaoAprovacao('enviar_proposta', {
    oportunidade: {
      id: oportunidade.externalId,
      fonte: oportunidade.fonte,
      url: oportunidade.url,
      valor: oportunidade.valor,
      title: oportunidade.title,
    },
    acao: 'enviar_proposta',
    valor: oportunidade.valor,
    risco: 0.5,
  });

  const avaliacao = avaliarRiscoAcao({
    tipo: 'enviar_proposta',
    valor: oportunidade.valor,
    risco: 0.5,
  });

  info('CANDIDATURA_PREPARADA', 'Candidatura preparada para aprovacao', {
    solicitacaoId: solicitacao.id,
    oportunidade: oportunidade.externalId,
    valor: oportunidade.valor,
    requerAprovacao: avaliacao.requerAprovacao,
  });

  return {
    sucesso: true,
    solicitacao,
    avaliacao,
    oportunidade,
  };
}

export function aprovarECandidatar(solicitacaoId, aprovador) {
  info('CANDIDATURA_APROVADA', 'Candidatura aprovada, preparando envio', {
    solicitacaoId,
    aprovador,
  });
  return { sucesso: true, solicitacaoId, aprovador };
}

export default { selecionarMelhoresOportunidades, prepararCandidatura, aprovarECandidatar };