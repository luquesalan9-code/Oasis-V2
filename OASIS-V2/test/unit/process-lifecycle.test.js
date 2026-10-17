import { beforeEach, describe, expect, it } from 'vitest';
import { estado } from '../../src/core/estado.js';
import { mineradora } from '../../src/core/mineradora.js';
import { inicializarOASIS } from '../../src/index.js';
import radarGlobal from '../../src/radar/radarGlobal.js';
import {
  atualizarStatusProcesso, criarProcesso, distribuirProcesso, obterProcesso,
} from '../../src/processos/processManager.js';
import { registrarWorker, obterWorker } from '../../src/workers/workerManager.js';

describe('ciclo de vida operacional de processos', () => {
  beforeEach(() => {
    estado.processos.clear();
    estado.workers.clear();
    radarGlobal.limparRadar();
    estado.contadores.processosCriados = 0;
    estado.contadores.processosConcluidos = 0;
    estado.contadores.processosFalhados = 0;
  });

  it('expõe os módulos inicializados no estado de saúde', () => {
    const resultado = inicializarOASIS();
    expect(resultado.sucesso).toBe(true);
    expect(Object.keys(mineradora.modulos)).toContain('operacao');
    expect(Object.keys(mineradora.modulos)).toContain('config');
  });

  it('deduplica processo por externalId', () => {
    const first = criarProcesso({ externalId: 'source:42' });
    const duplicate = criarProcesso({ externalId: 'source:42', title: 'duplicado' });
    expect(duplicate.id).toBe(first.id);
    expect(estado.processos.size).toBe(1);
  });

  it('bloqueia EXECUTANDO sem atribuicao de worker persistida', () => {
    const processo = criarProcesso({ externalId: 'source:worker-required' });
    expect(atualizarStatusProcesso(processo.id, 'NA_FILA').sucesso).toBe(true);
    expect(atualizarStatusProcesso(processo.id, 'DISTRIBUIDO').sucesso).toBe(true);
    const resultado = atualizarStatusProcesso(processo.id, 'EXECUTANDO');
    expect(resultado.sucesso).toBe(false);
    expect(obterProcesso(processo.id).status).toBe('DISTRIBUIDO');
  });

  it('registra atribuicao e eventos antes de executar, e libera worker ao concluir', () => {
    const worker = registrarWorker({ id: 'real-worker-1', tipo: 'real', capacidade: 1, executar: async () => ({ sucesso: true }) });
    const processo = criarProcesso({ externalId: 'source:valid-flow' });
    expect(distribuirProcesso(processo.id, worker.id).sucesso).toBe(true);
    expect(atualizarStatusProcesso(processo.id, 'EXECUTANDO').sucesso).toBe(true);
    expect(atualizarStatusProcesso(processo.id, 'VALIDANDO').sucesso).toBe(true);
    expect(atualizarStatusProcesso(processo.id, 'CONCLUIDO').sucesso).toBe(true);
    expect(obterProcesso(processo.id).eventos.map(evento => evento.tipo)).toContain('WORKER_ATRIBUIDO');
    expect(obterProcesso(processo.id).workerId).toBeNull();
    expect(obterWorker(worker.id).processosAtribuidos).toEqual([]);
    expect(estado.contadores.processosConcluidos).toBe(1);
  });

  it('rejeita transicao para estado terminal sem trilha permitida', () => {
    const processo = criarProcesso({ externalId: 'source:invalid-flow' });
    const resultado = atualizarStatusProcesso(processo.id, 'CONCLUIDO');
    expect(resultado.sucesso).toBe(false);
    expect(processo.status).toBe('CRIADO');
  });

  it('bloqueia execucao real sem um executor implementado', () => {
    const worker = registrarWorker({ id: 'worker-real-unimplemented', tipo: 'real', capacidade: 1 });
    const processo = criarProcesso({ externalId: 'source:real-blocked' });
    expect(distribuirProcesso(processo.id, worker.id).sucesso).toBe(true);
    const resultado = atualizarStatusProcesso(processo.id, 'EXECUTANDO');
    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('execucao real bloqueada');
    expect(processo.status).toBe('DISTRIBUIDO');
  });

  it('respeita capacidade e nao aceita alocacao duplicada', () => {
    const worker = registrarWorker({ id: 'real-worker-cap-1', tipo: 'real', capacidade: 1, executar: async () => ({ sucesso: true }) });
    const first = criarProcesso({ externalId: 'source:capacity-1' });
    const second = criarProcesso({ externalId: 'source:capacity-2' });
    expect(distribuirProcesso(first.id, worker.id).sucesso).toBe(true);
    expect(distribuirProcesso(second.id, worker.id).sucesso).toBe(false);
    expect(distribuirProcesso(first.id, worker.id).sucesso).toBe(false);
  });
});
