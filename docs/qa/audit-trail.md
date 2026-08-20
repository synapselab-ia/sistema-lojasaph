# Auditoria de trilha — REQ-SEC-003

Data: 2026-08-20
Status: **atendido após a correção da Issue #83**.

## Objetivo

Revalidar `REQ-SEC-003 — Auditoria`: alterações críticas em estoque, caixa, financeiro e configurações devem possuir trilha persistente, correlacionável ao ator/Organization/recurso e protegida contra mutação indevida.

Esta frente é distinta de observabilidade de runtime (`REQ-PLAT-006`). `audit_logs` explica mutações de negócio/configuração; logs Vercel/Supabase ajudam a diagnosticar execução e falhas.

## Estrutura e proteção de `audit_logs`

O estado hospedado foi inspecionado somente por leitura.

`public.audit_logs` possui:

- `organization_id` obrigatório;
- `actor_user_id` opcional para distinguir usuário autenticado de mutação de sistema;
- `action`, `entity_type` e `entity_id` para correlação estável;
- `occurred_at`;
- `before_data`/`after_data` opcionais;
- `metadata` estruturada.

Proteção atual:

- RLS habilitada;
- `authenticated` possui somente `SELECT` direto;
- leitura é restrita pela policy `audit_logs_admin_select` a `owner/admin` Organization-wide;
- `anon` não possui acesso;
- clientes normais não recebem `INSERT`, `UPDATE` ou `DELETE` direto;
- o hardening transversal também mantém `authenticated` sem `DELETE` direto nas tabelas públicas de aplicação.

## Matriz dos write paths críticos

### Estoque

Os command paths persistentes já escreviam auditoria dentro da mesma transação:

- entrada — `stock_entry.recorded`;
- retirada — `stock_withdrawal.recorded` via núcleo transacional de outflow;
- perda/vencimento — `stock_loss.recorded` via `private.record_stock_outflow`;
- devolução relacionada — `stock_return.recorded`;
- transferência — `stock_transfer.dispatched` e `stock_transfer.received`.

Os eventos preservam IDs de item/local/lote quando aplicável, quantidade, custo snapshot, estado resultante e origem técnica mínima. Não armazenam credenciais.

### Inventário físico

- `inventory_count.started`;
- `inventory_count.line_counted` com before/after da contagem/custo de ajuste;
- `inventory_count.confirmed`;
- `inventory_count.cancelled`.

Confirmação/cancelamento e respectivos audit events fazem parte da mesma transação; falhas/rollback não deixam evento órfão.

### Compras

- `purchase_order.created`;
- `purchase_order.issued`;
- `purchase_order.received`;
- `purchase_order.cancelled`.

Recebimento mantém correlação com pedido e entrada de estoque sem depender de log efêmero.

### Financeiro

- `payable_document.created`;
- `payment.recorded`;
- `payment.reversed`;
- `payable_document.cancelled`.

Os snapshots auditados são deliberadamente mínimos. A criação do documento registra IDs/total/quantidade de parcelas, sem copiar `access_key`; pagamento registra IDs/valor/data sem copiar `payment_reference`. Estorno/cancelamento preservam histórico em vez de delete físico.

### Caixa e configurações do próprio módulo

- `cash_register.created`;
- `payment_method.created`;
- `fee_rule.created`;
- `cash_session.opened`;
- `cash_payment_total.set`;
- `cash_movement.recorded`;
- `cash_session.closed`;
- `cash_session.cancelled`.

Esses comandos já eram RPCs transacionais/idempotentes e auditados.

## Gap encontrado — configuração crítica via Data API

A auditoria encontrou uma superfície diferente dos RPCs: alguns cadastros são legitimamente persistidos diretamente via Data API + RLS.

O caso real mais claro é `SupabaseStockItemRepository.save()`, que usa `upsert` direto em `stock_items`.

Três tabelas possuem configuração que altera diretamente o comportamento operacional do estoque e, antes desta fase, aceitavam INSERT/UPDATE autenticado sem trigger de auditoria:

1. `stock_items` — categoria/unidade/tipo/status, `track_expiration`, `track_batch`, `is_returnable`;
2. `stock_locations` — `location_type`, status e principalmente `allow_negative_stock`;
3. `stock_loss_reasons` — código/rótulo, `movement_type` e ativação usados por `record_stock_loss`.

Esse gap foi registrado na Issue #83.

## Correção

Migration canônica:

- `20260820192526_critical_config_audit.sql`.

Ela cria `private.audit_critical_inventory_configuration()`:

- `SECURITY DEFINER`;
- `search_path=''`;
- sem `EXECUTE` direto para `anon`, `authenticated` ou `service_role`;
- usada somente por três triggers `AFTER INSERT OR UPDATE` em `stock_items`, `stock_locations` e `stock_loss_reasons`.

A função monta snapshots por whitelist. Campos de timestamp e identificadores fiscais/externos desnecessários não são copiados.

Em UPDATE, `before_data` e `after_data` são comparados somente pelos campos operacionais whitelisted. Isso é importante porque os triggers de `updated_at` alteram fisicamente a linha mesmo quando um `upsert` repete o mesmo payload. UPDATE semanticamente idêntico retorna sem criar evento.

Ações novas:

- `stock_item.created` / `stock_item.updated`;
- `stock_location.created` / `stock_location.updated`;
- `stock_loss_reason.created` / `stock_loss_reason.updated`.

`actor_user_id` usa `auth.uid()` quando a alteração deriva de sessão autenticada. Mutações de sistema podem permanecer com ator nulo, conforme o schema existente.

## Regressão automatizada

`supabase/tests/audit_trail.sql` usa exclusivamente fixtures sintéticas e executa em transação revertida.

A suíte prova:

- criação e alteração das três configurações geram evento único;
- o ator autenticado é preservado;
- mudança de `allow_negative_stock` possui before/after correto;
- mudança de tracking de StockItem possui before/after correto;
- ativação/inativação de motivo de baixa possui before/after correto;
- retry de `upsert` com payload semanticamente idêntico não duplica auditoria;
- mutation + audit dentro de savepoint são revertidos juntos;
- snapshots de StockItem não incluem `ean`, `ncm`, `cest`, `created_at` ou `updated_at`;
- existem exatamente os três triggers esperados;
- a função privada não é executável diretamente pelos API roles;
- RLS/grants de `audit_logs` permanecem fechados para escrita do cliente.

O CI principal passou a executar essa suíte junto de migrations, schema/RLS/hardening e testes transacionais.

## Homologação remota

A migration foi aplicada somente após gates verdes.

Supabase registrou:

- `20260820192526 / critical_config_audit`.

Revalidação read-only confirmou:

- três triggers presentes nas tabelas esperadas;
- função privada com `SECURITY DEFINER` e `search_path=""`;
- `anon`, `authenticated` e `service_role` sem EXECUTE direto na função;
- `audit_logs` continua com somente SELECT para `authenticated` e a RLS anterior;
- a aplicação da DDL não criou evento artificial de Production: a contagem permaneceu em 5 eventos existentes antes/depois da migration.

Security Advisor não passou a listar a nova função privada. Permanecem apenas warnings já conhecidos das RPCs públicas `SECURITY DEFINER` intencionais e leaked-password protection do Auth. Performance Advisor mantém recomendações históricas de índices/FKs, sem finding novo causado por esta migration.

## Limite deliberado

Esta fase não transformou todo CRUD mestre em audit trail por conveniência. Outros cadastros diretos podem ser auditados futuramente se um requisito comprovar criticidade específica.

O critério atual de `REQ-SEC-003` cobre os fluxos exigidos e as configurações identificadas que alteram diretamente o comportamento crítico do estoque, sem coletar dados desnecessários.
