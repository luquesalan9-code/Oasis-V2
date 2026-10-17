/**
 * OASIS V2 - Persistência em Arquivo
 * Salva e restaura estado do sistema
 */
import { estado } from '../core/estado.js';
import { mineradora } from '../core/mineradora.js';
import { info, aviso } from '../logs/logger.js';
import { config } from '../core/config.js';
import fs from 'fs';
import path from 'path';

export function snapshotEstado() {
  return {
    contadores: { ...estado.contadores },
    processos: Array.from(estado.processos.values()),
    workers: Array.from(estado.workers.values()),
    financeiro: { ...mineradora.financeiro },
    simulacao: { ...mineradora.simulacao },
    operacao: { ...mineradora.operacao },
    salvoEm: new Date().toISOString(),
  };
}

export function restaurarEstado(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { sucesso: false, erro: 'Snapshot inválido' };
  }

  estado.processos.clear();
  estado.workers.clear();
  snapshot.processos?.forEach(p => estado.processos.set(p.id, p));
  snapshot.workers?.forEach(w => estado.workers.set(w.id, w));

  if (snapshot.contadores) {
    Object.keys(estado.contadores).forEach(chave => {
      if (snapshot.contadores[chave] !== undefined) {
        estado.contadores[chave] = snapshot.contadores[chave];
      }
    });
  }

  if (snapshot.financeiro) {
    Object.assign(mineradora.financeiro, snapshot.financeiro);
  }

  info('ESTADO_RESTORED', 'Estado restaurado com sucesso');
  return { sucesso: true, snapshot };
}

export function persistirEstado() {
  if (!config.persistencia.ativo) {
    return { sucesso: false, erro: 'Persistência desativada' };
  }

  try {
    const snapshot = snapshotEstado();
    const arquivo = config.persistencia.arquivo;
    const dir = path.dirname(arquivo);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(arquivo, JSON.stringify(snapshot, null, 2), 'utf-8');
    info('ESTADO_PERSISTIDO', `Estado salvo em ${arquivo}`);
    return { sucesso: true, arquivo, snapshot };
  } catch (e) {
    aviso('ESTADO_ERRO_PERSISTENCIA', e.message);
    return { sucesso: false, erro: e.message };
  }
}

export function carregarEstado() {
  if (!config.persistencia.ativo) {
    return { sucesso: false, erro: 'Persistência desativada' };
  }

  try {
    const arquivo = config.persistencia.arquivo;
    if (!fs.existsSync(arquivo)) {
      return { sucesso: false, erro: 'Arquivo de estado não encontrado' };
    }

    const dados = fs.readFileSync(arquivo, 'utf-8');
    const snapshot = JSON.parse(dados);
    return restaurarEstado(snapshot);
  } catch (e) {
    aviso('ESTADO_ERRO_CARREGAMENTO', e.message);
    return { sucesso: false, erro: e.message };
  }
}

export default { snapshotEstado, restaurarEstado, persistirEstado, carregarEstado };