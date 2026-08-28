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
| `/workspace/compras` | Compras | Pedidos, recebimentos e histórico ainda compartilhando a página atual até a consolidação própria. |
| `/workspace/financeiro` | Financeiro | Contas/documentos, vencimentos e pagamentos ainda compartilhando a página atual até a consolidação própria. |
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

## Contrato de navegação desktop

- sidebar persistente à esquerda;
- sete áreas reconhecíveis no primeiro nível;
- Estoque mantém `/workspace/estoque` como entrada da área e apresenta suas operações como destinos subordinados;
- a raiz de Estoque fica destacada como página apenas quando o usuário está nela; em uma subárea, Estoque permanece destacado como área e somente a subárea recebe `aria-current=page`;
- Cadastros apresenta Produtos, Fornecedores e Funcionários como destinos subordinados;
- Administração apresenta Estrutura, Usuários e permissões e Proteção dos dados;
- links reconhecem subrotas de detalhe sem fazer `/workspace` ficar ativo em todas as páginas.

## Contrato de navegação mobile

- o drawer vertical continua sendo o mecanismo principal de navegação;
- a mesma hierarquia do desktop fica disponível no menu;
- selecionar um destino fecha o menu;
- listas/tabelas densas das jornadas de Estoque possuem cards/formulários próprios em mobile quando overflow horizontal prejudicaria a tarefa.

## Autorização e segurança

Esta arquitetura **não define autorização**.

- guards, gateways, RPCs, policies e RLS existentes continuam sendo as boundaries autoritativas;
- disponibilidade de ações na UI apenas reflete permissões já conhecidas e não substitui enforcement;
- Q-022 permanece aberta e nenhum papel técnico foi renomeado como cargo de negócio;
- nenhuma regra transacional foi movida para React;
- nenhuma migration/RPC/RLS é necessária para esta consolidação de jornada.

## Requisitos PENDING preservados

A consolidação de Estoque não resolve por inferência:

- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita.

## Próxima etapa

Depois da integração e validação da consolidação de Estoque, a sequência aprovada da Fase 51 promove:

> **Compras.**
