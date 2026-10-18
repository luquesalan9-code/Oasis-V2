/**
 * OASIS V2 - Estado Global da Mineradora
 */
import { estado } from './estado.js';
import { info } from '../logs/logger.js';

export const mineradora = {
  status: 'INICIANDO',
  modulos: {},
  financeiro: {
    valorBrutoEstimadoTotal: 0,
    custoEstimadoTotal: 0,
    lucroEstimadoTotal: 0,
    roiEstimadoPercentual: 0,
    valorRealizadoTotal: 0,
    custoRealizadoTotal: 0,
    lucroRealizadoTotal: 0,
    roiRealizadoPercentual: 0,
    ganhos: 0,
    perdas: 0,
    resultadoLiquido: 0,
    receita: 0,
    custos: 0,
    lucro: 0,
  },
  operacao: {
    modo: 'PRIVADO',
    operacao: 'REAL',
  },
};

export function atualizarStatus(status) {
  mineradora.status = status;
  info('MINERADORA_STATUS', 'Status atualizado para ' + status);
}

export function obterResumo() {
  return {
    status: mineradora.status,
    modulos: Object.keys(mineradora.modulos),
    financeiro: { ...mineradora.financeiro },
    operacao: { ...mineradora.operacao },
    contadores: estado.contadores,
  };
}

export function registrarModulo(nome, modulo) {
  mineradora.modulos[nome] = modulo;
  estado.modulos[nome] = modulo;
}

export default mineradora;
