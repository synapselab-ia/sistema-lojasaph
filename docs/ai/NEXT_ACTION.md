# Next Action — Sistema Lojasaph

## Estado de transição

A **Fase 49 / Issue #136 (`REQ-DASH-005`)** foi implementada e validada no PR #137 (`agent/dashboard-purchases-supplier-history`).

Head de implementação validado: `f050bf5450958a2200e2571f4bc2c98202c22418`.

Validação desse head:

- CI #496 / `33116796708`: success — database, lint, typecheck, Vitest e production build;
- Inventory Count Integration #239 / `33116796712`: success;
- Business Transactions Integration #223 / `33116796785`: success.

O commit documental final posterior não altera runtime. Ainda assim, antes de qualquer nova frente, confirmar os checks do **head final** do PR e o estado real de merge.

## Próxima ação imediata

1. conferir PR #137, Issue #136, branch `agent/dashboard-purchases-supplier-history` e `main`;
2. se #137 ainda estiver aberto:
   - confirmar que os checks do head final estão verdes;
   - corrigir somente falha real, se houver;
   - não ampliar a Fase 49;
   - seguir o fluxo normal de merge com `Closes #136`;
3. se #137 já estiver mergeado:
   - não refazer a Fase 49;
   - confirmar #136 fechada;
   - confirmar o novo SHA de `main`;
   - confirmar CI pós-merge da `main`;
4. com a transição íntegra, promover **`REQ-ITEM-003 — EAN/código de barras/dados fiscais`** como próxima frente independente, salvo bug/regressão/nova prioridade explícita.

## Semântica que não deve ser reaberta sem evidência nova

Fase 49:

- pedido histórico por `ordered_at IS NOT NULL`;
- período de pedidos por `ordered_at`;
- recebimentos por `received_at`, independentes da data de emissão do pedido;
- Unit/Setor de compras somente por `purchase_orders.stock_location_id`;
- `horizonDays` não recorta histórico;
- histórico factual por fornecedor, sem score/ranking/SLA;
- preço por `supplier_prices.observed_at`;
- comparação somente das duas observações mais recentes do mesmo `supplier_item_id`;
- somente `unit_price` + `Money`;
- Unit/Setor não são inferidos para `supplier_prices`;
- ausência de duas observações comparáveis = histórico insuficiente, não falsa variação zero;
- nenhuma soma de UOMs heterogêneas;
- nenhuma migration/view/RPC/fixture Production nesta fase.

## Production — estado observado

Inventário read-only de 2026-08-27:

- 2 suppliers;
- 2 supplier_items;
- 2 supplier_prices;
- 0 purchase_orders;
- 0 purchase_receipts;
- 0 pares com duas observações comparáveis.

Não criar pedido, recebimento, preço ou fixture em Production para fabricar evidência visual.

## Se `REQ-ITEM-003` for promovido

Antes de implementar:

1. ler novamente `AGENTS.md`, `00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md`, este arquivo e `WORKFLOW.md`;
2. reconciliar Issues/PRs/branches/CI reais;
3. localizar o estado atual de EAN/código de barras/dados fiscais em schema, domínio, UI, importação e documentação;
4. revisar requisitos e questões abertas relacionadas;
5. consultar Production somente read-only quando isso ajudar a provar o gap;
6. definir a menor slice coerente a partir de campos/regras existentes;
7. não inventar NCM/CEST/regra fiscal, validação comercial ou integração externa sem requisito canônico.

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

1. concluir a transição do PR #137 / #136;
2. `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após validação de negócio.

## Fora de escopo imediato

- reabrir #132/#134/#136 sem regressão ou requisito novo;
- score/ranking/SLA/forecast de fornecedor;
- valuation/CMV/forecast genérico;
- POS/vendas ou outras questões PENDING;
- deploy Vercel rotineiro;
- tornar o repositório private automaticamente.
