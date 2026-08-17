# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Estado atual

Fase 9 — estoque transacional completo no Supabase — concluída tecnicamente no PR #27.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch da entrega: `agent/inventory-count-runtime`
- PR: #27 — Fase 9C — inventário físico persistente
- Issue encerrada pelo merge: #24
- Próxima Issue: #28 — Fase 10 — Compras, pedidos e recebimento operacional

## Concluído até aqui

- governança/engenharia reversa/domínio/Next.js;
- cadastros base e fornecedores;
- PostgreSQL/Supabase + migrations + RLS;
- Auth SSR + membership/Organization;
- entrada de estoque;
- retirada/FEFO;
- transferência dispatch/receive parcial/total;
- inventário físico persistente.

## Inventário persistente

Migration principal: `20260817232352_persistent_inventory_count.sql`, seguida de migration de cancelamento gerada pelo CLI pinado.

Implementado:

- `expected_quantity` + `expected_average_cost` como snapshot;
- uma sessão aberta por local;
- contagem por linha auditada;
- stale detection por quantidade/custo;
- ajustes `inventory_adjustment` positivos/negativos;
- FEFO para ajuste negativo rastreado;
- custo explícito quando positivo sem base anterior;
- bloqueio de positivo rastreado sem lote explícito;
- confirmação/cancelamento idempotentes;
- rota `/workspace/inventarios`.

## Validação

CI reaplica migrations/suites anteriores e os testes de inventário em PostgreSQL 17 limpo. A aplicação passa lint, typecheck, Vitest e build.

Homologação remota em rollback confirmou snapshot, ajuste negativo rastreado, ajuste positivo com custo, retry, stale, cancelamento/reabertura e bloqueio de positivo rastreado. Dados demo permanecem intactos.

## Próxima ação

Após o merge do PR #27, trabalhar exclusivamente na Issue #28: compras, pedidos e recebimento operacional. Não reabrir estoque/auth sem bug ou requisito novo comprovado.
