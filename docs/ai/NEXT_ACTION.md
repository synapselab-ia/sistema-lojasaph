# Next Action — Sistema Lojasaph

## Estado atual

A **Fase 49 / Issue #136 (`REQ-DASH-005`)** está em andamento na branch:

`agent/dashboard-purchases-supplier-history`

Baseline confirmada antes da implementação:

- `main=e3583b14280e6919834e53e958d00cf8d3946434`;
- PR #135 merged;
- Issue #134 fechada;
- CI pós-merge `33113803812`: success.

Não refazer a Fase 48.

## Slice implementada

A #136 foi delimitada a partir do schema/RLS/dados reais de Production, sem inventar regra de desempenho.

Recorte atual:

- pedidos emitidos por `purchase_orders.ordered_at IS NOT NULL`;
- recebimentos por `purchase_receipts.received_at`;
- histórico factual por fornecedor: pedidos, recebimentos e última atividade;
- Unit/Setor para compras somente por `purchase_orders.stock_location_id`;
- período local da Organization convertido para limites UTC;
- histórico de `supplier_prices` por `observed_at`;
- comparação somente entre as duas observações mais recentes do mesmo `supplier_item_id`;
- somente `unit_price`, usando `Money`;
- preço permanece Organization-wide quando Unit/Setor está ativo porque não existe vínculo local explícito no schema;
- nenhuma soma de quantidades heterogêneas;
- nenhum score/ranking/SLA/forecast.

Arquivos principais da implementação:

- `src/modules/dashboard/adapters/supabase-purchase-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-purchase-overview-query.test.ts`;
- `src/modules/dashboard/ui/purchase-overview-section.tsx`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

Nenhuma migration, view, RPC, DDL ou DML Production é necessária.

## Próxima ação imediata

1. reconciliar a Issue #136 e a branch `agent/dashboard-purchases-supplier-history` com o estado real do GitHub;
2. se **não existir PR** para essa branch, abrir um único PR contra `main`; se já existir, usar o existente e não duplicar;
3. revisar o diff real do PR e confirmar que ele contém apenas a Fase 49;
4. verificar os checks reais do head:
   - database/CI aplicável;
   - lint;
   - typecheck;
   - Vitest;
   - production build;
   - workflows de integração aplicáveis;
5. se algum check falhar, corrigir **somente a falha concreta**, sem ampliar a slice;
6. com CI verde, reconciliar documentação/evidência do PR e seguir o fluxo normal de review/merge da #136;
7. após merge, confirmar `main`, fechamento da Issue e CI pós-merge;
8. então promover **`REQ-ITEM-003 — EAN/código de barras/dados fiscais`**, salvo bug, regressão ou nova prioridade explícita.

## Estado esperado em Production para esta fase

Inventário read-only de 2026-08-27:

- 2 suppliers;
- 2 supplier_items;
- 2 supplier_prices;
- 0 purchase_orders;
- 0 purchase_receipts;
- 0 pares de `supplier_item_id` com duas observações de preço comparáveis.

Portanto, enquanto esses dados não mudarem pelo fluxo normal do produto, o comportamento correto do Dashboard é:

- compras/recebimentos históricos vazios;
- observações de preço existentes;
- estado explícito de **histórico insuficiente para calcular variação**.

Não criar pedido, recebimento, preço ou fixture em Production para fabricar evidência visual.

## #121 — continua ON HOLD

Não tocar #121 sem gatilho novo.

Última checagem válida em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos:

- primeira execução **agendada** do Storage backup; próxima janela esperada: 2026-08-28 03:47 America/Sao_Paulo;
- primeiro anexo Production legítimo;
- incidente/regressão real.

Sem isso, não fazer dispatch manual, fixture Production ou revalidação repetitiva.

## Ordem posterior

Salvo regressão/nova prioridade:

1. concluir `REQ-DASH-005` / #136;
2. `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após validação de negócio.

## Fora de escopo imediato

- reabrir #132/#134 sem regressão;
- score/ranking/“melhor fornecedor”;
- SLA, lead time ou atraso médio sem semântica canônica;
- economia estimada sem baseline comprovado;
- conversão/comparação automática de embalagem;
- valuation/CMV/forecast genérico;
- POS/vendas ou outras questões PENDING;
- deploy Vercel rotineiro;
- tornar o repositório private automaticamente.
