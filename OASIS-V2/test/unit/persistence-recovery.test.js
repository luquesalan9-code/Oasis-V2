import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../../src/core/config.js';
import { estado } from '../../src/core/estado.js';
import { mineradora } from '../../src/core/mineradora.js';
import { criarProcesso, atualizarStatusProcesso, distribuirProcesso } from '../../src/processos/processManager.js';
import { registrarWorker } from '../../src/workers/workerManager.js';
import { registrarLancamento, aprovarLancamento, confirmarRecebimento, listarLancamentos, limparLedger } from '../../src/financeiro/ledger.js';
import radar from '../../src/radar/radarGlobal.js';
import { criarSolicitacaoAprovacao, listarSolicitacoesPendentes, restaurarAprovacoes } from '../../src/aprovacao/fluxoAprovacao.js';
import { carregarEstado, persistirEstado, restaurarEstado, snapshotEstado } from '../../src/persistencia/persistencia.js';

const arquivoOriginal = config.persistencia.arquivo;
const persistenciaOriginal = config.persistencia.ativo;
let diretorioTemporario;

function limparEstadoDeTeste() {
  estado.processos.clear();
  estado.workers.clear();
  Object.keys(estado.contadores).forEach(chave => { estado.contadores[chave] = 0; });
  limparLedger();
  radar.limparRadar();
  restaurarAprovacoes({ solicitacoes: [], contador: 0 });
}

describe('persistência e recuperação segura', () => {
  beforeEach(() => {
    limparEstadoDeTeste();
    diretorioTemporario = mkdtempSync(join(tmpdir(), 'oasis-v2-recovery-'));
    config.persistencia.ativo = true;
    config.persistencia.arquivo = join(diretorioTemporario, 'state.json');
  });

  afterEach(() => {
    limparEstadoDeTeste();
    config.persistencia.arquivo = arquivoOriginal;
    config.persistencia.ativo = persistenciaOriginal;
    rmSync(diretorioTemporario, { recursive: true, force: true });
    mineradora.financeiro.lucroRealizadoTotal = 0;
  });

  it('persiste os módulos operacionais e coloca trabalhos interrompidos em quarentena ao reiniciar', () => {
    registrarWorker({ id: 'worker-1', tipo: 'real', capacidade: 1, executar: async () => ({ sucesso: true }) });
    const processo = criarProcesso({ externalId: 'recovery:1' });
    expect(distribuirProcesso(processo.id, 'worker-1').sucesso).toBe(true);
    expect(atualizarStatusProcesso(processo.id, 'EXECUTANDO').sucesso).toBe(true);
    registrarLancamento({ id: 'ledger-recovery-1', tipo: 'credito', conta: 'caixa', valor: 12 });
    aprovarLancamento('ledger-recovery-1', 'supervisor-test');
    confirmarRecebimento('ledger-recovery-1', {
      fonteOficial: true, verificada: true, verificadaPor: 'supervisor-test', referencia: 'https://receipt.example/1',
    });
    radar.adicionarOportunidade({ externalId: 'radar-recovery-1', fonte: 'teste' });
    criarSolicitacaoAprovacao('acao_teste', { processoId: processo.id });

    expect(persistirEstado().sucesso).toBe(true);
    expect(persistirEstado().sucesso).toBe(true);
    limparEstadoDeTeste();
    const resultado = carregarEstado();

    expect(resultado.sucesso).toBe(true);
    expect(resultado.recuperacao.emQuarentena).toBe(1);
    expect(estado.processos.get(processo.id).status).toBe('QUARENTENA');
    expect(estado.processos.get(processo.id).workerId).toBeNull();
    expect(estado.workers.get('worker-1').processosAtivos).toBe(0);
    expect(listarLancamentos({ status: 'CONFIRMADO' })).toHaveLength(1);
    expect(radar.obterResumoRadar().oportunidades).toBe(1);
    expect(listarSolicitacoesPendentes()).toHaveLength(1);
  });

  it('redige chaves sensíveis de snapshots', () => {
    criarProcesso({ externalId: 'safe:1', apiToken: 'nao-guardar' });
    const snapshot = snapshotEstado();
    expect(snapshot.processos[0].apiToken).toBe('[REDACTED]');
  });

  it('recusa snapshots com versão futura sem modificar o estado atual', () => {
    const processo = criarProcesso({ externalId: 'safe:current' });
    const resultado = restaurarEstado({ schemaVersion: 999, processos: [], workers: [] });
    expect(resultado.sucesso).toBe(false);
    expect(estado.processos.has(processo.id)).toBe(true);
  });
});
