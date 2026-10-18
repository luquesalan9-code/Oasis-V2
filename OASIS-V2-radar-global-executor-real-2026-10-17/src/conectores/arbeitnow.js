/** API pública oficial da Arbeitnow, filtrada para postos remotos. */
import ConectorBase from './conectorBase.js';
import { registrarFonte } from '../radar/radarGlobal.js';
import {
  consultarJson, criarOportunidadeRemota, erroDaFonte, INTERVALO_CONSULTA_MS,
  limiteSeguro, respostaDaFonte,
} from './jobFeedUtils.js';

export class ConectorArbeitnow extends ConectorBase {
  constructor() {
    super({
      id: 'arbeitnow',
      nome: 'Arbeitnow',
      descricao: 'Vagas remotas globais e europeias pelo feed público',
      baseURL: 'https://www.arbeitnow.com/api/job-board-api',
      requerCredencial: false,
      intervaloMinimoMs: INTERVALO_CONSULTA_MS,
    });
    registrarFonte({
      id: this.id,
      nome: this.nome,
      baseURL: this.baseURL,
      tipo: 'vagas-remotas',
      modo: 'leitura',
      atribuicaoExigida: true,
      descobertoEm: new Date().toISOString(),
    });
  }

  async consultar(opcoes = {}) {
    const limite = limiteSeguro(opcoes.limit);
    if (!this.podeConsultarAgora()) {
      return { sucesso: false, bloqueadaPorRateLimit: true, fonte: this.id };
    }
    this.ultimaConsulta = Date.now();
    this.status = 'CONSULTANDO';
    try {
      const dados = await consultarJson(this.baseURL);
      const itens = Array.isArray(dados?.data) ? dados.data : [];
      const oportunidades = itens.filter(job => job.remote === true).map(job => criarOportunidadeRemota({
        provider: this.id,
        platform: 'Arbeitnow',
        id: job.slug || job.id,
        title: job.title,
        url: job.url,
        company: job.company_name || job.company,
        location: job.location || 'Remoto',
        category: Array.isArray(job.tags) ? job.tags[0] : '',
        employmentType: Array.isArray(job.job_types) ? job.job_types.join(', ') : '',
        publishedAt: job.created_at || null,
        tags: job.tags,
      }));
      return respostaDaFonte(this, oportunidades, limite);
    } catch (error) {
      return erroDaFonte(this, error);
    }
  }
}

export default ConectorArbeitnow;