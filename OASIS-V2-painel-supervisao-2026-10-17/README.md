# Mineradora OASIS V2 - Documentacao

## Arquitetura

```
src/
  core/          - Configuracao, estado, mineradora, operacao
  agentes/       - Supervisao deterministica de permissoes, evidencias e remuneracao
  security/      - Autenticacao JWT, rate limiting, validacao Zod
  logs/          - Logger estruturado Winston
  radar/         - Radar global, normalizacao, deduplicacao, confianca
  conectores/    - Conector base, GitHub, gerenciador
  validacao/     - Validador de remuneracao, elegibilidade, legitimidade
  analise/       - Analisador de oportunidades (ROI, score, classificacao)
  decisao/       - Decisor de oportunidades
  processos/     - Gerenciador de processos e estados
  workers/       - Worker manager, especializacoes
  orquestrador/  - Ciclo: Radar -> Validacao -> Supervisao -> Quarentena/fila local
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

A suite possui testes unitarios, de integracao e seguranca. Execute `npm test` para validar a versao deste pacote.

## Comandos

- npm install: Instala as dependencias
- npm start: Inicia o servidor e o painel
- npm run dev: Inicia em modo desenvolvimento
- npm test: Executa todos os testes
- npm run lint: Verifica o estilo do codigo
- npm run typecheck: Verifica os tipos

## Operação ao vivo

Configure `OASIS_OPERACAO=REAL` para usar o único modo disponível. O Radar pode fazer uma consulta real, somente de leitura, pelo botão **Consultar agora**. Três verificadores determinísticos auditam permissões, evidências de pagamento e remuneração; itens sem comprovação vão para quarentena. Aprovação libera somente a fila local. A API de simulação foi removida.

## Painel web

Com o servidor iniciado, abra `http://127.0.0.1:10000/` no navegador. Entre com o usuário e a senha administrativa configurados no ambiente do servidor. O painel consulta dados protegidos em tempo real, atualiza a cada cinco segundos, permite uma consulta real do Radar e oferece controles de iniciar/parar que respeitam a prontidão. O botão de iniciar fica bloqueado enquanto houver requisitos ausentes; o Radar não envia propostas nem executa trabalho. O painel separa recebimentos confirmados de estimativas. Por padrão, o servidor escuta somente no computador local.

O modo REAL permanece somente leitura: não envia propostas, aceita contratos, reivindica recompensas, executa trabalhos ou movimenta dinheiro. A automação contínua permanece bloqueada até haver um executor de tarefas real e uma integração oficial autorizada, além da configuração segura de produção. Para produção, configure um segredo JWT aleatório de pelo menos 32 caracteres e `OASIS_SENHA_ADMIN_HASH` com um hash bcrypt; o servidor escuta em `127.0.0.1` por padrão.

## Seguranca

- Autenticacao JWT (Bearer token)
- Rate limiting por IP
- Validacao Zod em todas as entradas
- Helmet para headers de seguranca
- CORS configurado
- Senhas e tokens em variaveis de ambiente (.env)
- Ledger com IDs idempotentes
- Aprovacao humana para acoes externas
