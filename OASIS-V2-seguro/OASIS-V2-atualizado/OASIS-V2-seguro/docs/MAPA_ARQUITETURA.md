# MAPA DE ARQUITETURA — OASIS V2 (Fase 0)

> **Objetivo:** Mapear a arquitetura do V2, comparar com a V1 e com a especificação mestra.

---

## 1. Arquitetura Física — V2

```
┌─────────────────────────────────────────────────────────────┐
│                        PACKAGE.JSON                         │
│  Entry: src/index.js  |  Type: ES Modules  |  Node >= 20    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        src/index.js                          │
│  inicializarOASIS() → estado global                          │
│  criarServidorOASIS() → Express app                          │
│  iniciarOASIS() → app + server + ciclo                       │
└────────┬───────────────┬───────────────┬──────────────────┘
         │               │               │
         ▼               ▼               ▼
  ┌───────────┐   ┌───────────┐   ┌───────────┐
  │  CORE     │   │  API      │   │  SECURITY │
  │ config    │   │ servidor  │   │ auth      │
  │ estado    │   │ rotas     │   │ rateLimit │
  │ mineradora│   │           │   │ validação │
  │ operacao  │   │           │   │           │
  └────┬──────┘   └────┬──────┘   └─────┬─────┘
       │               │                 │
       │               │            (JWT middleware)
       │               │                 │
       ▼               ▼                 │
  ┌───────────┐   ┌───────────┐         │
  │  LOGS     │   │  ROTAS    │         │
  │ Winston   │   │ /health   │◀────────┘
  │ (buggy)   │   │ /auth/login
  └───────────┘   │ /api/*    │
                  │  23 routes│
                  └────┬──────┘
                       │
         ┌─────────────┼──────────────┬──────────────┐
         ▼             ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ ORQUESTR │  │ PROCESSOS│  │ WORKERS  │  │ PERSIST. │
  │ orquest.  │  │ procMgr  │  │ mgr      │  │ snapshot │
  └────┬─────┘  └──────────┘  └──────────┘  └──────────┘
       │
       ├──► RADAR (radarGlobal)
       │    ├── FONTES (Map)
       │    ├── NORMALIZAÇÃO
       │    ├── DEDUPLICAÇÃO
       │    └── ELEGPUIBILIDADE
       │
       ├──► CONECTORES
       │    ├── base (classe)
       │    └── github (ATIVO)
       │
       ├──► DECISÃO (decisor)
       │    └── ANALISE (analisador)
       │        └── FINANCEIRO (motorFinanceiro)
       │
       ├──► SIMULAÇÃO (simulador)
       │
       ├──► VALIDAÇÃO (validador)
       │    └── RADAR/confianca
       │
       ├──► APROVAÇÃO (fluxoAprovacao)
       │    └── CANDIDATURA (seletor)
       │
       ├──► FINANCEIRO (ledger)
       │
       └──► MONITORAMENTO (monitor)
              └── INTERFACE (interface.js — estrutura apenas)

```

### 1.1 Fluxo de Dados Principal (V2)

```
Descoberta (GitHub) → Conector → Radar Global → Normalização → Deduplicação
    → Processos (criarProcessoDeOportunidade)
    → Decisão (decidirOportunidade) → Análise (analisarEClassificar)
    → Worker (alocarWorker) → Simulação (simularFluxoCompleto)
    → Resultado → Financeiro (ledger) → Monitoramento
    → Persistência (persistirEstado → JSON)
```

### 1.2 Ciclo Automático (`operacao.js`)

```
configurarIntervalo(ms)   → define intervaloCicloMs
iniciarOperacao()          → seta cicloAtivo=true, status='ATIVA'
                            → BUG: nunca chama setInterval()
pararOperacao()            → limpa timer (se existir), status='PARADA'
```

> **Crítica:** O ciclo nunca é agendado via `setInterval`. `executarCicloRadar` e `executarCicloOrquestrador` só rodam manualmente (via API `/api/radar/executar` ou via teste).

---

## 2. Arquitetura Lógica — V2

### 2.1 Camada de Infraestrutura

| Componente | Tecnologia | Observação |
|-----------|-----------|------------|
| Servidor web | Express 4.x | `api/servidor.js` |
| HTTP | Node.js nativo `fetch` | Usado em `conectores/github.js` |
| Banco de dados | **Nenhum** | `pg` declarado mas não usado. Persistência via arquivo JSON. |
| Cache | `Map` (in-memory) | `estado.workers`, `estado.processos`, `fontes`, `oportunidades` |
| Logs | Winston 3 | Custom transport (buggy) |

### 2.2 Camada de Domínio

| Módulo | Responsabilidade | Portado da V1? |
|--------|-----------------|----------------|
| Core (config, estado, mineradora, operacao) | Configuração, estado global, ciclo de vida | Sim (refatorado) |
| Radar (radarGlobal, confianca) | Fontes, normalização, deduplicação, confiança | Sim (radarGlobal) + novo (confianca) |
| Conectores (base, github, gerenciador) | Abstração de fontes externas | **Novo** (V1 usa `integracoes/`) |
| Validação | Remuneração, elegibilidade, legitimidade | **Novo** (V1 não tinha) |
| Análise | ROI, score, classificação | Sim |
| Decisão | Executar/avali/agerar/rejeitar | Sim |
| Processos | Ciclo de vida, estados | Sim (simplificado) |
| Workers | Capacidade, alocação, tipos | Sim (simplificado) |
| Orquestrador | Ciclo completo | Sim (simplificado) |
| Simulação | End-to-end | Sim (substitui motorTempo + motorResultado) |
| Financeiro | Ledger, cálculos | Sim (ledger é novo) |
| Aprovação | Fluxo humano | **Novo** |
| Candidatura | Seleção + preparo | **Novo** |
| Persistência | JSON local | Sim (V1 tinha PostgreSQL + fallback) |
| Monitoramento | Métricas, saúde | **Novo** |
| Interface | Metadados de navegação | **Novo** (apenas skeleton) |
| Security | Auth, rate-limit, validação | **Novo** (V1 tinha nada) |

### 2.3 Módulos V1 com arquitetura mais avançada (não portados)

A V1 tinha uma arquitetura mais modular em certos aspectos:

```
V1 Integracoes:
    ├── integracoes/gerenciadorIntegracoes.js
    ├── integracoes/inicializarIntegracoes.js
    ├── integracoes/github/    (githubApi + githubOportunidades)
    ├── integracoes/freelancer/ (freelancerApi + freelancerOportunidades)
    └── integracoes/agentBounties/ (3 arquivos)

V1 Inteligencia:
    ├── inteligencia/inteligencia.js
    ├── inteligencia/aprendizado.js
    ├── inteligencia/descobridorFontes.js
    ├── inteligencia/metaInteligencia.js
    ├── inteligencia/normalizadorUniversal.js
    ├── inteligencia/registroFontes.js
    └── inteligencia/index.js

V1 Cerebro (6 módulos):
    ├── cerebro/cerebroCentral.js
    ├── cerebro/alocacaoCapacidade.js
    ├── cerebro/avaliacaoOportunidades.js
    ├── cerebro/gerenciadorCapacidade.js
    ├── cerebro/rankingAlocacao.js
    ├── cerebro/selecaoCapacidade.js
    └── cerebro/sincronizacaoCapacidade.js
```

O V2 substituiu `inteligencia/`, `integracoes/` e `cerebro/` com versões simplificadas:
- `conectores/` ≈ parcial substituto de `integracoes/`
- `analise/` + `decisao/` ≈ parcial substituto de `cerebro/`
- `radar/radarGlobal.js` ≈ parcial substituto de `radar/radarGlobal.js` (V1)

---

## 3. Matriz de Responsabilidades vs. Especificação

| Componente (Adendo V2 §2) | Implementado no V2 | Arquivo | Gap |
|---------------------------|-------------------|---------|-----|
| Cerebro Central OASIS | Parcial | `decisao/decisor.js`, `analise/analisador.js` | Não há coordenação única. |
| Radar Econômico Global | Parcial | `radar/radarGlobal.js`, `conectores/github.js` | Apenas GitHub. Sem Freelancer/AgentBounties. |
| Avaliador Econômico | Parcial | `analise/analisador.js` | Estima lucro, não verifica liquidez real. |
| Validador de Oportunidades | Sim | `validacao/validador.js` | Não valida API externa. |
| Orquestrador | Parcial | `orquestrador/orquestrador.js` | Não distribui para workers reais. |
| Workers Especializados | Parcial | `workers/workerManager.js` | 4 workers-padrão. Sem especialização real. |
| Motor de Execução | Não | — | Não existe. |
| Gerenciador de Integrações | Parcial | `conectores/gerenciador.js` | Apenas GitHub. |
| Laboratório de Capacidades | Não | — | Não existe. |
| Núcleo Financeiro Universal | Parcial | `financeiro/ledger.js` | Sem conversão de moedas, conciliação externa. |
| Persistência e Filas | Parcial | `persistencia/persistencia.js` | Arquivo JSON local, sem filas. |
| Segurança e Governança | Parcial | `security/*` | Auth plaintext. Sem MFA. |
| Observabilidade | Parcial | `monitoramento/monitor.js`, `logs/logger.js` | Logger com bugs de formatação. |
| Interface Web | Não | `interface/interface.js` | Apenas metadados. HTML estático. Bug de import. |
| Evolução Controlada | Não | — | Não existe. |

---

## 4. Estados de Processos — V2 vs. Especificação

### V2 (`processos/processManager.js`)
```
ESTADOS: CRIADO, FILA, ALOCADO, EXECUTANDO, CONCLUIDO,
         FALHA, CANCELADO, AGUARDANDO, BLOQUEADO,
         REVISAO, REJEITADO, EXPIRADO, RECUPERADO
```
**13 estados** — mais do que a especificação.

### Especificação (Adendo §3)
```
CRIADO → NA_FILA → DISTRIBUIDO → EXECUTANDO →
         VALIDANDO → CONCLUIDO → FALHOU →
         QUARENTENA → PAUSADO → CANCELADO
```
**10 estados** — com nomes diferentes.

### V1 (`processos/processManager.js`)
Status observados em `data/oasis-state.json`:
```
CRIADO, FILA, EXECUTANDO, CONCLUIDO, FALHOU
```

### Divergência
- V2 usa `FILA` e `ALOCADO`; especificação usa `NA_FILA` e `DISTRIBUIDO`.
- V2 tem `REVISAO`, `REJEITADO`, `EXPIRADO`, `RECUPERADO` — não estão na spec.
- **Nenhum módulo V2 valida transições de estado** — `atualizarStatusProcesso` aceita qualquer estado da lista sem checar se a transição é válida.

---

## 5. Segurança — Arquitetura de Defesa em Camadas

```
Request HTTP
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Helmet — headers de segurança    │  ← Implementado (servidor.js:18)
├─────────────────────────────────────┤
│ 2. CORS — configurado aberto        │  ← Implementado (servidor.js:19)
├─────────────────────────────────────┤
│ 3. express-rate-limit — 100 req/min  │  ← Implementado (servidor.js:24)
├─────────────────────────────────────┤
│ 4. express.json — limite 1MB         │  ← Implementado (servidor.js:20)
├─────────────────────────────────────┤
│ 5. JWT Middleware (autenticarRequisicao) │ ← Implementado (rotas.js:43)
├─────────────────────────────────────┤
│ 6. Zod Validation (validacaoProcesso) │ ← Implementado (rotas.js:96)
└─────────────────────────────────────┘
    │
    ▼
Rota específica → Business logic
```

### 5.1 Identidade e Access Control

| Aspecto | V2 | Status |
|--------|----|--------|
| Segredo JWT | Variável local | Sem segredo padrão em produção; configure um valor aleatório forte. |
| Hash de senha | bcrypt configurável | Hash bcrypt obrigatório em produção; sem senha padrão |
| MFA / Passkeys | Nenhum | Não implementado |
| Permissões | `permissao: 'operador'` (hardcoded) | Sem granularidade |

---

## 6. Arquitetura Comparativa: V1 vs V2

### 6.1 Matriz de Comparação

| Aspecto | V1 | V2 | Evolução |
|---------|----|----|----------|
| Versão | 0.1.0 | 2.0.0 | Reescrita |
| Runtime | Node.js >= 20 | Node.js >= 20 | Compatível |
| Módulos | ES Modules | ES Modules | Compatível |
| Arquitetura | Modular monolítica | Modular monolítica | Similar |
| Persistência | PostgreSQL + JSON fallback | JSON apenas | **Regressão** |
| Auth | Nenhuma | JWT | **Melhoria** |
| Validação | Nenhuma | Zod | **Melhoria** |
| Rate limiting | Nenhuma | express-rate-limit | **Melhoria** |
| Security headers | Nenhuma | Helmet | **Melhoria** |
| Aprovação humana | Implícita | Fluxo explícito | **Melhoria** |
| Testes | Scripts standalone (.mjs/.cjs) | Vitest (28 testes) | **Melhoria** |
| CI/CD | Nenhuma | Nenhuma | Nenhuma |
| Docker | Nenhum | Nenhum | Nenhuma |
| Versionamento | Git (.git presente) | **Nenhum** | **Regressão** |
| Documentação | README | README + 5 docs (em criação) | Evoluindo |

### 6.2 Matriz de Cobertura de Módulos

```
Legend: [✓] Implementado | [~] Parcial | [✗] Não implementado

V1 Modules                 V2 Status    V2 Arquivo
────────────────────────────────────────────────
core/config.js             [✓]          core/config.js
core/estado.js             [~]          core/estado.js (diferente estrutura)
core/mineradora.js         [~]          core/mineradora.js (simplificado)
core/operacao.js           [~]          core/operacao.js (bug no setInterval)
api/servidor.js            [✓]          api/servidor.js
api/rotas.js               [~]          api/rotas.js (rotas diferentes)
api/operacao.js            [~]          (mesclado em rotas.js)
workers/workerManager.js   [~]          workers/workerManager.js (simplificado)
processos/processManager.js [~]         processos/processManager.js (simplificado)
orquestrador/orquestrador.js [~]        orquestrador/orquestrador.js (simplificado)
radar/radarGlobal.js       [~]          radar/radarGlobal.js (portado)
radar/radar.js             [✗]          (não portado)
validacao/validador.js     [✓]          validacao/validador.js
analise/analisador.js      [✓]          analise/analisador.js (portado)
decisao/decisor.js         [✓]          decisao/decisor.js (portado)
financeiro/motorFinanceiro.js [~]       financeiro/motorFinanceiro.js (portado)
financeiro/ledger.js       [✓] (new)    financeiro/ledger.js
financeiro/resumoFinanceiro.js [✗]      (não portado)
simulacao/motorTempo.js    [✗]          (não portado)
simulacao/motorResultado.js [✗]          (não portado)
simulacao/simulador.js     [✓] (new)    simulacao/simulador.js
logs/logger.js             [~]          logs/logger.js (com bugs)
persistencia/persistencia.js [~]        persistencia/persistencia.js (sem PG)
inteligencia/ (7 files)    [✗]          (não portado)
integracoes/ (agentBounties) [✗]        (não portado)
integracoes/ (freelancer)  [✗]          (não portado)
integracoes/ (github)      [~]          conectores/github.js (simplificado)
estrategia/ (2 files)      [✗]          (não portado)
economia/ (4 files)        [✗]          (não portado)
executores/ (3 files)      [✗]          (não portado)
oportunidades/ (1 file)    [✗]          (não portado)
pipeline/ (1 file)         [✗]          (não portado)
portfolio/ (1 file)        [✗]          (não portado)
risco/ (1 file)            [✗]          (não portado)
tesouraria/ (1 file)      [✗]          (não portado)
patrimonio/ (1 file)       [✗]          (não portado)
security/ (3 files)        [✓] (new)    security/auth.js, rateLimit.js, validacao.js
interface/ (1 file)        [~]          interface/interface.js (só metadata)
monitoramento/ (1 file)    [✓] (new)    monitoramento/monitor.js
aprovacao/ (1 file)        [✓] (new)    aprovacao/fluxoAprovacao.js
candidatura/ (1 file)      [✓] (new)    candidatura/seletor.js
conectores/ (3 files)      [✓] (new)    conectores/
```

---

## 7. Pontos de Acoplamento e Dependências Entre Módulos

### 7.1 Grafo de Importações (V2)

```
index.js
├── core/config.js
├── core/mineradora.js
│   └── core/estado.js
│   └── logs/logger.js
├── core/operacao.js
│   └── core/mineradora.js
│   └── core/estado.js
│   └── logs/logger.js
├── api/servidor.js
│   ├── core/config.js
│   ├── core/mineradora.js
│   ├── core/estado.js
│   ├── logs/logger.js
│   ├── api/rotas.js
│   └── (helmet, cors, rate-limit, express)
└── api/rotas.js
    ├── security/auth.js → core/config.js
    ├── security/validacao.js → core/config.js
    ├── core/mineradora.js
    ├── core/estado.js
    ├── core/operacao.js
    ├── orquestrador/orquestrador.js → estado, logger, radar, processos, decisao, workers
    ├── workers/workerManager.js → estado, logger
    ├── radar/radarGlobal.js → logger
    ├── validacao/validador.js → logger
    ├── simulacao/simulador.js → estado, mineradora, logger, orquestrador, workers, processos
    ├── persistencia/persistencia.js → estado, mineradora, logger, core/config.js
    └── monitoramento/monitor.js → estado, mineradora, logger, radar
```

### 7.2 Acoplamentos Observados

- `estado.js` é importado por praticamente todos os módulos (central de estado global).
- `logger.js` é importado por todos os módulos.
- `core/mineradora.js` depende de `core/estado.js` e `logs/logger.js`.
- `api/rotas.js` importa 12 módulos — **alta acoplamento**.
- `simulacao/simulador.js` depende de `orquestrador`, `workers`, `processos` — ciclo fechado.
- `interface/interface.js` tem import quebrado — **módulo inutilizável**.

---

## 8. Arquitetura de Testes — V2

```
Vitest (config padrão, sem vitest.config.js)
    │
    ├── test/unit/           → Testes unitários
    │   ├── config.test.js    → 7 testes (Zod config)
    │   └── auth.test.js      → 4 testes (JWT)
    │
    ├── test/integration/    → Testes de integração
    │   └── fluxo.test.js     → 7 testes (simulação end-to-end)
    │
    └── test/security/       → Testes de segurança
        └── seguranca.test.js → 10 testes (ledger, confianca, aprovacao)
```

- **Total:** 28 testes, todos passando.
- **Setup:** `beforeEach` limpa estado (`estado.processos.clear()`, `estado.workers.clear()`, contadores zerados, radar limpo, ledger limpo).
- **Coverage:** `npm run test:coverage` definido mas **não executado** (requer `@vitest/coverage`).

### 8.1 O que NÃO é testado

- API/server (nenhum teste de requisição HTTP)
- Persistência (nenhum teste de save/load)
- Conectores (nenhum teste, GitHub não mockado)
- Interface (não importa — bug de import)
- Operador de ciclo automático (bug do setInterval)
- Rate limiting
- Validação Zod
- Integração externa (nenhuma key/credencial)
- Recovery após reinício
- Idempotência em processos
- Matriz de transições de estado
- Transições inválidas de processos
