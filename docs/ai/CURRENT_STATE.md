# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 10 — Compras, pedidos e recebimento operacional — concluída tecnicamente no PR #29.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch da entrega: `agent/purchases-runtime`
- PR atual: #29 — Fase 10 — compras, pedidos e recebimento operacional
- Issue atual: #28 — deve ser encerrada pelo merge do PR #29
- Próxima Issue registrada: #31 — Fase 11 — Financeiro: documentos, parcelas e contas a pagar

## Correção de continuidade realizada antes da Fase 10

Durante a validação do PR #29 foi comprovado que o PR #26 de transferência nunca havia sido integrado à `main`, embora a documentação posterior o tratasse como concluído.

O reparo foi concluído pelo PR #30:

- transferência transacional restaurada na `main`;
- suites de transferência restauradas;
- runtime `/workspace/transferencias` restaurado;
- contrato `inventory_adjustment` reconciliado por migration forward-only;
- factories de domínio e CI conciliados;
- Issue #24 reaberta durante o reparo e fechada novamente após CI verde;
- PR #26 antigo fechado como superseded, sem merge.

Registro detalhado: `docs/ai/RESTORE_TRANSFER_NOTE.md`.

## Concluído até aqui

- governança, engenharia reversa, domínio e fundação Next.js;
- PostgreSQL/Supabase + migrations + RLS;
- Auth SSR + membership/Organization;
- produtos e fornecedores persistentes;
- entrada e retirada/FEFO;
- transferência dispatch/receive parcial/total;
- inventário físico persistente;
- compras e recebimento operacional persistentes.

## Fase 10 — Compras

Implementado:

- `purchase_orders`, `purchase_order_items`, `purchase_receipts` e `purchase_receipt_items`;
- criação de pedido em `draft`;
- emissão para `ordered`;
- recebimento parcial/total;
- cancelamento controlado;
- preço/custo snapshot;
- histórico de preço em `supplier_prices` na emissão;
- recebimento multi-item atômico integrado ao ledger/saldo/lotes;
- idempotência + locks + auditoria;
- RLS por Organization;
- `/workspace/compras`;
- papéis de gestão `owner/admin/manager/purchases`;
- recebimento também permitido a `inventory`;
- quantidade do pedido na unidade-base de estoque; `purchase_unit_snapshot` informativo, sem conversão implícita.

A migration versionada é `20260817234222_purchases_operational_flow.sql`.

## Hardening da Fase 10

- payload `NULL` de criação/recebimento é rejeitado explicitamente;
- retry de cancelamento compara também o motivo original;
- retry com o mesmo command ID e payload diferente conflita;
- direct writes do cliente permanecem proibidos nas tabelas críticas;
- `received` não é cancelável pelo command simples;
- cancelamento parcial não desfaz mercadoria já recebida.

## Validação

Head material final da implementação passou:

- lint;
- typecheck;
- testes unitários;
- production build;
- CI PostgreSQL 17 com todas as migrations;
- suites de schema/RLS/roles;
- retirada;
- transferência simples e multi-lote;
- inventário físico;
- suíte completa de compras.

A suíte de compras comprova também rollback multi-item: se uma linha de recebimento falha, nenhuma linha do mesmo command permanece aplicada.

## Supabase remoto

Aplicado no projeto homologado em `sa-east-1`:

- `reconcile_inventory_adjustment_type` durante o reparo da Fase 9;
- `purchases_operational_flow` na Fase 10.

Homologação de Compras executada em `BEGIN/ROLLBACK` confirmou:

- criação e retry;
- emissão;
- payloads `NULL` rejeitados;
- recebimento parcial e final;
- retry de recebimento sem duplicação;
- custo médio e saldo coerentes;
- lotes/validades preservados quando informados;
- cancelamento idempotente e conflito com motivo diferente.

Após rollback:

- item rastreado retornou a saldo `100.000` e custo `2.10`;
- item não rastreado retornou a saldo `20.000` e custo `20.00`;
- zero pedidos de teste;
- zero usuário de teste;
- zero vínculo SupplierItem temporário.

Security Advisor mostra apenas warnings esperados/intencionais dos command RPCs `SECURITY DEFINER` executáveis por `authenticated`. Performance Advisor mantém INFO de FKs/índices, tratado como backlog de tuning orientado a carga real.

## Próxima ação

Integrar o PR #29 e confirmar o fechamento da Issue #28. Depois, tornar a Issue #31 a única frente em andamento e iniciar a Fase 11 — Financeiro conforme `docs/ai/NEXT_ACTION.md`.
