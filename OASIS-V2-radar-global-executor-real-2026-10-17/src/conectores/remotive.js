/** API pública oficial da Remotive. Respeita atribuição e mantém links de origem. */
import ConectorBase from './conectorBase.js';
import { registrarFonte } from '../radar/radarGlobal.js';
import {
  consultarJson, criarOportunidadeRemota, erroDaFonte, INTERVALO_CONSULTA_MS,
  limiteSeguro, respostaDaFonte,
} from './jobFeedUtils.js';

export class ConectorRemotive extends ConectorBase {
  constructor() {
    super({
      id: 'remotive',
      nome: 'Remotive',
      descricao: 'Vagas remotas internacionais pela API pública',
      baseURL: 'https://remotive.com/api/remote-jobs',
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
      atrasoDadosHoras: 24,
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
      const dados = await consultarJson(this.baseURL + '?limit=' + limite);
      const itens = Array.isArray(dados?.jobs) ? dados.jobs : [];
      const oportunidades = itens.map(job => criarOportunidadeRemota({
        provider: this.id,
        platform: 'Remotive',
        id: job.id,
        title: job.title,
        url: job.url,
        company: job.company_name,
        location: job.candidate_required_location || 'Remoto',
        category: job.category,
        employmentType: job.job_type,
        salaryText: job.salary,
        publishedAt: job.publication_date || null,
        tags: job.tags,
      }));
      return respostaDaFonte(this, oportunidades, limite);
    } catch (error) {
      return erroDaFonte(this, error);
    }
  }
}

export default ConectorRemotive;