/**
 * OASIS V2 - Testes Unitários: Logger Estruturado
 * Valida formatação e API existente do Winston logger.
 */
import { describe, it, expect, vi } from 'vitest';
import { info, sucesso, aviso, erro, debug, obterLogger } from '../../src/logs/logger.js';

describe('Logger V2', () => {
  it('deve expor todos os handlers da API existente', () => {
    expect(typeof info).toBe('function');
    expect(typeof sucesso).toBe('function');
    expect(typeof aviso).toBe('function');
    expect(typeof erro).toBe('function');
    expect(typeof debug).toBe('function');
    expect(typeof obterLogger).toBe('function');
  });

  it('deve retornar instância winston via obterLogger', () => {
    const l = obterLogger();
    expect(l).toBeDefined();
    expect(typeof l.info).toBe('function');
    expect(typeof l.error).toBe('function');
  });

  it('deve não lançar erro ao registrar mensagens', () => {
    expect(() => info('TEST', 'msg', { x: 1 })).not.toThrow();
    expect(() => sucesso('TEST', 'msg')).not.toThrow();
    expect(() => aviso('TEST', 'msg')).not.toThrow();
    expect(() => erro('TEST', 'msg', { code: 1 })).not.toThrow();
    expect(() => debug('TEST', 'msg')).not.toThrow();
  });

  it('deve aceitar chamada sem argumentos de dados', () => {
    expect(() => info('TEST', 'msg')).not.toThrow();
    expect(() => erro('TEST', 'msg')).not.toThrow();
  });

  it('deve permitir spy no handler sem quebrar o caller', () => {
    const l = obterLogger();
    const spy = vi.spyOn(l, 'error').mockImplementation(function () { return l; });
    expect(() => erro('TEST', 'msg')).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});