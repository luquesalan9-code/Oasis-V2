/**
 * Registro de adaptadores de execução oficiais instalados pelo operador.
 * Nenhum provedor externo é presumido ou ativado por padrão.
 */
const integracoes = new Map();

function urlHttpsSemCredenciais(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function registrarIntegracaoExecucaoOficial(adaptador) {
  if (!adaptador || typeof adaptador !== 'object') {
    return { sucesso: false, erro: 'ADAPTADOR_INVALIDO' };
  }
  const {
    id, plataforma, endpoint, documentacao, oficial, escopos, enviarResultado,
    verificarResultado, autorizadoEm, termosAvaliadosEm, suportaIdempotencia,
  } = adaptador;
  if (typeof id !== 'string' || !id.trim()
    || typeof plataforma !== 'string' || !plataforma.trim()
    || !urlHttpsSemCredenciais(endpoint)
    || !urlHttpsSemCredenciais(documentacao)
    || oficial !== true
    || !Array.isArray(escopos) || !escopos.includes('submit_work')
    || typeof enviarResultado !== 'function'
    || typeof verificarResultado !== 'function'
    || typeof autorizadoEm !== 'string' || !Number.isFinite(Date.parse(autorizadoEm))
    || typeof termosAvaliadosEm !== 'string' || !Number.isFinite(Date.parse(termosAvaliadosEm))
    || suportaIdempotencia !== true) {
    return { sucesso: false, erro: 'ADAPTADOR_OFICIAL_INCOMPLETO' };
  }
  const registro = { ...adaptador, id: id.trim(), plataforma: plataforma.trim() };
  integracoes.set(registro.id, registro);
  return { sucesso: true, integracao: obterIntegracaoExecucaoOficial(registro.id) };
}

export function obterIntegracaoExecucaoPorPlataforma(plataforma) {
  return Array.from(integracoes.values()).find(item => item.plataforma.toLowerCase() === String(plataforma || '').toLowerCase()) || null;
}

export function obterIntegracaoExecucaoOficial(id) {
  const item = integracoes.get(id);
  if (!item) return null;
  return {
    id: item.id,
    plataforma: item.plataforma,
    endpoint: item.endpoint,
    documentacao: item.documentacao,
    escopos: [...item.escopos],
    autorizadoEm: item.autorizadoEm,
    termosAvaliadosEm: item.termosAvaliadosEm,
    suportaIdempotencia: item.suportaIdempotencia,
    ativa: true,
  };
}

export function listarIntegracoesExecucaoOficial() {
  return Array.from(integracoes.keys()).map(obterIntegracaoExecucaoOficial);
}

export function limparIntegracoesExecucaoOficial() {
  integracoes.clear();
}

export function exportarAdaptadorExecucaoOficial(plataforma) {
  return obterIntegracaoExecucaoPorPlataforma(plataforma);
}
