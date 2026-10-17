
# MINERADORA OASIS V2 — DOCUMENTO MESTRE

## Missao

Reconstruir integralmente a Mineradora OASIS em uma nova pasta, preservando a V1. A plataforma deve descobrir, validar, priorizar e executar oportunidades legitimas de renda online, com autonomia controlada, monitoramento, aprendizado e capacidade de evolucao.

## Regra de isolamento

V1: C:\Users\flqotrem1533\Projetos\Oasis
V2: C:\Users\flqotrem1533\Projetos\Oasis-V2

A V1 e somente leitura. Nunca modificar, excluir, mover ou sobrescrever arquivos, repositorios, bancos de dados, configuracoes ou deploys da V1. Nenhum deploy ou push sem autorizacao explicita.

## Historico tecnico conhecido

A V1 usa Node.js, JavaScript e ES Modules. A entrada conhecida e src/index.js, com npm start executando node src/index.js. Dependencias conhecidas incluem Express, cors e pg.

Modulos conhecidos ou planejados na V1:

* core/mineradora.js, core/estado.js e core/operacao.js
* workers/workerManager.js
* processos/processManager.js
* simulacao/motorTempo.js e simulacao/motorResultado.js
* financeiro
* radar/radar.js e radar/radarGlobal.js
* agente/agenteOportunidades.js
* cerebro
* inteligencia
* integracoes/github
* integracoes/freelancer
* integracoes/agentBounties
* oportunidades
* testes de ciclo, integracao e seguranca

Esta lista e parcial. Inspecionar a V1 em modo somente leitura para identificar os demais componentes e requisitos. Nao copiar arquivos indiscriminadamente.

## Objetivos do produto

1. Operacao privada inicial para o proprietario.
2. Descoberta continua de oportunidades legitimas de trabalho e renda online.
3. Priorizacao por lucro liquido potencial, tempo, risco, requisitos e chance de conclusao.
4. Execucao autonoma de tarefas rotineiras previamente autorizadas.
5. Integracoes oficiais e autorizadas.
6. Workers, filas, processos, monitoramento e recuperacao de falhas.
7. Simulacao completa antes de operacoes reais.
8. Motor financeiro com receitas confirmadas, custos, taxas e conversoes.
9. Inteligencia que aprende com resultados e propoe melhorias.
10. Evolucao automatizada com testes, versionamento, backup e rollback.
11. API e painel de controle.
12. Arquitetura preparada para multiusuarios, planos, assinaturas, limites e administracao.
13. Operacao cloud sem depender do computador pessoal ligado.
14. Busca prioritaria de um caminho realista para conquistar o primeiro trabalho remunerado.

## Modulos obrigatorios

### Core

Configuracao por ambiente, estado consistente, inicializacao, encerramento, logs, validacao, recuperacao e diagnostico de saude.

### Radar global

Descobrir fontes, coletar dados, normalizar oportunidades, atualizar registros, eliminar duplicatas e oportunidades expiradas, manter historico e registrar origem e horario.

### Validador

Verificar remuneracao, elegibilidade, requisitos, prazos, custos, taxas, legitimidade, condicoes de pagamento e evidencias. Identificar dados desconhecidos. Palavras como bounty, reward e paid nao comprovam pagamento.

### Cerebro

Pontuar e ordenar oportunidades com criterios explicaveis: lucro liquido estimado, tempo, risco, prazo, requisitos, custos, capacidade disponivel e probabilidade estimada. Nao apresentar pontuacao interna como garantia de resultado.

### Agente de integracao

Investigar novas fontes, documentacao e APIs oficiais, analisar viabilidade e propor conectores. Novas conexoes e permissoes exigem autorizacao.

### Capacidades

Catalogar ferramentas, dependencias, entradas, saidas, versoes, testes e limitacoes. Testar novas capacidades em ambiente isolado antes de ativa-las.

### Processos e filas

IDs unicos, idempotencia, prioridade, estados explicitos, tentativas limitadas, prazos, historico, distribuicao, recuperacao e tratamento de falhas.

### Workers

Gerenciar capacidade, carga, disponibilidade, especialidade, produtividade, limites e falhas. Separar workers de simulacao, analise e execucao real.

### Ciclo autonomo

Verificar saude, atualizar fontes, descobrir e validar oportunidades, pontuar, priorizar, criar processos, distribuir tarefas, executar dentro das permissoes, registrar resultados e atualizar metricas. Iniciar, pausar, retomar e parar com seguranca.

### Simulacao e treinamento

Simular sucessos, falhas, atrasos, custos, filas e concorrencia. Resultados simulados nunca podem ser contabilizados como receita real.

### Financeiro

Registrar valores brutos, taxas, custos, lucro liquido, moedas, conversoes, valores pendentes e recebimentos confirmados. Identificar a origem das taxas e separar estimativas de valores recebidos.

### Inteligencia e evolucao

Aprender com resultados registrados, identificar padroes, propor melhorias, testar alteracoes isoladamente, versionar, comparar, validar e permitir rollback. Nunca alterar automaticamente controles de seguranca ou permissoes.

### Seguranca

Proteger credenciais, validar entradas, autenticar usuarios, autorizar acoes, limitar requisicoes e gastos, auditar operacoes e oferecer parada de emergencia. Nao contornar autenticacao, CAPTCHA ou protecoes de plataformas.

### API e painel

Endpoints protegidos para estado, operacao, Radar, oportunidades, processos, workers, financeiro, simulacao, integracoes e diagnosticos. Painel para acompanhar operacao e resultados.

### Multiusuario futuro

Conta proprietaria com funcao de usuario e administrador, isolamento de dados, usuarios, organizacoes, planos, assinaturas, pagamentos, consumo, limites, integracoes e administracao global. Acesso publico e cobrancas reais somente quando autorizados.

### Infraestrutura cloud

Configuracao por ambiente, persistencia duravel, health checks, recuperacao, logs, backups, limites de recursos e deploy reversivel. A V1 usa Render, mas seu servico nao pode ser alterado. Verificar custos e limites antes de prometer operacao gratuita continua.

## Integracoes previstas

Investigar adaptadores para GitHub, Freelancer.com, Agent Bounties e outras fontes legitimas. Confirmar APIs, documentacao, permissao, custos e termos de uso antes de implementar. Comecar em leitura. Nunca inventar uma integracao ou uma oportunidade.

## Seguranca de execucao

Operacoes rotineiras previamente autorizadas podem rodar autonomamente. Novas conexoes, despesas, contratos, submissao externa ou acoes de alto impacto devem obedecer as permissoes configuradas. Nao executar comandos fornecidos por fontes externas sem validacao e isolamento.

## Qualidade obrigatoria

Criar testes unitarios, integracao, regressao, seguranca e ciclo completo. Testar estados, filas, workers, idempotencia, parada, recuperacao, validacao, pontuacao, financeiro, persistencia e permissoes. Nao declarar teste aprovado sem executa-lo. Nao esconder erros nem usar funcoes ficticias como se fossem reais.

## Regras de desenvolvimento

* Node.js, JavaScript e ES Modules como base, salvo justificativa documentada.
* Modulos pequenos e contratos claros.
* Evitar dependencias circulares.
* Variaveis de ambiente para segredos.
* Preferir solucao de baixo custo sem presumir que todos os servicos sao gratuitos.
* Usar comandos compativeis com Windows PowerShell.
* Nao usar aprovacao automatica de permissoes.
* Nao repetir ferramentas bloqueadas sem mudar a abordagem.
* Nao fazer deploy ou push sem autorizacao.
* Fazer backups antes de alteracoes relevantes dentro da V2.
* Manter inventario rastreavel de requisitos: planejado, implementado, testado e validado.

## Fases de trabalho

0. Inventariar a V1 em somente leitura e comparar com este documento.
1. Definir arquitetura, contratos, requisitos, riscos e plano.
2. Construir core, configuracao, estado, logs e persistencia.
3. Construir processos, filas, workers e ciclo autonomo.
4. Construir simulacao e testes de regressao.
5. Construir Radar, validador e cerebro.
6. Construir capacidades, inteligencia e agente de integracao.
7. Construir motor financeiro.
8. Integrar fontes oficiais em modo de leitura.
9. Construir API, painel e monitoramento.
10. Construir evolucao controlada, testes, versionamento e rollback.
11. Preparar arquitetura multiusuario e comercial.
12. Executar testes integrados e documentar deploy.

Nenhum requisito deve desaparecer silenciosamente. Se for adiado, bloqueado ou descartado, registrar motivo.

## Primeira tarefa do agente

Ler este documento. Confirmar que o diretorio de trabalho e Oasis-V2. Inspecionar a V1 somente em leitura, inventariar modulos, endpoints, testes, dependencias, integracoes e funcionalidades adicionais. Criar os documentos de arquitetura, inventario, plano, matriz de testes, riscos e estado do projeto. Apresentar o relatorio da Fase 0 antes de iniciar a implementacao.

Nao modificar a V1. Nao fazer deploy nem push. Nao executar operacoes externas reais.

## ADENDO CONSOLIDADO V2.0 — INTERFACE, AUTONOMIA E GOVERNANCA

Data da consolidacao: 09/10/2026
Este adendo complementa o documento mestre existente. Os requisitos anteriores permanecem validos. Em caso de conflito, prevalecem o isolamento da V1, a seguranca, a legalidade, a protecao financeira e a necessidade de testes verificaveis.

### 1. PRINCIPIOS INEGOCIAVEIS

1. A OASIS deve descobrir, avaliar e executar oportunidades legitimas dentro das permissoes concedidas, APIs oficiais, termos de uso, limites tecnicos e leis aplicaveis.
2. A operacao inicial e privada, destinada ao proprietario. Recursos multiusuario e comerciais ficam para uma fase futura.
3. A prioridade inicial e validar oportunidades reais com custo inicial zero sempre que possivel.
4. Nenhuma receita pode ser presumida. Valores simulados, estimados, pendentes e recebidos devem ser apresentados separadamente.
5. Nenhuma funcionalidade sera declarada concluida sem evidencia, testes e verificacao.
6. Nenhum gasto, assinatura, deposito, taxa antecipada, contrato, permissao sensivel, deploy ou push sera autorizado implicitamente.
7. A V1 permanece intocavel e somente para leitura. Todo trabalho de implementacao ocorre em Oasis-V2.
8. A autonomia deve respeitar orcamento, permissoes, limites, seguranca, qualidade e possibilidade de interrupcao.
9. A evolucao automatica exige testes, validacao, versionamento, monitoramento e rollback.
10. O objetivo e construir uma plataforma funcional, auditavel, resiliente e economicamente sustentavel, sem prometer renda garantida.

### 2. ARQUITETURA CENTRAL

A plataforma deve organizar os seguintes componentes, com contratos claros e responsabilidades separadas:

- Cerebro Central OASIS: coordena estrategia, prioridades, radar, workers, finanças, riscos e infraestrutura.
- Radar Economico Global: pesquisa fontes autorizadas, descobre oportunidades e registra origem, data e evidencias.
- Avaliador Economico: estima retorno liquido, tempo, custos, probabilidade de sucesso, liquidez e risco.
- Validador de Oportunidades: verifica autenticidade, requisitos, elegibilidade, regras e viabilidade.
- Orquestrador: distribui tarefas, controla dependencias, capacidade, prioridades, repeticoes e interrupcoes.
- Workers Especializados: executam tarefas dentro de capacidades e permissoes explicitamente definidas.
- Motor de Execucao: administra o ciclo de trabalho e exige um worker identificado antes de marcar um processo como executando.
- Gerenciador de Integracoes: registra APIs oficiais, autorizacoes, credenciais, limites, disponibilidade e estado das conexoes.
- Laboratorio de Capacidades: pesquisa e testa novas habilidades em ambiente isolado.
- Nucleo Financeiro Universal: registra custos, resultados, comprovantes, liquidacao, conversao e saldo.
- Persistencia e Filas: preservam estado, tarefas, eventos, resultados e recuperacao apos reinicio.
- Seguranca e Governanca: aplicam permissoes minimas, limites, auditoria e controles.
- Observabilidade: centraliza logs, metricas, alertas, erros e diagnosticos.
- Interface Web: apresenta o estado real da plataforma e permite administrar a operacao.
- Evolucao Controlada: permite melhorias verificadas, implantacao gradual e rollback.

Fluxo operacional obrigatorio:

Descoberta -> verificacao da fonte -> validacao -> avaliacao economica e de risco -> decisao de elegibilidade -> fila -> distribuicao -> worker identificado -> execucao autorizada -> validacao do resultado -> comprovacao -> lancamento financeiro -> aprendizado.

Se uma etapa obrigatoria falhar, o processo deve ser pausado, rejeitado, colocado em quarentena ou encaminhado para diagnostico. Nunca deve ser contabilizado como sucesso sem comprovacao.

### 3. CICLO DE VIDA DOS PROCESSOS

Os estados devem ser padronizados e documentados. No minimo:

- CRIADO
- NA_FILA
- DISTRIBUIDO
- EXECUTANDO
- VALIDANDO
- CONCLUIDO
- FALHOU
- QUARENTENA
- PAUSADO
- CANCELADO

Transicoes invalidas devem ser rejeitadas. Cada transicao precisa de data, identificador do processo, motivo e origem.

Requisitos obrigatorios:
- Um processo em EXECUTANDO deve ter workerId valido e atribuicao persistida.
- A atribuicao deve ser confirmada antes da execucao.
- O resultado precisa estar vinculado ao processo e ao worker responsavel.
- Falhas nao podem deixar processos presos indefinidamente em EXECUTANDO.
- Retentativas devem ter limites, intervalos e protecao contra duplicidade.
- Operacoes repetidas nao podem duplicar pagamentos, resultados ou lancamentos financeiros.
- A recuperacao apos reinicio deve reconciliar fila, processos, workers e resultados.
- O fluxo completo deve ser testado de ponta a ponta: fila -> distribuidor -> worker -> motor -> resultado -> financeiro.

### 4. ESPECIFICACAO OFICIAL DA INTERFACE WEB

A interface deve recriar a referencia visual oficial "Painel OASIS com Operacao Ativa.png" como uma aplicacao web funcional. A imagem e referencia de design, nunca fundo estatico para simular uma interface pronta.

Estilo visual:
- Tema escuro, profissional e futurista.
- Tons de azul, detalhes luminosos e contrastes legiveis.
- Hierarquia visual clara, paineis organizados, graficos e indicadores.
- Animacoes breves e discretas, sem prejudicar desempenho ou acessibilidade.
- Layout responsivo para desktop, tablet e celular.
- Estados de carregamento, vazio, erro, indisponibilidade e dados desatualizados.
- A interface deve consumir dados reais da API. Dados demonstrativos devem ser identificados explicitamente.

#### 4.1 Navegacao obrigatoria

1. Inicio
2. Radar
3. Processos
4. Workers
5. Habilidades
6. Ganhos
7. Falhas
8. Financeiro
9. Integracoes
10. Configuracoes

Todas as paginas devem ter navegacao funcional, rotas coerentes, tratamento de erros e integracao com os contratos da API.

#### 4.2 Inicio — painel principal

- Saldo central em USD com destaque visual.
- Animacao curta quando um novo valor confirmado for registrado.
- Separacao entre saldo recebido, saldo disponivel, valores pendentes e estimativas.
- Estado operacional atualizado: parado, iniciando, operando, pausado ou com falha.
- Botao de iniciar, pausar, retomar e parar, conforme as capacidades reais implementadas.
- O estado so muda na interface depois da confirmacao da API; mostrar erro se a operacao falhar.
- Feed de atividade com data, categoria, resumo e acesso aos detalhes.
- Categorias visiveis: Ganhos, Habilidades e Falhas.
- Resumo de oportunidades, processos, workers, alertas e aprovacoes pendentes.
- Area lateral com cotacao USD, outros ativos configurados, projecao mensal e grafico de atividade.
- Cotacoes devem informar fonte, horario da consulta e indisponibilidade quando aplicavel.
- Projecoes devem ser identificadas como estimativas e apresentar premissas.
- Valores ausentes nao podem ser substituidos por numeros inventados.

#### 4.3 Pagina Radar

- Oportunidades descobertas, aprovadas, rejeitadas e em verificacao.
- Nome, fonte original, data, requisitos, recompensa anunciada e moeda.
- Evidencias e link para a fonte original.
- Estimativa de custo, tempo, retorno liquido e risco.
- Confiabilidade da fonte e motivo da classificacao.
- Filtros por categoria, estado, risco, recompensa e tempo estimado.
- Separacao explicita entre oportunidade encontrada, validada e elegivel para execucao.
- Nenhuma oportunidade deve ser apresentada como renda garantida.

#### 4.4 Pagina Processos

- Lista de processos com identificador, origem, worker, estado e datas.
- Progresso, tentativas, duracao, resultado e motivo de falha.
- Detalhes da sequencia de eventos e historico de transicoes.
- Acoes de pausar, cancelar ou repetir somente quando permitidas pelo estado e pelas regras.
- Indicadores de processos presos, duplicados ou aguardando distribuicao.
- Filtros e busca por identificador, worker, origem e estado.

#### 4.5 Pagina Workers

- Workers ativos, inativos, ocupados, bloqueados e em erro.
- Especialidade, habilidades, capacidade, tarefas atribuidas e resultados.
- Identidade individual, permissoes e limites de execucao.
- Historico de desempenho, taxa de sucesso, falhas e tempo de processamento.
- Atribuicao e liberacao de tarefas auditaveis.
- Um worker nao pode executar tarefas fora de sua especialidade ou permissao.

#### 4.6 Pagina Habilidades

- Catalogo de capacidades disponiveis e em desenvolvimento.
- Origem, versao, requisitos, testes e estado de validacao.
- Separacao entre descoberta, laboratorio, simulacao, validacao e producao.
- Evidencias de qualidade e compatibilidade.
- Nenhuma habilidade experimental pode receber permissoes de producao automaticamente.

#### 4.7 Pagina Ganhos

- Resultados positivos registrados com fonte e processo relacionados.
- Recompensa anunciada, valor aprovado, valor pendente, valor liquidado e valor recebido.
- Comprovantes, data, moeda e estado de confirmacao.
- Separacao entre receita bruta, custos, taxas, estornos e lucro liquido.
- Filtros por periodo, fonte, categoria e estado.
- Apenas recebimentos comprovados podem compor a receita efetivamente recebida.

#### 4.8 Pagina Falhas

- Falhas tecnicas, oportunidades rejeitadas, riscos e inconsistencias.
- Data, severidade, componente, processo relacionado e causa conhecida.
- Evidencias, diagnostico, tentativas anteriores e medidas corretivas.
- Separacao entre erro transitorio, erro permanente, bloqueio externo e risco de seguranca.
- Falhas recorrentes devem gerar alertas e impedir repeticoes perigosas.

#### 4.9 Pagina Financeiro

- Livro-razão auditavel e historico de lancamentos.
- Saldos por moeda e ativo, quando suportados.
- Receita bruta, custos, taxas, estornos e resultado liquido.
- Valores pendentes, liquidados, recebidos, disputados e revertidos.
- Conversao para USD com taxa, fonte e horario registrados.
- Conciliacao entre processo, comprovante, liquidacao e saldo.
- Projecoes separadas de valores efetivamente realizados.
- Nenhuma movimentacao financeira externa sem autorizacao explicita e integracao legitimamente habilitada.

#### 4.10 Pagina Integracoes

- Servico, finalidade, fornecedor, estado, ultima verificacao e permissao concedida.
- APIs oficiais, limites, cotas, custos conhecidos e condicoes de uso.
- Estado de autenticacao sem revelar tokens ou segredos.
- Diagnostico de conexao e historico de erros.
- Ambiente de teste separado de producao.
- Nenhuma integracao deve ser ativada sem validacao de seguranca e autorizacao necessaria.

#### 4.11 Pagina Configuracoes

- Modo privado, simulacao e operacao real, claramente diferenciados.
- Limites de custo, concorrencia, tentativas e tempo.
- Politicas de aprovacao, alertas e notificacoes.
- Configuracoes de seguranca e sessoes administrativas.
- Backup, restauracao, diagnostico e versao instalada.
- Acoes criticas com confirmacao, registro de auditoria e verificacao de permissao.
- Segredos nunca devem ser exibidos em texto aberto.

### 5. RADAR ECONOMICO E AVALIACAO

O radar deve pesquisar fontes autorizadas e registrar:
- Fonte, endereco, data de descoberta e ultima verificacao.
- Recompensa anunciada e condicoes de elegibilidade.
- Probabilidade estimada de conclusao, com incerteza identificada.
- Tempo estimado e custo total previsto.
- Taxas, conversao, requisitos tecnicos e custos de oportunidade.
- Risco de fraude, reputacao da fonte e evidencias verificaveis.
- Possibilidade de liquidacao e prazo estimado de recebimento.
- Motivo para aprovar, rejeitar, adiar ou colocar em quarentena.

A classificacao economica deve considerar retorno liquido esperado por unidade de tempo, risco, liquidez, confiabilidade e incerteza. O ranking nao deve privilegiar apenas a recompensa anunciada.

Publicacoes encontradas em repositorios, redes ou comunidades nao constituem prova de que a recompensa exista ou possa ser recebida. A fonte oficial e os requisitos devem ser verificados antes de qualquer execucao.

### 6. TRATAMENTO FINANCEIRO OBRIGATORIO

Cada valor deve ter categoria e estado explicitos:
- Estimado.
- Descoberto.
- Aprovado.
- Pendente.
- Liquidado pela fonte.
- Recebido e comprovado.
- Reembolsado ou revertido.
- Disputado ou inconsistente.
- Custo ou taxa.
- Resultado liquido calculado.

O saldo disponivel nao pode incluir recompensas apenas anunciadas ou pendentes. Estimativas e projecoes nunca devem ser somadas a recebimentos reais.

Cada lancamento deve registrar moeda, valor, origem, processo relacionado, horario, comprovante e identificador de conciliacao quando disponivel. Deve existir protecao contra duplicidade e mecanismo de auditoria para correcao de inconsistencias.

### 7. SEGURANCA, PERMISSOES E GOVERNANCA

- Principio do menor privilegio para cada worker, integracao e usuario.
- Segredos em variaveis de ambiente ou armazenamento apropriado, nunca no codigo ou nos logs.
- Autenticacao administrativa robusta, com suporte a MFA ou passkeys quando viavel.
- Validacao de entradas, protecao de endpoints e limites de requisicoes.
- Auditoria de acoes administrativas, mudancas de configuracao e operacoes externas.
- Limites de gasto, tentativas, concorrencia e execucao.
- Protecao contra repeticao de operacoes, abuso de APIs e execucao de instrucoes externas nao confiaveis.
- Bloqueio de atividades fraudulentas, evasao de limites, contorno de autenticacao ou violacao de termos.
- Credenciais devem ser revogaveis e vinculadas a permissoes especificas.
- Parada de emergencia deve impedir novas execucoes e tratar tarefas em andamento com seguranca.
- Acoes irreversiveis, financeiras ou com novos custos exigem autorizacao explicita conforme a politica definida.

### 8. PERSISTENCIA, RESILIENCIA E AUDITORIA

- Estado critico nao pode depender exclusivamente da memoria do processo.
- Persistir processos, atribuicoes, resultados, eventos, configuracoes e lancamentos financeiros.
- Garantir integridade e consistencia nas transicoes de estado.
- Implementar backups e testar restauracao periodicamente.
- Usar identificadores unicos e idempotencia para evitar duplicacoes.
- Prever indisponibilidade de servicos externos, limites de requisicao e falhas temporarias.
- Implementar retentativas controladas, circuit breakers quando apropriado e backpressure.
- Monitorar saude, latencia, erros, uso de recursos e integridade da fila.
- Preservar historico suficiente para reproduzir diagnosticos sem armazenar segredos desnecessarios.

### 9. EVOLUCAO AUTONOMA CONTROLADA

Toda melhoria proposta deve seguir:
Descoberta -> justificativa -> isolamento -> teste -> simulacao -> validacao -> revisao de seguranca -> aprovacao exigida -> implantacao gradual -> monitoramento -> manutencao ou rollback.

Requisitos:
- Versionar codigo, configuracoes e capacidades.
- Manter testes de regressao e criterios mensuraveis de aceitacao.
- Comparar resultados antes e depois da mudanca.
- Bloquear promocao quando testes, seguranca ou integridade financeira falharem.
- Preservar uma versao funcional para rollback.
- Limitar recursos usados por experimentos.
- Registrar alteracoes, justificativas, evidencias e resultados.
- Mudancas autonomas nao podem ampliar permissoes, criar despesas ou remover controles sem autorizacao explicita.

### 10. ESTRATEGIA DE RENDA E ESCALA

A primeira estrategia deve privilegiar oportunidades verificaveis, de baixo custo e legalmente acessiveis, incluindo servicos digitais assistidos por IA e tarefas legitimas, conforme disponibilidade real.

A OASIS deve comparar alternativas por retorno liquido esperado, tempo de execucao, risco, confiabilidade, liquidez e requisitos de entrada. A estrategia deve poder ser reavaliada quando os dados demonstrarem baixo desempenho.

Reinvestimento de lucro recebido, aumento de capacidade e expansao devem obedecer a limites configurados. Valores apenas previstos nao podem financiar novas despesas. A expansao multiusuario e comercial depende de uma fase especifica, com requisitos juridicos, tecnicos, operacionais e de privacidade.

### 11. PLANO DE IMPLEMENTACAO E PRIORIDADES

Fase 0 — Inventario e preservacao:
- Confirmar diretorio V2.
- Inspecionar V1 somente em leitura.
- Inventariar arquivos, modulos, endpoints, testes, dependencias e integracoes.
- Documentar o estado inicial e as lacunas.

Fase 1 — Core operacional:
- Corrigir estados e transicoes de processos.
- Garantir atribuicao valida de worker.
- Corrigir distribuicao, execucao, resultados e encerramento.
- Testar o fluxo completo e a recuperacao apos reinicio.

Fase 2 — Persistencia e governanca:
- Validar armazenamento, filas, auditoria, idempotencia e backups.
- Revisar autenticacao, permissoes e limites.

Fase 3 — Radar verificavel:
- Implementar fontes oficiais e validacao de oportunidades.
- Separar descobertas, oportunidades elegiveis e oportunidades executaveis.
- Registrar evidencias e motivos de rejeicao.

Fase 4 — Financeiro:
- Implementar livro-razão e conciliacao.
- Separar simulacao, estimativa, pendencia e recebimento comprovado.
- Testar duplicidades, reversoes e inconsistencias.

Fase 5 — Interface:
- Implementar as dez paginas especificadas.
- Conectar cada painel a endpoints reais.
- Validar responsividade, acessibilidade e estados de erro.

Fase 6 — Operacao real controlada:
- Habilitar somente integracoes autorizadas e testadas.
- Definir limites, monitoramento, parada de emergencia e criterios de interrupcao.
- Nao presumir que modo real significa receita comprovada.

Fase 7 — Evolucao e expansao:
- Implementar laboratorio de capacidades, validacao, versionamento e rollback.
- Planejar multiusuario somente apos maturidade e autorizacao.

Nenhuma fase deve ser considerada concluida apenas por existir codigo. Exigir testes executados, resultados registrados e verificacao independente dos criterios de aceitacao.

### 12. MATRIZ DE DECISOES CONSOLIDADA

As 77 decisoes de produto e governanca ficam consolidadas nos seguintes grupos. Os grupos complementam os modulos anteriores e devem ser convertidos em requisitos rastreaveis, sem perder detalhes durante a implementacao.

1. Visao, divisao de responsabilidades e arquitetura modular.
2. Alocacao adaptativa de recursos e divisorias.
3. Reinvestimento limitado de lucro efetivamente recebido.
4. Autonomia controlada e politicas de aprovacao.
5. Radar global e avaliacao economica.
6. Validacao de oportunidades e reputacao das fontes.
7. Workers especializados e identidade individual.
8. Orquestracao, filas, dependencias e prioridades.
9. Motor de execucao, resultados e protecao contra duplicidade.
10. Simulacao, treinamento e promocao controlada para producao.
11. Integracoes oficiais, ciclo de vida e gestao de credenciais.
12. Memoria operacional, eventos e conhecimento compartilhado.
13. Financeiro universal, conciliacao, liquidez e conversao para USD.
14. Evidencia financeira e comprovacao de recebimentos.
15. Seguranca em camadas, permissoes minimas e defesa contra fraude.
16. Autenticacao administrativa e protecao de sessoes.
17. Gestao de segredos e dados.
18. Resiliencia, continuidade de servicos externos e recuperacao.
19. Persistencia hibrida, backups e recuperacao de desastre.
20. Observabilidade, alertas, notificacoes e resposta a incidentes.
21. Metricas de qualidade, sucesso, eficiencia e maturidade.
22. Reavaliacao economica, incerteza e valor da informacao.
23. Planejamento temporal, previsoes calibradas e metas.
24. Controle de capacidade, concorrencia e backpressure.
25. Laboratorio de novas capacidades e isolamento experimental.
26. Evolucao de codigo com testes, versionamento e rollback.
27. Monitoramento de regras externas e termos de uso.
28. Gestao de falhas, quarentena e contencao de erros.
29. Documentacao viva, inventario e rastreabilidade de requisitos.
30. Interface profissional com dados reais e navegacao funcional.
31. Painel financeiro e feed de atividades auditaveis.
32. Estrategia inicial de renda de baixo custo e fontes verificaveis.
33. Diversificacao e sustentabilidade do portfolio de renda.
34. Crescimento gradual baseado em resultados demonstrados.
35. Infraestrutura resiliente e custos controlados.
36. Preparacao para multiusuario futuro, sem ativacao prematura.
37. Separacao entre modo privado, simulacao e operacao real.
38. Controles de inicio, pausa, retomada e parada de emergencia.
39. Governanca de permissoes, gastos e operacoes irreversiveis.
40. Avaliacao de dependencias e compatibilidade entre modulos.
41. Comunicacao por contratos e eventos documentados.
42. Reprodutibilidade de testes e diagnosticos.
43. Protecao contra oportunidades inviaveis ou suspeitas.
44. Priorizacao por retorno liquido, tempo, risco e liquidez.
45. Reavaliacao de estrategias com base em evidencias.
46. Separacao entre previsao, pendencia, liquidacao e recebimento.
47. Auditoria de mudancas, decisoes e resultados.
48. Promocao de componentes somente apos criterios de maturidade.
49. Expansao condicionada a qualidade e sustentabilidade.
50. Seguranca de dados e privacidade desde o desenho.
51. Tratamento explicito de incerteza e indisponibilidade.
52. Testes integrados e regressao como requisito de entrega.
53. Estados de erro e vazio visiveis na interface.
54. Cotacoes com fonte, horario e indicacao de atualidade.
55. Projecoes claramente identificadas como estimativas.
56. Acessibilidade e responsividade da interface.
57. Historico de processos, workers e lancamentos.
58. Identificadores unicos, idempotencia e reconciliacao.
59. Limites por integracao, worker e processo.
60. Revisao de risco antes de execucao externa.
61. Protecao contra repeticoes e retentativas ilimitadas.
62. Politicas de cancelamento e encerramento seguro.
63. Verificacao de comprovantes e consistencia financeira.
64. Monitoramento de qualidade das fontes.
65. Gestao de capacidades e habilidades por versao.
66. Registro de origem e permissao de cada capacidade.
67. Planejamento de tarefas e dependencias.
68. Distribuicao adaptativa sem exceder capacidade.
69. Controle de acesso administrativo.
70. Avaliacao de incerteza e coleta de evidencias adicionais.
71. Mudancas de estrategia auditaveis e reversiveis.
72. Recuperacao de desastre e teste de restauracao.
73. Reputacao de fontes e sinais de fraude.
74. Novas capacidades testadas em ambiente isolado.
75. Portfolio de renda diversificado e sustentavel.
76. Adaptacao da estrategia por resultados reais.
77. Gestao de liquidez e compromissos financeiros.

### 13. RELATORIO OBRIGATORIO DE DESENVOLVIMENTO

Ao concluir cada tarefa, o agente deve informar:
- Objetivo e escopo executado.
- Arquivos criados ou alterados.
- Arquivos que nao foram alterados.
- Testes executados e resultados reais.
- Problemas encontrados e riscos restantes.
- Requisitos atendidos, pendentes ou bloqueados.
- Evidencias que sustentam cada afirmacao.
- Proximo passo recomendado.

Nao declarar deploy, push, integracao, receita ou funcionalidade como concluida sem evidencia verificavel.

### 14. CRITERIOS GERAIS DE ACEITACAO

A OASIS so pode avancar para operacao real controlada quando:
- O fluxo completo dos processos estiver testado.
- Nenhum processo ativo ficar sem worker identificado.
- Persistencia e recuperacao forem verificadas.
- As integracoes respeitarem permissoes e limites oficiais.
- A interface mostrar os dados corretos e distinguir estimativas de fatos.
- O financeiro impedir duplicidade e permitir conciliacao.
- Os controles de seguranca e parada de emergencia estiverem testados.
- Logs e auditoria permitirem reconstruir decisoes e resultados.
- Testes de regressao estiverem passando.
- Custos, limites e riscos conhecidos estiverem documentados.

Este documento define o destino e os criterios de trabalho; nao comprova que todos os modulos ja estejam implementados.

