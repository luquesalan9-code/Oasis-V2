export function adicionarOportunidadeAoSistema(oportunidade) {
  try {
    adicionarOportunidade(oportunidade);
  } catch (e) {
  }
  const processo = criarProcessoDeOportunidade(oportunidade);
  info('OPORTUNIDADE_ADICIONADA', "Oportunidade ${processo.id} adicionada", { id: processo.id, fonte: processo.fonte });
  return processo;
}

export function processarOportunidades(lote) {
  const criados = [];
  for (const o of lote) {
    const processo = adicionarOportunidadeAoSistema(o);
    criados.push(processo);
  }
  return { sucesso: true, total: criados.length, processos: criados };
}

export function obterResumoOrquestrador() {
  return {
    ciclosExecutados: estado.contadores.ciclosExecutados,
    processosAtivos: estado.processos.size,
    workersAtivos: estado.workers.size,
    radar: obterResumoRadar(),
  };
}

export default { executarCicloOrquestrador, processarOportunidades, obterResumoOrquestrador, adicionarOportunidadeAoSistema };

