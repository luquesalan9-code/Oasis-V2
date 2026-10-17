/** OASIS V2 - Ciclo periódico da operação. */
import { config } from './config.js';
import { mineradora } from './mineradora.js';
import { estado } from './estado.js';
import { info, aviso, erro } from '../logs/logger.js';
import { executarCicloReal } from '../orquestrador/orquestrador.js';

let cicloAtivo = false;
let cicloTimer = null;
let intervaloCicloMs = config.operacao.intervaloCicloMs;
let cicloEmAndamento = null;

export function configurarIntervalo(ms) {
  const intervalo = Number(ms);
  if (!Number.isFinite(intervalo) || intervalo < 1000) {
    throw new Error('O intervalo do ciclo deve ser de pelo menos 1000 ms');
  }
  // Respeita a cadência mínima do conector GitHub para evitar consultas repetidas.
  intervaloCicloMs = Math.max(30000, intervalo);
  if (cicloAtivo) {
    clearInterval(cicloTimer);
    agendarCiclos();
  }
  return intervaloCicloMs;
}

function agendarCiclos() {
  cicloTimer = setInterval(() => {
    executarCiclo().catch(error => erro('CICLO_FALHOU', error.message));
  }, intervaloCicloMs);
  cicloTimer.unref?.();
}

export function iniciarOperacao() {
  if (config.operacao.operacao !== 'REAL' || config.simulacao.ativa) {
    return {
      sucesso: false,
      erro: 'Operacao automatica exige OASIS_OPERACAO=REAL e OASIS_SIMULACAO_ATIVA=false',
    };
  }
  if (cicloAtivo) return { sucesso: false, erro: 'Operacao ja esta ativa' };

  cicloAtivo = true;
  mineradora.status = 'ATIVA';
  agendarCiclos();
  info('OPERACAO_INICIADA', 'Descoberta ao vivo agendada sem execução externa', {
    intervaloCicloMs,
  });
  return { sucesso: true, status: mineradora.status, intervaloCicloMs };
}

export async function pararOperacao() {
  if (!cicloAtivo) return { sucesso: false, erro: 'Operacao nao esta ativa' };
  cicloAtivo = false;
  if (cicloTimer) clearInterval(cicloTimer);
  cicloTimer = null;
  if (cicloEmAndamento) await cicloEmAndamento;
  mineradora.status = 'PARADA';
  info('OPERACAO_PARADA', 'Operacao parada');
  return { sucesso: true, status: mineradora.status };
}

export async function executarCiclo() {
  if (!cicloAtivo) return { sucesso: false, erro: 'Operacao nao esta ativa' };
  if (cicloEmAndamento) return { sucesso: false, erro: 'Ciclo anterior ainda esta em andamento' };

  cicloEmAndamento = executarCicloReal();
  try {
    return await cicloEmAndamento;
  } catch (error) {
    aviso('CICLO_ERRO', error.message);
    throw error;
  } finally {
    cicloEmAndamento = null;
  }
}

export function obterStatusOperacao() {
  return {
    ativo: cicloAtivo,
    status: mineradora.status,
    ciclosExecutados: estado.contadores.ciclosExecutados,
    intervaloCicloMs,
    modo: config.operacao.operacao,
    simulacaoAtiva: config.simulacao.ativa,
    cicloEmAndamento: Boolean(cicloEmAndamento),
  };
}

export default { iniciarOperacao, pararOperacao, executarCiclo, obterStatusOperacao, configurarIntervalo };
