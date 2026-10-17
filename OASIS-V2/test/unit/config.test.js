/**
 * OASIS V2 - Testes Unitários: Configuração
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { config } from '../../src/core/config.js';

describe('Configuração V2', () => {
  it('deve ter nome OASIS', () => {
    expect(config.nome).toBe('OASIS');
  });

  it('deve ter versão 2.0.0', () => {
    expect(config.versao).toBe('2.0.0');
  });

  it('deve ter porta válida', () => {
    expect(config.porta).toBeGreaterThanOrEqual(1);
    expect(config.porta).toBeLessThanOrEqual(65535);
  });

  it('deve ter operacao em modo PRIVADO por padrão', () => {
    expect(config.operacao.modo).toBe('PRIVADO');
  });

  it('deve iniciar somente em modo REAL', () => {
    expect(config.operacao.operacao).toBe('REAL');
  });

  it('deve ter JWT secreto configurado', () => {
    expect(config.seguranca.jwt.secreto.length).toBeGreaterThanOrEqual(16);
  });

  it('deve ter rate limit configurado', () => {
    expect(config.seguranca.rateLimit.janelaMs).toBeGreaterThan(0);
    expect(config.seguranca.rateLimit.maxRequisicoes).toBeGreaterThan(0);
  });
});
