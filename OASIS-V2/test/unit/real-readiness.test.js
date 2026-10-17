import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/core/config.js';
import { estado } from '../../src/core/estado.js';
import { iniciarOperacao, obterProntidaoOperacaoReal, obterStatusOperacao } from '../../src/core/operacao.js';

const operacaoOriginal = config.operacao.operacao;
const ambienteOriginal = config.ambiente;

afterEach(() => {
  config.operacao.operacao = operacaoOriginal;
  config.ambiente = ambienteOriginal;
  estado.workers.clear();
});

describe('prontidao para operacao real', () => {
  it('apresenta bloqueios concretos e nao inicia automacao sem executor/agentes', () => {
    config.operacao.operacao = 'REAL';
    config.ambiente = 'development';

    const prontidao = obterProntidaoOperacaoReal();
    expect(prontidao.pronta).toBe(false);
    expect(prontidao.bloqueios).toContain('AMBIENTE_NAO_PRODUCAO');
    expect(prontidao.bloqueios).toContain('EXECUTOR_REAL_NAO_IMPLEMENTADO');
    expect(prontidao.bloqueios).toContain('SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA');
    expect(prontidao.bloqueios).toContain('INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA');

    const inicio = iniciarOperacao();
    expect(inicio.sucesso).toBe(false);
    expect(inicio.erro).toBe('OPERACAO_REAL_NAO_PRONTA');
    expect(obterStatusOperacao().ativo).toBe(false);
  });
});
