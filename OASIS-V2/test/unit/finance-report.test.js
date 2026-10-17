import { beforeEach, describe, expect, it } from 'vitest';
import { estado } from '../../src/core/estado.js';
import { criarProcesso } from '../../src/processos/processManager.js';
import { aprovarLancamento, confirmarRecebimento, limparLedger, registrarLancamento } from '../../src/financeiro/ledger.js';
import { obterRelatorioFinanceiro } from '../../src/monitoramento/monitor.js';

describe('relatorio financeiro sem confundir previsao e recebimento', () => {
  beforeEach(() => {
    estado.processos.clear();
    limparLedger();
  });

  it('nao apresenta valor anunciado nem processo concluido como receita', () => {
    const processo = criarProcesso({ externalId: 'money:unverified', valorBrutoEstimado: 900, custoEstimado: 5 });
    processo.status = 'CONCLUIDO';
    const relatorio = obterRelatorioFinanceiro();
    expect(relatorio.recebimentosConfirmados).toEqual({});
    expect(relatorio.estimativasElegiveis.valorBruto).toBe(0);
  });

  it('só conta recebimentos com aprovação, confirmação e evidência', () => {
    const processo = criarProcesso({ externalId: 'money:eligible', valorBrutoEstimado: 90, custoEstimado: 10 });
    processo.validacao = { valido: true };
    const lancamento = registrarLancamento({
      id: 'receipt-1', tipo: 'credito', conta: 'caixa', moeda: 'USD', valor: 50,
      idempotencyKey: 'receipt:process-1',
    });
    expect(lancamento.sucesso).toBe(true);
    expect(registrarLancamento({ tipo: 'credito', valor: 50, idempotencyKey: 'receipt:process-1' }).sucesso).toBe(false);
    const evidence = {
      fonteOficial: true, verificada: true, verificadaPor: 'reviewer', referencia: 'https://receipt.example/1',
    };
    expect(confirmarRecebimento('receipt-1', evidence).sucesso).toBe(false);
    aprovarLancamento('receipt-1', 'reviewer');
    expect(confirmarRecebimento('receipt-1', 'https://receipt.example/1').sucesso).toBe(false);
    confirmarRecebimento('receipt-1', evidence);

    const relatorio = obterRelatorioFinanceiro();
    expect(relatorio.estimativasElegiveis).toMatchObject({ valorBruto: 90, custo: 10, resultadoLiquido: 80 });
    expect(relatorio.recebimentosConfirmados.USD).toBe(50);
    expect(relatorio.saldoConfirmado.USD).toBe(50);
  });
});
