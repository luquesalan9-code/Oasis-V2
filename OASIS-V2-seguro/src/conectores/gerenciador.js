/**
 * OASIS V2 - Gerenciador de Conectores
 * Registra, consulta e deduplica oportunidades de múltiplas fontes
 */
import ConectorBase from './conectorBase.js';
import ConectorGitHub from './github.js';
import { info, aviso } from '../logs/logger.js';

export class GerenciadorConectores {
  constructor() {
    this.conectores = new Map();
    this.registrarPadroes();
  }

  registrarPadroes() {
    this.registrar(new ConectorGitHub());
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
    const resultados = [];
    for (const [id, conector] of this.conectores) {
      try {
        const resultado = await conector.consultar({ limite });
        if (resultado.sucesso) {
          resultados.push(resultado);
        } else {
          aviso('CONECTOR_FALHA', `Conector ${id}: ${resultado.erro || 'Falha na consulta'}`, { conector: id });
        }
      } catch (e) {
        aviso('CONECTOR_ERRO', `Conector ${id}: ${e.message}`, { conector: id });
      }
    }
    return { sucesso: true, resultados, total: resultados.length };
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