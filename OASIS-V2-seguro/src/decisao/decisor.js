/**
 * OASIS V2 - Decisão de Oportunidades
 * Portado de decisor.js V1
 */
import { analisarEClassificar } from '../analise/analisador.js';

export function avaliarCapacidadeExecucao(processo = {}) {
  const oportunidade = processo.dadosOportunidade || {};

  const fonteAutorizada =
    processo.fonteAutorizada === true ||
    oportunidade.fonteAutorizada === true ||
    oportunidade.autorizada === true ||
    oportunidade.autorizacaoFonte === true;

  const automacaoPermitida =
    processo.automacaoPermitida === true ||
    oportunidade.automacaoPermitida === true;

  const execucaoPermitida =
    processo.execucaoPermitida === true ||
    oportunidade.execucaoPermitida === true ||
    oportunidade.podeExecutar === true;

  const execucaoAutonoma =
    processo.execucaoAutonoma === true ||
    oportunidade.execucaoAutonoma === true;

  const executorDisponivel =
    Boolean(processo.executor) ||
    Boolean(processo.executorId) ||
    Boolean(oportunidade.executor) ||
    Boolean(oportunidade.executorId);

  const executavel =
    fonteAutorizada &&
    automacaoPermitida &&
    execucaoPermitida &&
    execucaoAutonoma &&
    executorDisponivel;

  return {
    executavel,
    fonteAutorizada,
    automacaoPermitida,
    execucaoPermitida,
    execucaoAutonoma,
    executorDisponivel,
  };
}

export function decidirOportunidade(processo) {
  const analise = analisarEClassificar(processo);
  if (!analise.sucesso) {
    return { sucesso: false, decisao: 'REJEITAR', motivo: analise.erro };
  }

  const capacidade = avaliarCapacidadeExecucao(processo);

  let decisao = 'REJEITAR';
  let prioridade = 'BAIXA';

  const score = Number(analise.score) || 0;
  const faixaValor = analise.faixaValor || 'DESCONHECIDA';

  if (faixaValor === 'MICRO') {
    prioridade = 'CRITICA';
  } else if (faixaValor === 'SMALL') {
    prioridade = 'ALTA';
  } else if (faixaValor === 'MEDIUM' || faixaValor === 'HIGH') {
    prioridade = 'MEDIA';
  } else if (score >= 300) {
    prioridade = 'CRITICA';
  } else if (score >= 200) {
    prioridade = 'ALTA';
  } else if (score >= 100) {
    prioridade = 'MEDIA';
  } else if (score >= 50) {
    prioridade = 'BAIXA';
  }

  if (capacidade.executavel) {
    if (score >= 50 || faixaValor === 'MICRO') {
      decisao = 'EXECUTAR';
    } else {
      decisao = 'AVALIAR';
    }
  } else {
    if (score >= 100) {
      decisao = 'AGUARDAR_EXECUCAO';
    } else if (score >= 50 || faixaValor === 'MICRO') {
      decisao = 'AVALIAR';
    } else {
      decisao = 'REJEITAR';
    }
  }

  return {
    sucesso: true,
    processoId: processo.id,
    decisao,
    prioridade,
    score,
    classificacao: analise.classificacao,
    faixaValor,
    retornoLiquidoEsperadoPorHora: analise.retornoLiquidoEsperadoPorHora,
    executavel: capacidade.executavel,
    capacidadeExecucao: capacidade,
    analise,
  };
}

export function decidirLista(processos = []) {
  if (!Array.isArray(processos)) {
    return { sucesso: false, erro: 'A lista de processos precisa ser um array.', total: 0, executaveis: 0, aguardandoExecucao: 0, decisoes: [] };
  }

  const decisoes = processos.map(decidirOportunidade);
  const executaveis = decisoes.filter(r => r.sucesso === true && r.decisao === 'EXECUTAR');
  const aguardandoExecucao = decisoes.filter(r => r.sucesso === true && r.decisao === 'AGUARDAR_EXECUCAO');

  return {
    sucesso: true,
    total: decisoes.length,
    executaveis: executaveis.length,
    aguardandoExecucao: aguardandoExecucao.length,
    decisoes,
  };
}

export function obterMelhoresOportunidades(processos = [], limite = 10) {
  if (!Array.isArray(processos)) return [];

  const quantidade = Number.isFinite(Number(limite)) && Number(limite) > 0
    ? Math.floor(Number(limite))
    : 10;

  const analisadas = processos
    .map(decidirOportunidade)
    .filter(resultado => resultado.sucesso)
    .sort((a, b) => {
      if (a.decisao === 'EXECUTAR' && b.decisao !== 'EXECUTAR') return -1;
      if (b.decisao === 'EXECUTAR' && a.decisao !== 'EXECUTAR') return 1;

      const retornoA = Number(a.retornoLiquidoEsperadoPorHora) || 0;
      const retornoB = Number(b.retornoLiquidoEsperadoPorHora) || 0;
      if (retornoB !== retornoA) return retornoB - retornoA;

      const faixaA = a.faixaValor || '';
      const faixaB = b.faixaValor || '';
      if (faixaA === 'MICRO' && faixaB !== 'MICRO') return -1;
      if (faixaB === 'MICRO' && faixaA !== 'MICRO') return 1;

      return b.score - a.score;
    });

  return analisadas.slice(0, quantidade);
}

export default { decidirOportunidade, decidirLista, obterMelhoresOportunidades, avaliarCapacidadeExecucao };