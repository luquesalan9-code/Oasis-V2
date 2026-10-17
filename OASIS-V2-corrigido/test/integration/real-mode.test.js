import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/core/config.js';
import { estado } from '../../src/core/estado.js';
import radar from '../../src/radar/radarGlobal.js';
import { limparProcessos } from '../../src/processos/processManager.js';
import { executarCicloReal } from '../../src/orquestrador/orquestrador.js';

const modoOriginal = config.operacao.operacao;
const simulacaoOriginal = config.simulacao.ativa;

afterEach(() => {
  config.operacao.operacao = modoOriginal;
  config.simulacao.ativa = simulacaoOriginal;
  vi.unstubAllGlobals();
  radar.limparRadar();
  limparProcessos();
  estado.contadores.ciclosExecutados = 0;
});

describe('Descoberta em modo REAL', () => {
  it('consulta a fonte ao vivo, enfileira e mantém execução externa bloqueada', async () => {
    config.operacao.operacao = 'REAL';
    config.simulacao.ativa = false;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{
          id: 8675309,
          title: 'Bounty: $42 for fixing the issue',
          body: 'Example issue for a mocked response.',
          html_url: 'https://github.com/example/project/issues/42',
          state: 'open',
          created_at: '2026-01-01T00:00:00Z',
          user: { login: 'example' },
        }],
      }),
    }));

    const result = await executarCicloReal();

    expect(result.sucesso).toBe(true);
    if (!('processos' in result)) return;
    expect(result.modo).toBe('REAL_DESCOBERTA');
    expect(result.descobertas).toBe(1);
    expect(result.novosProcessos).toBe(1);
    expect(result.processos[0].dadosOportunidade.execucaoPermitida).toBe(false);
    expect(result.processos[0].dadosOportunidade.automacaoPermitida).toBe(false);
  });

  it('recusa iniciar descoberta real se simulação estiver ativa', async () => {
    config.operacao.operacao = 'REAL';
    config.simulacao.ativa = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await executarCicloReal();

    expect(result.sucesso).toBe(false);
    expect(result.erro).toContain('CICLO_REAL_BLOQUEADO');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
