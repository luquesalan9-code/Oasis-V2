/**
 * OASIS V2 - Supervisão determinística em três verificações independentes.
 * O resultado pode liberar um item apenas para a fila local de revisão.
 * Esta supervisão nunca autoriza execução externa, candidatura ou gasto.
 */

const VERIFIED_PAYMENT_EVIDENCE = evidence => (
  evidence?.fonteOficial === true
  && evidence?.verificada === true
  && typeof evidence?.verificadaPor === 'string'
  && evidence.verificadaPor.trim().length > 0
  && typeof evidence?.url === 'string'
  && /^https:\/\//i.test(evidence.url)
);

export function criarSupervisaoAgentes() {
  return {
    ativo: true,
    tipo: 'deterministica',
    verificadores: ['permissoes', 'evidencias', 'remuneracao'],
    execucaoExternaAutorizada: false,
  };
}

export function supervisionarOportunidade(oportunidade = {}, validacao = {}) {
  const permissionsOk = validacao.elegibilidade?.elegivel === true
    && oportunidade.fonteAutorizada === true
    && oportunidade.automacaoPermitida === true
    && oportunidade.execucaoPermitida === true
    && oportunidade.execucaoAutonoma === true;
  const paymentEvidence = Array.isArray(oportunidade.evidenciasPagamento)
    && oportunidade.evidenciasPagamento.some(VERIFIED_PAYMENT_EVIDENCE);
  const evidenceOk = validacao.legitimidade?.legitimo === true && paymentEvidence;
  const reward = Number(oportunidade.valor ?? oportunidade.reward ?? oportunidade.bounty);
  const remunerationOk = validacao.remuneracao?.valido === true
    && Number.isFinite(reward)
    && reward > 0
    && typeof (oportunidade.moeda || oportunidade.currency) === 'string';

  const verificacoes = [
    { agente: 'permissoes', aprovado: permissionsOk, motivo: permissionsOk ? null : 'PERMISSOES_NAO_COMPROVADAS' },
    { agente: 'evidencias', aprovado: evidenceOk, motivo: evidenceOk ? null : 'EVIDENCIA_OFICIAL_NAO_VERIFICADA' },
    { agente: 'remuneracao', aprovado: remunerationOk, motivo: remunerationOk ? null : 'REMUNERACAO_NAO_COMPROVADA' },
  ];
  const aprovadaParaFila = verificacoes.every(item => item.aprovado);

  return {
    responsavel: 'supervisao-deterministica-oasis',
    decisao: aprovadaParaFila ? 'FILA_LOCAL' : 'QUARENTENA',
    aprovadaParaFila,
    somenteFilaLocal: true,
    execucaoExternaAutorizada: false,
    verificacoes,
    motivos: verificacoes.filter(item => !item.aprovado).map(item => item.motivo),
    supervisionadoEm: new Date().toISOString(),
  };
}

export default { criarSupervisaoAgentes, supervisionarOportunidade };
