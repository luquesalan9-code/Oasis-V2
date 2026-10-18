import { describe, expect, it } from 'vitest';
import { criarSupervisaoAgentes, supervisionarOportunidade } from '../../src/agentes/supervisao.js';

const validacaoAprovada = {
  elegibilidade: { elegivel: true },
  legitimidade: { legitimo: true },
  remuneracao: { valido: true },
};
const oportunidadeAprovada = {
  fonteAutorizada: true,
  automacaoPermitida: true,
  execucaoPermitida: true,
  execucaoAutonoma: true,
  valor: 25,
  moeda: 'USD',
  evidenciasPagamento: [{
    fonteOficial: true,
    verificada: true,
    verificadaPor: 'revisor-interno',
    url: 'https://example.com/payment-terms',
  }],
};

describe('supervisao deterministica', () => {
  it('registra os tres verificadores sem conceder autorizacao externa', () => {
    const supervisao = criarSupervisaoAgentes();
    expect(supervisao.ativo).toBe(true);
    expect(supervisao.verificadores).toHaveLength(3);
    expect(supervisao.execucaoExternaAutorizada).toBe(false);
  });

  it('libera oportunidade comprovada somente para a fila local', () => {
    const resultado = supervisionarOportunidade(oportunidadeAprovada, validacaoAprovada);
    expect(resultado.aprovadaParaFila).toBe(true);
    expect(resultado.decisao).toBe('FILA_LOCAL');
    expect(resultado.somenteFilaLocal).toBe(true);
    expect(resultado.execucaoExternaAutorizada).toBe(false);
  });

  it('coloca oportunidades sem permissao e comprovacao em quarentena', () => {
    const resultado = supervisionarOportunidade({ valor: 25 }, {});
    expect(resultado.aprovadaParaFila).toBe(false);
    expect(resultado.decisao).toBe('QUARENTENA');
    expect(resultado.motivos).toContain('PERMISSOES_NAO_COMPROVADAS');
    expect(resultado.motivos).toContain('EVIDENCIA_OFICIAL_NAO_VERIFICADA');
  });
});
