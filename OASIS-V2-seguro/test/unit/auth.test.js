/**
 * OASIS V2 - Testes Unitários: Autenticação
 */
import { describe, it, expect } from 'vitest';
import { gerarToken, verificarToken } from '../../src/security/auth.js';

describe('Autenticação V2', () => {
  it('deve gerar token valido', () => {
    const token = gerarToken({ usuario: 'teste' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('deve verificar token valido', () => {
    const token = gerarToken({ usuario: 'teste' });
    const payload = verificarToken(token);
    expect(payload).not.toBeNull();
    expect(payload['usuario']).toBe('teste');
  });

  it('deve rejeitar token invalido', () => {
    const payload = verificarToken('token-invalido');
    expect(payload).toBeNull();
  });

  it('deve rejeitar token expirado', () => {
    const token = gerarToken({ usuario: 'teste' }, { expiracao: 0 });
    const payload = verificarToken(token);
    expect(payload).toBeNull();
  });
});