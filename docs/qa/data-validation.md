# Validação de dados — REQ-PLAT-003

Status: **verificado na Fase 29 (2026-08-20) e revalidado na Fase 40 (2026-08-21)**.

`REQ-PLAT-003` exige que regras essenciais sejam validadas no servidor/domínio e, quando aplicável, no banco. A auditoria transversal original não encontrou regra crítica existente que dependesse exclusivamente de formulário/UI nem caso reproduzível em que entrada inválida alcançasse estado persistente ou uma transição proibida por ausência de validação autoritativa.

A Fase 40 não refez a auditoria do zero. Ela tratou a matriz abaixo como baseline e verificou **drift posterior** até a `main` de entrada `ff65c09d14b3468eb119e083f67e63d70aaa81ce`.

## Revalidação da Fase 40

### Comparação desde a auditoria original

A matriz original foi versionada no commit `370b37161150bcf2eac3afb4afb9d8bb80d96e10`. A comparação desse commit com a `main` de entrada da Fase 40 mostrou 14 commits posteriores.

Não houve alteração em `src/**` desde a auditoria original. Portanto domínio, value objects, gateways e UIs críticas que sustentaram a conclusão da Fase 29 continuam materialmente os mesmos.

As únicas mudanças funcionais de banco posteriores relevantes para esta revalidação foram:

- `20260820184106_membership_rls_initplan.sql`: altera somente a forma de avaliação de `auth.uid()` na policy de membership para initPlan, preservando a semântica de autorização;
- `20260820192526_critical_config_audit.sql`: adiciona triggers `AFTER INSERT OR UPDATE` para auditar configurações críticas de estoque, sem remover `CHECK`, FK, trigger de validação ou command existente.

Os demais movimentos de migration no intervalo são reconciliações de filename/versão sem mudança de conteúdo SQL, além de documentação e automação de backup.

### Supabase hospedado — leitura somente

Production `fhbvwyttikrbeaanatlr` foi consultado apenas por introspecção SQL `SELECT` e permanece `ACTIVE_HEALTHY`, PostgreSQL 17.

A inspeção confirmou:

- migrations mais recentes: `20260820192526 / critical_config_audit` e `20260820184106 / membership_rls_initplan`;
- colunas monetárias críticas continuam com precisão/escala apropriadas, em geral `numeric(18,2)`;
- quantidades críticas continuam em `numeric(18,3)`;
- `stock_movement_items.quantity > 0` e `unit_cost_snapshot >= 0`;
- lotes exigem quantidade original positiva, restante não negativo e `remaining_quantity <= original_quantity`;
- transferências/movimentos continuam impedindo origem e destino iguais quando ambos existem;
- inventário mantém checks de quantidade contada/custo não negativos e FKs compostas por `organization_id`;
- compras continuam impondo `ordered_quantity > 0`, `received_quantity >= 0`, `received_quantity <= ordered_quantity` e preço não negativo;
- Financeiro continua impondo lifecycle/document type/parcelas/pagamentos coerentes, inclusive pagamento `amount > 0` e relação explícita de reversão;
- Caixa continua impondo enum/lifecycle, fundo inicial não negativo, sequência válida, movimentos positivos e vigência de taxa coerente;
- cadastros críticos de estoque continuam com `CHECK`s de nome/código/enums e FKs compostas por `organization_id`;
- `inventory_balances_negative_policy` continua instalado e aplica a política de saldo negativo por local;
- os novos triggers `stock_items_critical_config_audit`, `stock_locations_critical_config_audit` e `stock_loss_reasons_critical_config_audit` coexistem com as validações anteriores e apenas adicionam trilha de auditoria.

Nenhum DDL, DML de negócio, RPC crítico ou fixture foi executado em Production nesta revalidação.

### Conclusão diferencial

Não apareceu drift que transforme a UI na única defesa de uma regra essencial. A Fase 40, portanto, **reconfirma REQ-PLAT-003 como atendido** e não justifica Issue corretiva, migration, patch funcional ou suíte duplicada.

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
- `scoped_permissions.sql` e `security_hardening.sql`;
- `audit_trail.sql`, para a única mudança funcional de configuração crítica posterior à auditoria original.

O último head anterior à Fase 40 já estava verde no CI #353. A branch da revalidação deve repetir o CI principal antes do merge, mesmo sendo documental.

## Regra para mudanças futuras

Uma nova regra essencial não deve ser considerada concluída apenas porque o formulário a impede. A barreira autoritativa deve existir em domínio/server/RPC e, para invariantes estruturais ou relacionais, também no PostgreSQL quando aplicável. O teste deve exercitar a camada autoritativa, não apenas a UI.
