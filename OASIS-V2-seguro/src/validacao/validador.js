/**
 * OASIS V2 - Validador de Oportunidades
 * Verifica remuneração, elegibilidade, legitimidade e pagamentos
 */
import { info, aviso } from '../logs/logger.js';

export function validarRemuneracao(oportunidade) {
  const valor = Number(oportunidade?.valor || 0);
  const moeda = oportunidade?.moeda || 'USD';
  const motivos = [];

  if (valor <= 0) motivos.push('SEM_VALOR_INFORMADO');
  if (valor > 0 && valor < 0.01) motivos.push('VALOR_MUITO_BAIXO');
  if (!moeda) motivos.push('SEM_MOEDA');

  return {
    valido: motivos.length === 0,
    valor,
    moeda,
    motivos,
  };
}

export function validarElegibilidade(oportunidade) {
  const motivos = [];
  const flags = [
    ['fonteAutorizada', 'FONTE_NAO_AUTORIZADA'],
    ['automacaoPermitida', 'AUTOMACAO_NAO_PERMITIDA'],
    ['execucaoPermitida', 'EXECUCAO_NAO_PERMITIDA'],
    ['execucaoAutonoma', 'EXECUCAO_NAO_AUTONOMA'],
  ];

  for (const [chave, motivo] of flags) {
    if (oportunidade?.[chave] !== true) motivos.push(motivo);
  }

  return {
    elegivel: motivos.length === 0,
    motivos,
  };
}

export function validarLegitimidadePagamento(oportunidade) {
  const motivos = [];
  const campos = ['pagamentoConfirmado', 'historicoPagamentos', 'avaliacaoFonte', 'reputacao'];

  const temIndicios = campos.some(c => oportunidade?.[c]);
  if (!temIndicios) motivos.push('SEM_INDICIOS_PAGAMENTO');

  return {
    legitimo: motivos.length === 0,
    motivos,
  };
}

export function validarOportunidade(oportunidade) {
  const remuneracao = validarRemuneracao(oportunidade);
  const elegibilidade = validarElegibilidade(oportunidade);
  const legitimidade = validarLegitimidadePagamento(oportunidade);

  const todosValidos = remuneracao.valido && elegibilidade.elegivel && legitimidade.legitimo;

  return {
    valido: todosValidos,
    remuneracao,
    elegibilidade,
    legitimidade,
    motivos: [...remuneracao.motivos, ...elegibilidade.motivos, ...legitimidade.motivos],
  };
}

export default { validarRemuneracao, validarElegibilidade, validarLegitimidadePagamento, validarOportunidade };