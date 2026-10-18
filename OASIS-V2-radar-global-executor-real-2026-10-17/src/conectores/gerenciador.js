/**
 * OASIS V2 - Gerenciador de Conectores
 * Registra, consulta e deduplica oportunidades de múltiplas fontes
 */
import ConectorBase from './conectorBase.js';
import ConectorGitHub from './github.js';
import ConectorRemoteOK from './remoteOk.js';
import ConectorRemotive from './remotive.js';
import ConectorArbeitnow from './arbeitnow.js';
import { info, aviso } from '../logs/logger.js';

export class GerenciadorConectores {
  constructor() {
    this.conectores = new Map();
    this.registrarPadroes();
  }

  registrarPadroes() {
    this.registrar(new ConectorGitHub());
    this.registrar(new ConectorRemoteOK());
    this.registrar(new ConectorRemotive());
    this.registrar(new ConectorArbeitnow());
  }

  registrar(conector) {
    if (!(conector instanceof ConectorBase)) {
      throw new Error('Conector deve estender ConectorBase');
    }
    this.conectores.set(conector.id, conector);
    info('CONECTOR_REGISTRADO', `Conector ${conector.id} registrado`);
    return conector;
  }

  obterConector(id) {
    return this.conectores.get(id) || null;
  }

  listarConectores() {
    return Array.from(this.conectores.values()).map(c => c.obterStatus());
  }

  async consultarTodos({ limite = 50 } = {}) {
    const respostas = await Promise.all(Array.from(this.conectores.entries()).map(async ([id, conector]) => {
      try {
        const resultado = await conector.consultar({ limit: limite });
        if (!resultado.sucesso) {
          aviso('CONECTOR_FALHA', `Conector ${id}: ${resultado.erro || 'Falha na consulta'}`, { conector: id });
        }
        return resultado;
      } catch (e) {
        aviso('CONECTOR_ERRO', `Conector ${id}: ${e.message}`, { conector: id });
        return { sucesso: false, fonte: id, erro: e.message };
      }
    }));
    const resultados = respostas.filter(resultado => resultado?.sucesso === true);
    const falhas = respostas.filter(resultado => resultado?.sucesso !== true).map(resultado => ({
      conector: resultado?.fonte || 'desconhecido',
      erro: resultado?.erro || (resultado?.bloqueadaPorRateLimit ? 'CONSULTA_AGUARDANDO_INTERVALO' : 'Falha na consulta'),
      status: resultado?.status || null,
      bloqueadaPorRateLimit: resultado?.bloqueadaPorRateLimit === true,
    }));
    return { sucesso: falhas.length === 0, resultados, falhas, total: resultados.length };
  }

  listarStatus() {
    return Array.from(this.conectores.values()).map(conector => conector.obterStatus());
  }

  async consultarPorFonte(fonteId, opcoes = {}) {
    const conector = this.conectores.get(fonteId);
    if (!conector) {
      return { sucesso: false, erro: `Conector ${fonteId} não encontrado` };
    }
    return await conector.consultar(opcoes);
  }
}

export default GerenciadorConectores;
