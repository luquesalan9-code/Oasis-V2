import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/core/config.js';
import { estado } from '../../src/core/estado.js';
import { iniciarOperacao, obterProntidaoOperacaoReal, obterStatusOperacao } from '../../src/core/operacao.js';
import { criarSupervisaoAgentes } from '../../src/agentes/supervisao.js';

const operacaoOriginal = config.operacao.operacao;
const ambienteOriginal = config.ambiente;
const supervisaoOriginal = estado.modulos.supervisaoAgentes;

afterEach(() => {
  config.operacao.operacao = operacaoOriginal;
  config.ambiente = ambienteOriginal;
  estado.modulos.supervisaoAgentes = supervisaoOriginal;
  estado.workers.clear();
});

describe('prontidao para operacao real', () => {
  it('apresenta bloqueios concretos e nao inicia automacao sem executor/agentes', () => {
    config.operacao.operacao = 'REAL';
    config.ambiente = 'development';
    estado.modulos.supervisaoAgentes = undefined;
    expect(obterProntidaoOperacaoReal().bloqueios).toContain('SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA');
    estado.modulos.supervisaoAgentes = criarSupervisaoAgentes();

    const prontidao = obterProntidaoOperacaoReal();
    expect(prontidao.pronta).toBe(false);
    expect(prontidao.bloqueios).toContain('AMBIENTE_NAO_PRODUCAO');
    expect(prontidao.bloqueios).toContain('EXECUTOR_REAL_NAO_IMPLEMENTADO');
    expect(prontidao.bloqueios).not.toContain('SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA');
    expect(prontidao.bloqueios).toContain('INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA');

    const inicio = iniciarOperacao();
    expect(inicio.sucesso).toBe(false);
    expect(inicio.erro).toBe('OPERACAO_REAL_NAO_PRONTA');
    expect(obterStatusOperacao().ativo).toBe(false);
  });
});
