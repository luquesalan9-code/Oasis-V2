import { afterEach, describe, expect, it, vi } from 'vitest';
import radar from '../../src/radar/radarGlobal.js';
import { ConectorRemoteOK } from '../../src/conectores/remoteOk.js';
import { ConectorRemotive } from '../../src/conectores/remotive.js';
import { ConectorArbeitnow } from '../../src/conectores/arbeitnow.js';
import GerenciadorConectores from '../../src/conectores/gerenciador.js';
import { estado } from '../../src/core/estado.js';
import { processarOportunidades } from '../../src/orquestrador/orquestrador.js';
import { limparProcessos } from '../../src/processos/processManager.js';

afterEach(() => {
  vi.unstubAllGlobals();
  radar.limparRadar();
  limparProcessos();
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  };
}

describe('fontes globais oficiais do Radar', () => {
  it('registra GitHub e três fontes públicas de vagas remotas', () => {
    const gerenciador = new GerenciadorConectores();

    expect(gerenciador.listarStatus().map(fonte => fonte.id)).toEqual([
      'github', 'remoteok', 'remotive', 'arbeitnow',
    ]);
  });

  it('mantém vagas globais no Radar sem convertê-las em tarefas executáveis', () => {
    const resultado = processarOportunidades([{
      externalId: 'remotive:lead-1',
      fonte: 'remotive',
      plataforma: 'Remotive',
      tipoOportunidade: 'VAGA_REMOTA',
      title: 'Remote role',
      url: 'https://remotive.com/remote-jobs/example',
      fonteAutorizada: true,
      execucaoPermitida: false,
    }]);

    expect(resultado.vagasRemotasRegistradas).toBe(1);
    expect(resultado.total).toBe(0);
    expect(estado.processos.size).toBe(0);
    expect(radar.listarOportunidadesRadar()[0]).toMatchObject({
      tipoOportunidade: 'VAGA_REMOTA',
      titulo: 'Remote role',
      url: 'https://remotive.com/remote-jobs/example',
    });
  });

  it('normaliza o feed Remote OK sem transformar uma vaga em permissão de execução', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([
      { legal: 'atribuir e linkar de volta' },
      {
        id: 123,
        position: 'Remote engineer',
        company: 'Example Co',
        url: 'https://remoteok.com/remote-jobs/example-123',
        date: '2026-10-16T00:00:00Z',
        tags: ['dev', 'contract'],
      },
      { id: 124, position: 'Link inseguro', url: 'javascript:alert(1)' },
    ])));

    const resultado = await new ConectorRemoteOK().consultar({ limit: 10 });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.total).toBe(1);
    expect(resultado.oportunidades[0]).toMatchObject({
      externalId: 'remoteok:123',
      tipoOportunidade: 'VAGA_REMOTA',
      plataforma: 'Remote OK',
      fonteAutorizada: true,
      automacaoPermitida: false,
      execucaoPermitida: false,
      execucaoAutonoma: false,
      requerCandidaturaHumana: true,
    });
    expect(resultado.oportunidades[0].url).toBe('https://remoteok.com/remote-jobs/example-123');
  });

  it('mantém origem e salário anunciado da Remotive sem contá-lo como receita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      jobs: [{
        id: 88,
        title: 'Remote analyst',
        company_name: 'Example Ltd',
        candidate_required_location: 'Worldwide',
        category: 'Data',
        job_type: 'contract',
        salary: 'USD 20/hour',
        publication_date: '2026-10-15',
        url: 'https://remotive.com/remote-jobs/data/remote-analyst-88',
      }],
    })));

    const resultado = await new ConectorRemotive().consultar({ limit: 3 });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.oportunidades[0]).toMatchObject({
      externalId: 'remotive:88',
      empresa: 'Example Ltd',
      localizacao: 'Worldwide',
      remuneracaoAnunciada: 'USD 20/hour',
      valor: 0,
      execucaoPermitida: false,
    });
    expect(radar.listarFontes().find(fonte => fonte.id === 'remotive').atrasoDadosHoras).toBe(24);
  });

  it('inclui somente vagas marcadas como remotas pela Arbeitnow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      data: [
        {
          slug: 'remote-role',
          title: 'Remote researcher',
          company: 'Global Org',
          location: 'Worldwide',
          remote: true,
          url: 'https://example.org/jobs/remote-role',
          tags: ['research'],
        },
        {
          slug: 'office-role',
          title: 'Office role',
          remote: false,
          url: 'https://example.org/jobs/office-role',
        },
      ],
    })));

    const resultado = await new ConectorArbeitnow().consultar({ limit: 10 });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.total).toBe(1);
    expect(resultado.oportunidades[0].externalId).toBe('arbeitnow:remote-role');
    expect(resultado.oportunidades[0].empresa).toBe('Global Org');
  });

  it('recusa resposta acima do limite e registra a fonte com estado de erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'x'.repeat(10_000_001),
    }));

    const conector = new ConectorRemoteOK();
    const resultado = await conector.consultar();

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('RESPOSTA_DA_FONTE_EXCEDE_LIMITE');
    expect(conector.obterStatus().status).toBe('ERRO');
  });
});
