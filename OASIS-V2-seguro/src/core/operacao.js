/**
 * OASIS V2 - Operação (start/stop/ciclo)
 */
import { mineradora } from './mineradora.js';
import { estado } from './estado.js';
import { info, aviso } from '../logs/logger.js';

let cicloAtivo = false;
let cicloTimer = null;
let intervaloCicloMs = 5000;

export function configurarIntervalo(ms) {
  intervaloCicloMs = Math.max(1000, ms);
}

export function iniciarOperacao() {
  if (cicloAtivo) {
    return { sucesso: false, erro: 'Operação já está ativa' };
  }
  cicloAtivo = true;
  mineradora.status = 'ATIVA';
  info('OPERACAO_INICIADA', 'Operação da mineradora iniciada');
  return { sucesso: true, status: mineradora.status };
}

export function pararOperacao() {
  if (!cicloAtivo) {
    return { sucesso: false, erro: 'Operação não está ativa' };
  }
  cicloAtivo = false;
  if (cicloTimer) {
    clearInterval(cicloTimer);
    cicloTimer = null;
  }
  mineradora.status = 'PARADA';
  info('OPERACAO_PARADA', 'Operação da mineradora parada');
  return { sucesso: true, status: mineradora.status };
}

export function executarCiclo() {
  if (!cicloAtivo) {
    return { sucesso: false, erro: 'Operação não está ativa' };
  }
  estado.contadores.ciclosExecutados++;
  info('CICLO_EXECUTADO', `Ciclo ${estado.contadores.ciclosExecutados} executado`);
  return { sucesso: true, ciclo: estado.contadores.ciclosExecutados };
}

export function obterStatusOperacao() {
  return {
    ativo: cicloAtivo,
    status: mineradora.status,
    ciclosExecutados: estado.contadores.ciclosExecutados,
    intervaloCicloMs,
  };
}

export default { iniciarOperacao, pararOperacao, executarCiclo, obterStatusOperacao, configurarIntervalo };