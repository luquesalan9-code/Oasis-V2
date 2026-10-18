# RISCOS E BLOQUEIOS — OASIS V2 (Fase 0)

> **Estado verificado 2026-10-17:** o painel permite consulta real e somente leitura do Radar, e a supervisão determinística envia itens sem permissões/evidências/remuneração para quarentena. A automação contínua segue bloqueada: ainda faltam executor real, integração oficial autorizada e configuração de produção. Os riscos RIS abaixo são um inventário histórico e podem conter observações obsoletas; esta nota é a referência atual até a revisão item a item.

> **Objetivo:** Documentar riscos, bloqueios e decisões pendentes.

> **Atualização 2026-10-17:** A API agora carrega, passa lint e typecheck; o ciclo REAL consulta GitHub em modo somente leitura e exige simulação desligada. Credenciais padrão foram removidas e produção exige segredo JWT forte e hash bcrypt. Ainda faltam persistência durável com recuperação verificada e conectores autorizados para execução/candidatura real; nenhuma ação externa de trabalho ou financeira está implementada.

---

## 1. Classificação de Riscos

| Severidade | Significado |
|-----------|-------------|
| 🔴 CRÍTICO | Compromete segurança, integridade financeira ou pode causar perda de dados |
| 🟠 ALTO | Bloqueia funcionalidade ou causa falha em ambiente de produção |
| 🟡 MÉDIO | Degrada qualidade, mas não impede operação |
| 🟢 BAIXO | Melhoria estética ou de manutenção |

---

## 2. Riscos Críticos (🔴)

### RIS-01: Autenticação em plaintext

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/security/auth.js:27-36` |
| **Descrição** | `autenticarLogin` compara senha em plaintext (`password !== senhaEsperada`). `bcryptjs` está instalada mas **nunca importada**. |
| **Impacto** | Qualquer vazamento de `.env` expõe credenciais diretamente. |
| **Evidência** | Grep: `bcryptjs` não aparece em `src/`. `autenticarLogin` usa `password !== senhaEsperada`. |
| **Status** | Aberto |

### RIS-02: Segredo JWT fraco ou padrão

| Campo | Valor |
|-------|-------|
| **Descrição** | A configuração antiga permitia um segredo previsível. Agora não há segredo padrão em produção e o servidor exige valor configurado com pelo menos 32 caracteres. |
| **Status** | Resolvido no código; configure o segredo forte antes de produção. |

### RIS-03: Senha administrativa padrão

| Campo | Valor |
|-------|-------|
| **Descrição** | O login não aceita mais senha padrão. Em produção exige hash bcrypt configurado. |
| **Status** | Resolvido no código; configure o hash antes de produção. |

### RIS-04: Interface Web não funcional (bug de import)

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/interface/interface.js:5` |
| **Descrição** | `import { info } from './src/logs/logger.js'` — caminho relativo errado. O arquivo está em `src/interface/interface.js`, então o import deveria ser `'../logs/logger.js'`. |
| **Impacto** | Módulo não carrega. Interface web completamente inoperante (apenas HTML estático, sem dados reais da API). |
| **Evidência** | `node --input-type=module -e "import('./src/interface/interface.js')"` → "Cannot find module" |
| **Status** | Aberto |

---

## 3. Riscos Altos (🟠)

### RIS-05: Ciclo automático não executa

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/core/operacao.js:16-24` |
| **Descrição** | `iniciarOperacao()` seta `cicloAtivo = true` e `mineradora.status = 'ATIVA'`, mas **nunca chama `setInterval`** para agendar ciclos periódicos. A função `configurarIntervalo(ms)` apenas define uma variável local. |
| **Impacto** | Sistema não executa ciclos automaticamente. Apenas ciclos manuais via API (`/api/radar/executar`) ou testes funcionam. |
| **Evidência** | Código: `cicloAtivo = true; mineradora.status = 'ATIVA';` — sem nenhum `setInterval`. |
| **Status** | Aberto |

### RIS-06: Persistência sem PostgreSQL

| Campo | Valor |
|-------|-------|
| **Arquivo** | `package.json:22`, `src/persistencia/persistencia.js` |
| **Descrição** | `pg` declarado como dependência mas não importado. Persistência é apenas arquivo JSON local. A V1 usava PostgreSQL como backend principal. |
| **Impacto** | Regressão: sem persistência durável em ambiente cloud. Estado em memória se perde a cada reinício (não há carregamento automático no startup). |
| **Evidência** | Grep: `pg` não importado em `src/`. `persistencia.js` usa apenas `fs`. |
| **Status** | Aberto |

### RIS-07: Logger com bugs de formatação

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/logs/logger.js:8,22,27,30,31` |
| **Descrição** | - `niveis` em vez de `levels` (winston ignora) |
| | - `nivel: config.logs.nivel` em vez de `level:` (transport ignora) |
| | - `mensagem`, `nivel` em vez de `message`, `level` no printf |
| **Impacto** | Logs aparecem como `undefined [undefined] undefined {dados}` — informação perdida. Dificulta debugging e auditoria. |
| **Evidência** | Output de teste: `undefined [undefined] undefined {"servico":"oasis-v2",...}` |
| **Status** | Aberto |

### RIS-08: Sinconf de formato de `mineradora.modulos`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/core/mineradora.js:9` vs `src/core/index.js:18-24` vs `descobrir.js:24` |
| **Descrição** | `inicializarOASIS()` seta `mineradora.modulos = { config: true, estado: true }` (boolean). `descobrir.js` seta `mineradora.modulos[nome] = { nome, status: 'ATIVO' }` (objeto). `start.js` faz `Object.keys(mineradora.modulos)`. |
| **Impacto** | Inconsistência de formato. `Object.keys` funciona em ambos, mas o conteúdo difere. |
| **Status** | Aberto |

### RIS-09: Transições de estado de processos não validadas

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/processos/processManager.js:47-55` |
| **Descrição** | `atualizarStatusProcesso(id, status)` aceita qualquer valor da lista `ESTADOS` sem validar se a transição do status atual para o novo é permitida. A especificação exige: "Transições inválidas devem ser rejeitadas." |
| **Impacto** | Processos podem pular estados críticos (ex: CRIADO → CONCLUIDO sem EXECUTANDO). |
| **Status** | Aberto |

### RIS-10: Nenhum carregamento automático de estado no startup

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/index.js:34-44` |
| **Descrição** | `iniciarOASIS()` chama `inicializarOASIS()`, `criarServidorOASIS()`, `iniciarServidor(app)`, `configurarIntervalo()`, `iniciarOperacao()`. **Nunca chama `carregarEstado()`**. |
| **Impacto** | Após restart, todo estado (processos, workers, financeiro) é perdido. A especificação exige recuperação pós-reinício. |
| **Status** | Aberto |

---

## 4. Riscos Médios (🟡)

### RIS-11: Dependências não utilizadas

| Campo | Valor |
|-------|-------|
| **Arquivo** | `package.json` |
| **Descrição** | 4 dependências instaladas mas não usadas: `pg`, `joi`, `bcryptjs`, `uuid`. |
| **Impacto** | Aumenta superfície de ataque, tamanho do bundle, confusão. `bcryptjs` não usado apesar de ser a solução óbvia para RIS-01. |
| **Evidência** | Grep em `src/`: nenhum `import` de `pg`, `joi`, `bcryptjs`, `uuid`. |
| **Status** | Aberto |

### RIS-12: CORS aberto

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/api/servidor.js:19` |
| **Descrição** | `app.use(cors())` — sem configuration, aceita todas as origens. |
| **Impacto** | Qualquer site pode fazer requisições à API (se o token vazar). |
| **Status** | Aberto |

### RIS-13: Sem versionamento (git)

| Campo | Valor |
|-------|-------|
| **Arquivo** | Raiz V2 |
| **Descrição** | V2 **não tem** `.git/`. Nenhum histórico de versões, sem backup automático, sem rollback. |
| **Impacto** | Perda total em caso de corrupção. A especificação exige versionamento, backup e rollback (Fase 10). |
| **Evidência** | `Test-Path .git` → False. |
| **Status** | Aberto |

### RIS-14: Sem `.gitignore`

| Campo | Valor |
|-------|-------|
| **Arquivo** | Raiz V2 |
| **Descrição** | `.env` com credenciais está exposto. `node_modules/` e `data/` não podem ser ignorados. |
| **Status** | Aberto |

### RIS-15: Sem teste de cobertura

| Campo | Valor |
|-------|-------|
| **Arquivo** | `package.json:13` |
| **Descrição** | `npm run test:coverage` definido mas `@vitest/coverage` não está nas dependências. |
| **Status** | Aberto |

### RIS-16: Estado financeiro duplicado

| Campo | Valor |
|-------|-------|
| **Arquivo** | `core/mineradora.js:10-25` vs `financeiro/ledger.js` |
| **Descrição** | `mineradora.financeiro` contém campos de resumo (receita, custos, lucro) atualizados manualmente pelo simulador. `ledger.js` mantém lançamentos individuais. **Não há reconciliação automática** entre os dois. |
| **Impacto** | Divergência de dados financeiros entre API e ledger. |
| **Status** | Aberto |

### RIS-17: `operacao.js` — `configurarIntervalo` não usa `config.operacao.intervaloCicloMs`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/core/operacao.js:12-14` vs `src/index.js:40` |
| **Descrição** | `index.js` chama `configurarIntervalo(config.operacao.intervaloCicloMs)`, mas a função usa o valor global default de 5000ms. Como o setInterval não existe, o problema é teórico. |
| **Status** | Aberto |

---

## 5. Riscos Baixos (🟢)

### RIS-18: `descobrir.js` importa radar como default

| Campo | Valor |
|-------|-------|
| **Arquivo** | `descobrir.js:13` |
| **Descrição** | `import radar from './src/radar/radarGlobal.js'` — importa o default export. Funciona, mas o named export `obterResumoRadar` também é importado no `rotas.js`. Pequena confusão de estilo. |
| **Status** | Aberto |

### RIS-19: Hardcoded values in `obterResumoOrquestrador`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/core/mineradora.js:47` |
| **Descrição** | `router.get('/api/config', ...)` retorna `config: { nome: mineradora.status, versao: '2.0.0', operacao: mineradora.operacao }` — `nome` é setado com `mineradora.status` (campo errado). |
| **Status** | Aberto |

---

## 6. Bloqueios para Operação Real

| Bloqueador | Descrição |
|-----------|-----------|
| 🔴 SEM AUTH HASH | Senhas em plaintext |
| 🔴 SEM GIT | Sem backup/versionamento |
| 🔴 SEM PERSISTÊNCIA DURÁVEL | Sem carregamento automático no startup |
| 🔴 SEM INTERFACE FUNCIONAL | Import quebrado |
| 🟠 SEM CICLO AUTOMÁTICO | setInterval não implementado |
| 🟠 SEM TESTES DE API | Nenhum teste HTTP |
| 🟠 SEM TESTES DE SEGURANDA | Apenas JWT + ledger testados |
| 🟠 SEM TESTES DE RECOVERY | Sem restore após reinício |
| 🟠 SEM COBERTURA | < 15% de cobertura de código |
| 🟠 SEM LINT CONFIG | ESLint não configurado |
| 🟠 SEM TSCONFIG | TypeScript não configurado |

---

## 7. Bloqueios para Fases Futuras

| Próxima Fase | Bloqueio que deve ser resolvido antes |
|-------------|--------------------------------------|
| Fase 1 (Core) | RIS-05 (ciclo automático), RIS-10 (carregamento estado) |
| Fase 2 (Persistência) | RIS-06 (PostgreSQL), RIS-13 (git), RIS-14 (.gitignore) |
| Fase 3 (Radar) | RIS-11 (deps não usadas), conectores Freelancer/AgentBounties |
| Fase 4 (Financeiro) | RIS-16 (duplicidade financeira), conversão de moedas |
| Fase 5 (Interface) | RIS-04 (import quebrado), todos os testes de API |
| Fase 6 (Operação real) | RIS-01 (plaintext), RIS-02 (JWT fraco), RIS-03 (senha fraca), RIS-09 (transições) |
| Fase 7 (Evolução) | RIS-13 (git), RIS-15 (cobertura) |

---

## 8. Decisões Pendentes (não resolvidas na inspeção)

| Decisão | Pergunta | Status V1 | Status V2 |
|---------|----------|-----------|-----------|
| D-01 | Qual a fonte de dados primária? | PostgreSQL (`DATABASE_URL`) | Apenas arquivo JSON | Por resolver |
| D-02 | Como fazer backup automático? | Não identificado | Não implementado | Por resolver |
| D-03 | Onde rodar a V2 em produção? | Render (mencionado na spec) | Não definido | Por resolver |
| D-04 | Como autenticação multi-fator? | Não implementado | Não implementado | Por resolver |
| D-05 | Qual o limite de gasto diário? | Não implementado | Não implementado | Por resolver |
| D-06 | Como fazer rollback de versão? | Não implementado | Não implementado | Por resolver |
| D-07 | Como validar integrações oficiais? | Freelancer, AgentBounties, GitHub | Apenas GitHub (sem mock) | Por resolver |
| D-08 | Como testar sem credenciais reais? | Não identificado | Não implementado | Por resolver |

> **Nota:** Não inventamos decisões ou receitas. Cada item acima é uma lacuna identificada, não uma solução proposta.

