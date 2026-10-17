/**
 * OASIS V2 - Conector Base para Fontes de Oportunidades
 */
export class ConectorBase {
  constructor(config) {
    this.id = config.id;
    this.nome = config.nome;
    this.descricao = config.descricao;
    this.baseURL = config.baseURL || '';
    this.requerCredencial = config.requerCredencial || false;
    this.credencialConfigurada = false;
    this.status = 'INATIVO';
    this.ultimaConsulta = null;
    this.intervaloMinimoMs = config.intervaloMinimoMs || 30000;
  }

  podeConsultarAgora() {
    if (!this.ultimaConsulta) return true;
    return Date.now() - this.ultimaConsulta >= this.intervaloMinimoMs;
  }

  async consultar(opcoes = {}) {
    if (this.requerCredencial && !this.credencialConfigurada) {
      return {
        sucesso: false,
        erro: 'CREDENCIAL_NECESSARIA',
        fonte: this.id,
        mensagem: 'Fonte ' + this.id + ' requer credencial nao configurada',
      };
    }

    if (!this.podeConsultarAgora()) {
      return {
        sucesso: false,
        bloqueadaPorRateLimit: true,
        fonte: this.id,
      };
    }

    this.ultimaConsulta = Date.now();
    this.status = 'ATIVO';

    throw new Error('Metodo consultar() deve ser sobrescrito por ' + this.id);
  }

  obterStatus() {
    return {
      id: this.id,
      nome: this.nome,
      status: this.status,
      requerCredencial: this.requerCredencial,
      credencialConfigurada: this.credencialConfigurada,
      ultimaConsulta: this.ultimaConsulta ? new Date(this.ultimaConsulta).toISOString() : null,
    };
  }
}

export default ConectorBase;
