/**
 * OASIS V2 - Testes Unitários: Autenticação
 */
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { config } from '../../src/core/config.js';
import { autenticarLogin, gerarToken, verificarToken } from '../../src/security/auth.js';

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

  it('deve autenticar usando hash bcrypt e rejeitar senha errada', async () => {
    const original = { ...config.seguranca };
    try {
      config.seguranca.adminUsuario = 'teste-admin';
      config.seguranca.adminSenha = undefined;
      config.seguranca.adminSenhaHash = await bcrypt.hash('Senha-Segura-123!', 4);

      const ok = await autenticarLogin('teste-admin', 'Senha-Segura-123!');
      const falha = await autenticarLogin('teste-admin', 'senha-errada');
      expect(ok.sucesso).toBe(true);
      expect(falha.sucesso).toBe(false);
    } finally {
      Object.assign(config.seguranca, original);
    }
  });

  it('nao aceita credencial padrão quando senha não foi configurada', async () => {
    const original = { ...config.seguranca };
    try {
      config.seguranca.adminSenha = undefined;
      config.seguranca.adminSenhaHash = undefined;
      const result = await autenticarLogin('admin', '123456');
      expect(result).toEqual({ sucesso: false, erro: 'LOGIN_NAO_CONFIGURADO' });
    } finally {
      Object.assign(config.seguranca, original);
    }
  });
});
