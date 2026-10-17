/**
 * OASIS V2 - Conector de Oportunidades com Classificacao de Confianca
 * 
 * Estados: ANUNCIADO, NAO_VERIFICADO, FINANCIADO, CANDIDATURA_PENDENTE,
 *          TRABALHO_ACEITO, ENTREGA_REALIZADA, PAGAMENTO_PENDENTE, PAGAMENTO_CONFIRMADO
 */
import { info, aviso } from '../logs/logger.js';

export const ESTADOS_RECEITA = {
  ANUNCIADO: 'ANUNCIADO',
  NAO_VERIFICADO: 'NAO_VERIFICADO',
  FINANCIADO: 'FINANCIADO',
  CANDIDATURA_PENDENTE: 'CANDIDATURA_PENDENTE',
  TRABALHO_ACEITO: 'TRABALHO_ACEITO',
  ENTREGA_REALIZADA: 'ENTREGA_REALIZADA',
  PAGAMENTO_PENDENTE: 'PAGAMENTO_PENDENTE',
  PAGAMENTO_CONFIRMADO: 'PAGAMENTO_CONFIRMADO',
};

export function avaliarConfianca(oportunidade) {
  const motivos = [];
  let confianca = 0.5;

  // Verificar se ha evidencias verificaveis
  if (oportunidade.url) {
    confianca += 0.1;
  } else {
    motivos.push('SEM_URL');
  }

  // Verificar valor
  if (oportunidade.valor && oportunidade.valor > 0) {
    confianca += 0.1;
  } else {
    motivos.push('SEM_VALOR');
  }

  // Verificar autor da issue
  if (oportunidade.autor) {
    confianca += 0.1;
  }

  // Verificar data de criacao
  if (oportunidade.criadoEm) {
    confianca += 0.1;
  }

  // Verificar contradicoes
  if (oportunidade.valor > 100000) {
    motivos.push('VALOR_SUSPEITO');
    confianca -= 0.3;
  }

  // Verificar prazo
  if (oportunidade.prazo) {
    const prazo = new Date(oportunidade.prazo);
    if (prazo < new Date()) {
      motivos.push('PRAZO_VENCIDO');
      confianca -= 0.2;
    }
  }

  // Verificar se ha sinais de fraude
  const texto = (oportunidade.title || '') + ' ' + (oportunidade.descricao || '');
  if (/fake|scam|fraud|guarantee|100%|easy money/i.test(texto)) {
    motivos.push('SINAL_FRAUDE');
    confianca -= 0.5;
  }

  // Verificar se o valor foi extraido ou inserido manualmente
  if (oportunidade.valorConfirmado) {
    confianca += 0.2;
  } else {
    motivos.push('VALOR_NAO_CONFIRMADO');
  }

  confianca = Math.max(0, Math.min(1, confianca));

  return {
    confianca,
    motivos,
    estado: confianca > 0.7 ? ESTADOS_RECEITA.FINANCIADO :
            confianca > 0.4 ? ESTADOS_RECEITA.NAO_VERIFICADO :
            ESTADOS_RECEITA.ANUNCIADO,
  };
}

export function detectarFraude(oportunidade) {
  const sinais = [];
  const texto = (oportunidade.title || '') + ' ' + (oportunidade.descricao || '');

  if (/guaranteed|100% sure|easy money|no effort|passive income/i.test(texto)) {
    sinais.push('PROMISSA_GARANTIDA');
  }
  if (/pay first|fee required|deposit|investment/i.test(texto)) {
    sinais.push('CAUCAO_SOLICITADA');
  }
  if (oportunidade.valor && oportunidade.valor > 10000) {
    sinais.push('VALOR_ALTO_NAO_VERIFICADO');
  }
  if (!oportunidade.url) {
    sinais.push('SEM_EVIDENCIA');
  }

  return {
    suspeito: sinais.length > 0,
    sinais,
  };
}

export default { avaliarConfianca, detectarFraude, ESTADOS_RECEITA };