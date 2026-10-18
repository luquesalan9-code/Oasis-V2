import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../../src/core/config.js';
import { estado } from '../../src/core/estado.js';
import { limparProcessos, criarProcesso, atualizarStatusProcesso } from '../../src/processos/processManager.js';
import { registrarWorker } from '../../src/workers/workerManager.js';
import {
  limparIntegracoesExecucaoOficial,
  registrarIntegracaoExecucaoOficial,
} from '../../src/integracoes/execucaoOficial.js';
import { executarProcessoReal } from '../../src/executores/executorReal.js';

const modoOriginal = config.operacao.operacao;
const persistenciaOriginal = config.persistencia.ativo;
const arquivoOriginal = config.persistencia.arquivo;
let diretorioTemporario;

beforeEach(() => {
  estado.processos.clear();
  estado.workers.clear();
  limparIntegracoesExecucaoOficial();
  config.operacao.operacao = 'REAL';
  config.persistencia.ativo = true;
  diretorioTemporario = mkdtempSync(join(tmpdir(), 'oasis-real-executor-'));
  config.persistencia.arquivo = join(diretorioTemporario, 'state.json');
});

afterEach(() => {
  config.operacao.operacao = modoOriginal;
  config.persistencia.ativo = persistenciaOriginal;
  config.persistencia.arquivo = arquivoOriginal;
  limparProcessos();
  estado.workers.clear();
  limparIntegracoesExecucaoOficial();
  if (diretorioTemporario) rmSync(diretorioTemporario, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function criarAdaptador(overrides = {}) {
  const agora = new Date().toISOString();
  return {
    id: 'provider-test',
    plataforma: 'Test Platform',
    endpoint: 'https://api.example.org',
    documentacao: 'https://docs.example.org/api',
    oficial: true,
    escopos: ['submit_work'],
    autorizadoEm: agora,
    termosAvaliadosEm: agora,
    suportaIdempotencia: true,
    enviarResultado: vi.fn().mockResolvedValue({ sucesso: true, idExterno: 'delivery-1' }),
    verificarResultado: vi.fn().mockResolvedValue({
      sucesso: true,
      evidencia: {
        fonteOficial: true,
        verificada: true,
        url: 'https://api.example.org/deliveries/delivery-1',
      },
    }),
    ...overrides,
  };
}

function criarProcessoAprovado() {
  const processo = criarProcesso({
    externalId: 'listing:1',
    fonte: 'test',
    plataforma: 'Test Platform',
    fonteAutorizada: true,
    automacaoPermitida: true,
    execucaoPermitida: true,
    execucaoAutonoma: true,
    dadosOportunidade: {
      externalId: 'listing:1',
      fonte: 'test',
      plataforma: 'Test Platform',
      fonteAutorizada: true,
      automacaoPermitida: true,
      execucaoPermitida: true,
      execucaoAutonoma: true,
    },
    supervisao: { aprovadaParaFila: true },
    autorizacaoExecucao: {
      aprovada: true,
      aprovadaPor: 'admin-test',
      escopo: 'submit_work',
      integracaoId: 'provider-test',
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  atualizarStatusProcesso(processo.id, 'NA_FILA');
  return processo;
}

describe('executor real', () => {
  it('não executa quando não há integração oficial configurada', async () => {
    const processo = criarProcessoAprovado();
    const resultado = await executarProcessoReal(processo.id);

    expect(resultado).toEqual({ sucesso: false, erro: 'INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA' });
    expect(processo.status).toBe('NA_FILA');
  });

  it('bloqueia autorização ausente antes de chamar o worker', async () => {
    const processo = criarProcessoAprovado();
    processo.autorizacaoExecucao = null;
    registrarIntegracaoExecucaoOficial(criarAdaptador());
    const worker = registrarWorker({
      id: 'worker-real-test',
      tipo: 'real',
      executar: vi.fn(),
    });

    const resultado = await executarProcessoReal(processo.id);

    expect(resultado.erro).toBe('AUTORIZACAO_EXTERNA_EXPLICITA_AUSENTE_OU_EXPIRADA');
    expect(worker.executar).not.toHaveBeenCalled();
    expect(processo.status).toBe('NA_FILA');
  });

  it('executa, envia uma vez e conclui somente após prova oficial', async () => {
    const processo = criarProcessoAprovado();
    const adapter = criarAdaptador();
    registrarIntegracaoExecucaoOficial(adapter);
    const worker = registrarWorker({
      id: 'worker-real-test',
      tipo: 'real',
      executar: vi.fn().mockResolvedValue({
        sucesso: true,
        entregaveis: [{ tipo: 'link', nome: 'resultado', sha256: 'ab12' }],
      }),
    });

    const resultado = await executarProcessoReal(processo.id);

    expect(resultado.sucesso).toBe(true);
    expect(worker.executar).toHaveBeenCalledTimes(1);
    expect(adapter.enviarResultado).toHaveBeenCalledTimes(1);
    expect(adapter.verificarResultado).toHaveBeenCalledTimes(1);
    expect(processo.status).toBe('CONCLUIDO');
    expect(processo.resultadoExecucao.status).toBe('COMPROVADO');
    expect(processo.resultadoExecucao.evidencia.url).toBe('https://api.example.org/deliveries/delivery-1');
    expect((await executarProcessoReal(processo.id)).erro).toBe('PROCESSO_FORA_DA_FILA');
  });

  it('manda para quarentena se a integração não confirmar a entrega', async () => {
    const processo = criarProcessoAprovado();
    const adapter = criarAdaptador({
      verificarResultado: vi.fn().mockResolvedValue({ sucesso: false }),
    });
    registrarIntegracaoExecucaoOficial(adapter);
    registrarWorker({
      id: 'worker-real-test',
      tipo: 'real',
      executar: async () => ({ sucesso: true, entregaveis: [{ nome: 'resultado' }] }),
    });

    const resultado = await executarProcessoReal(processo.id);

    expect(resultado.erro).toBe('RESULTADO_SEM_PROVA_OFICIAL');
    expect(processo.status).toBe('QUARENTENA');
    expect(processo.resultadoExecucao.status).toBe('EVIDENCIA_NAO_COMPROVADA');
  });
});