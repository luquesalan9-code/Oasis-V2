/**
 * OASIS V2 - Monitoramento e Relatórios
 */
import { estado } from '../core/estado.js';
import { mineradora } from '../core/mineradora.js';
import { info } from '../logs/logger.js';
import { obterResumoRadar } from '../radar/radarGlobal.js';

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
  const falhados = processos.filter(p => p.status === 'FALHA');

  const valorBruto = concluidos.reduce((sum, p) => sum + (Number(p.valorBrutoEstimado) || 0), 0);
  const custo = concluidos.reduce((sum, p) => sum + (Number(p.custoEstimado) || 0), 0);
  const lucro = valorBruto - custo;
  const roi = custo > 0 ? (lucro / custo) * 100 : 0;

  return {
    totalProcessos: processos.length,
    concluidos: concluidos.length,
    falhados: falhados.length,
    valorBruto,
    custo,
    lucro,
    roi,
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