/** Feed JSON oficial do Remote OK. Somente descoberta; aplicação sempre humana. */
import ConectorBase from './conectorBase.js';
import { registrarFonte } from '../radar/radarGlobal.js';
import {
  consultarJson, criarOportunidadeRemota, erroDaFonte, INTERVALO_CONSULTA_MS,
  limiteSeguro, respostaDaFonte,
} from './jobFeedUtils.js';

export class ConectorRemoteOK extends ConectorBase {
  constructor() {
    super({
      id: 'remoteok',
      nome: 'Remote OK',
      descricao: 'Vagas remotas globais pelo feed JSON público',
      baseURL: 'https://remoteok.com/api',
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
      const itens = Array.isArray(dados) ? dados.filter(item => item && item.id && item.position) : [];
      const oportunidades = itens.map(job => criarOportunidadeRemota({
        provider: this.id,
        platform: 'Remote OK',
        id: job.id || job.slug,
        title: job.position,
        url: job.apply_url || job.url,
        company: job.company,
        location: job.location || 'Remoto',
        category: Array.isArray(job.tags) ? job.tags[0] : '',
        employmentType: Array.isArray(job.tags) ? job.tags.filter(tag => /full.?time|part.?time|contract|freelance/i.test(tag)).join(', ') : '',
        salaryText: job.salary_min || job.salary_max
          ? String(job.salary_min || '?') + '–' + String(job.salary_max || '?') + ' (anual, conforme anúncio)'
          : '',
        publishedAt: job.date || null,
        tags: job.tags,
      }));
      return respostaDaFonte(this, oportunidades, limite);
    } catch (error) {
      return erroDaFonte(this, error);
    }
  }
}

export default ConectorRemoteOK;