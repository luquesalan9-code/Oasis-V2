/**
 * OASIS V2 - Configuração Centralizada
 * Substitui src/config/config.js da V1 com validação Zod e defaults seguros
 */
import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  nome: z.string().default('OASIS'),
  versao: z.string().default('2.0.0'),
  ambiente: z.enum(['development', 'production', 'test']).default('development'),
  porta: z.coerce.number().min(1).max(65535).default(10000),
  operacao: z.object({
    modo: z.string().default('PRIVADO'),
    operacao: z.string().default('SIMULACAO'),
    intervaloCicloMs: z.coerce.number().min(100).default(5000),
    tempoMaximoCicloMs: z.coerce.number().min(1000).default(30000),
  }).default({}),
  simulacao: z.object({
    aceleracao: z.coerce.number().min(1).default(60),
    ativa: z.boolean().default(true),
  }).default({}),
  radar: z.object({
    ativo: z.boolean().default(true),
    oportunidadesPorCiclo: z.coerce.number().min(1).max(500).default(100),
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
    jwt: z.object({
      secreto: z.string().min(16).default('oasis-v2-jwt-secret-change-me'),
      expiracao: z.coerce.number().default(3600),
    }).default({}),
    rateLimit: z.object({
      janelaMs: z.coerce.number().min(1000).default(60000),
      maxRequisicoes: z.coerce.number().min(1).default(100),
    }).default({}),
  }).default({}),
});

function carregarConfiguracao() {
  const raw = {
    nome: process.env.OASIS_NOME,
    versao: process.env.OASIS_VERSAO,
    ambiente: process.env.NODE_ENV,
    porta: process.env.PORT,
    operacao: {
      modo: process.env.OASIS_MODO,
      operacao: process.env.OASIS_OPERACAO,
      intervaloCicloMs: process.env.OASIS_INTERVALO_CICLO_MS,
      tempoMaximoCicloMs: process.env.OASIS_TEMPO_MAXIMO_CICLO_MS,
    },
    simulacao: {
      aceleracao: process.env.OASIS_ACCELERACAO,
      ativa: process.env.OASIS_SIMULACAO_ATIVA === 'true',
    },
    radar: {
      ativo: process.env.OASIS_RADAR_ATIVO === 'true',
      oportunidadesPorCiclo: process.env.OASIS_RADAR_OPORTUNIDADES,
    },
    logs: {
      ativo: process.env.OASIS_LOGS_ATIVO === 'true',
      nivel: process.env.OASIS_LOGS_NIVEL,
    },
    persistencia: {
      ativo: process.env.OASIS_PERSISTENCIA_ATIVA === 'true',
      arquivo: process.env.OASIS_PERSISTENCIA_ARQUIVO,
    },
    seguranca: {
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
  return ConfigSchema.parse(raw);
}

export const config = carregarConfiguracao();
export default config;