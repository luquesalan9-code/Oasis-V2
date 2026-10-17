/**
 * OASIS V2 - Análise de Oportunidades
 * Portado e unificado de analisador.js V1
 */
import { calcularFinanceiro, calcularROI, calcularMargem } from '../financeiro/motorFinanceiro.js';

function numero(valor, padrao = 0) {
  if (valor === null || valor === undefined || valor === '') return padrao;
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function normalizarFator(valor, padrao = 0.5) {
  if (valor === null || valor === undefined || valor === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  const fracao = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, fracao));
}

export function analisarProcesso(processo) {
  if (!processo || typeof processo !== 'object') {
    return { sucesso: false, erro: 'Processo não encontrado' };
  }

  const financeiro = calcularFinanceiro(
    numero(processo.valorBrutoEstimado),
    numero(processo.custoEstimado)
  );

  const tempoEstimadoMinutos = Math.max(0, numero(processo.tempoEstimadoMinutos));
  const lucroPorMinuto = tempoEstimadoMinutos > 0 ? financeiro.lucro / tempoEstimadoMinutos : 0;

  return {
    sucesso: true,
    processoId: processo.id,
    valorBruto: financeiro.valorBruto,
    custo: financeiro.custo,
    lucro: financeiro.lucro,
    roi: financeiro.roi,
    margem: financeiro.margem,
    tempoEstimadoMinutos,
    lucroPorMinuto,
    probabilidadeSucesso: normalizarFator(processo.probabilidadeSucesso),
    repetibilidade: normalizarFator(processo.repetibilidade),
    volume: normalizarFator(processo.volume),
    concorrencia: normalizarFator(processo.concorrencia),
    risco: normalizarFator(processo.risco),
    capacidadeWorkers: normalizarFator(processo.capacidadeWorkers),
  };
}

function classificarFaixaValor(valorBruto) {
  const v = numero(valorBruto);
  if (v >= 0.01 && v <= 0.20) return 'MICRO';
  if (v > 0.20 && v <= 1) return 'SMALL';
  if (v > 1 && v <= 10) return 'MEDIUM';
  if (v > 10) return 'HIGH';
  return 'DESCONHECIDO';
}

function calcularFatorPrioridade(faixa) {
  switch (faixa) {
    case 'MICRO': return 1.5;
    case 'SMALL': return 1.2;
    case 'MEDIUM': return 1.0;
    case 'HIGH': return 0.9;
    default: return 1.0;
  }
}

function calcularRetornoLiquidoEsperadoPorTempo(analise) {
  const valorLiquido = numero(analise.lucro);
  const tempo = numero(analise.tempoEstimadoMinutos);
  if (tempo <= 0) return 0;

  const probabilidade = normalizarFator(analise.probabilidadeSucesso);
  const repetibilidade = normalizarFator(analise.repetibilidade);
  const volume = normalizarFator(analise.volume);
  const concorrencia = normalizarFator(analise.concorrencia);
  const risco = normalizarFator(analise.risco);
  const capacidadeWorkers = normalizarFator(analise.capacidadeWorkers);

  const fatorRisco = 1 - risco * 0.3;
  const fatorConcorrencia = 1 - concorrencia * 0.2;
  const fatorVolume = 1 + volume * 0.3;
  const fatorRepetibilidade = 1 + repetibilidade * 0.2;
  const fatorCapacidade = 0.5 + capacidadeWorkers * 0.5;

  const retornoEsperado = valorLiquido * probabilidade;
  const retornoAjustado = retornoEsperado * fatorRisco * fatorConcorrencia * fatorVolume * fatorRepetibilidade * fatorCapacidade;
  return retornoAjustado / (tempo / 60);
}

export function calcularScore(analise) {
  if (!analise || typeof analise !== 'object') return 0;

  const roi = numero(analise.roi);
  const lucroPorMinuto = numero(analise.lucroPorMinuto);
  const probabilidade = normalizarFator(analise.probabilidadeSucesso);
  const retornoLiquidoEsperadoPorHora = calcularRetornoLiquidoEsperadoPorTempo(analise);

  const faixaValor = classificarFaixaValor(analise.valorBruto);
  const fatorPrioridade = calcularFatorPrioridade(faixaValor);

  const roiScore = Math.max(-100, Math.min(500, roi));
  const lucroTempoScore = Math.max(-100, Math.min(1000, lucroPorMinuto * 60));
  const probabilidadeScore = probabilidade * 100;
  const retornoEsperadoScore = Math.max(-100, Math.min(1000, retornoLiquidoEsperadoPorHora));

  const scoreBase = roiScore * 0.25 + lucroTempoScore * 0.20 + probabilidadeScore * 0.20 + retornoEsperadoScore * 0.35;
  return scoreBase * fatorPrioridade;
}

export function classificarOportunidade(score) {
  const valor = numero(score);
  if (valor >= 300) return 'EXCELENTE';
  if (valor >= 200) return 'MUITO_BOA';
  if (valor >= 100) return 'BOA';
  if (valor >= 50) return 'REGULAR';
  return 'BAIXA';
}

export function analisarEClassificar(processo) {
  const analise = analisarProcesso(processo);
  if (!analise.sucesso) return analise;

  const score = calcularScore(analise);
  const classificacao = classificarOportunidade(score);
  const faixaValor = classificarFaixaValor(analise.valorBruto);
  const fatorPrioridade = calcularFatorPrioridade(faixaValor);
  const retornoLiquidoEsperadoPorHora = calcularRetornoLiquidoEsperadoPorTempo(analise);

  return {
    ...analise,
    score,
    classificacao,
    faixaValor,
    fatorPrioridade,
    retornoLiquidoEsperadoPorHora,
  };
}

export default { analisarProcesso, calcularScore, classificarOportunidade, analisarEClassificar };