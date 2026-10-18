/** Utilidades de lectura para APIs públicas de trabajo remoto. */
export const INTERVALO_CONSULTA_MS = 5 * 60 * 1000;
const MAX_RESPONSE_CHARS = 10_000_000;

export function urlHttpsValida(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function limiteSeguro(value, fallback = 25) {
  const limite = Number(value);
  if (!Number.isInteger(limite)) return fallback;
  return Math.max(1, Math.min(100, limite));
}

export async function consultarJson(url) {
  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'OASIS-V2-Global-Radar/2.0',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  });
  if (!resposta.ok) {
    throw Object.assign(new Error('HTTP ' + resposta.status), { status: resposta.status });
  }
  const texto = await resposta.text();
  if (texto.length > MAX_RESPONSE_CHARS) throw new Error('RESPOSTA_DA_FONTE_EXCEDE_LIMITE');
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('RESPOSTA_JSON_INVALIDA');
  }
}

export function criarOportunidadeRemota({
  provider,
  platform,
  id,
  title,
  url,
  company = '',
  location = '',
  category = '',
  employmentType = '',
  salaryText = '',
  publishedAt = null,
  tags = [],
}) {
  const link = urlHttpsValida(url);
  const safeId = String(id || '').trim();
  const safeTitle = String(title || '').trim().slice(0, 300);
  if (!safeId || !safeTitle || !link) return null;

  return {
    externalId: provider + ':' + safeId,
    fonte: provider,
    origem: provider,
    plataforma: platform,
    tipoOportunidade: 'VAGA_REMOTA',
    valor: 0,
    moeda: 'USD',
    custo: 0,
    lucro: 0,
    title: safeTitle,
    url: link,
    empresa: String(company || '').trim().slice(0, 160),
    localizacao: String(location || '').trim().slice(0, 160),
    categoria: String(category || '').trim().slice(0, 100),
    modalidade: String(employmentType || '').trim().slice(0, 80),
    remuneracaoAnunciada: String(salaryText || '').trim().slice(0, 160),
    publicadoEm: publishedAt || null,
    tags: Array.isArray(tags) ? tags.slice(0, 20).map(tag => String(tag).slice(0, 50)) : [],
    fonteAutorizada: true,
    automacaoPermitida: false,
    execucaoPermitida: false,
    execucaoAutonoma: false,
    descobertaSomente: true,
    requerCandidaturaHumana: true,
  };
}

export function respostaDaFonte(conector, oportunidades, limite) {
  conector.status = 'ATIVO';
  const validas = oportunidades.filter(Boolean).slice(0, limite);
  return {
    sucesso: true,
    fonte: conector.id,
    total: validas.length,
    oportunidades: validas,
    bloqueadaPorRateLimit: false,
  };
}

export function erroDaFonte(conector, error) {
  conector.status = 'ERRO';
  const mensagem = error?.message || String(error);
  return {
    sucesso: false,
    fonte: conector.id,
    status: error?.status || null,
    erro: mensagem,
    mensagem,
  };
}
