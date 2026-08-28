# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Baseline funcional após a consolidação de Compras:

- `main=63d97153cbe90fa13e9316522d1b909b5ed14840` — merge do PR #157;
- PR #157 — `feat: consolidar jornada de Compras` — **merged**;
- CI pós-merge da `main` #553 / run `33203276726`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- no head final do PR #157, Business Transactions Integration #251 / run `33203078639`: **success**;
- no head final do PR #157, Inventory Count Integration #264 / run `33203078624`: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. reconciliação/handoff de Cadastros — PR #152;
6. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
7. Estoque: posição + jornadas operacionais consolidadas — PR #155;
8. Compras: pedidos + recebimentos + histórico consolidados — PR #157.

## Compras consolidado

A área de Compras deixou de concentrar criação, listagem, emissão, recebimento, cancelamento e histórico em uma única página.

### Visão da área

`/workspace/compras` agora apresenta:

- quantidade de pedidos visíveis;
- rascunhos;
- pedidos aguardando recebimento;
- recebimentos recentes;
- atalhos para Pedidos, Recebimentos e Histórico;
- pedidos em andamento com acesso ao detalhe.

### Pedidos

`/workspace/compras/pedidos` passou a ser a lista principal:

- busca por fornecedor, local, produto, status ou observação;
- filtro por status;
- quantidade de itens pendentes;
- total do pedido calculado a partir dos snapshots existentes;
- tabela desktop e cards mobile;
- URL estável para cada pedido.

`/workspace/compras/pedidos/novo` concentra a criação e continua gerando pedido em **rascunho** pelo RPC existente.

`/workspace/compras/pedidos/[id]` apresenta:

- fornecedor e local de recebimento;
- status, previsão, emissão e observações;
- itens com quantidade pedida, recebida e pendente;
- preço unitário e total registrados;
- histórico de recebimentos;
- ações contextuais de emitir, receber e cancelar conforme estado e permissões já existentes.

Pedido inexistente ou inacessível utiliza o mesmo estado seguro, sem confirmar existência fora do escopo.

### Recebimento

`/workspace/compras/pedidos/[id]/receber` substitui a ação embutida na antiga megapágina.

O fluxo:

- mostra somente itens com quantidade pendente;
- suporta recebimento parcial;
- explicita pedido, recebido e pendente;
- permite lote/validade quando o produto já possui rastreabilidade correspondente;
- deixa itens em branco fora do recebimento atual;
- usa o mesmo `receive_purchase_order` já existente via gateway.

A UI **não escreve saldo diretamente**. O RPC continua sendo a fronteira autoritativa que, na mesma transação, registra o recebimento, atualiza quantidades do pedido, movimenta Estoque, trata lote/alocação quando aplicável, atualiza o status e preserva auditoria/idempotência.

Portanto, a consolidação não criou segunda entrada de estoque nem dupla contabilização.

### Recebimentos e histórico

- `/workspace/compras/recebimentos` consulta entregas já efetivadas, produto, quantidade, custo registrado e lote/validade quando existentes;
- `/workspace/compras/historico` concentra pedidos recebidos ou cancelados;
- ambos preservam acesso ao detalhe original sem expor UUID como informação operacional.

### UX e linguagem

- Compras passou a aparecer como área com destinos subordinados na navegação;
- `window.prompt()` deixou de ser usado para cancelar pedido;
- cancelamento usa diálogo explícito com motivo opcional e deixa claro que entradas já efetivadas não são revertidas;
- criação, lista, detalhe e recebimento usam os componentes do design system;
- mobile possui cards/fluxos verticais próprios em vez de depender somente de tabela larga;
- estados loading, empty, erro, read-only e not-found foram tratados conforme aplicável.

## Boundaries e regras preservados

Nenhum schema, migration, RPC, grant ou policy/RLS foi criado ou alterado para esta consolidação.

Continuam autoritativos:

- `create_purchase_order`;
- `issue_purchase_order`;
- `receive_purchase_order`;
- `cancel_purchase_order`;
- RLS/grants e escopo associado ao local de estoque;
- validações de transição de status;
- limite de quantidade recebida versus pendente;
- atomicidade e idempotência do recebimento;
- integração pedido → Estoque exatamente uma vez pelo fluxo já implementado.

A UI não criou política de aprovação, pedido mínimo, agenda comercial, custeio ou FEFO.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para produzir essa evidência.

## Próxima slice oficial: Financeiro

**A próxima área da Fase 51 é Financeiro. Não refazer Cadastros, Estoque ou Compras sem bug/gap concreto.**

Inventário preliminar já confirmou que `/workspace/financeiro` ainda é uma megapágina de aproximadamente 26 KB que mistura:

- visão de contas a pagar;
- criação de documento e parcelas;
- instruções/referências de pagamento;
- registro de pagamento;
- estorno;
- cancelamento;
- anexos;
- exportação CSV;
- histórico de eventos.

Também existem `window.prompt()` para estorno de pagamento e cancelamento de documento. A próxima execução deve inventariar os boundaries de Financeiro e organizar a jornada no padrão `lista → detalhe → ação`, preservando as regras financeiras já implementadas.

Não criar migration/RPC para resolver layout antes de provar gap real.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. **Financeiro** — próxima;
9. Caixa;
10. Dashboard;
11. limpeza de linguagem/resíduos de engenharia;
12. homologação UX em jornadas desktop/tablet/mobile;
13. reconciliação funcional final;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## PENDING permanece sem inferência

Continuam PENDING até decisão real de negócio:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

Q-022 também permanece aberta; não reinterpretar papéis técnicos como cargos de negócio.

## #75/#121 — TOTALMENTE ON HOLD

Não investigar scheduling, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar Storage/R2/S3/retention/secrets/variables e não retomar restore nesta fase.

`REQ-PLAT-005` será retomado no production-readiness final, salvo decisão explícita do operador.
