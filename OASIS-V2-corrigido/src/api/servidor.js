/**
 * OASIS V2 - Servidor Express Principal
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import rotas from './rotas.js';
import { config } from '../core/config.js';
import { mineradora } from '../core/mineradora.js';
import { estado } from '../core/estado.js';
import { info } from '../logs/logger.js';

export function criarServidor() {
  const app = express();

  // Segurança
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.seguranca.rateLimit.janelaMs,
    max: config.seguranca.rateLimit.maxRequisicoes,
    message: { sucesso: false, erro: 'Muitas requisicoes. Tente novamente em instantes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Rotas
  app.use(rotas);

  // Health check público
  app.get('/health', (req, res) => {
    res.json({
      sucesso: true,
      servico: 'oasis-v2',
      status: mineradora.status,
      modulos: Object.keys(mineradora.modulos),
      contadores: estado.contadores,
    });
  });

  // Tratamento de erros
  app.use((err, req, res, next) => {
    info('API_ERRO', err.message, { rota: req.path });
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  });

  return app;
}

export function iniciarServidor(app) {
  return app.listen(config.porta, config.host, () => {
    info('SERVIDOR_INICIADO', `OASIS V2 rodando em ${config.host}:${config.porta}`);
    info('MODO', `Operacao: ${config.operacao.operacao}, Modo: ${config.operacao.modo}`);
  });
}

export default { criarServidor, iniciarServidor };
