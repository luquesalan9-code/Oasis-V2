/**
 * OASIS V2 - Logger Estruturado
 * Substitui src/logs/logger.js da V1 com Winston e persistência em arquivo
 */
import winston from 'winston';
import { config } from '../core/config.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  levels,
  format,
  defaultMeta: { servico: 'oasis-v2' },
  transports: [
    new winston.transports.Console({
      level: (config.logs.nivel || 'info').toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...dados }) => {
          return `${timestamp} [${level}] ${message}${Object.keys(dados).length ? ' ' + JSON.stringify(dados) : ''}`;
        })
      ),
    }),
  ],
});

export function info(evento, mensagem, dados = null) {
  logger.info(mensagem, { evento, dados });
}

export function sucesso(evento, mensagem, dados = null) {
  logger.info(mensagem, { evento, dados });
}

export function aviso(evento, mensagem, dados = null) {
  logger.warn(mensagem, { evento, dados });
}

export function erro(evento, mensagem, dados = null) {
  logger.error(mensagem, { evento, dados });
}

export function debug(evento, mensagem, dados = null) {
  logger.debug(mensagem, { evento, dados });
}

export function obterLogger() {
  return logger;
}

export default { info, sucesso, aviso, erro, debug, obterLogger };