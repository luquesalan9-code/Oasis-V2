/**
 * OASIS V2 - Entry Point Principal
 */
import { config } from './core/config.js';
import { mineradora } from './core/mineradora.js';
import { estado } from './core/estado.js';
import { info, erro } from './logs/logger.js';
import { criarServidor, iniciarServidor } from './api/servidor.js';
import { iniciarOperacao, configurarIntervalo } from './core/operacao.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function inicializarOASIS() {
  info('OASIS_INICIANDO', 'Iniciando OASIS V2', { versao: config.versao, ambiente: config.ambiente });
  mineradora.status = 'PRONTA';
  mineradora.operacao = {
    modo: config.operacao.modo,
    operacao: config.operacao.operacao,
  };
  mineradora.simulacao.ativa = config.simulacao.ativa;
  estado.modulos = {
    config: true,
    estado: true,
    logger: true,
    operacao: true,
    mineradora: true,
  };
  info('OASIS_INICIADO', 'OASIS V2 iniciado com sucesso');
  return { sucesso: true, status: mineradora.status, modulos: Object.keys(estado.modulos) };
}

export function criarServidorOASIS() {
  return criarServidor();
}

export function iniciarOASIS() {
  inicializarOASIS();
  const app = criarServidorOASIS();
  const server = iniciarServidor(app);
  configurarIntervalo(config.operacao.intervaloCicloMs);
  if (config.operacao.operacao === 'REAL') {
    const operacao = iniciarOperacao();
    if (!operacao.sucesso) {
      server.close();
      throw new Error(operacao.erro);
    }
  }
  return { app, server, mineradora };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    iniciarOASIS();
  } catch (e) {
    erro('OASIS_FALHA_INICIAL', e.message);
    process.exit(1);
  }
}

export default { inicializarOASIS, criarServidorOASIS, iniciarOASIS };
