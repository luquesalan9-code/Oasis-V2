/**
 * OASIS V2 - Entry Point Principal
 */
import { config } from './core/config.js';
import { mineradora } from './core/mineradora.js';
import { estado } from './core/estado.js';
import { info, aviso, erro } from './logs/logger.js';
import { criarServidor, iniciarServidor } from './api/servidor.js';
import { iniciarOperacao, configurarIntervalo } from './core/operacao.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarEstado, persistirEstado } from './persistencia/persistencia.js';
import { criarInterface } from './interface/interface.js';

export function inicializarOASIS() {
  info('OASIS_INICIANDO', 'Iniciando OASIS V2', { versao: config.versao, ambiente: config.ambiente });
  if (config.persistencia.ativo) {
    const recuperacao = carregarEstado();
    if (!recuperacao.sucesso && !recuperacao.ausente) {
      throw new Error(`RECUPERACAO_BLOQUEADA: ${recuperacao.erro}`);
    }
    if (recuperacao.sucesso && recuperacao.recuperacao?.emQuarentena > 0) {
      const gravado = persistirEstado();
      if (!gravado.sucesso) throw new Error(`SNAPSHOT_RECUPERADO_NAO_PERSISTIDO: ${gravado.erro}`);
    }
  }
  mineradora.status = 'PRONTA';
  mineradora.operacao = {
    modo: config.operacao.modo,
    operacao: config.operacao.operacao,
  };
  estado.modulos = {
    config: true,
    estado: true,
    logger: true,
    operacao: true,
    mineradora: true,
    interface: criarInterface(),
  };
  mineradora.modulos = estado.modulos;
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
      aviso('OPERACAO_REAL_BLOQUEADA', 'API permanece disponível para diagnóstico; automação não iniciada', {
        erro: operacao.erro,
        bloqueios: operacao.prontidao?.bloqueios || [],
      });
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
