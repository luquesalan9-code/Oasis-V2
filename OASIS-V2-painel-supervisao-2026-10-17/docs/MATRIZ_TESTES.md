# MATRIZ DE TESTES — OASIS V2 (Fase 0)

> **Objetivo:** Mapear todos os testes existentes, resultados reais e lacunas.

---

## 1. Resumo Executivo de Testes

| Métrica | Valor |
|---------|-------|
| Framework | Vitest v1.6.1 |
| Arquivos de teste | 4 |
| Total de testes | 28 |
| Testes aprovados | 28 |
| Testes falhando | 0 |
| Duração | 1.28s |
| Comando | `npm test` |
| Resultado | **Passar** (commit: HEAD não existe — V2 não tem git) |

---

## 2. Testes Executados (Resultados Reais)

### 2.1 `npm test` — Output Capturado

```
 RUN  v1.6.1  C:/Users/flqotrem1533/Projetos/Oasis-V2

 ✓ test/unit/config.test.js  (7 tests)   6ms
 ✓ test/security/seguranca.test.js  (10 tests)  19ms
 ✓ test/integration/fluxo.test.js  (7 tests)  25ms
 ✓ test/unit/auth.test.js  (4 tests)  10ms

  Test Files  4 passed (4)
       Tests  28 passed (28)
   Start at  23:04:40
   Duration  1.28s (transform 263ms, setup 1ms, collect 1.08s, tests 60ms, environment 1ms, prepare 962ms)
```

**Estado:** ✅ Todos os 28 testes passam. Nenhuma falha.

### 2.2 `npm run lint` — Resultado

```
> oasis-v2@2.0.0 lint
> eslint src test

ESLint: 8.57.1

ESLint couldn't find a configuration file.
```

**Estado:** ❌ **FALHA** — não há `.eslintrc` ou `eslint.config.js` no projeto.

### 2.3 `npm run typecheck` — Resultado

```
> oasis-v2@2.0.0 typecheck
> tsc --noEmit

tsc: The TypeScript Compiler - Version 5.9.3
[Imprime help completo do tsc — não type-check nada]
```

**Estado:** ❌ **FALHA** — não há `tsconfig.json`. O comando apenas imprime help.

---

## 3. Matriz Detalhada de Testes

### 3.1 `test/unit/config.test.js` — 7 testes ✅

| # | Nome | Resultado | Evidência |
|---|------|-----------|------------|
| 1 | deve ter nome OASIS | ✅ Pass | `expect(config.nome).toBe('OASIS')` |
| 2 | deve ter versão 2.0.0 | ✅ Pass | `expect(config.versao).toBe('2.0.0')` |
| 3 | deve ter porta válida | ✅ Pass | Porta entre 1 e 65535 |
| 4 | deve ter operação em modo PRIVADO por padrão | ✅ Pass | `config.operacao.modo === 'PRIVADO'` |
| 5 | deve iniciar em modo REAL | ✅ Pass | `config.operacao.operacao === 'REAL'` |
| 6 | deve ter JWT secreto configurado | ✅ Pass | `config.seguranca.jwt.secreto.length >= 16` |
| 7 | deve ter rate limit configurado | ✅ Pass | `janelaMs > 0`, `maxRequisicoes > 0` |

### 3.2 `test/unit/auth.test.js` — 4 testes ✅

| # | Nome | Resultado | Evidência |
|---|------|-----------|------------|
| 1 | deve gerar token válido | ✅ Pass | Token é string não-vazia |
| 2 | deve verificar token válido | ✅ Pass | Payload `{usuario: 'teste'}` retornado |
| 3 | deve rejeitar token inválido | ✅ Pass | `verificarToken('token-invalido')` retorna `null` |
| 4 | deve rejeitar token expirado | ✅ Pass | Token com `expiracao: 0` → `null` |

### 3.3 `test/integration/fluxo.test.js` — 7 testes ✅

| # | Nome | Resultado | Evidência |
|----|------|----------|-----------|
| 1 | deve gerar e verificar token válido | ✅ Pass | JWT gerado e verificado |
| 2 | deve analisar e classificar oportunidade | ✅ Pass | lucro=80, roi=400, classificação definida |
| 3 | deve decidir oportunidade executável | ✅ Pass | `decisao.executavel === true` |
| 4 | deve criar processo de oportunidade | ✅ Pass | ID truthy, status='CRIADO', valor=25 |
| 5 | deve registrar worker | ✅ Pass | ID='test-worker', status='DISPONIVEL' |
| 6 | deve executar fluxo completo de simulação | ✅ Pass | 2 processos, lucro=12, processosConcluidos>=2 |
| 7 | deve processar lote de oportunidades | ✅ Pass | 2 processos criados, sucesso=true |

### 3.4 `test/security/seguranca.test.js` — 10 testes ✅

| # | Nome | Resultado | Evidência |
|----|------|----------|-----------|
| 1 | deve registrar lançamento com ID único | ✅ Pass | `lancamento.id` truthy |
| 2 | deve rejeitar ID duplicado | ✅ Pass | `erro: 'ID duplicado'` |
| 3 | deve aprovar lançamento pendente | ✅ Pass | `status: 'APROVADO'` |
| 4 | deve confirmar recebimento | ✅ Pass | `status: 'CONFIRMADO'` |
| 5 | deve conciliar ledger | ✅ Pass | `total: 1`, `pendentes: 1` |
| 6 | deve avaliar confiança de oportunidade | ✅ Pass | `confianca > 0.5`, estado=FINANCIADO |
| 7 | deve detectar fraude em promessa garantida | ✅ Pass | `suspeito: true`, `sinais` contém 'PROMISSA_GARANTIDA' |
| 8 | deve criar solicitação de aprovação | ✅ Pass | ID truthy, status='PENDENTE' |
| 9 | deve aprovar solicitação | ✅ Pass | `status: 'APROVADA'` |
| 10 | deve rejeitar solicitação | ✅ Pass | `status: 'REJEITADA'` |

---

## 4. Testes que NÃO Existem (Gap Analysis)

### 4.1 Domínio — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| API/Servidor | Teste de requisição HTTP (supertest) | ❌ Não existe |
| API/Servidor | Health check público | ❌ Não existe |
| API/Servidor | Login sem credenciais | ❌ Não existe |
| API/Servidor | Endpoints protegidos sem JWT | ❌ Não existe |
| API/Servidor | Rate limiting | ❌ Não existe |
| API/Servidor | Helmet headers | ❌ Não existe |
| API/Servidor | CORS | ❌ Não existe |
| API/Servidor | 404 catch-all | ❌ Não existe |
| API/Servidor | Error handler 500 | ❌ Não existe |
| Operador | `iniciarOperacao` agrega timer | ❌ Não existe |
| Operador | `pararOperacao` limpa timer | ❌ Não existe |
| Operador | `executarCiclo` quando inativo | ❌ Não existe |

### 4.2 Processos — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Processos | Transições de estado válidas | ❌ Não existe |
| Processos | Transições de estado inválidas (rejeitadas) | ❌ Não existe |
| Processos | Idempotência (mesmo externalId) | ❌ Não existe |
| Processos | Recuperação após reinício | ❌ Não existe |
| Processos | Processo em EXECUTANDO sem worker | ❌ Não existe |

### 4.3 Workers — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Workers | Limite de capacidade | ❌ Não existe |
| Workers | `obterWorkerDisponivel` por especialidade | ❌ Não existe |
| Workers | `alocarWorker` / `liberarWorker` | ❌ Não existe |
| Workers | Separação simulação/real | ❌ Não existe |
| Workers | Falha de worker não deixa processo preso | ❌ Não existe |

### 4.4 Persistência — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Persistência | `persistirEstado` cria diretório | ❌ Não existe |
| Persistência | `carregarEstado` restaura estado | ❌ Não existe |
| Persistência | Snapshot contém contadores | ❌ Não existe |
| Persistência | Corrupção do JSON | ❌ Não existe |

### 4.5 Financeiro — Parcialmente Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Ledger | Duplicidade de lançamentos | ✅ Sim (lead-1 duplicado) |
| Ledger | Aprovação | ✅ Sim |
| Ledger | Confirmação recebimento | ✅ Sim |
| Ledger | Conciliação | ✅ Sim |
| Ledger | Saldo por conta/moeda | ❌ Não existe |
| Ledger | Reversão/estorno | ❌ Não existe |
| Ledger | Conversão de moedas | ❌ Não existe |

### 4.6 Radar/Conectores — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Radar | Deduplicação de oportunidades | ❌ Não existe |
| Radar | Expiração de oportunidades | ❌ Não existe |
| Radar | `normalizarOportunidade` campos variados | ❌ Não existe |
| Radar | `avaliarElegibilidadeOperacional` | ❌ Não existe |
| Conectores | GitHub (mock de HTTP) | ❌ Não existe |
| Conectores | Rate limit do conector | ❌ Não existe |
| Conectores | Conector inválido | ❌ Não existe |

### 4.7 Simulação — Parcialmente Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Simulação | Fluxo completo (éxito) | ✅ Sim |
| Simulação | Fluxo com falhas | ❌ Não existe |
| Simulação | Resultados simulados ≠ receita real | ❌ Não existe |
| Simulação | Isolamento de dados simulados | ❌ Não existe |

### 4.8 Segurança — Parcialmente Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Auth | Login válido gera token | ✅ Sim (via JWT) |
| Auth | Login inválido rejeita | ❌ Não existe |
| Auth | Senha em plaintext | ⚠️ Confirmado (não testado) |
| Auth | bcrypt não usado | ⚠️ Confirmado (não testado) |
| Auth | MFA / revogação | ❌ Não existe |
| Fraud | Detecção de fraude | ✅ Sim |
| Fraud | Sinais de fraude | ✅ Sim |
| Aprovação | Ação irreversível requer aprovação | ✅ Sim (avaliarRiscoAcao) |
| Aprovação | Aprovação/rejeição | ✅ Sim |

### 4.9 Interface — Não Cobertos

| Área | Teste necessário | Status |
|------|-----------------|--------|
| Interface | Módulo carrega | ❌ **FALHA** — import quebrado (`'./src/logs/logger.js'`) |
| Interface | Navegação | ❌ Não existe |
| Interface | HTML gerado | ❌ Não existe |

---

## 5. Cobertura de Código

| Métrica | Valor |
|---------|-------|
| Linhas de código V2 (`src/`) | ~1,400 aprox. |
| Linhas testadas | ~200 (via testes de integração) |
| Cobertura estimada | < 15% |
| `npm run test:coverage` | Definido mas **não configurado** (`@vitest/coverage` não instalado) |

### 5.1 Arquivos NÃO cobertos por testes

| Arquivo | Testado? |
|--------|----------|
| `src/core/config.js` | ✅ |
| `src/core/estado.js` | Parcial (via beforeEach) |
| `src/core/mineradora.js` | Parcial |
| `src/core/operacao.js` | ❌ |
| `src/security/auth.js` | ✅ (JWT parte) |
| `src/security/rateLimit.js` | ❌ |
| `src/security/validacao.js` | ❌ |
| `src/logs/logger.js` | Parcial (via side-effects) |
| `src/radar/radarGlobal.js` | Parcial |
| `src/radar/confianca.js` | ✅ |
| `src/conectores/*` | ❌ |
| `src/validacao/validador.js` | ❌ |
| `src/analise/analisador.js` | Parcial |
| `src/decisao/decisor.js` | Parcial |
| `src/processos/processManager.js` | Parcial |
| `src/workers/workerManager.js` | Parcial |
| `src/orquestrador/orquestrador.js` | Parcial |
| `src/simulacao/simulador.js` | ❌ Removido do runtime |
| `src/financeiro/ledger.js` | ✅ |
| `src/financeiro/motorFinanceiro.js` | Parcial (via analise) |
| `src/aprovacao/fluxoAprovacao.js` | ✅ |
| `src/candidatura/seletor.js` | ❌ |
| `src/persistencia/persistencia.js` | ❌ |
| `src/monitoramento/monitor.js` | ❌ |
| `src/interface/interface.js` | ❌ (não importa) |
| `src/api/servidor.js` | ❌ |
| `src/api/rotas.js` | ❌ |

---

## 6. Scripts de Teste V1 (não portados)

A V1 possui testes standalone (não framework):

| Arquivo V1 | Tipo | Descrição (parcial) |
|-----------|------|---------------------|
| `test_ciclo_v1.mjs` | Integração | Teste de ciclo completo V1 |
| `test_ciclo_v1.backup.mjs` | Backup | Versão backup |
| `test_fix.mjs` / `.cjs` | Debug | Testes de correção |
| `test_flow.mjs` | Integração | Flow test |
| `test_simple.cjs` | Debug | Teste simples |
| `teste-integracao-positiva.mjs` | Integração | Teste positivo |
| `teste-cerebro-integracao.mjs` | Integração | Cérebro integração |
| `check_import*.cjs` (x4) | Debug | Verificação de imports |
| `fix_import*.cjs` (x3) | Debug | Correção de imports |
| `fix_orquestrador*.cjs` (x2) | Debug | Correção orquestrador |
| `analyze-bounties.js` | Script | Análise de bounties |

**Status V1:** Nenhum teste executado (V1 é somente-leitura, e NÃO tem script `test` ou framework configurado).
