# Workspace — Arquitetura da informação e navegação

Status: **atualizado durante a consolidação da Fase 51 / Issue #142**  
Data: **2026-08-28**

## Objetivo

Organizar o workspace pelo modelo mental da operação sem alterar silenciosamente regras de autorização, persistência ou domínio.

O primeiro nível aprovado permanece:

1. Visão geral;
2. Estoque;
3. Compras;
4. Financeiro;
5. Caixa;
6. Cadastros;
7. Administração.

## Mapa rota → área/subárea

| Rota | Área | Responsabilidade atual |
| --- | --- | --- |
| `/workspace` | Visão geral | Painel operacional. |
| `/workspace/estoque` | Estoque | Posição/saldos, alertas objetivos e acesso às tarefas da área. |
| `/workspace/estoque/entradas` | Estoque | Registro dedicado de entrada de estoque. |
| `/workspace/estoque/retiradas` | Estoque | Registro dedicado de retirada para consumo por setor. |
| `/workspace/baixas` | Estoque | Baixas, perdas, quebras e vencimentos conforme motivos já configurados. |
| `/workspace/devolucoes` | Estoque | Devoluções parciais/totais relacionadas a retiradas anteriores. |
| `/workspace/transferencias` | Estoque | Expedição e recebimento de transferências entre locais. |
| `/workspace/inventarios` | Estoque | Inventários físicos, contagem, confirmação/cancelamento e histórico. |
| `/workspace/estoque/lotes` | Estoque | Consulta de lotes com saldo e validades registradas. |
| `/workspace/estoque/minimos` | Estoque | Consulta e manutenção de estoque mínimo por produto/local. |
| `/workspace/compras` | Compras | Visão da área com situação dos pedidos, recebimentos recentes e acesso às jornadas. |
| `/workspace/compras/pedidos` | Compras | Lista pesquisável/filtrável de pedidos disponíveis no escopo atual. |
| `/workspace/compras/pedidos/novo` | Compras | Criação dedicada de pedido em rascunho. |
| `/workspace/compras/pedidos/[id]` | Compras | Detalhe estável do pedido, itens, quantidades, recebimentos e ações contextuais. |
| `/workspace/compras/pedidos/[id]/receber` | Compras | Registro explícito de recebimento total/parcial pelo boundary autoritativo do pedido. |
| `/workspace/compras/recebimentos` | Compras | Consulta dos recebimentos já registrados e incorporados ao Estoque. |
| `/workspace/compras/historico` | Compras | Consulta de pedidos recebidos ou cancelados. |
| `/workspace/financeiro` | Financeiro | Visão da área com indicadores derivados, atenção de vencimentos e acesso às jornadas. |
| `/workspace/financeiro/contas` | Financeiro | Lista pesquisável/filtrável de documentos e contas a pagar disponíveis no escopo atual. |
| `/workspace/financeiro/contas/nova` | Financeiro | Registro dedicado de documento financeiro e suas parcelas. |
| `/workspace/financeiro/contas/[id]` | Financeiro | Detalhe estável do documento, parcelas, referências, anexos, pagamentos, estornos e cancelamento. |
| `/workspace/financeiro/contas/[id]/pagar` | Financeiro | Registro explícito de pagamento para uma parcela do documento. |
| `/workspace/financeiro/vencimentos` | Financeiro | Consulta de parcelas por status derivado de vencimento/pagamento. |
| `/workspace/financeiro/pagamentos` | Financeiro | Histórico de eventos de pagamento e estorno. |
| `/workspace/caixa` | Caixa | Situação, sessões, movimentações, fechamento e histórico ainda compartilhando a página atual até a consolidação própria. |
| `/workspace/produtos` | Cadastros | Lista de Produtos; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/fornecedores` | Cadastros | Lista de Fornecedores; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/funcionarios` | Cadastros | Lista de Funcionários; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/administracao/estrutura` | Administração | Estrutura organizacional. |
| `/workspace/administracao/acessos` | Administração | Usuários e permissões. |
| `/workspace/backup` | Administração | Proteção dos dados. |
| `/workspace/selecionar-organizacao` | Contexto do workspace | Seleção/troca de organização; fluxo utilitário, não módulo de negócio. |

## Contrato da área Estoque

A raiz `/workspace/estoque` responde primeiro:

> O que existe, onde existe e o que exige atenção?

Ela não concentra mais formulários de movimentação. Ações operacionais ficam em jornadas próprias e reutilizam os mesmos boundaries existentes.

### Posição

A visão principal oferece:

- saldos por produto e local;
- busca por produto/local;
- filtro de situação do estoque mínimo;
- quantidade de posições abaixo do mínimo;
- quantidade de lotes já vencidos com saldo;
- transferências em trânsito;
- atalhos explícitos para as tarefas da área;
- tabela em desktop e cards próprios em telas menores.

O saldo permanece somente leitura na UI.

### Entradas

`/workspace/estoque/entradas` usa a operação persistente já existente. A separação de página não altera:

- validação de quantidade/custo;
- atomicidade;
- idempotência;
- lote/validade;
- cálculo de saldo/custo;
- autorização no backend/banco.

A tela não resolve `REQ-STK-010` nem define nova política de custeio.

### Retiradas

`/workspace/estoque/retiradas` mantém:

- setor de consumo obrigatório;
- local de origem;
- seleção opcional de lote quando aplicável;
- regras de saldo/rastreabilidade já existentes.

A UI deliberadamente chama o comportamento sem escolha de lote de **seleção automática**. Ela não transforma `REQ-EXP-004`/Q-019 em uma política FEFO homologada.

### Baixas e perdas

`/workspace/baixas` preserva motivos estruturados e a exigência de lote vencido quando a regra já existia para itens rastreados. O histórico deixa de expor tipos internos de movimento e possui representação mobile dedicada.

### Devoluções

`/workspace/devolucoes` permanece vinculada à retirada original. Produto, local, custo e rastreabilidade não podem ser substituídos pela tela. IDs internos deixam de ser apresentados como informação operacional; o usuário escolhe a retirada por data, produto, local e quantidade pendente.

### Transferências

`/workspace/transferencias` mantém o contrato de duas etapas:

1. expedir reduz a origem;
2. receber credita o destino somente pela quantidade confirmada.

Recebimento parcial continua suportado. A UI não altera as transações nem permite transferir entre o mesmo local.

### Inventários

`/workspace/inventarios` preserva o fluxo de início → contagem → confirmação/cancelamento. A referência inicial continua protegendo a sessão contra alterações concorrentes, mas esse mecanismo é apresentado em linguagem operacional.

Cancelar inventário exige confirmação explícita e não aplica ajustes. Tabelas de contagem/histórico possuem alternativa mobile deliberada.

A limitação já existente para aumento de item rastreado sem lote explícito permanece visível; a UI não inventa lote ou validade para contornar a regra.

### Lotes e validades

`/workspace/estoque/lotes` é consulta somente leitura dos lotes ativos com saldo. Permite busca/filtro e identifica somente validade já atingida.

Não existe alerta antecipado arbitrário nesta slice porque Q-020 continua aberta. Não existe promessa de FEFO porque Q-019/`REQ-EXP-004` continuam PENDING.

### Estoque mínimo

`/workspace/estoque/minimos` concentra consulta/manutenção da política existente por produto/local. A semântica continua:

- ausência de política não gera alerta;
- igualdade ao mínimo não gera alerta;
- apenas saldo estritamente menor é sinalizado.

## Contrato da área Compras

A raiz `/workspace/compras` responde primeiro:

> Quais pedidos estão em preparação ou aguardando recebimento e onde continuo a tarefa?

Ela não concentra mais criação, emissão, recebimento, cancelamento e histórico no mesmo componente.

### Pedidos

`/workspace/compras/pedidos` é a lista principal. Ela oferece:

- busca por fornecedor, local, produto, status ou observação;
- filtro de status;
- quantidade de itens pendentes;
- total do pedido a partir dos snapshots registrados;
- tabela em desktop e cards próprios em telas menores;
- navegação para URL estável de detalhe.

A criação fica em `/workspace/compras/pedidos/novo` e continua gerando **rascunho** pelo mesmo RPC existente. A tela não cria política de aprovação nem novas condições comerciais.

### Detalhe e ações

`/workspace/compras/pedidos/[id]` apresenta:

- fornecedor e local de recebimento;
- status, previsão e data de emissão;
- observações;
- itens com pedido, recebido e pendente;
- preço unitário e total registrado;
- histórico de recebimentos do pedido;
- ações contextuais de emitir, receber e cancelar conforme o estado e a disponibilidade já suportados.

Pedido inexistente ou inacessível usa o mesmo estado seguro, sem confirmar a existência de registro fora do escopo.

O cancelamento não usa mais `window.prompt()`. A confirmação acontece em diálogo explícito com motivo opcional e deixa claro que recebimentos já efetivados não são revertidos.

### Recebimento

`/workspace/compras/pedidos/[id]/receber` preserva o contrato existente:

- somente pedidos `ordered` ou `partially_received` podem receber;
- é possível receber somente parte dos itens e quantidades;
- a quantidade informada não pode ultrapassar o pendente;
- lote e validade continuam sendo campos suportados pelo comportamento atual, sem transformar Q-018/Q-019 em regra nova;
- a UI não calcula nem grava saldo diretamente.

O RPC autoritativo continua responsável, na mesma transação, por:

- criar o recebimento e seus itens;
- incrementar a quantidade recebida do pedido;
- atualizar o saldo/custo existente;
- criar a entrada e seus itens no Estoque;
- criar lote/alocação quando aplicável;
- atualizar o status do pedido;
- registrar auditoria e preservar idempotência.

Portanto, a consolidação de UX não introduz uma segunda entrada de estoque nem duplica contabilização.

### Recebimentos e histórico

`/workspace/compras/recebimentos` é consulta dos recebimentos já efetivados, com produto, quantidade, custo registrado, lote/validade quando existentes e acesso ao pedido relacionado.

`/workspace/compras/historico` concentra pedidos `received` e `cancelled`, mantendo o detalhe original acessível.

Nenhuma dessas páginas cria nova semântica de agenda, pedido mínimo, embalagem, aprovação ou condição comercial.

## Contrato da área Financeiro

A raiz `/workspace/financeiro` responde primeiro:

> O que está em aberto, o que já foi pago e o que exige atenção por vencimento?

A visão principal não contém mais o formulário completo de documento, pagamento, estorno e cancelamento. Ela apresenta indicadores derivados dos registros existentes, parcelas vencidas/vencendo hoje e atalhos para as jornadas da área.

### Contas a pagar

`/workspace/financeiro/contas` é a lista principal de documentos. Ela oferece:

- busca por fornecedor, unidade, número, tipo, série ou observação;
- filtro de situação derivada do conjunto de parcelas;
- total nominal, saldo/diferença e vencimento em aberto;
- tabela em desktop e cards próprios em telas menores;
- navegação para URL estável de detalhe.

A criação fica em `/workspace/financeiro/contas/nova` e usa o mesmo boundary idempotente existente. Fornecedor, unidade, setor, identificação do documento, parcelas e referências continuam sendo validados pelo backend/banco.

A UI não decide a cardinalidade final de pagamentos, não redistribui parcelas e não classifica diferença monetária.

### Documento financeiro

`/workspace/financeiro/contas/[id]` concentra o contexto persistente da obrigação:

- fornecedor, unidade e setor;
- tipo, número, série, emissão e identificador quando registrados;
- total nominal, pago líquido e saldo/diferença;
- parcelas, vencimentos, status e referências de pagamento;
- anexos privados vinculados ao documento;
- histórico de pagamentos e estornos;
- ações contextuais de registrar pagamento, estornar e cancelar quando disponíveis.

Documento inexistente ou inacessível usa estado seguro sem confirmar a existência de registro fora do escopo.

Anexos permanecem subordinados ao documento e reutilizam o boundary privado existente. A consolidação não cria um cadastro paralelo de anexos nem altera Storage.

### Pagamento

`/workspace/financeiro/contas/[id]/pagar` registra um evento de pagamento pelo RPC existente.

A tela permite escolher uma parcela e informa nominal, pago líquido e saldo/diferença atual. Ela deliberadamente **não impede por regra de UI** um valor que produza diferença para o nominal, porque o comportamento persistente atual preserva essa diferença e Q-015/`REQ-FIN-004` continuam sem decisão adicional.

A referência do pagamento executado permanece separada da instrução/referência cadastrada na parcela.

### Estorno e cancelamento

Estorno e cancelamento deixam de usar `window.prompt()`.

- estorno usa diálogo explícito com motivo opcional e cria o evento reverso pelo mesmo RPC, sem apagar o pagamento original;
- um pagamento já estornado não oferece nova ação de estorno na UI, mantendo também o enforcement de banco;
- cancelamento usa diálogo explícito com motivo opcional;
- documento com pagamento líquido diferente de zero continua precisando ter os pagamentos estornados antes do cancelamento, conforme a regra persistente existente.

Nenhuma dessas regras foi movida para React; a UI apenas apresenta o comportamento já autorizado.

### Vencimentos

`/workspace/financeiro/vencimentos` consulta parcelas por status derivado já existente:

- vencida;
- vence hoje;
- a vencer;
- paga;
- cancelada.

Não foi criada janela arbitrária de “próximos N dias”, pois a configuração dessa antecedência não está homologada. O timezone organizacional continua sendo usado pelo cálculo persistente do status.

### Pagamentos

`/workspace/financeiro/pagamentos` apresenta pagamentos e estornos como eventos separados, com contexto de documento/parcela quando disponível. Ações destrutivas permanecem no detalhe do documento, não na consulta global.

O export CSV existente permanece disponível na visão financeira para perfis com a permissão correspondente.

## Contrato de navegação desktop

- sidebar persistente à esquerda;
- sete áreas reconhecíveis no primeiro nível;
- Estoque mantém `/workspace/estoque` como entrada da área e apresenta suas operações como destinos subordinados;
- Compras mantém `/workspace/compras` como entrada da área e apresenta Pedidos, Recebimentos e Histórico como destinos subordinados;
- Financeiro mantém `/workspace/financeiro` como entrada da área e apresenta Contas a pagar, Vencimentos e Pagamentos como destinos subordinados;
- a raiz de uma área fica destacada como página apenas quando o usuário está nela; em uma subárea, a área permanece destacada e somente a subárea recebe `aria-current=page`;
- Cadastros apresenta Produtos, Fornecedores e Funcionários como destinos subordinados;
- Administração apresenta Estrutura, Usuários e permissões e Proteção dos dados;
- links reconhecem subrotas de detalhe sem fazer `/workspace` ficar ativo em todas as páginas.

## Contrato de navegação mobile

- o drawer vertical continua sendo o mecanismo principal de navegação;
- a mesma hierarquia do desktop fica disponível no menu;
- selecionar um destino fecha o menu;
- listas/tabelas densas de Estoque, Compras e Financeiro possuem cards/formulários próprios em mobile quando overflow horizontal prejudicaria a tarefa;
- recebimento de pedido e pagamento financeiro possuem fluxos verticais dedicados, em vez de campos embutidos em tabela larga.

## Autorização e segurança

Esta arquitetura **não define autorização**.

- guards, gateways, RPCs, policies e RLS existentes continuam sendo as boundaries autoritativas;
- disponibilidade de ações na UI apenas reflete permissões já conhecidas e não substitui enforcement;
- pedidos e recebimentos continuam scope-aware pelo local de estoque relacionado;
- documentos, parcelas, referências e pagamentos continuam scope-aware pela unidade/setor do documento financeiro;
- criação, pagamento, estorno e cancelamento continuam passando pelos wrappers públicos autorizados e pelas funções privadas existentes;
- Q-022 permanece aberta e nenhum papel técnico foi renomeado como cargo de negócio;
- nenhuma regra transacional foi movida para React;
- nenhuma migration/RPC/RLS é necessária para estas consolidações de jornada.

## Requisitos PENDING preservados

As consolidações de Estoque, Compras e Financeiro não resolvem por inferência:

- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-FIN-004` — cardinalidade final de pagamentos por parcela;
- Q-013 — detalhes finais da identidade documental financeira;
- Q-014 — pagamentos parciais/múltiplos;
- Q-015 — classificação de diferença entre nominal e pago;
- Q-016 — conteúdo final da referência Pix/Boleto;
- Q-017 — semântica de “Checar data”;
- Q-018 — momento exato de obrigatoriedade de validade;
- Q-024 — semântica dos dias de pedido/entrega;
- Q-025 — regra de pedido mínimo.

## Próxima etapa

Depois da integração e validação da consolidação de Financeiro, a sequência aprovada da Fase 51 promove:

> **Caixa.**
