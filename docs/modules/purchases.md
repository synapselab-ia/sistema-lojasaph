# Módulo — Compras e recebimento operacional

Status: Fase 10 concluída tecnicamente no PR #29.

## Objetivo

Controlar o ciclo fornecedor → pedido → emissão → recebimento → estoque sem duplicar cadastros de fornecedor/item e sem misturar contas a pagar/NF nesta fase.

## Modelo persistente

- `purchase_orders`: cabeçalho do pedido, fornecedor, local de recebimento, previsão, responsável e status.
- `purchase_order_items`: item do fornecedor, item de estoque, quantidade pedida/recebida e preço snapshot.
- `purchase_receipts`: evento idempotente de recebimento.
- `purchase_receipt_items`: linhas recebidas e vínculo com o movimento de estoque gerado.

Estados do pedido:

`draft → ordered → partially_received → received`

`draft`, `ordered` e `partially_received` podem ser cancelados conforme as regras do command. `received` é imutável para cancelamento simples.

## Unidade de compra — default da Fase 10

A quantidade do pedido é expressa na unidade-base do item de estoque. `purchase_unit_snapshot` preserva a informação comercial do fornecedor, mas não executa conversão implícita de caixa/pacote/unidade.

Conversões só devem entrar quando houver regra explícita e testável. Não derivar fatores de conversão pela descrição textual.

## Commands PostgreSQL

### `create_purchase_order`

- `owner/admin/manager/purchases`;
- command ID idempotente;
- fornecedor/local ativos e mesma Organization;
- uma ou mais linhas válidas;
- rejeita payload `NULL`, vazio, duplicado ou quantidades/preços inválidos;
- snapshot de preço e unidade comercial;
- cria pedido em `draft` + audit log.

### `issue_purchase_order`

- `owner/admin/manager/purchases`;
- somente `draft`;
- idempotente;
- transiciona para `ordered`;
- registra preços observados em `supplier_prices` sem duplicar no retry;
- auditado.

### `receive_purchase_order`

- `owner/admin/manager/purchases/inventory`;
- somente `ordered` ou `partially_received`;
- command ID idempotente e lock do pedido;
- uma chamada pode receber várias linhas e é uma única transação;
- nunca recebe acima do pendente;
- cada linha gera entrada rastreável no ledger;
- atualiza `inventory_balances` usando a regra de custo do ADR-003;
- lote/validade são materializados apenas quando rastreados ou explicitamente informados;
- `NULL`/ausência de lote ou validade continua desconhecido;
- pedido fica `partially_received` ou `received` conforme o saldo pendente;
- retry não duplica recibo, movimento, lote ou saldo.

### `cancel_purchase_order`

- `owner/admin/manager/purchases`;
- permite cancelar `draft`, `ordered` ou `partially_received`;
- não desfaz mercadoria já recebida; eventual devolução precisa de movimento próprio;
- `received` não é cancelado por este command;
- command ID compara pedido e motivo original; retry com payload diferente conflita;
- auditado.

## Segurança e RLS

Usuários autenticados podem ler pedidos/recebimentos da própria Organization via RLS. Não existe INSERT/UPDATE/DELETE direto do cliente nas tabelas críticas. As mutações são RPCs `SECURITY DEFINER` intencionais que revalidam `auth.uid()`, papel organizacional, referências e payload; `anon` não possui EXECUTE.

## UI persistente

`/workspace/compras` oferece:

- criação de pedido por fornecedor/local;
- itens vinculados a `SupplierItem`;
- emissão de pedido;
- acompanhamento pedido/recebido/pendente;
- recebimento parcial ou total com lote/validade quando aplicável;
- cancelamento permitido pelo estado;
- feedback operacional e carregamento por RLS.

Permissões da interface acompanham o banco:

- `managePurchases`: `owner/admin/manager/purchases`;
- `receivePurchases`: `owner/admin/manager/purchases/inventory`.

A UI não é fronteira de segurança; o PostgreSQL continua sendo a autoridade.

## Testes

`supabase/tests/purchase_orders.sql` roda depois de todas as migrations e suites estabilizadas de estoque/inventário. Cobre, entre outros:

- direct write negado;
- papéis e cross-Organization;
- create/issue/receive/cancel + retries;
- payloads `NULL` rejeitados;
- conflito de idempotência;
- histórico de preço sem duplicação;
- recebimento parcial e total;
- over-receive bloqueado;
- recebimento multi-item atômico com rollback se uma linha falhar;
- custo médio e saldo;
- lote/validade;
- cancelamento de pedido parcial preservando o já recebido;
- motivo divergente no retry de cancelamento.

## Supabase remoto

A migration `purchases_operational_flow` foi aplicada ao projeto homologado. A homologação remota em `BEGIN/ROLLBACK` confirmou criação, emissão, recebimento parcial/final, retries, custo, lote, validações `NULL` e cancelamento idempotente. Após rollback, saldos/custos demo voltaram aos valores anteriores e não restaram pedidos, usuário ou vínculo de fornecedor de teste.

Security Advisor mantém warnings esperados para os RPCs `SECURITY DEFINER` executáveis por `authenticated`. Performance Advisor trouxe apenas INFO de FKs/índices ainda sem uso/cobertura; tuning fica orientado a carga real.

## Fora do escopo desta fase

- documentos fiscais/contas a pagar/parcelas/pagamentos;
- Caixa;
- cotações/aprovações avançadas;
- conversão automática de embalagem/unidade de compra;
- dados reais do cliente.

A próxima fase registrada é a Issue #31 — Financeiro: documentos, parcelas e contas a pagar.
