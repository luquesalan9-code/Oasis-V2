/**
 * OASIS V2 - Radar Global de Oportunidades
 * Portado de radarGlobal.js V1 com normalização e deduplicação
 */
import { info, aviso } from '../logs/logger.js';

const fontes = new Map();
const oportunidades = new Map();
let lotesProcessados = 0;

export function registrarFonte(fonte) {
  const { id, ...dados } = fonte;
  if (!id) throw new Error('Fonte precisa de id');
  fontes.set(id, { id, ...dados, criadoEm: new Date().toISOString() });
  return fontes.get(id);
}

export function obterFonte(id) {
  return fontes.get(id) || null;
}

export function listarFontes() {
  return Array.from(fontes.values());
}

export function registrarFontesConhecidas(fontesArray) {
  fontesArray.forEach(f => registrarFonte(f));
  return { sucesso: true, total: fontesArray.length };
}

export function normalizarOportunidade(oportunidade) {
  const primeiroValor = (...campos) => {
    for (const c of campos) {
      if (oportunidade[c] !== undefined && oportunidade[c] !== null) return oportunidade[c];
    }
    return undefined;
  };

  const valor = primeiroValor('valor', 'valorBruto', 'preco', 'reward', 'bounty', 'payment');
  const externalId = primeiroValor('externalId', 'id', 'issueId', 'projectId', 'url');
  const fonte = primeiroValor('fonte', 'origem', 'plataforma', 'source');
  const modo = primeiroValor('modo') || 'DESCOBERTA';
  const descobertaSomente = primeiroValor('descobertaSomente');

  return {
    id: `oport-${externalId || Math.random().toString(36).slice(2)}`,
    externalId: String(externalId || ''),
    fonte: fonte || 'desconhecido',
    origem: primeiroValor('origem', fonte) || 'desconhecido',
    plataforma: primeiroValor('plataforma', 'platform') || 'desconhecido',
    titulo: String(primeiroValor('titulo', 'title', 'name') || '').trim().slice(0, 300),
    url: typeof primeiroValor('url', 'html_url', 'apply_url') === 'string'
      ? primeiroValor('url', 'html_url', 'apply_url')
      : null,
    tipoOportunidade: primeiroValor('tipoOportunidade') || 'TAREFA',
    empresa: primeiroValor('empresa', 'company') || '',
    localizacao: primeiroValor('localizacao', 'location') || '',
    categoria: primeiroValor('categoria', 'category') || '',
    modalidade: primeiroValor('modalidade', 'employmentType') || '',
    remuneracaoAnunciada: primeiroValor('remuneracaoAnunciada', 'salary') || '',
    publicadoEm: primeiroValor('publicadoEm', 'publishedAt') || null,
    tags: Array.isArray(primeiroValor('tags')) ? primeiroValor('tags').slice(0, 20) : [],
    valor: Number(valor) || 0,
    moeda: primeiroValor('moeda', 'currency') || 'USD',
    custo: Number(primeiroValor('custo', 'custoEstimado')) || 0,
    lucro: Number(primeiroValor('lucro', 'profit')) || 0,
    roi: Number(primeiroValor('roi')) || null,
    retornoHora: Number(primeiroValor('retornoHora', 'hourlyRate')) || null,
    tempoMinutos: Number(primeiroValor('tempoMinutos', 'tempoEstimadoMinutos')) || null,
    probabilidade: Number(primeiroValor('probabilidade', 'probabilidadeSucesso')) || 0.5,
    complexidade: Number(primeiroValor('complexidade')) || 0.5,
    interacaoHumana: primeiroValor('interacaoHumana') || false,
    repetibilidade: Number(primeiroValor('repetibilidade')) || 0.5,
    velocidade: Number(primeiroValor('velocidade')) || 0.5,
    facilidade: Number(primeiroValor('facilidade')) || 0.5,
    automacaoPermitida: primeiroValor('automacaoPermitida') === true,
    autorizacaoFonte: primeiroValor('autorizacaoFonte', 'fonteAutorizada') || false,
    fonteAutorizada: primeiroValor('fonteAutorizada', 'autorizacaoFonte') || false,
    execucaoPermitida: primeiroValor('execucaoPermitida', 'podeExecutar') === true,
    execucaoAutonoma: primeiroValor('execucaoAutonoma') === true,
    podeExecutar: primeiroValor('podeExecutar', 'execucaoPermitida') || false,
    descobertaSomente: descobertaSomente === undefined ? modo === 'DESCOBERTA' : descobertaSomente === true,
    requerCandidaturaHumana: primeiroValor('requerCandidaturaHumana') === true,
    modo,
    status: primeiroValor('status') || 'open',
    criadoEm: primeiroValor('criadoEm') || new Date().toISOString(),
    atualizadoEm: primeiroValor('atualizadoEm') || null,
    dadosOriginais: { ...oportunidade },
  };
}

export function normalizarLote(lote) {
  if (!Array.isArray(lote)) return [];
  return lote.map(normalizarOportunidade);
}

export function adicionarOportunidade(oportunidade) {
  const normalizada = normalizarOportunidade(oportunidade);
  const chave = normalizada.externalId || normalizada.id;
  if (oportunidades.has(chave)) {
    return { sucesso: false, duplicada: true, existente: oportunidades.get(chave) };
  }
  oportunidades.set(chave, normalizada);
  return { sucesso: true, oportunidade: normalizada };
}

export function avaliarElegibilidadeOperacional(oportunidade) {
  const motivos = [];
  if (!oportunidade.fonteAutorizada) motivos.push('FONTE_NAO_AUTORIZADA');
  if (!oportunidade.automacaoPermitida) motivos.push('AUTOMACAO_NAO_PERMITIDA');
  if (!oportunidade.execucaoPermitida) motivos.push('EXECUCAO_NAO_PERMITIDA');
  if (!oportunidade.execucaoAutonoma) motivos.push('EXECUCAO_NAO_AUTONOMA');

  return {
    elegivel: motivos.length === 0,
    motivos,
    podeExecutar: motivos.length === 0,
  };
}

export function buscarEEnfileirar({ limite = 100 } = {}) {
  const array = Array.from(oportunidades.values());
  const normalizadas = normalizarLote(array);
  return {
    sucesso: true,
    total: normalizadas.length,
    oportunidades: normalizadas.slice(0, limite),
    lotesProcessados: ++lotesProcessados,
  };
}

export function listarOportunidadesRadar({ limite = 50 } = {}) {
  const tamanho = Math.max(1, Math.min(100, Number(limite) || 50));
  return Array.from(oportunidades.values())
    .sort((a, b) => Date.parse(b.publicadoEm || b.criadoEm || 0) - Date.parse(a.publicadoEm || a.criadoEm || 0))
    .slice(0, tamanho);
}

export function obterResumoRadar() {
  return {
    fontes: fontes.size,
    oportunidades: oportunidades.size,
    lotesProcessados,
  };
}

export function limparRadar() {
  fontes.clear();
  oportunidades.clear();
  lotesProcessados = 0;
  return { sucesso: true };
}

export function snapshotRadar() {
  return { fontes: Array.from(fontes.entries()), oportunidades: Array.from(oportunidades.entries()), lotesProcessados };
}

export function restaurarRadar(snapshot) {
  if (!Array.isArray(snapshot?.fontes) || !Array.isArray(snapshot?.oportunidades)) {
    return { sucesso: false, erro: 'Snapshot do radar invalido' };
  }
  fontes.clear();
  oportunidades.clear();
  for (const [id, fonte] of snapshot.fontes) fontes.set(id, fonte);
  for (const [id, oportunidade] of snapshot.oportunidades) oportunidades.set(id, oportunidade);
  lotesProcessados = snapshot.lotesProcessados || 0;
  return { sucesso: true };
}

export default {
  registrarFonte, obterFonte, listarFontes, registrarFontesConhecidas,
  normalizarOportunidade, normalizarLote, adicionarOportunidade, listarOportunidadesRadar,
  avaliarElegibilidadeOperacional, buscarEEnfileirar, obterResumoRadar, limparRadar,
  snapshotRadar, restaurarRadar,
};
