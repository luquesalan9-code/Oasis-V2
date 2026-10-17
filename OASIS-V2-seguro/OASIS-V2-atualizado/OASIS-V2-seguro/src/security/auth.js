/** OASIS V2 - Autenticação JWT com credenciais configuradas pelo operador. */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../core/config.js';

const { secreto, expiracao } = config.seguranca.jwt;

export function gerarToken(payload, opcoes = {}) {
  const options = { expiresIn: expiracao, issuer: 'oasis-v2' };
  if (opcoes.expiracao !== undefined) options.expiresIn = opcoes.expiracao;
  return jwt.sign(payload, secreto, options);
}

export function verificarToken(token) {
  try {
    return jwt.verify(token, secreto, { issuer: 'oasis-v2' });
  } catch {
    return null;
  }
}

export async function autenticarLogin(username, password) {
  const { adminUsuario, adminSenha, adminSenhaHash } = config.seguranca;
  if (!username || !password) {
    return { sucesso: false, erro: 'Usuario e senha obrigatorios' };
  }
  if (!adminSenha && !adminSenhaHash) {
    return { sucesso: false, erro: 'LOGIN_NAO_CONFIGURADO' };
  }

  let senhaValida = false;
  if (adminSenhaHash) {
    try {
      senhaValida = await bcrypt.compare(password, adminSenhaHash);
    } catch {
      senhaValida = false;
    }
  } else if (config.ambiente !== 'production') {
    const informada = Buffer.from(password);
    const configurada = Buffer.from(adminSenha || '');
    senhaValida = informada.length === configurada.length && timingSafeEqual(informada, configurada);
  }

  if (username !== adminUsuario || !senhaValida) {
    return { sucesso: false, erro: 'Credenciais invalidas' };
  }

  const token = gerarToken({ usuario: username, permissao: 'operador' });
  return { sucesso: true, token, expiracao };
}

export function autenticarRequisicao(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ sucesso: false, erro: 'Token nao fornecido' });
  }
  const payload = verificarToken(authHeader.substring(7));
  if (!payload) {
    return res.status(401).json({ sucesso: false, erro: 'Token invalido ou expirado' });
  }
  req.user = payload;
  return next();
}

export default { gerarToken, verificarToken, autenticarLogin, autenticarRequisicao };
