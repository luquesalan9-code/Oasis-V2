import { describe, it, expect, beforeEach } from "vitest";
import { registrarLancamento, aprovarLancamento, confirmarRecebimento, limparLedger, conciliar } from "../../src/financeiro/ledger.js";
import { avaliarConfianca, detectarFraude, ESTADOS_RECEITA } from "../../src/radar/confianca.js";
import { criarSolicitacaoAprovacao, aprovarSolicitacao, rejeitarSolicitacao } from "../../src/aprovacao/fluxoAprovacao.js";

describe("Seguranca e Ledger V2", () => {
  beforeEach(() => {
    limparLedger();
  });

  it("deve registrar lancamento com ID unico", () => {
    const resultado = registrarLancamento({ tipo: "credito", conta: "caixa", moeda: "USD", valor: 100, origem: "teste" });
    expect(resultado.sucesso).toBe(true);
    expect(resultado.lancamento.id).toBeTruthy();
  });

  it("deve rejeitar ID duplicado", () => {
    registrarLancamento({ id: "led-1", tipo: "credito", valor: 100 });
    const resultado = registrarLancamento({ id: "led-1", tipo: "credito", valor: 200 });
    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe("ID duplicado");
  });

  it("deve aprovar lancamento pendente", () => {
    registrarLancamento({ id: "led-2", tipo: "credito", valor: 50 });
    const aprovar = aprovarLancamento("led-2", "admin");
    expect(aprovar.sucesso).toBe(true);
    expect(aprovar.lancamento.status).toBe("APROVADO");
  });

  it("deve confirmar recebimento", () => {
    registrarLancamento({ id: "led-3", tipo: "credito", valor: 75 });
    aprovarLancamento("led-3", "admin");
    const confirmar = confirmarRecebimento("led-3", { fonteOficial: true, verificada: true, verificadaPor: "reviewer", referencia: "https://example.org/receipt/3" });
    expect(confirmar.sucesso).toBe(true);
    expect(confirmar.lancamento.status).toBe("CONFIRMADO");
  });

  it("deve conciliar ledger", () => {
    registrarLancamento({ id: "led-4", tipo: "credito", valor: 100 });
    const conc = conciliar();
    expect(conc.total).toBe(1);
    expect(conc.pendentes).toBe(1);
  });

  it("deve avaliar confianca de oportunidade", () => {
    const oport = { url: "https://github.com/test/issue/1", valor: 100, autor: "user", criadoEm: "2024-01-01", title: "Fix bug" };
    const avaliacao = avaliarConfianca(oport);
    expect(avaliacao.confianca).toBeGreaterThan(0.5);
    expect(avaliacao.estado).toBe(ESTADOS_RECEITA.FINANCIADO);
  });

  it("deve detectar fraude em promessa garantida", () => {
    const oport = { title: "Easy money guaranteed 100%", valor: 1000 };
    const avaliacao = detectarFraude(oport);
    expect(avaliacao.suspeito).toBe(true);
    expect(avaliacao.sinais).toContain("PROMISSA_GARANTIDA");
  });

  it("deve criar solicitacao de aprovacao", () => {
    const sol = criarSolicitacaoAprovacao("enviar_proposta", { valor: 100 });
    expect(sol.id).toBeTruthy();
    expect(sol.status).toBe("PENDENTE");
  });

  it("deve aprovar solicitacao", () => {
    const sol = criarSolicitacaoAprovacao("enviar_proposta", { valor: 100 });
    const aprovar = aprovarSolicitacao(sol.id, "admin");
    expect(aprovar.sucesso).toBe(true);
    expect(aprovar.solicitacao.status).toBe("APROVADA");
  });

  it("deve rejeitar solicitacao", () => {
    const sol = criarSolicitacaoAprovacao("enviar_proposta", { valor: 100 });
    const rejeitar = rejeitarSolicitacao(sol.id, "admin", ["Valor muito alto"]);
    expect(rejeitar.sucesso).toBe(true);
    expect(rejeitar.solicitacao.status).toBe("REJEITADA");
  });
});

