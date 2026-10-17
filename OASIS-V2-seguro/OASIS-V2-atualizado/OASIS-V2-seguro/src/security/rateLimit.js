/**
 * OASIS V2 - Rate Limiting
 * Substitui a ausência total de rate limiting na V1
 */
import rateLimit from 'express-rate-limit';
import { config } from '../core/config.js';

const { janelaMs, maxRequisicoes } = config.seguranca.rateLimit;

export function criarRateLimit() {
  return rateLimit({
    windowMs: janelaMs,
    max: maxRequisicoes,
    message: {
      sucesso: false,
      erro: 'Muitas requisições. Tente novamente em instantes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function rateLimitPorIP(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'desconhecido';
  req.rateLimit = { ip, timestamp: Date.now() };
  next();
}

export default { criarRateLimit, rateLimitPorIP };