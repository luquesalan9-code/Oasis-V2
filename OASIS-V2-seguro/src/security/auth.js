/**
 * OASIS V2 - Autenticação JWT
 * Substitui a ausência total de auth na V1
 */
import jwt from 'jsonwebtoken';
import { config } from '../core/config.js';

const { secreto, expiracao } = config.seguranca.jwt;

export function gerarToken(payload, opcoes = {}) {
  const options = { expiresIn: expiracao, issuer: 'oasis-v2' };
  if (opcoes.expiracao !== undefined) {
    options.expiresIn = opcoes.expiracao;
  }
  return jwt.sign(payload, secreto, options);
}

export function verificarToken(token) {
  try {
    return jwt.verify(token, secreto, { issuer: 'oasis-v2' });
  } catch (e) {
    return null;
  }
}

export function autenticarLogin(username, password) {
  const usuarios = {
    [process.env.OASIS_USUARIO_ADMIN || 'admin']: process.env.OASIS_SENHA_ADMIN || '123456',
  };
  if (!username || !password) {
    return { sucesso: false, erro: 'Usuario e senha obrigatorios' };
  }
  const senhaEsperada = usuarios[username];
  if (!senhaEsperada || password !== senhaEsperada) {
    return { sucesso: false, erro: 'Credenciais inválidas' };
  }
  const token = gerarToken({ usuario: username, permissao: 'operador' });
  return { sucesso: true, token, expiracao };
}

export function autenticarRequisicao(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ sucesso: false, erro: 'Token não fornecido' });
  }
  const token = authHeader.substring(7);
  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({ sucesso: false, erro: 'Token inválido ou expirado' });
  }
  req.user = payload;
  next();
}

export default { gerarToken, verificarToken, autenticarLogin, autenticarRequisicao };