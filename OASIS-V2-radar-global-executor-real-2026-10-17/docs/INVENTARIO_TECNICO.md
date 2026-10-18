# INVENTÁRIO TÉCNICO — OASIS V2 (Fase 0)

> **Data da auditoria:** 2026-10-10  
> **Projeto:** Mineradora OASIS V2  
> **Diretório V2:** `C:\Users\flqotrem1533\Projetos\Oasis-V2`  
> **Diretório V1 (leitura-only):** `C:\Users\flqotrem1533\Projetos\Oasis`  
> **Node.js:** v24.21.0 | **npm:** 11.19.0  
> **Base do projeto:** ES Modules (`"type": "module"`), Node.js >= 20

> **Nota de atualização:** Este inventário é um retrato histórico de 2026-10-10. Em 2026-10-17 foram corrigidos os bloqueios de inicialização, lint, typecheck, ciclo de descoberta e autenticação padrão. A operação REAL continua limitada à descoberta pública e revisão humana; não executa candidaturas nem tarefas.

---

## 1. Estrutura de Diretórios V2

### 1.1 Diretório raiz (V2)

| Caminho | Tipo | Observação |
|---------|------|------------|
| `.env` | File | Credenciais locais ignoradas pelo Git; não publique este arquivo. |
| `.env.example` | File | Template sem segredos. |
| `package.json` | File | Definição do projeto — 12 dependências, 4 devDependencies. |
| `package-lock.json` | File | Lockfile do npm. |
| `kilo.json` | File | Config de permissões do Kilo (V1 = deny para edit/bash). |
| `README.md` | File | Documentação do projeto (auto-descritiva). |
| `start.js` | File | Entry-point alternativo (`node start.js`). |
| `descobrir.js` | File | Script de descoberta offline (GitHub gratuito). |
| `docs/` | Dir | Especificação mestra + backups. |
| `src/` | Dir | Código-fonte (27 arquivos, 18 subdiretórios). |
| `test/` | Dir | Testes Vitest (4 arquivos, 28 testes). |
| `scripts/` | Dir | **Vazio** — nenhum script. |
| `node_modules/` | Dir | Instalado (ver package-lock). |

> **NÃO** existe `.git/` no V2 — o projeto **não está versionado** sob git.  
> **NÃO** existe `data/` no V2 — o diretório de persistência não foi criado.  
> **NÃO** existe `tsconfig.json` — `npm run typecheck` falha.  
> **NÃO** existe `.eslintrc` ou `eslint.config.js` — `npm run lint` falha.  
> **NÃO** existe `.gitignore`.

### 1.2 Árvore de `src/` (27 arquivos)

```
src/
├── index.js                          # Entry point principal
├── core/
│   ├── config.js                     # Configuração Zod + dotenv
│   ├── estado.js                     # Estado global (Map-based)
│   ├── mineradora.js                 # Estado da mineradora
│   └── operacao.js                   # Start/stop/ciclo
├── security/
│   ├── auth.js                       # JWT (login, token, middleware)
│   ├── rateLimit.js                  # express-rate-limit wrapper
│   └── validacao.js                  # Schema Zod (Processo, Risco)
├── logs/
│   └── logger.js                     # Winston (tem bugs — ver §6)
├── radar/
│   ├── radarGlobal.js                # Fontes, normalização, deduplicação
│   └── confianca.js                  # Avaliação de confiança e fraude
├── conectores/
│   ├── conectorBase.js              # Classe base abstrata
│   ├── github.js                    # Descoberta de issues GitHub
│   ├── remoteOk.js                  # Feed JSON público de vagas remotas
│   ├── remotive.js                  # API pública de vagas remotas
│   ├── arbeitnow.js                 # API pública, filtrada para vagas remotas
│   └── gerenciador.js               # Gerenciador de conectores
├── executores/
│   └── executorReal.js              # Worker real, autorização e evidência
├── integracoes/
│   └── execucaoOficial.js           # Registro de adaptadores oficiais
├── validacao/
│   └── validador.js                  # Remuneração, elegibilidade, legitimidade
├── analise/
│   └── analisador.js                 # ROI, score, classificação
├── decisao/
│   └── decisor.js                    # Decisão de oportunidades
├── processos/
│   └── processManager.js             # Ciclo de vida de processos
├── workers/
│   └── workerManager.js              # Registro, alocação, capacidade
├── orquestrador/
│   └── orquestrador.js               # Ciclo: Radar → Validação → Análise → Processos
├── financeiro/
│   ├── ledger.js                     # Contabilidade com IDs idempotentes
│   └── motorFinanceiro.js            # Cálculos de ROI/margem
├── aprovacao/
│   └── fluxoAprovacao.js             # Fluxo de aprovação humana
├── candidatura/
│   └── seletor.js                    # Seleção e preparo de candidaturas
├── persistencia/
│   └── persistencia.js               # Snapshot/restore JSON (arquivo local)
├── monitoramento/
│   └── monitor.js                    # Métricas, saúde, relatórios
├── interface/
│   └── interface.js                  # Estrutura de navegação (tem bug — ver §6)
├── api/
│   ├── servidor.js                   # Express: helmet, cors, rate-limit
│   └── rotas.js                      # Rotas RESTful (15 protegidas + 2 públicas)
```

### 1.3 Árvore de `test/` (4 arquivos)

```
test/
├── unit/
│   ├── config.test.js                # 7 testes — Configuração
│   └── auth.test.js                  # 4 testes — Autenticação JWT
├── integration/
│   └── fluxo.test.js                 # 7 testes — Fluxo completo
└── security/
    └── seguranca.test.js             # 10 testes — Ledger, confiança, aprovação
```

---

## 2. Inventário de Módulos V2 (por responsabilidade)

| Módulo | Arquivo | Estado | Função principal |
|--------|---------|--------|------------------|
| **Core** | `core/config.js` | Implementado | Configuração via Zod + dotenv. Valida tipo, ambiente, operação, simulação, radar, logs, persistência, segurança (JWT, rate-limit). |
| **Core** | `core/estado.js` | Implementado | Estado global: `Map` de workers/processos, contadores, modulos. Funções: obterContadores, incrementarContador, registrarModulo, limparEstado. |
| **Core** | `core/mineradora.js` | Implementado | Estado da mineradora: status, modulos, financeiro, simulação, operação. Funções: atualizarStatus, obterResumo, registrarModulo. |
| **Core** | `core/operacao.js` | Implementado | Start/stop ciclo. **BUG:** `configurarIntervalo` define o intervalo, mas `iniciarOperacao` nunca chama `setInterval` automaticamente — o ciclo não roda autonomamente. |
| **Security** | `security/auth.js` | Implementado | JWT (gerarToken, verificarToken, autenticarLogin, autenticarRequisicao). Senha em plaintext (não hash). |
| **Security** | `security/rateLimit.js` | Implementado | Wrapper para `express-rate-limit`. **NÃO importado** por `servidor.js` — config inline em vez disso. |
| **Security** | `security/validacao.js` | Implementado | Schemas Zod: ProcessoSchema (14 campos), ConfiguracaoRiscoSchema. |
| **Logs** | `logs/logger.js` | Implementado com bugs | Winston. **BUGS:** `niveis` em vez de `levels`; `nivel` em vez de `level`; `mensagem` em vez de `message`. Output: `undefined [undefined] undefined`. |
| **Radar** | `radar/radarGlobal.js` | Implementado | Fontes (Map), normalização, deduplicação, elegibilidade operacional, busca/enfileirar, resumo, limpar. |
| **Radar** | `radar/confianca.js` | Implementado | ESTADOS_RECEITA (8 estados), avaliarConfianca, detectarFraude (regex). |
| **Conectores** | `conectores/conectorBase.js` | Implementado | Classe base abstrata: id, baseURL, credencial, rate-limit, consultar(). |
| **Conectores** | `conectores/` | Implementado | GitHub Issues, Remote OK, Remotive e Arbeitnow; chamadas públicas somente de leitura. |
| **Executor** | `executores/executorReal.js` | Implementado com gates | Exige worker, adaptador oficial, autorização explícita, idempotência e prova; sem provider registrado por padrão. |
| **Integrações** | `integracoes/execucaoOficial.js` | Implementado como registro | Valida e lista adaptadores oficiais instalados pelo operador; nenhum está conectado no ZIP. |
| **Validação** | `validacao/validador.js` | Implementado | validarRemuneracao, validarElegibilidade, validarLegitimidadePagamento, validarOportunidade. |
| **Análise** | `analise/analisador.js` | Implementado | analisarProcesso, calcularScore, classificarOportunidade, analisarEClassificar. |
| **Decisão** | `decisao/decisor.js` | Implementado | avaliarCapacidadeExecucao, decidirOportunidade, decidirLista, obterMelhoresOportunidades. |
| **Processos** | `processos/processManager.js` | Implementado | criarProcesso, criarProcessoDeOportunidade, atualizarStatus, processarLote, obterResumo, limpar. **BUG:** ESTADOS inclui 13 estados, transição não validada contra matriz da especificação. |
| **Workers** | `workers/workerManager.js` | Implementado | registrarWorker, obterWorker, listarWorkers, obterWorkerDisponivel, alocarWorker, liberarWorker, garantirWorkersPadrao. |
| **Orquestrador** | `orquestrador/orquestrador.js` | Implementado | executarCicloRadar, executarCicloOrquestrador, processarOportunidades, obterResumoOrquestrador. |
| **Simulação** | — | Removido | Runtime aceita somente modo REAL; sem rota ou módulo de simulação. |
| **Financeiro** | `financeiro/ledger.js` | Implementado | registrarLancamento, aprovarLancamento, confirmarRecebimento, obterSaldo, conciliar, limparLedger. IDs idempotentes. |
| **Financeiro** | `financeiro/motorFinanceiro.js` | Implementado | calcularFinanceiro, calcularROI, calcularMargem. |
| **Aprovação** | `aprovacao/fluxoAprovacao.js` | Implementado | criarSolicitacaoAprovacao, aprovarSolicitacao, rejeitarSolicitacao, avaliarRiscoAcao. |
| **Candidatura** | `candidatura/seletor.js` | Implementado | selecionarMelhoresOportunidades, prepararCandidatura, aprovarECandidatar. |
| **Persistência** | `persistencia/persistencia.js` | Implementado | snapshotEstado, restaurarEstado, persistirEstado (JSON local), carregarEstado. **NÃO usa PostgreSQL** — `pg` é dependência não utilizada. |
| **Monitoramento** | `monitoramento/monitor.js` | Implementado | obterMetricas, obterRelatorioFinanceiro, obterRelatorioWorkers, monitorarSaude. |
| **Interface** | `interface/interface.js` | Estrutura com bug | **BUG:** import quebrado (`'./src/logs/logger.js'` → deveria ser `'../logs/logger.js'`). Apenas metadados de navegação e HTML estático. |
| **API** | `api/servidor.js` | Implementado | Express + helmet + cors + rate-limit + error handler. |
| **API** | `api/rotas.js` | Implementado | 17 rotas (2 públicas + 15 protegidas por JWT). |

---

## 3. Inventário de Rotas/API V2

| Método | Rota | Visibilidade | Autenticação | Função |
|--------|------|-------------|-------------|--------|
| GET | `/health` | Pública | Nenhuma | Health check (duplicado no router e no servidor) |
| POST | `/auth/login` | Pública | Nenhuma | Login → JWT token |
| GET | `/api/config` | Protegida | JWT | Config básica |
| POST | `/api/operacao/iniciar` | Protegida | JWT | Iniciar operação |
| POST | `/api/operacao/parar` | Protegida | JWT | Parar operação |
| GET | `/api/operacao/status` | Protegida | JWT | Status da operação |
| GET | `/api/radar` | Protegida | JWT | Resumo do radar |
| POST | `/api/radar/oportunidades` | Protegida | JWT | Processar lote de oportunidades |
| POST | `/api/radar/executar` | Protegida | JWT | Executar ciclo orquestrador |
| GET | `/api/radar/fontes` | Protegida | JWT | Fontes e status dos conectores |
| GET | `/api/radar/oportunidades` | Protegida | JWT | Oportunidades globais descobertas |
| GET | `/api/processos` | Protegida | JWT | Lista de processos |
| GET | `/api/processos/resumo` | Protegida | JWT | Resumo de processos |
| POST | `/api/processos` | Protegida | JWT | Criar processo |
| POST | `/api/processos/:id/executar` | Protegida | JWT | Despachar somente processo já autorizado e com integração registrada |
| GET | `/api/workers` | Protegida | JWT | Lista de workers |
| POST | `/api/workers/registrar` | Protegida | JWT | Registrar worker |
| GET | `/api/financeiro` | Protegida | JWT | Estado financeiro |
| GET | `/api/estado` | Protegida | JWT | Estado geral do sistema |
| POST | `/api/validar/oportunidade` | Protegida | JWT | Validar oportunidade |
| POST | `/api/persistencia/salvar` | Protegida | JWT | Salvar estado |
| POST | `/api/persistencia/carregar` | Protegida | JWT | Carregar estado |
| GET | `/api/monitor/metricas` | Protegida | JWT | Métricas |
| GET | `/api/monitor/financeiro` | Protegida | JWT | Relatório financeiro |
| GET | `/api/monitor/workers` | Protegida | JWT | Relatório de workers |
| GET | `/api/monitor/saude` | Protegida | JWT | Health check interno |
| ANY | `*` | — | — | 404 catch-all |

**Total:** 25 endpoints (2 públicos + 23 protegidos)

> **Observação:** `/api/financeiro` retorna apenas `mineradora.financeiro` (objetos in-memory), não consulta o ledger. `/api/persistencia/salvar` escreve em `./data/oasis-state.json` (diretório não existe — depende de `fs.mkdirSync({recursive: true})`).

---

## 4. Persistência e Estado

### 4.1 V2 — `persistencia/persistencia.js`
- **Tipo:** Arquivo local JSON (`fs.writeFileSync` / `fs.readFileSync`).
- **Caminho:** `./data/oasis-state.json` (definido em `config.persistencia.arquivo`).
- **Snapshot contém:** contadores, processos (array), workers (array), financeiro, simulação, operação.
- **PostgreSQL (`pg`):** declarado como dependência, **não importado**. Persistência é exclusivamente arquivo-local.
- **Diretório `data/`:** **não existe** no V2. Criado sob-demandado por `fs.mkdirSync({ recursive: true })` na escrita.

### 4.2 V1 — `persistencia/persistencia.js`
- **Tipo:** Híbrido — PostgreSQL (`pg.Pool` + `DATABASE_URL`) com fallback para arquivo local.
- **Caminho:** `./data/oasis-state.json`.
- **Estado real persistido:** `data/oasis-state.json` contém 3 processos e 1 worker reais da V1.

### 4.3 Arquivos de estado V1 (lidos, não modificados)

| Arquivo | Conteúdo |
|---------|----------|
| `data/oasis-state.json` | 3 processos (2 CONCLUIDO, 1 FALHOU) + 1 worker (worker-000001, tipo "simulacao"). Salvo em 2026-10-09T03:44:06.775Z. |
| `data/oasis-state.backup.json` | Backup do estado. |
| `backups/` | 2 arquivos de backup de `operacao.js` (antes-correcao-operacao, diagnostico-operacao). |

---

## 5. Inventário de Segurança

| Componente | V2 | V1 | Observação |
|------------|----|----|------------|
| Autenticação | JWT (`jsonwebtoken`) — `auth.js` | **Ausente** | V2 adiciona login/admin. |
| Rate limiting | `express-rate-limit` — `servidor.js` (inline) | **Ausente** | Configurado no servidor, não reutiliza `rateLimit.js`. |
| Headers de segurança | `helmet` | **Ausente** | Adicionado no V2. |
| Validação de entrada | `zod` — `security/validacao.js` | **Ausente** | ProcessoSchema + ConfiguracaoRiscoSchema. |
| Senhas | **Plaintext** (`autenticarLogin` compara strings) | N/A | **Risco:** sem bcrypt/hash. `bcryptjs` instalado mas **não usado**. |
| CORS | `cors` (abre para todos) | `cors` | Sem restrição de origem. |
| Senha administrativa | Variável local | Sem senha padrão; produção exige hash bcrypt. |
| Segredo JWT | Variável local | Sem segredo padrão em produção; configure um valor aleatório forte. |

---

## 6. Dependências — Análise de Uso

### 6.1 Dependências declaradas vs. utilizadas

| Dependência | Versão | Usada? | Importado em |
|-------------|--------|--------|-------------|
| `express` | 4.22.3 | Sim | `api/servidor.js`, `api/rotas.js` |
| `cors` | 2.8.6 | Sim | `api/servidor.js` |
| `pg` | 8.23.1 | **Não** | Nenhum arquivo `src/` importa `pg` |
| `winston` | 3.19.0 | Sim (com bugs) | `logs/logger.js` |
| `express-rate-limit` | 7.5.1 | Sim (inline) | `api/servidor.js` |
| `helmet` | 7.2.0 | Sim | `api/servidor.js` |
| `joi` | 17.13.8 | **Não** | Nenhum arquivo `src/` importa `joi` |
| `jsonwebtoken` | 9.0.3 | Sim | `security/auth.js` |
| `bcryptjs` | 2.4.3 | **Não** | Nenhum arquivo `src/` importa `bcryptjs` |
| `dotenv` | 16.6.1 | Sim | `core/config.js` (`import 'dotenv/config'`) |
| `uuid` | 9.0.1 | **Não** | Nenhum arquivo `src/` importa `uuid` |
| `zod` | 3.25.76 | Sim | `core/config.js`, `security/validacao.js` |

### 6.2 DevDependencies

| Pacote | Versão | Status de configuração |
|--------|--------|----------------------|
| `vitest` | 1.6.1 | Configurado (`npm test`). Funciona. |
| `@types/node` | 20.19.43 | Instalado. |
| `eslint` | 8.57.1 | Instalado, **mas sem arquivo de configuração** — `npm run lint` **FALHA**. |
| `typescript` | 5.9.3 | Instalado, **mas sem `tsconfig.json`** — `npm run typecheck` **FALHA**. |

### 6.3 Dependências não utilizadas (gordura)

- `pg` — declarada, não importada.
- `joi` — declarada, não importada (código usa `zod`).
- `bcryptjs` — declarada, não importada (autenticação usa plaintext).
- `uuid` — declarada, não importada (IDs gerados manualmente com contador).
- `scripts/` — diretório vazio, nenhum script registrado.

---

## 7. Bugs Confirmados por Inspeção/Execução

| # | Arquivo:Linha | Bug | Evidência |
|---|--------------|-----|-----------|
| 1 | `src/interface/interface.js:5` | Import quebrado: `'./src/logs/logger.js'` deveria ser `'../logs/logger.js'` | `node --input-type=module -e "import('./src/interface/interface.js')"` → "Cannot find module 'src/interface/src/logs/logger.js'" |
| 2 | `src/logs/logger.js:8,22` | `niveis` em vez de `levels` (winston ignora a propriedade) | Código lê `niveis,` no createLogger; winston documentação usa `levels` |
| 3 | `src/logs/logger.js:27` | `nivel: config.logs.nivel` em vez de `level:` | Transport console recebe propriedade não reconhecida |
| 4 | `src/logs/logger.js:30,31` | `nivel` e `mensagem` em vez de `level` e `message` no printf | Output de teste: `undefined [undefined] undefined` |
| 5 | `npm run lint` | Falha — não há arquivo de configuração ESLint | `eslint` não encontra `.eslintrc` ou `eslint.config.js` |
| 6 | `npm run typecheck` | Falha — não há `tsconfig.json` | `tsc --noEmit` imprime ajuda em vez de type-check |
| 7 | `src/core/operacao.js` | `iniciarOperacao` não agenda `setInterval` automaticamente | Código: `cicloAtivo = true` mas sem `setInterval`; `configurarIntervalo` apenas define variável |
| 8 | `src/core/mineradora.js:9` | `modulos: {}` (objeto) vs `descobrir.js:24` atribui `{nome, status}` — inconsistência de formato | `inicializarOASIS` seta `mineradora.modulos = {config: true,...}`; `descobrir.js` seta `mineradora.modulos[nome] = {nome, status:'ATIVO'}` |

---

## 8. Funcionalidades Implementadas vs. Especificação (V2)

| Requisito (ESPECIFICACAO_MESTRA §) | Implementado? | Arquivo(s) | Observação |
|-------------------------------------|---------------|------------|------------|
| Core: Config, estado, logs, validação, saúde | **Parcial** | `core/*`, `logs/logger.js` | Logger com bugs de formatação. |
| Radar global: descoberta, normalização, deduplicação | **Sim** | `radar/radarGlobal.js`, `conectores/` | GitHub ativo. Freelancer/AgentBounties não implementados. |
| Validador: remuneração, elegibilidade, legitimidade | **Sim** | `validacao/validador.js` | Valida flags, não verifica API externa. |
| Cérebro: pontuação e priorização | **Sim** | `analise/analisador.js`, `decisao/decisor.js` | Score explicável. |
| Workers: capacidade, carga, especialização | **Sim** | `workers/workerManager.js` | Separa simulação/real. |
| Processos: IDs, idempotência, estados, tentativas | **Parcial** | `processos/processManager.js` | Estados não validam transições (não há matriz). Sem idempotência de processos. |
| Persistência: estado, filas, eventos, lançamentos | **Parcial** | `persistencia/persistencia.js` | Apenas arquivo JSON. Sem PostgreSQL. Sem filas. |
| Segurança: credenciais, validação, auth, rate-limit | **Parcial** | `security/*` | Autenticação plaintext. Sem MFA/passkeys. |
| API e painel | **Parcial** | `api/rotas.js` | API sim funcional. Interface é apenas estrutura/metadata. |
| Simulação | **Não** | — | Removida do runtime por decisão do usuário; somente modo REAL é aceito. |
| Financeiro: receitas, custos, taxas, conversão | **Parcial** | `financeiro/ledger.js`, `financeiro/motorFinanceiro.js` | Ledger com IDs idempotentes. Sem conversão de moedas. |
| Inteligência e evolução | **Não** | — | Módulos `inteligencia/`, `estrategia/`, `economia/` da V1 não portados. |
| Multiusuário futuro | **Não** | — | Não implementado. |
| Infraestrutura cloud | **Não** | — | Nenhum deploy/configuração cloud. |
| Aprovação humana | **Sim** | `aprovacao/fluxoAprovacao.js` | Fluxo de aprovação para ações externas. |

---

## 9. Módulos V1 Não Portados para V2

Inspecionados em `C:\Users\flqotrem1533\Projetos\Oasis` (leitura-only) — **não implementados no V2:**

| Módulo V1 | Arquivo | Função | Status V2 |
|-----------|---------|--------|-----------|
| `agente/agenteOportunidades.js` | V1 | Agente de oportunidades | Não portado |
| `cerebro/` (6 arquivos) | V1 | Cérebro central, alocação, ranking, sincronização, seleção | Parcialmente substituído por `analise/` + `decisao/` |
| `economia/` (4 arquivos) | V1 | Ativos, mercados, moedas, preços | Não portado |
| `estrategia/` (2 arquivos) | V1 | Gerenciador e motor de estratégia | Não portado |
| `executores/` (3 arquivos) | V1 | Executor manager, agentBountiesExecutor, inicialização | Não portado |
| `integracoes/` (agentBounties, freelancer, github) | V1 | APIs de terceiros | Descoberta V2 em `conectores/` (GitHub, Remote OK, Remotive, Arbeitnow); submissão oficial ainda não configurada |
| `inteligencia/` (7 arquivos) | V1 | Aprendizado, descoberta de fontes, normalizador | Não portado |
| `oportunidades/oportunidadeManager.js` | V1 | Gerenciador de oportunidades | Não portado |
| `pipeline/pipelineOasis.js` | V1 | Pipeline orquestral | Não portado |
| `portfolio/portfolioManager.js` | V1 | Gerenciamento de portfolio | Não portado |
| `risco/gerenciadorRisco.js` | V1 | Gestão de risco | Não portado |
| `tesouraria/tesourariaManager.js` | V1 | Tesouraria | Não portado |
| `patrimonio/patrimonioManager` | V1 | **Arquivo sem extensão** | Não portado |
| `radar/radar.js` | V1 | Radar local | Não portado (V2 usa apenas `radarGlobal.js`) |
| `simulacao/motorTempo.js`, `motorResultado.js` | V1 | Motores de tempo e resultado | Não portado (V2 usa `simulador.js`) |
| Root scripts | V1 | `analyze-bounties.js`, `test_*.mjs/cjs`, `check_import*.cjs`, `fix_*.cjs` | Não portado |
