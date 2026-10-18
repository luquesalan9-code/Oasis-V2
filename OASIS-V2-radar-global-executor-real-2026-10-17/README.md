# Mineradora OASIS V2 - Documentacao

## Arquitetura

```
src/
  core/          - Configuracao, estado, mineradora, operacao
  agentes/       - Supervisao deterministica de permissoes, evidencias e remuneracao
  security/      - Autenticacao JWT, rate limiting, validacao Zod
  logs/          - Logger estruturado Winston
  radar/         - Radar global, normalizacao, deduplicacao, confianca
  conectores/    - GitHub e APIs públicas de vagas remotas globais
  executores/    - Despacho real de trabalhos com comprovação e idempotência
  integracoes/   - Registro de adaptadores oficiais de execução
  validacao/     - Validador de remuneracao, elegibilidade, legitimidade
  analise/       - Analisador de oportunidades (ROI, score, classificacao)
  decisao/       - Decisor de oportunidades
  processos/     - Gerenciador de processos e estados
  workers/       - Worker manager, especializacoes
  orquestrador/  - Ciclo: Radar -> Validacao -> Supervisao -> Quarentena/fila local
  candidatura/   - Selecao e preparo de candidaturas
  aprovacao/     - Fluxo de aprovacao humana
  financeiro/    - Motor financeiro, ledger, relatórios e carteira cifrada
  persistencia/  - Salvamento e restauracao de estado
  monitoramento/ - Metricas, saude, relatorios
  interface/     - Estrutura do painel web
  api/           - Servidor Express, rotas protegidas
```

## Conectores

### Fontes globais de descoberta (somente leitura)

O Radar consulta quatro fontes oficiais em paralelo:

### GitHub Issues
- API oficial: https://api.github.com/search/issues
- Busca pública sem credencial; `GITHUB_TOKEN` opcional
- Normaliza: valor, moeda, URL, autor, prazo
- Deduplicacao por externalId
- Filtro de valores suspeitos (> $100.000)

### Remote OK, Remotive e Arbeitnow
- Feeds/APIs HTTPS públicos para vagas remotas no mundo e na Europa
- Atribui cada anúncio à plataforma e mantém o link original
- Remotive informa atraso de até 24 horas nos anúncios
- Vagas ficam como leads no Radar e não viram processos de execução automaticamente
- Salário informado no anúncio é exibido como não verificado, sem contar como receita

As consultas respeitam intervalo mínimo de cinco minutos nas fontes de emprego. O Radar não faz scraping de páginas nem envia candidatura.

## Fluxo de Aprovacao

1. Descoberta: conectores consultam GitHub Issues e APIs públicas de vagas remotas
2. Normalizacao: Deduplicacao, extracao de valor
3. Analise: ROI, margem, lucro por minuto, score
4. Decisao: Classificacao EXCELENTE/MUITO_BOA/BOA/REGULAR/BAIXA
5. Candidatura: Prepara solicitacao de aprovacao (SEM enviar)
6. Aprovacao: Humana aprova ou rejeita
7. Execução real: worker registrado prepara entregáveis; adaptador oficial autorizado faz a submissão
8. Validação: a integração consulta a plataforma e exige evidência oficial antes de concluir
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

Com o servidor iniciado, abra `http://127.0.0.1:10000/` no navegador. Entre com o usuário e a senha administrativa configurados no ambiente do servidor. Os atalhos laterais abrem páginas próprias para atividade, Radar, processos, workers, financeiro, carteira e prontidão, além das configurações da mineradora e da interface. O Radar permite consulta real somente de leitura. Os controles de iniciar/parar respeitam a prontidão; iniciar fica bloqueado enquanto houver requisitos ausentes. O painel separa recebimentos confirmados de estimativas. Por padrão, o servidor escuta somente no computador local.

O Radar em modo REAL consulta fontes globais somente para leitura. Um motor de execução real valida worker identificado, autorização externa explícita com escopo e expiração, adaptador API oficial, persistência anterior à submissão, chave idempotente e evidência confirmada antes de concluir. Não há adaptador de execução conectado por padrão: nenhum anúncio global autoriza candidatura, contrato, envio de trabalho ou gasto. A automação contínua permanece bloqueada até instalar e autorizar um provedor oficial, registrar um worker real e configurar produção. Para produção, configure um segredo JWT aleatório de pelo menos 32 caracteres e `OASIS_SENHA_ADMIN_HASH` com hash bcrypt; o servidor escuta em `127.0.0.1` por padrão.

### Carteira de recebimento

A página **Carteira** aceita um destino bancário e o salva em arquivo local cifrado com AES-256-GCM. Configure `OASIS_VAULT_KEY` no arquivo `.env` com uma chave aleatória de 32 bytes em Base64; gere uma com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Mantenha essa chave e o arquivo `.env` fora do Git e guarde uma cópia segura da chave: sem ela, o arquivo cifrado não pode ser lido. Sem chave configurada, a carteira permanece desabilitada. O painel retorna somente os dados mascarados. O cadastro guarda os dados de recebimento, mas não conecta a um banco nem envia pagamentos.

## Seguranca

- Autenticacao JWT (Bearer token)
- Rate limiting por IP
- Validacao Zod em todas as entradas
- Helmet para headers de seguranca
- CORS configurado
- Senhas e tokens em variaveis de ambiente (.env)
- Ledger com IDs idempotentes
- Aprovacao humana para acoes externas
