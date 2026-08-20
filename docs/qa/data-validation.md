# Validação de dados — REQ-PLAT-003

Status: **verificado em 2026-08-20**.

`REQ-PLAT-003` exige que regras essenciais sejam validadas no servidor/domínio e, quando aplicável, no banco. A auditoria transversal não encontrou regra crítica existente que dependa exclusivamente de formulário/UI nem caso reproduzível em que entrada inválida alcance estado persistente ou uma transição proibida por ausência de validação autoritativa.

## Contrato de camadas

- UI: ergonomia e feedback antecipado; nunca é a única barreira para regra crítica.
- Domínio/value objects: normalização e formatos canônicos reutilizáveis.
- Adapters/RPCs: validação semântica e de lifecycle antes da mutação crítica.
- PostgreSQL: tipos, precisão, `NOT NULL`, `CHECK`, `UNIQUE`, FKs compostas por `organization_id`, triggers e índices parciais protegem invariantes estruturais.
- RLS/grants/scope continuam sendo autorização, não substitutos de validação de dados.

## Matriz de evidência

| Área | Regras amostradas | Barreira autoritativa | Evidência existente |
| --- | --- | --- | --- |
| Primitivos | dinheiro com até 2 casas; quantidade com até 3 casas; overflow | `Money`, `Quantity` + `numeric(18,2)`/`numeric(18,3)` | value objects + schema remoto |
| Cadastros | nomes/códigos obrigatórios, enums/status, categoria/unidade/fornecedor válidos | domínio + `CHECK` + FKs compostas | `stock-item.ts`, `supplier.ts`, constraints remotas |
| Fornecedores | no máximo um contato primário ativo | domínio + índice único parcial | `MULTIPLE_PRIMARY_CONTACTS` + `supplier_contacts_one_primary_idx` |
| Estoque | quantidade/custo, item/local ativo, saldo, lote, motivo, devolução | `private.*` RPCs + checks/triggers/FKs | suites de entrada/retirada/perda/devolução/transferência |
| Saldo negativo | permitido somente em local configurado | trigger `inventory_balances_negative_policy` | migration de retirada + trigger remoto |
| Transferências | origem != destino, recebido <= despachado, lifecycle | RPCs + `CHECK`/FK | suites `stock_transfer*.sql` |
| Inventário | uma contagem aberta, quantidade contada >= 0, confirmação completa/stale, custo/lote em ajuste | RPCs + constraints/índice | `inventory_count.sql` e cancelamento |
| Compras | itens obrigatórios/sem duplicidade, quantidade > 0, precisão, preço >= 0, fornecedor/item/local ativos, recebimento <= pendente | `private.create/receive_purchase_order` + constraints | `purchase_orders.sql` |
| Financeiro | tipo obrigatório, conjunto de parcelas consistente, valores/precisão, vencimento, unidade/setor/fornecedor, lifecycle de pagamento/estorno/cancelamento | RPCs + constraints/FKs | `finance_payables.sql` |
| Caixa | identidade de configuração, enum de meio/movimento, datas de taxa, valores, sessão aberta, valor contado | RPCs + constraints/FKs | `cash_sessions.sql` |
| Escopo | IDs inexistentes/inativos/cross-org | queries RPC por organização + FKs compostas + RLS/scope | suites de permissões e módulos |
| Datas | tipos `date`/`timestamptz`, intervalos de taxa e sequenciamento de transferência | assinatura RPC + `CHECK`/casts | schema/RPCs e suites existentes |

## Pontos verificados no Supabase hospedado

A inspeção foi somente leitura.

- colunas monetárias críticas usam escala 2; quantidades críticas usam escala 3;
- itens de movimento exigem quantidade positiva e custo não negativo;
- compras impedem recebido maior que pedido;
- parcelas validam numeração/contagem e o RPC exige conjunto completo e vencimento;
- pagamentos exigem valor positivo, data e documento ativo;
- Caixa valida enums, valores, sessão aberta e intervalos de taxa;
- relações hierárquicas relevantes usam FKs compostas com `organization_id`;
- `inventory_balances` não possui mais um `CHECK quantity_on_hand >= 0` rígido porque a migration transacional de retirada o substituiu intencionalmente por `private.enforce_inventory_balance_negative_policy()`, permitindo negativo apenas quando `stock_locations.allow_negative_stock=true`.

## Regressões reaproveitadas

Não foi criada suíte duplicada. A conclusão reutiliza as suites já executadas pela CI, principalmente:

- `schema_smoke.sql`;
- `stock_withdrawal.sql` e `stock_withdrawal_sector_scope.sql`;
- `stock_return.sql`;
- `stock_loss.sql`;
- `stock_transfer.sql` e `stock_transfer_multibatch.sql`;
- `inventory_count.sql` e `inventory_count_cancel.sql`;
- `purchase_orders.sql`;
- `finance_payables.sql`;
- `cash_sessions.sql`;
- `scoped_permissions.sql` e `security_hardening.sql`.

A última mudança funcional anterior (Fase 28) permaneceu verde em CI #301, Business Transactions Integration #153 e Inventory Count Integration #169. Esta auditoria não alterou código, schema, RLS, grants, Auth ou dados remotos.

## Regra para mudanças futuras

Uma nova regra essencial não deve ser considerada concluída apenas porque o formulário a impede. A barreira autoritativa deve existir em domínio/server/RPC e, para invariantes estruturais ou relacionais, também no PostgreSQL quando aplicável. O teste deve exercitar a camada autoritativa, não apenas a UI.
