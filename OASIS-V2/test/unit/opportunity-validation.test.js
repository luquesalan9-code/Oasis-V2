import { describe, expect, it } from 'vitest';
import { validarOportunidade, validarLegitimidadePagamento } from '../../src/validacao/validador.js';

describe('validacao de remuneracao e elegibilidade', () => {
  it('nao trata texto com bounty e valor anunciado como prova de pagamento', () => {
    const resultado = validarOportunidade({
      title: 'Bounty: $500',
      valor: 500,
      moeda: 'USD',
      fonteAutorizada: true,
      automacaoPermitida: false,
      execucaoPermitida: false,
      execucaoAutonoma: false,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.legitimidade.motivos).toContain('SEM_EVIDENCIA_OFICIAL_DE_PAGAMENTO');
  });

  it('exige evidência HTTPS marcada como oficial e verificada por um revisor', () => {
    const evidencia = {
      fonteOficial: true,
      verificada: true,
      verificadaPor: 'supervisor-financeiro',
      url: 'https://example.org/terms/payments',
    };
    expect(validarLegitimidadePagamento({ evidenciasPagamento: [evidencia] }).legitimo).toBe(true);
    expect(validarLegitimidadePagamento({ evidenciasPagamento: [{ ...evidencia, url: 'http://example.org/pay' }] }).legitimo).toBe(false);
  });
});
