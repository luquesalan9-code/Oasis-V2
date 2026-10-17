/**
 * OASIS V2 - Conector GitHub
 */
import ConectorBase from './conectorBase.js';
import { info, aviso } from '../logs/logger.js';
import { registrarFonte } from '../radar/radarGlobal.js';

export class ConectorGitHub extends ConectorBase {
  constructor() {
    super({
      id: 'github',
      nome: 'GitHub Issues',
      baseURL: 'https://api.github.com',
      requerCredencial: false,
      intervaloMinimoMs: 30000,
    });
    this.status = 'DESCOBERTA';
    registrarFonte({
      id: this.id,
      nome: this.nome,
      baseURL: this.baseURL,
      requerCredencial: this.requerCredencial,
      tipo: 'issues',
      descobertoEm: new Date().toISOString(),
    });
  }

  podeConsultarAgora() {
    if (!this.ultimaConsulta) return true;
    return Date.now() - this.ultimaConsulta >= this.intervaloMinimoMs;
  }

  async consultar(opcoes = {}) {
    const query = opcoes && opcoes.query !== undefined ? opcoes.query : 'bounty OR reward OR paid';
    const limit = opcoes && opcoes.limit !== undefined ? opcoes.limit : 10;

    if (this.requerCredencial && !this.credencialConfigurada) {
      return { sucesso: false, erro: 'CREDENCIAL_NECESSARIA', fonte: this.id, mensagem: 'Credencial necessaria' };
    }

    if (!this.podeConsultarAgora()) {
      return { sucesso: false, bloqueadaPorRateLimit: true, fonte: this.id };
    }

    this.ultimaConsulta = Date.now();
    this.status = 'ATIVO';

    const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query) + '+is:issue+is:open&per_page=' + limit;

    try {
      const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'OASIS-V2-Mineradora',
      };

      const token = process.env.GITHUB_TOKEN;
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }

      const resposta = await fetch(url, { method: 'GET', headers });

      if (!resposta.ok) {
        return {
          sucesso: false,
          fonte: this.id,
          status: resposta.status,
          erro: 'GitHub HTTP ' + resposta.status,
          mensagem: 'GitHub HTTP ' + resposta.status,
        };
      }

      const dados = await resposta.json();
      const itens = Array.isArray(dados.items) ? dados.items : [];

      const oportunidades = [];
      for (const issue of itens) {
        const valor = this.extrairValor(issue);
        if (valor === null || valor <= 0 || valor > 100000) continue;

        oportunidades.push({
          externalId: String(issue.id),
          fonte: 'github',
          origem: 'github',
          plataforma: 'GitHub',
          valor: valor,
          moeda: 'USD',
          custo: 0,
          lucro: valor,
          title: issue.title,
          url: issue.html_url,
          autor: issue.user ? issue.user.login : null,
          status: issue.state,
          criadoEm: issue.created_at,
          dadosOriginais: issue,
          fonteAutorizada: true,
          automacaoPermitida: false,
          execucaoPermitida: false,
          execucaoAutonoma: false,
          descobertaSomente: true,
        });
      }

      info('GITHUB_CONSULTA', 'Encontradas ' + oportunidades.length + ' oportunidades validas', { total: oportunidades.length });
      return { sucesso: true, fonte: this.id, total: oportunidades.length, oportunidades, bloqueadaPorRateLimit: false };
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      aviso('GITHUB_ERRO', msg);
      return { sucesso: false, fonte: this.id, erro: msg, mensagem: msg };
    }
  }

  extrairValor(issue) {
    const texto = (issue.title || '') + ' ' + (issue.body || '');
    const padroes = [
      /(?:USD|\$)\s*([0-9]+(?:[.,][0-9]+)?)/i,
      /([0-9]+(?:[.,][0-9]+)?)\s*(?:USD|USDC|USDT)/i,
      /(?:reward|bounty|prize|payment|paid)[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/i,
    ];

    for (const padrao of padroes) {
      const correspondencia = texto.match(padrao);
      if (correspondencia && correspondencia[1]) {
        const numero = Number(correspondencia[1].replace(',', '.'));
        if (Number.isFinite(numero)) return numero;
      }
    }
    return null;
  }
}

export default ConectorGitHub;
