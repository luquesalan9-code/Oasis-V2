/**
 * OASIS V2 - Simulação End-to-End
 * Fluxo completo: Radar → Validação → Análise → Decisão → Fila → Worker → Resultado → Financeiro
 */
import { estado } from '../core/estado.js';
import { mineradora } from '../core/mineradora.js';
import { info } from '../logs/logger.js';
import { processarOportunidades, executarCicloOrquestrador } from '../orquestrador/orquestrador.js';
import { garantirWorkersPadrao } from '../workers/workerManager.js';
import { atualizarStatusProcesso } from '../processos/processManager.js';

export function resetarEstadoSimulacao() {
  estado.processos.clear();
  estado.workers.clear();
  estado.contadores.processosCriados = 0;
  estado.contadores.processosConcluidos = 0;
  estado.contadores.ciclosExecutados = 0;
  mineradora.financeiro.valorRealizadoTotal = 0;
  mineradora.financeiro.custoRealizadoTotal = 0;
  mineradora.financeiro.lucroRealizadoTotal = 0;
  mineradora.financeiro.resultadoLiquido = 0;
  mineradora.financeiro.receita = 0;
  mineradora.financeiro.custos = 0;
  mineradora.financeiro.lucro = 0;
}

export function simularFluxoCompleto(oportunidades = []) {
  info('SIMULACAO_INICIADA', `Iniciando simulação com ${oportunidades.length} oportunidades`);

  // 1. Resetar estado para simulação isolada
  resetarEstadoSimulacao();

  // 2. Garantir workers padrão
  garantirWorkersPadrao();

  // 3. Processar oportunidades no radar
  const radar = processarOportunidades(oportunidades);
  info('SIMULACAO_RADAR', `${radar.total} processos criados no radar`);

  // 4. Executar ciclo orquestrador
  const ciclo = executarCicloOrquestrador();
  info('SIMULACAO_CICLO', `Ciclo executado: ${ciclo.ciclo} radar=${ciclo.radar.total} alocados=${ciclo.alocados.length}`);

  // 5. Simular conclusão de todos os processos
  let concluidos = 0;
  for (const [id, processo] of estado.processos) {
    if (processo.status === 'CRIADO' || processo.status === 'ALOCADO') {
      atualizarStatusProcesso(id, 'EXECUTANDO');
      atualizarStatusProcesso(id, 'CONCLUIDO');
      processo.resultadoTipo = 'SUCESSO';
      processo.valorRealizado = processo.valorBrutoEstimado || 0;
      processo.custoRealizado = processo.custoEstimado || 0;
      processo.lucroRealizado = processo.valorRealizado - processo.custoRealizado;
      estado.contadores.processosConcluidos++;
      concluidos++;
    }
  }

  // 6. Atualizar financeiro
  let valorBruto = 0;
  let custo = 0;
  let lucro = 0;
  for (const [id, processo] of estado.processos) {
    valorBruto += Number(processo.valorRealizado) || 0;
    custo += Number(processo.custoRealizado) || 0;
    lucro += Number(processo.lucroRealizado) || 0;
  }
  mineradora.financeiro.valorRealizadoTotal = valorBruto;
  mineradora.financeiro.custoRealizadoTotal = custo;
  mineradora.financeiro.lucroRealizadoTotal = lucro;
  mineradora.financeiro.resultadoLiquido = lucro;
  mineradora.financeiro.receita = valorBruto;
  mineradora.financeiro.custos = custo;
  mineradora.financeiro.lucro = lucro;

  info('SIMULACAO_CONCLUIDA', `Simulação concluída: ${concluidos} processos concluídos, lucro=${lucro}`);

  return {
    radar,
    ciclo,
    concluidos,
    financeiro: {
      valorRealizado: valorBruto,
      custoRealizado: custo,
      lucroRealizado: lucro,
    },
    resumo: {
      processosAtivos: estado.processos.size,
      workersAtivos: estado.workers.size,
      contadores: estado.contadores,
    },
  };
}

export function simularCicloCompleto() {
  const oportunidadesExemplo = [
    {
      externalId: 'sim-1',
      fonte: 'simulacao',
      origem: 'simulacao',
      plataforma: 'simulacao',
      valor: 10.00,
      moeda: 'USD',
      custo: 2.00,
      tempoEstimadoMinutos: 60,
      probabilidadeSucesso: 0.8,
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
    },
    {
      externalId: 'sim-2',
      fonte: 'simulacao',
      origem: 'simulacao',
      plataforma: 'simulacao',
      valor: 5.00,
      moeda: 'USD',
      custo: 1.00,
      tempoEstimadoMinutos: 30,
      probabilidadeSucesso: 0.9,
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
    },
  ];

  return simularFluxoCompleto(oportunidadesExemplo);
}

export default { simularFluxoCompleto, simularCicloCompleto, resetarEstadoSimulacao };