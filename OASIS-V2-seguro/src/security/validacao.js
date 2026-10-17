/**
 * OASIS V2 - Validação de Entrada
 * Substitui a ausência de validação na V1
 */
import { z } from 'zod';
import { config } from '../core/config.js';

export const ProcessoSchema = z.object({
  valorBrutoEstimado: z.number().min(0).default(0),
  custoEstimado: z.number().min(0).default(0),
  tempoEstimadoMinutos: z.number().min(1).max(10080).default(60),
  probabilidadeSucesso: z.number().min(0).max(1).default(0.5),
  repetibilidade: z.number().min(0).max(1).default(0.5),
  volume: z.number().min(0).max(1).default(0.5),
  concorrencia: z.number().min(0).max(1).default(0.5),
  risco: z.number().min(0).max(1).default(0.5),
  capacidadeWorkers: z.number().min(0).max(1).default(0.5),
  categoria: z.string().optional(),
  plataforma: z.string().optional(),
  fonte: z.string().optional(),
  origem: z.string().optional(),
  dadosOportunidade: z.record(z.any()).optional(),
  fonteAutorizada: z.boolean().default(false),
  automacaoPermitida: z.boolean().default(false),
  execucaoPermitida: z.boolean().default(false),
  execucaoAutonoma: z.boolean().default(false),
  executor: z.string().optional(),
  executorId: z.string().optional(),
});

export const ConfiguracaoRiscoSchema = z.object({
  riscoMaximoPorOperacao: z.number().min(0).max(1).default(1),
  custoMaximoPorOperacao: z.number().min(0).default(0),
  permitirExecucaoReal: z.boolean().default(false),
});

export function validacaoProcesso(dados) {
  return ProcessoSchema.safeParse(dados);
}

export function validacaoConfigRisco(dados) {
  return ConfiguracaoRiscoSchema.safeParse(dados);
}

export default { validacaoProcesso, validacaoConfigRisco };