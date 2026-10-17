/** OASIS V2 - Configuração validada. */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

function booleanFromEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === '') return undefined;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  throw new Error(`${name} deve ser true ou false`);
}

const isProduction = process.env.NODE_ENV === 'production';
const ConfigSchema = z.object({
  nome: z.string().default('OASIS'),
  versao: z.string().default('2.0.0'),
  ambiente: z.enum(['development', 'production', 'test']).default('development'),
  host: z.string().default('127.0.0.1'),
  porta: z.coerce.number().int().min(1).max(65535).default(10000),
  corsOrigins: z.array(z.string().url()).default([]),
  operacao: z.object({
    modo: z.string().default('PRIVADO'),
    operacao: z.enum(['SIMULACAO', 'REAL']).default('SIMULACAO'),
    intervaloCicloMs: z.coerce.number().int().min(1000).default(30000),
    tempoMaximoCicloMs: z.coerce.number().int().min(1000).default(30000),
  }).default({}),
  simulacao: z.object({
    aceleracao: z.coerce.number().min(1).default(60),
    ativa: z.boolean().default(false),
  }).default({}),
  radar: z.object({
    ativo: z.boolean().default(true),
    oportunidadesPorCiclo: z.coerce.number().int().min(1).max(100).default(10),
  }).default({}),
  logs: z.object({
    ativo: z.boolean().default(true),
    nivel: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO'),
  }).default({}),
  persistencia: z.object({
    ativo: z.boolean().default(true),
    arquivo: z.string().default('./data/oasis-state.json'),
  }).default({}),
  seguranca: z.object({
    adminUsuario: z.string().default('admin'),
    adminSenha: z.string().optional(),
    adminSenhaHash: z.string().regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/).optional(),
    jwt: z.object({
      secreto: z.string().min(32).default(isProduction ? '' : randomBytes(32).toString('hex')),
      expiracao: z.coerce.number().int().min(60).default(3600),
    }).default({}),
    rateLimit: z.object({
      janelaMs: z.coerce.number().min(1000).default(60000),
      maxRequisicoes: z.coerce.number().int().min(1).default(100),
    }).default({}),
  }).default({}),
});

const raw = {
  nome: process.env.OASIS_NOME,
  versao: process.env.OASIS_VERSAO,
  ambiente: process.env.NODE_ENV,
  host: process.env.HOST,
  porta: process.env.PORT,
  corsOrigins: (process.env.OASIS_CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  operacao: {
    modo: process.env.OASIS_MODO,
    operacao: process.env.OASIS_OPERACAO,
    intervaloCicloMs: process.env.OASIS_INTERVALO_CICLO_MS,
    tempoMaximoCicloMs: process.env.OASIS_TEMPO_MAXIMO_CICLO_MS,
  },
  simulacao: {
    aceleracao: process.env.OASIS_ACCELERACAO,
    ativa: booleanFromEnv('OASIS_SIMULACAO_ATIVA'),
  },
  radar: {
    ativo: booleanFromEnv('OASIS_RADAR_ATIVO'),
    oportunidadesPorCiclo: process.env.OASIS_RADAR_OPORTUNIDADES,
  },
  logs: {
    ativo: booleanFromEnv('OASIS_LOGS_ATIVO'),
    nivel: process.env.OASIS_LOGS_NIVEL,
  },
  persistencia: {
    ativo: booleanFromEnv('OASIS_PERSISTENCIA_ATIVA'),
    arquivo: process.env.OASIS_PERSISTENCIA_ARQUIVO,
  },
  seguranca: {
    adminUsuario: process.env.OASIS_USUARIO_ADMIN,
    adminSenha: process.env.OASIS_SENHA_ADMIN,
    adminSenhaHash: process.env.OASIS_SENHA_ADMIN_HASH,
    jwt: {
      secreto: process.env.OASIS_JWT_SECRETO,
      expiracao: process.env.OASIS_JWT_EXPIRACAO,
    },
    rateLimit: {
      janelaMs: process.env.OASIS_RATE_LIMIT_JANELA_MS,
      maxRequisicoes: process.env.OASIS_RATE_LIMIT_MAX,
    },
  },
};

export const config = ConfigSchema.parse(raw);

if (isProduction) {
  if (config.seguranca.jwt.secreto.length < 32) {
    throw new Error('OASIS_JWT_SECRETO deve ter pelo menos 32 caracteres em produção');
  }
  if (!config.seguranca.adminSenhaHash?.startsWith('$2')) {
    throw new Error('Configure OASIS_SENHA_ADMIN_HASH (bcrypt) em produção');
  }
}

if (config.operacao.operacao === 'REAL' && config.simulacao.ativa) {
  throw new Error('Modo REAL bloqueado: defina OASIS_SIMULACAO_ATIVA=false');
}

export default config;
