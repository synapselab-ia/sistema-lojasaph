# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 49 / Issue #136 — `REQ-DASH-005` em andamento na branch `agent/dashboard-purchases-supplier-history`.**

Baseline integrada e reconciliada antes da nova frente:

- `main=e3583b14280e6919834e53e958d00cf8d3946434` — merge da Fase 48 / PR #135;
- Issue #134 encerrada;
- PR #135 merged;
- CI pós-merge da `main`: run `33113803812`, success;
- nenhum PR aberto no início da Fase 49;
- únicas Issues abertas naquele ponto: #75 e #121, ambas de proteção de dados e fora da frente ativa.

Não refazer Fase 48/#134.

## Fase 49 — #136 / `REQ-DASH-005`

### Inventário técnico concluído

Revisados:

- `AGENTS.md`, `00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md` e `WORKFLOW.md`;
- `docs/product/requirements.md`;
- `docs/product/open-questions.md`;
- `docs/modules/purchases.md`;
- `docs/modules/master-data.md`;
- Dashboard integrado após a Fase 48;
- schema/RLS real de suppliers, vínculos, preços, pedidos e recebimentos;
- Production somente read-only.

RLS confirmado em Production:

- `suppliers`, `supplier_contacts`, `supplier_terms`, `supplier_items`, `supplier_prices`: RLS ativo; leitura para `authenticated` por membership da Organization;
- `purchase_orders`, `purchase_order_items`, `purchase_receipts`, `purchase_receipt_items`: RLS ativo; leitura passa por `private.can_read_purchase_order(...)` ou relação equivalente;
- não existe necessidade de service/admin key para o read model do Dashboard.

### Dados reais encontrados em Production

Projeto: `fhbvwyttikrbeaanatlr`.

Contagens em 2026-08-27:

- `suppliers`: 2;
- `supplier_contacts`: 1;
- `supplier_terms`: 0;
- `supplier_items`: 2;
- `supplier_prices`: 2;
- `purchase_orders`: 0;
- `purchase_order_items`: 0;
- `purchase_receipts`: 0;
- `purchase_receipt_items`: 0.

As 2 observações de preço atuais:

- têm `source='demo_seed'`;
- têm `observed_at=2026-08-01 12:00:00+00`;
- pertencem a vínculos fornecedor/item distintos;
- não formam nenhum par com duas observações comparáveis.

Consequência: Production hoje deve mostrar compras/recebimentos vazios e histórico de preço **sem variação calculável**. Não criar fixtures/pedidos/preços em Production para fabricar evidência.

### Slice aprovada na #136

A Fase 49 implementa apenas fatos determinísticos:

- pedidos emitidos por `purchase_orders.ordered_at IS NOT NULL`;
- recebimentos por `purchase_receipts.received_at`;
- histórico por fornecedor com contagem de pedidos emitidos, recebimentos e última atividade;
- Unit/Setor para compras exclusivamente por `purchase_orders.stock_location_id`;
- período inclusivo no calendário local convertido para UTC como `[start, end)`;
- histórico de preços por `supplier_prices.observed_at`;
- variação somente entre as duas observações mais recentes do mesmo `supplier_item_id`;
- comparação somente de `unit_price`, usando `Money`/centavos exatos;
- preço permanece Organization-wide quando Unit/Setor está ativo, pois `supplier_prices` não possui vínculo local explícito;
- ausência de duas observações comparáveis aparece como falta de histórico suficiente, não como “0 variação” comprovada.

Explicitamente fora da slice:

- score/ranking/“melhor fornecedor”;
- SLA/lead time/atraso médio sem semântica canônica;
- soma de quantidades heterogêneas;
- comparação/conversão de `package_price`/embalagem;
- forecast, IA, sugestão ou compra automática;
- economia estimada sem baseline comprovado.

### Código da branch

Arquivos novos:

- `src/modules/dashboard/adapters/supabase-purchase-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-purchase-overview-query.test.ts`;
- `src/modules/dashboard/ui/purchase-overview-section.tsx`.

Arquivo integrado:

- `src/app/workspace/(operacao)/page.tsx` — adiciona a seção “Compras e fornecedores”.

Documentação afetada:

- `docs/modules/dashboard.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`.

Nenhuma migration, view, RPC, DDL ou DML Production foi criada.

### Validação

Testes unitários da nova slice cobrem:

- limites UTC do período local;
- recebimento no período com pedido emitido antes do período;
- agrupamento factual por fornecedor;
- ausência de comparação entre vínculos distintos;
- comparação das duas observações mais recentes do mesmo `supplier_item`;
- histórico comparável sem alteração de preço.

A validação completa deve ser reconciliada no PR da branch:

- lint;
- typecheck;
- Vitest;
- production build;
- workflows aplicáveis.

Não fazer deploy Vercel rotineiro para provar esta entrega.

## Issue #121 — ON HOLD

`REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage` continua aberta, mas **não é frente ativa**.

A checagem única exigida em 2026-08-27 confirmou:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Retomar somente quando ocorrer um destes eventos:

1. primeira execução **agendada** do `Production Storage Backup` após o armamento — próxima janela esperada: 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo criado pelo fluxo normal;
3. falha/incidente/regressão real do pipeline Storage.

Até lá: não fazer `workflow_dispatch` artificial, não criar fixture Production e não repetir a mesma validação sem evidência nova.

A Issue #75 permanece umbrella de proteção de dados e não é frente ativa.

## Ordem de trabalho

1. concluir #136 / Fase 49: reconciliar PR da branch, corrigir apenas falhas reais de CI/review e integrar;
2. após merge, confirmar `main` + Issue/PR + CI pós-merge e promover `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após decisão de negócio real.

A #121 pode ser retomada quando seu gatilho existir, mas simples espera não bloqueia essa ordem.

## Não fazer

- não reabrir Fase 48/#134 sem regressão concreta;
- não ampliar #136 com score/SLA/forecast;
- não tocar #121 sem gatilho real;
- não criar dados Production para fabricar evidência;
- não somar quantidades de UOMs diferentes;
- não inferir Unit/Setor para `supplier_prices`;
- não antecipar `REQ-ITEM-003` dentro da Fase 49;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente.
