/**
 * OASIS V2 - Estado Global
 * Substitui src/core/estado.js da V1 com tipagem e imutabilidade
 */
export const estado = {
  workers: new Map(),
  processos: new Map(),
  timers: new Map(),
  contadores: {
    processosCriados: 0,
    processosConcluidos: 0,
    processosFalhados: 0,
    ciclosExecutados: 0,
  },
  modulos: {},
};

export function obterContadores() {
  return { ...estado.contadores };
}

export function incrementarContador(chave) {
  if (chave in estado.contadores) {
    estado.contadores[chave]++;
  }
}

export function registrarModulo(nome, modulo) {
  estado.modulos[nome] = modulo;
}

export function obterModulo(nome) {
  return estado.modulos[nome] || null;
}

export function limparEstado() {
  estado.workers.clear();
  estado.processos.clear();
  estado.timers.clear();
  Object.keys(estado.contadores).forEach(chave => {
    estado.contadores[chave] = 0;
  });
  estado.modulos = {};
}

export default estado;