/**
 * OASIS V2 - Monitoramento e Relatórios
 */
import { estado } from '../core/estado.js';
import { mineradora } from '../core/mineradora.js';
import { info } from '../logs/logger.js';
import { obterResumoRadar } from '../radar/radarGlobal.js';
import { listarLancamentos } from '../financeiro/ledger.js';

export function obterMetricas() {
  return {
    contadores: { ...estado.contadores },
    processos: estado.processos.size,
    workers: estado.workers.size,
    financeiro: { ...mineradora.financeiro },
    radar: obterResumoRadar(),
    status: mineradora.status,
    modulos: Object.keys(mineradora.modulos),
  };
}

export function obterRelatorioFinanceiro() {
  const processos = Array.from(estado.processos.values());
  const concluidos = processos.filter(p => p.status === 'CONCLUIDO');
  const falhados = processos.filter(p => p.status === 'FALHOU');
  const elegiveis = processos.filter(p => p.validacao?.valido === true);
  const estimativaBruta = elegiveis.reduce((sum, p) => sum + (Number(p.valorBrutoEstimado) || 0), 0);
  const custoEstimado = elegiveis.reduce((sum, p) => sum + (Number(p.custoEstimado) || 0), 0);
  const recebimentos = {};
  const custos = {};
  for (const item of listarLancamentos({ status: 'CONFIRMADO' })) {
    if (item.evidencia?.verificada !== true || !item.confirmadoEm) continue;
    const destino = item.tipo === 'credito' ? recebimentos : custos;
    destino[item.moeda] = (destino[item.moeda] || 0) + Number(item.valor || 0);
  }
  const moedas = new Set([...Object.keys(recebimentos), ...Object.keys(custos)]);
  const saldoConfirmado = Object.fromEntries(Array.from(moedas, moeda => [moeda,
    (recebimentos[moeda] || 0) - (custos[moeda] || 0),
  ]));

  return {
    totalProcessos: processos.length,
    concluidos: concluidos.length,
    falhados: falhados.length,
    estimativasElegiveis: {
      valorBruto: estimativaBruta,
      custo: custoEstimado,
      resultadoLiquido: estimativaBruta - custoEstimado,
      rotulo: 'Estimativas; nao sao receita recebida.',
    },
    recebimentosConfirmados: recebimentos,
    custosConfirmados: custos,
    saldoConfirmado: saldoConfirmado,
    processosPorStatus: processos.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function obterRelatorioWorkers() {
  const workers = Array.from(estado.workers.values());
  return {
    total: workers.length,
    porTipo: workers.reduce((acc, w) => {
      acc[w.tipo] = (acc[w.tipo] || 0) + 1;
      return acc;
    }, {}),
    porStatus: workers.reduce((acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    }, {}),
    workers,
  };
}

export function monitorarSaude() {
  const metricas = obterMetricas();
  const alertas = [];

  if (metricas.processos > 1000) alertas.push('MUITOS_PROCESSOS');
  if (metricas.financeiro.lucro < 0) alertas.push('LUCRO_NEGATIVO');
  if (metricas.workers === 0) alertas.push('SEM_WORKERS');

  return {
    saude: alertas.length === 0 ? 'SAUDAVEL' : 'ALERTA',
    alertas,
    metricas,
  };
}

export default { obterMetricas, obterRelatorioFinanceiro, obterRelatorioWorkers, monitorarSaude };
