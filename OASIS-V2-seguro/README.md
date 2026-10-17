# Mineradora OASIS V2 - Documentacao

## Arquitetura

```
src/
  core/          - Configuracao, estado, mineradora, operacao
  security/      - Autenticacao JWT, rate limiting, validacao Zod
  logs/          - Logger estruturado Winston
  radar/         - Radar global, normalizacao, deduplicacao, confianca
  conectores/    - Conector base, GitHub, gerenciador
  validacao/     - Validador de remuneracao, elegibilidade, legitimidade
  analise/       - Analisador de oportunidades (ROI, score, classificacao)
  decisao/       - Decisor de oportunidades
  processos/     - Gerenciador de processos e estados
  workers/       - Worker manager, especializacoes
  orquestrador/  - Ciclo: Radar -> Validacao -> Analise -> Decisao -> Fila -> Worker
  simulacao/     - Simulador end-to-end
  candidatura/   - Selecao e preparo de candidaturas
  aprovacao/     - Fluxo de aprovacao humana
  financeiro/    - Motor financeiro, ledger, relatorios
  persistencia/  - Salvamento e restauracao de estado
  monitoramento/ - Metricas, saude, relatorios
  interface/     - Estrutura do painel web
  api/           - Servidor Express, rotas protegidas
```

## Conectores

### GitHub Issues (ATIVO)
- API oficial: https://api.github.com/search/issues
- Sem credencial necessaria (10 req/hora)
- Com GITHUB_TOKEN: 30 req/min
- Normaliza: valor, moeda, URL, autor, prazo
- Deduplicacao por externalId
- Filtro de valores suspeitos (> $100.000)

### Freelancer (BLOQUEADO)
- Requer: FREELANCER_OAUTH_TOKEN
- Status: Estrutura pronta, desativado

### Agent Bounties (BLOQUEADO)
- Requer: AGENT_BOUNTIES_API_URL + autenticacao
- Status: Estrutura pronta, desativado

## Fluxo de Aprovacao

1. Descoberta: Conector GitHub consulta issues
2. Normalizacao: Deduplicacao, extracao de valor
3. Analise: ROI, margem, lucro por minuto, score
4. Decisao: Classificacao EXCELENTE/MUITO_BOA/BOA/REGULAR/BAIXA
5. Candidatura: Prepara solicitacao de aprovacao (SEM enviar)
6. Aprovacao: Humana aprova ou rejeita
7. Execucao: Worker especializado executa tarefa
8. Entrega: Resultado submetido para revisao
9. Pagamento: Confirmacao de recebimento no ledger

## Estados de Receita

- ANUNCIADO: Oportunidade detectada
- NAO_VERIFICADO: Valor nao confirmado
- FINANCIADO: Valor verificado pela fonte
- CANDIDATURA_PENDENTE: Aguardando resposta
- TRABALHO_ACEITO: Contrato aceito
- ENTREGA_REALIZADA: Trabalho entregue
- PAGAMENTO_PENDENTE: Aguardando pagamento
- PAGAMENTO_CONFIRMADO: Receita confirmada (entrar no ledger)

## Testes

- npm test: 28 testes aprovados
- test/unit/config.test.js: 7 testes
- test/unit/auth.test.js: 4 testes
- test/integration/fluxo.test.js: 7 testes
- test/security/seguranca.test.js: 10 testes

## Comandos

- npm run dev: Inicia em modo desenvolvimento
- node start.js: Inicia o servidor
- node descobrir.js: Executa descoberta de oportunidades
- npm test: Executa todos os testes

## Seguranca

- Autenticacao JWT (Bearer token)
- Rate limiting por IP
- Validacao Zod em todas as entradas
- Helmet para headers de seguranca
- CORS configurado
- Senhas e tokens em variaveis de ambiente (.env)
- Ledger com IDs idempotentes
- Aprovacao humana para acoes externas
