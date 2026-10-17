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
  if (config.operacao.operacao !== 'REAL') {
    return {
      sucesso: false,
      erro: 'Operacao automatica exige modo REAL',
    };
  }
  const prontidao = obterProntidaoOperacaoReal();
  if (!prontidao.pronta) {
    return { sucesso: false, erro: 'OPERACAO_REAL_NAO_PRONTA', prontidao };
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

export function obterProntidaoOperacaoReal() {
  const bloqueios = [];
  const executoresReais = Array.from(estado.workers.values()).filter(worker => (
    worker.tipo === 'real' && typeof worker.executar === 'function'
  ));
  if (config.ambiente !== 'production') bloqueios.push('AMBIENTE_NAO_PRODUCAO');
  if (!config.persistencia.ativo) bloqueios.push('PERSISTENCIA_DESATIVADA');
  if (config.operacao.operacao !== 'REAL') bloqueios.push('MODO_REAL_NAO_CONFIGURADO');
  if (!config.seguranca.adminSenhaHash) bloqueios.push('SENHA_ADMIN_BCRYPT_AUSENTE');
  if (config.seguranca.jwt.secreto.length < 32) bloqueios.push('SEGREDO_JWT_INVALIDO');
  if (executoresReais.length === 0) bloqueios.push('EXECUTOR_REAL_NAO_IMPLEMENTADO');
  if (!estado.modulos.supervisaoAgentes) bloqueios.push('SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA');
  if (!estado.modulos.integracaoExecucaoOficial) bloqueios.push('INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA');
  return { pronta: bloqueios.length === 0, bloqueios, executoresReais: executoresReais.length };
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
    const resultado = await cicloEmAndamento;
    if (resultado.erro === 'PERSISTENCIA_OBRIGATORIA_FALHOU') {
      cicloAtivo = false;
      if (cicloTimer) clearInterval(cicloTimer);
      cicloTimer = null;
      mineradora.status = 'FALHA';
      erro('OPERACAO_INTERROMPIDA', 'Persistência obrigatória indisponível; descoberta automática interrompida');
    }
    return resultado;
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
    cicloEmAndamento: Boolean(cicloEmAndamento),
  };
}

export default { iniciarOperacao, pararOperacao, executarCiclo, obterStatusOperacao, obterProntidaoOperacaoReal, configurarIntervalo };
