# ESTADO DO PROJETO — OASIS V2 (Fase 0)

> **Data:** 2026-10-10  
> **Fase:** 0 — Auditoria e Inventário  
> **Status da fase:** ✅ **Concluída** (documentação gerada, aguardando início da Fase 1)

---

## 1. Visão Geral do Estado

| Item | Detalhe |
|------|---------|
| Diretório V2 | `C:\Users\flqotrem1533\Projetos\Oasis-V2` ✅ Confirmado |
| Diretório V1 | `C:\Users\flqotrem1533\Projetos\Oasis` ✅ Confirmado (read-only) |
| Arquivo de especificação | `docs/ESPECIFICACAO_MESTRA.md` ✅ Lido integralmente (608 linhas) |
| package.json | ✅ Lido |
| Node.js | v24.21.0 ✅ |
| npm | 11.19.0 ✅ |
| `.env` | ✅ Presente (contém senha admin fraca) |
| `.env.example` | ✅ Presente |
| `.gitignore` | ❌ **Ausente** |
| `tsconfig.json` | ❌ **Ausente** |
| ESLint config | ❌ **Ausente** |
| vitest.config | ❌ Ausente (usa defaults) |

---

## 2. Arquivos Criados Nesta Fase

| Arquivo | Status |
|--------|--------|
| `docs/INVENTARIO_TECNICO.md` | ✅ Criado |
| `docs/MAPA_ARQUITETURA.md` | ✅ Criado |
| `docs/MATRIZ_TESTES.md` | ✅ Criado |
| `docs/RISCOS_E_BLOQUEIOS.md` | ✅ Criado |
| `docs/ESTADO_PROJETO.md` | ✅ Criado (este arquivo) |

> **Nenhum arquivo V1 foi modificado, apagado, movido ou renomeado.**  
> **Nenhum código-fonte V2 foi alterado.**  
> **Nenhuma dependência foi instalada.**  
> **Nenhum commit foi feito (V2 não tem git).**  
> **Nenhum deploy foi realizado.**

---

## 3. Estrutura de Código V2 — Estado por Módulo

| Diretório | Arquivos | Estado | Observação |
|-----------|----------|--------|-----------|
| `core/` | 4 | ✅ Implementado | config, estado, mineradora, operacao |
| `security/` | 3 | ✅ Implementado | auth, rateLimit, validacao |
| `logs/` | 1 | ✅ Implementado (com bugs) | Winston logger com bugs de formatação |
| `radar/` | 2 | ✅ Implementado | radarGlobal, confianca |
| `conectores/` | 3 | ✅ Implementado | base, github, gerenciador |
| `validacao/` | 1 | ✅ Implementado | validador de oportunidades |
| `analise/` | 1 | ✅ Implementado | analisador (ROI, score, classificação) |
| `decisao/` | 1 | ✅ Implementado | decisor |
| `processos/` | 1 | ⚠️ Parcial | Sem validação de transições |
| `workers/` | 1 | ✅ Implementado | workerManager |
| `orquestrador/` | 1 | ✅ Implementado | orquestrador |
| `simulacao/` | 1 | ✅ Implementado | simulador |
| `financeiro/` | 2 | ✅ Implementado | ledger, motorFinanceiro |
| `aprovacao/` | 1 | ✅ Implementado | fluxoAprovacao |
| `candidatura/` | 1 | ✅ Implementado | seletor |
| `persistencia/` | 1 | ⚠️ Parcial | Apenas JSON. Sem PG. Sem auto-load no startup |
| `monitoramento/` | 1 | ✅ Implementado | monitor |
| `interface/` | 1 | ❌ Não funcional | Import quebrado |
| `api/` | 2 | ✅ Implementado | servidor, rotas |
| **Total** | **27** | | |

---

## 4. Testes — Estado

| Métrica | Valor |
|--------|-------|
| Framework | Vitest 1.6.1 |
| Arquivos de teste | 4 |
| Total de testes | 28 |
| Aprovados | 28 ✅ |
| Falhando | 0 ✅ |
| `npm run lint` | ❌ Falha (sem config ESLint) |
| `npm run typecheck` | ❌ Falha (sem tsconfig) |
| `npm run test:coverage` | ❌ Não configurado |

### 4.1 Testes Executados

| Comando | Resultado | Duração |
|---------|-----------|---------|
| `npm test` | ✅ 28/28 passaram | 1.28s |
| `npm run lint` | ❌ ESLint config não encontrado | ~1s |
| `npm run typecheck` | ❌ tsconfig não encontrado | ~1s |

### 4.2 Import Verification

| Módulo | Importável? | Observação |
|--------|-------------|------------|
| `src/index.js` | ✅ Sim | Entry point carrega |
| `src/radar/radarGlobal.js` | ✅ Sim | |
| `src/financeiro/ledger.js` | ✅ Sim | |
| `src/orquestrador/orquestrador.js` | ✅ Sim | |
| `src/logs/logger.js` | ✅ Sim | Mas formatação bugada |
| `src/interface/interface.js` | ❌ Não | Import quebrado: `'./src/logs/logger.js'` |
| `src/conectores/gerenciador.js` | ✅ Sim | |

---

## 5. Estado por Objetivo do Produto (ESPECIFICACAO_MESTRA §4)

| # | Objetivo | Estado V2 | Evidência |
|---|----------|-----------|-----------|
| 1 | Operação privada inicial | ✅ Sim | `OASIS_MODO=PRIVADO` em `.env` |
| 2 | Descoberta de oportunidades | ⚠️ Parcial | Apenas GitHub (sem auth). Freelancer/AgentBounties não implementados. |
| 3 | Priorização por lucro/tempo/risco | ✅ Sim | `analise/analisador.js` + `decisao/decisor.js` |
| 4 | Execução autônoma (autorizada) | ⚠️ Parcial | Ciclo manual via API. Sem setInterval (RIS-05). |
| 5 | Integrações oficiais | ⚠️ Parcial | Apenas GitHub. Freelancer/AgentBounties no roadmap. |
| 6 | Workers, filas, monitoramento | ⚠️ Parcial | Workers implementados. **Sem filas reais.** Monitoramento presente. |
| 7 | Simulação completa | ✅ Sim | `simulacao/simulador.js` testado end-to-end |
| 8 | Motor financeiro | ⚠️ Parcial | Ledger + motor. Sem conversão de moedas. |
| 9 | Inteligência que aprende | ❌ Não | Módulos `inteligencia/` da V1 não portados |
| 10 | Evolução automatizada | ❌ Não | Sem git, sem CI/CD |
| 11 | API e painel | ⚠️ Parcial | API com 23 routes. Painel não funcional (RIS-04). |
| 12 | Multiusuário futuro | ❌ Não | Não implementado (explicitamente futuro) |
| 13 | Operação cloud | ❌ Não | Sem deploy, sem config cloud |
| 14 | Primeiro trabalho remunerado | ❌ Não | Nenhuma integração real ativa |

---

## 6. Estado por Fase de Implementação (ESPECIFICACAO MESTRA §11)

| Fase | Nome | Status | Progresso |
|------|------|--------|-----------|
| 0 | Inventário e preservação | ✅ **Concluída esta auditoria** | 100% da auditoria |
| 1 | Core operacional | 🟡 Parcial (não concluída) | Core existe, mas ciclo não auto-roda (RIS-05) |
| 2 | Persistência e governança | 🔴 Não iniciada | Persistência JSON; sem PG; sem auth hash |
| 3 | Radar verificável | 🟡 Parcial | GitHub ativo; sem validação de fonte externa |
| 4 | Financeiro | 🟡 Parcial | Ledger com IDs idempotentes; sem conciliação externa |
| 5 | Interface | ❌ Não iniciada (bug) | Interface com import quebrado |
| 6 | Operação real controlada | 🔴 Não iniciada | Bloqueada por RIS-01, RIS-02, RIS-03 |
| 7 | Evolução e expansão | 🔴 Não iniciada | Sem git, sem versionamento |
| 8 | Testes integrados | 🟡 Parcial | 28 testes unitários/integration/security; sem API tests |
| 9 | Documentar deploy | ❌ Não iniciada | Sem deploy |

---

## 7. Estado dos Processos e Workers

### 7.1 Workers (V2)

```
Workers padrão (garantirWorkersPadrao):
├── worker-real-1    (tipo: real,      especialização: geral, capacidade: 1)
├── worker-sim-1     (tipo: simulação, especialização: geral, capacidade: 5)
├── worker-sim-2     (tipo: simulação, especialização: coding, capacidade: 5)
└── worker-sim-3     (tipo: simulação, especialização: research, capacidade: 5)
```

- **Total de workers padrão:** 4
- **Workers reais:** 1 (capacidade 1)
- **Workers de simulação:** 3 (capacidade 5 cada)
- **Especializações:** geral, coding, research

### 7.2 Workers (V1 — estado persistido)

```
data/oasis-state.json:
├── worker-000001 (tipo: simulacao, capacidade: 5, status: DISPONIVEL)
│   ├── processosConcluidos: 2
│   └── processosFalhos: 1
```

### 7.3 Processos (V1)

3 processos no estado persistido:
| ID | Status | Resultado | Valor |
|----|--------|-----------|-------|
| OASIS-000001 | CONCLUIDO | SUCESSO | BRL 0.10 |
| OASIS-000002 | FALHOU | FALHA | BRL 0.00 |
| OASIS-000003 | CONCLUIDO | SUCESSO | BRL 0.10 |

### 7.4 Processos (V2)

- **Nenhum processo persistente.** Estado in-memory apenas.
- `estado.processos` é um `Map` vazio no startup.
- Processos são criados via testes (limpos com `beforeEach`).

---

## 8. Estado de Integrações

| Integração | V1 | V2 | Status |
|-----------|----|----|----|
| GitHub | `integracoes/github/` (2 arquivos) | `conectores/github.js` | ✅ Ativo (busca pública, sem auth) |
| Freelancer | `integracoes/freelancer/` (3 arquivos) | Não implementado | ❌ Não portado |
| Agent Bounties | `integracoes/agentBounties/` (3 arquivos) | Não implementado | ❌ Não portado |

### 8.1 Variáveis de Ambiente de Integração

| Variável | V1 | V2 |
|---------|----|----|
| `GITHUB_TOKEN` | Referenciado | Referenciado (`conectores/github.js:60`) |
| `FREELANCER_OAUTH_TOKEN` | — | ❌ Não referenciado |
| `AGENT_BOUNTIES_API_URL` | — | ❌ Não referenciado |
| `DATABASE_URL` | Usado (`persistencia.js:13`) | ❌ Não usado |

---

## 9. Estado de Segurança

| Controle | Estado | Detalhes |
|----------|--------|----------|
| JWT | ✅ Implementado | `jsonwebtoken` HS256 |
| Rate limiting | ✅ Implementado | 100 req/min (inline no servidor) |
| Helmet | ✅ Implementado | Headers de segurança |
| CORS | ⚠️ Aberto | Sem restrição de origem |
| Zod validation | ✅ Implementado | ProcessoSchema, ConfiguracaoRiscoSchema |
| Password hashing | ❌ Ausente | `bcryptjs` instalado mas não usado |
| MFA / Passkeys | ❌ Ausente | Não implementado |
| `.gitignore` | ❌ Ausente | `.env` no repositório |
| Versionamento | ❌ Ausente | Sem `.git/` |

---

## 10. Resumo de Conformidade com ESPECIFICACAO_MESTRA

| Requisito | Atendido | Evidência |
|-----------|----------|-----------|
| "V1 somente leitura" | ✅ | Nenhum arquivo V1 modificado |
| "Node.js, JS, ES Modules" | ✅ | `package.json`: `"type": "module"`, `"engines": {"node": ">=20"}` |
| "Variáveis de ambiente para segredos" | ✅ | `.env` com `dotenv/config` |
| "Usar comandos compatíveis com Windows PowerShell" | ✅ | Testes executados via `npm test` no PowerShell |
| "Não usar aprovação automática" | ✅ | `fluxoAprovacao.js` exige aprovação humana |
| "Fazer backups antes de alterações" | ✅ | V2 não tem alterações. V1 tem `backups/` |
| "Inventário rastreável" | ✅ | Este documento + INVENTARIO_TECNICO.md |
| "Testes de ciclo, integração e segurança" | ⚠️ Parcial | 28 testes; sem testes de ciclo automático, sem testes de API |
| "Não declarar teste aprovado sem executá-lo" | ✅ | Todos os resultados são reais (output capturado) |
| "Não inventar resultados" | ✅ | Bugs documentados; nada inventado |

---

## 11. Métricas de Codebase

| Métrica | V2 | V1 |
|--------|-----|-----|
| Arquivos source | 27 | ~41 (+scripts root) |
| Diretórios source | 18 | 24 |
| Arquivos de teste | 4 | 0 (scripts standalone) |
| Frameworks de teste | Vitest | Nenhum |
| Linhas aproximadas de código (src) | ~1,400 | ~3,500 |
| Dependências runtime | 12 | 3 |
| Dependências dev | 4 | 0 |
| Total de packages instalados | 17 (top-level) | 11 (top-level) |

---

## 12. Próximos Passos — Proposta de Tarefa Pequena

> **A Fase 0 está concluída. Nenhuma implementação foi feita.**

### Proposta para Fase 1 (pequena e focada):

**Corrigir bugs de infraestrutura bloquearantes:**

1. **Fix RIS-04:** Corrigir import em `src/interface/interface.js:5` — `'./src/logs/logger.js'` → `'../logs/logger.js'`.
2. **Fix RIS-07:** Corrigir `src/logs/logger.js` — `niveis` → `levels`, `nivel` → `level`, `mensagem` → `message`.
3. **Criar `.gitignore`** — ignorar `.env`, `node_modules/`, `data/`.
4. **Criar `.eslintrc` ou `eslint.config.js`** — para `npm run lint` funcionar.
5. **Criar `tsconfig.json`** — para `npm run typecheck` funcionar.

**Critério de aceitação:**
- `npm test` → 28/28 passam ✅
- `npm run lint` → sem erros ✅
- `npm run typecheck` → sem erros ✅
- `src/interface/interface.js` importa sem erro ✅
- Winston produz logs com formatação correta ✅
- `.env` não é rastreado por git ✅

### Alternativa (mais focada ainda):

Se a prioridade for segurança antes de tudo:

**Corrigir RIS-01 (auth plaintext):**
1. Implementar `bcryptjs` para hash de senhas no `security/auth.js`.
2. Adicionar teste unitário para login com hash.
3. Remover senha do `.env` e usar hash pré-computado.

---

## 13. Conclusão da Fase 0

A Fase 0 de auditoria e inventário está **completa**. Foram:

- ✅ Lida a `ESPECIFICACAO_MESTRA.md` integralmente (608 linhas)
- ✅ Confirmado diretório V2 (`C:\Users\flqotrem1533\Projetos\Oasis-V2`)
- ✅ Inspecionada estrutura V2 (27 arquivos source, 4 testes, 28 testes passando)
- ✅ Inspecionada V1 em modo read-only (41 arquivos, estado persistido, 3 processos)
- ✅ Executado testes locais (`npm test` → 28/28 passaram)
- ✅ Executado `npm run lint` → falha (sem config)
- ✅ Executado `npm run typecheck` → falha (sem tsconfig)
- ✅ Verificado imports de módulos
- ✅ Identificado 19 riscos (4 críticos, 6 altos, 8 médios, 1 baixo)
- ✅ Criado 5 documentos de auditoria em `docs/`
- ❌ **Nenhum código V1 ou V2 foi modificado**
- ❌ **Nenhuma dependência foi instalada**
- ❌ **Nenhum commit, deploy ou operação externa foi realizada**

**Aguardando início da Fase 1.**
