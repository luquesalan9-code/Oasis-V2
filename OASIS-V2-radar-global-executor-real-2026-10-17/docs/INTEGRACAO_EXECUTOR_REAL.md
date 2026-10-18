# Executor real e Radar global

## Radar global

A descoberta pública consulta quatro APIs oficiais por HTTPS:

- GitHub Issues, para tarefas e recompensas publicadas em issues.
- Remote OK, por meio do feed JSON público.
- Remotive, pela API pública de vagas remotas. Os dados podem ter atraso de 24 horas e a interface mantém os links e a atribuição à Remotive.
- Arbeitnow, pela API pública de vagas, mantendo apenas itens marcados como remotos.

As vagas remotas entram como leads do Radar, não como processos executáveis. O texto de salário é exibido como informação do anúncio; não é tratado como remuneração confirmada nem como receita. O painel mantém os links para a fonte original. Conteúdo de anúncios é dado externo não confiável e nunca é interpretado como instrução para o executor.

## Fluxo do executor

`src/executores/executorReal.js` implementa o despacho real de uma tarefa. Antes de chamar um worker, exige processo na fila, worker real atribuído, adaptador registrado para a plataforma, autorização explícita vigente com escopo `submit_work`, e persistência atômica da chave de idempotência. Depois, exige entregáveis do worker, envio confirmado pela API oficial e evidência HTTPS validada pela integração antes de concluir. Falhas ou resultados incertos não são reenviados automaticamente; vão para falha ou quarentena.

O sistema vem sem worker de produção e sem integração de submissão registrada. Assim, o motor não faz candidatura, entrega externa, contrato, gasto ou pagamento por conta própria. A prontidão de operação mostra esses bloqueios e o botão de início permanece desabilitado.

## Contrato do adaptador oficial

Um adaptador deve ser instalado como código revisado no projeto e registrado por `registrarIntegracaoExecucaoOficial`. O registro exige:

- Identificador e plataforma atendida.
- Endpoint HTTPS e URL HTTPS da documentação oficial.
- Declaração `oficial: true`.
- Escopo `submit_work`, concessão autorizada e data da revisão dos termos.
- Suporte comprovado a idempotência.
- Função `enviarResultado` que passe a mesma chave de idempotência à API oficial.
- Função `verificarResultado` que consulte a fonte oficial e retorne uma URL HTTPS verificável.

Tokens ficam dentro do adaptador e devem vir do ambiente, nunca do painel, do arquivo ZIP, de logs ou de snapshots. Cada plataforma possui OAuth, permissões e termos próprios; a implementação desse adaptador depende da plataforma que será usada.

## Contrato do worker

Um worker real deve ser registrado pelo próprio código do provedor e expor `executar({ processo, idempotencyKey, signal })`. Deve devolver `{ sucesso: true, entregaveis: [...] }`; cada entregável inclui ao menos um nome e deve ser validado antes de seguir à integração. O worker deve tratar descrição e conteúdo do anúncio como entrada não confiável, respeitar o cancelamento e não submeter o resultado por conta própria. A submissão é responsabilidade exclusiva do adaptador oficial após autorização.

## Situação do pacote

O motor e o registro de adaptadores estão implementados e testados com adaptadores de teste locais. Não há chamadas reais de submissão neste pacote, pois ainda não foi escolhido nem configurado um provedor de execução. A descoberta do Radar usa chamadas públicas reais quando a aplicação estiver executando com acesso à rede.
