/**
 * OASIS V2 - Testes de Integração: Fluxo Completo
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { estado } from '../../src/core/estado.js';
import { mineradora } from '../../src/core/mineradora.js';
import radarGlobal from '../../src/radar/radarGlobal.js';
import { processarOportunidades } from '../../src/orquestrador/orquestrador.js';
import { simularFluxoCompleto } from '../../src/simulacao/simulador.js';
import { gerarToken, verificarToken } from '../../src/security/auth.js';
import { analisarEClassificar } from '../../src/analise/analisador.js';
import { decidirOportunidade } from '../../src/decisao/decisor.js';
import { criarProcessoDeOportunidade } from '../../src/processos/processManager.js';
import { registrarWorker } from '../../src/workers/workerManager.js';

describe('Fluxo Completo V2', () => {
  beforeEach(() => {
    estado.processos.clear();
    estado.workers.clear();
    estado.contadores.processosCriados = 0;
    estado.contadores.processosConcluidos = 0;
    estado.contadores.ciclosExecutados = 0;
    mineradora.financeiro.lucroRealizadoTotal = 0;
    radarGlobal.limparRadar();
  });

  it('deve gerar e verificar token valido', () => {
    const token = gerarToken({ usuario: 'admin' });
    const payload = verificarToken(token);
    expect(payload).not.toBeNull();
    expect(payload['usuario']).toBe('admin');
  });

  it('deve analisar e classificar oportunidade', () => {
    const processo = {
      id: 'test-1',
      valorBrutoEstimado: 100,
      custoEstimado: 20,
      tempoEstimadoMinutos: 60,
      probabilidadeSucesso: 0.8,
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
    };
    const analise = analisarEClassificar(processo);
    expect(analise.sucesso).toBe(true);
    expect(analise.lucro).toBe(80);
    expect(analise.roi).toBe(400);
    expect(analise.classificacao).toBeTruthy();
  });

  it('deve decidir oportunidade executavel', () => {
    const processo = {
      id: 'test-2',
      valorBrutoEstimado: 50,
      custoEstimado: 10,
      tempoEstimadoMinutos: 30,
      probabilidadeSucesso: 0.9,
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
      executor: 'worker-1',
    };
    const decisao = decidirOportunidade(processo);
    expect(decisao.sucesso).toBe(true);
    expect(decisao.executavel).toBe(true);
  });

  it('deve criar processo de oportunidade', () => {
    const oport = {
      externalId: 'test-3',
      fonte: 'simulacao',
      plataforma: 'simulacao',
      valor: 25,
      custo: 5,
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
    };
    const processo = criarProcessoDeOportunidade(oport);
    expect(processo.id).toBeTruthy();
    expect(processo.status).toBe('CRIADO');
    expect(processo.valorBrutoEstimado).toBe(25);
  });

  it('deve registrar worker', () => {
    const worker = registrarWorker({ id: 'test-worker', tipo: 'simulacao', especializacao: 'geral', capacidade: 5 });
    expect(worker.id).toBe('test-worker');
    expect(worker.status).toBe('DISPONIVEL');
  });

  it('deve executar fluxo completo de simulacao', () => {
    const oportunidades = [
      {
        externalId: 'flux-1',
        fonte: 'simulacao',
        plataforma: 'simulacao',
        valor: 10,
        custo: 2,
        tempoEstimadoMinutos: 60,
        probabilidadeSucesso: 0.8,
        fonteAutorizada: true,
        automacaoPermitida: true,
        execucaoPermitida: true,
        execucaoAutonoma: true,
      },
      {
        externalId: 'flux-2',
        fonte: 'simulacao',
        plataforma: 'simulacao',
        valor: 5,
        custo: 1,
        tempoEstimadoMinutos: 30,
        probabilidadeSucesso: 0.9,
        fonteAutorizada: true,
        automacaoPermitida: true,
        execucaoPermitida: true,
        execucaoAutonoma: true,
      },
    ];

    const resultado = simularFluxoCompleto(oportunidades);
    expect(resultado.radar.total).toBe(2);
    expect(resultado.concluidos).toBe(2);
    expect(resultado.financeiro.lucroRealizado).toBe(12);
    expect(estado.contadores.processosConcluidos).toBeGreaterThanOrEqual(2);
  });

  it('deve processar lote de oportunidades', () => {
    const lote = [
      { externalId: 'lote-1', fonte: 'sim', plataforma: 'sim', valor: 10, custo: 2 },
      { externalId: 'lote-2', fonte: 'sim', plataforma: 'sim', valor: 20, custo: 4 },
    ];
    const resultado = processarOportunidades(lote);
    expect(resultado.sucesso).toBe(true);
    expect(resultado.total).toBe(2);
  });
});



