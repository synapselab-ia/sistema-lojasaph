# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 49 / Issue #136 — `REQ-DASH-005` implementada e validada no PR #137 (`agent/dashboard-purchases-supplier-history`).**

Baseline integrada antes da Fase 49:

- `main=e3583b14280e6919834e53e958d00cf8d3946434` — merge da Fase 48 / PR #135;
- Issue #134 encerrada;
- CI pós-merge da Fase 48 `33113803812`: success.

Não refazer Fase 48/#134.

## Fase 49 — #136 / PR #137

A slice fecha a cobertura determinística de Fornecedores/Compras no Dashboard sem migration, view, RPC, fixture Production ou nova regra transacional.

### Entregue

- pedidos emitidos: `purchase_orders.ordered_at IS NOT NULL`;
- período de pedidos por `ordered_at` no timezone da Organization;
- recebimentos por `purchase_receipts.received_at`, independentes da data de emissão do pedido;
- Unit/Setor para compras exclusivamente por `purchase_orders.stock_location_id` e locais visíveis/compatíveis;
- sem período: histórico visível completo;
- `horizonDays` não recorta histórico de pedidos/recebimentos;
- histórico factual por fornecedor: pedidos emitidos, recebimentos e última atividade;
- histórico de preços por `supplier_prices.observed_at`;
- variação somente entre as duas observações mais recentes do mesmo `supplier_item_id`;
- comparação somente de `unit_price`, usando `Money`/centavos exatos;
- preço permanece Organization-wide com Unit/Setor ativo porque `supplier_prices` não possui vínculo local explícito;
- ausência de duas observações comparáveis aparece como histórico insuficiente, não como falsa variação zero;
- timestamps são comparados por instante, não pela representação textual ISO;
- paginação do read model possui ordenação estável.

Explicitamente não implementado:

- score/ranking/“melhor fornecedor”;
- SLA, lead time, atraso médio ou qualidade inferida;
- soma de quantidades de UOMs heterogêneas;
- comparação/conversão automática de `package_price`/embalagem;
- economia estimada sem baseline canônico;
- forecast/IA/compra automática.

### Código

- `src/modules/dashboard/adapters/supabase-purchase-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-purchase-overview-query.test.ts`;
- `src/modules/dashboard/ui/purchase-overview-section.tsx`;
- integração em `src/app/workspace/(operacao)/page.tsx`;
- documentação em `docs/modules/dashboard.md`.

O browser usa sessão autenticada + RLS. Nenhuma service/admin key foi adicionada.

### Validação do head de implementação

Head de implementação validado: `f050bf5450958a2200e2571f4bc2c98202c22418`.

- CI #496 / `33116796708`: database, lint, typecheck, Vitest e production build verdes;
- Inventory Count Integration #239 / `33116796712`: success;
- Business Transactions Integration #223 / `33116796785`: success.

O commit documental final posterior a esses checks não altera código de runtime; ainda assim, o PR #137 só deve ser integrado com os checks do head final verdes.

### Production — validação read-only

Projeto `fhbvwyttikrbeaanatlr`, sem DDL/DML/fixtures:

- `suppliers`: 2;
- `supplier_contacts`: 1;
- `supplier_terms`: 0;
- `supplier_items`: 2;
- `supplier_prices`: 2;
- `purchase_orders`: 0;
- `purchase_order_items`: 0;
- `purchase_receipts`: 0;
- `purchase_receipt_items`: 0;
- pares com duas ou mais observações comparáveis: 0.

As duas observações atuais têm `source='demo_seed'`, `observed_at=2026-08-01 12:00:00+00` e pertencem a vínculos fornecedor/item distintos.

Portanto o estado correto em Production hoje é:

- zero pedidos emitidos no histórico;
- zero recebimentos;
- observações de preço existentes;
- histórico insuficiente para calcular variação.

Não criar dados Production para fabricar demonstração.

## Issue #121 — ON HOLD

`REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage` continua aberta, mas não é frente ativa.

Última checagem válida em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Retomar somente com gatilho real:

1. primeira execução agendada do `Production Storage Backup` — próxima janela esperada: 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo criado pelo fluxo normal;
3. incidente/regressão real do pipeline Storage.

Sem gatilho: não fazer `workflow_dispatch` artificial, fixture Production ou repetição da mesma introspecção vazia.

A Issue #75 permanece umbrella de proteção de dados e não é frente ativa.

## Ordem de trabalho

Antes de abrir nova frente, reconciliar o estado real do PR #137 / Issue #136 / `main`.

Se #137 estiver mergeado, #136 fechada e a CI pós-merge da `main` estiver verde:

1. não refazer a Fase 49;
2. promover `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após decisão de negócio real.

A #121 pode ser retomada quando seu gatilho existir, mas simples espera não bloqueia essa ordem.

## Não fazer

- não reabrir Fase 48/#134 sem regressão concreta;
- não reabrir/ampliar #136 com score/SLA/forecast sem requisito novo;
- não tocar #121 sem gatilho real;
- não criar dados Production para fabricar evidência;
- não somar quantidades de UOMs diferentes;
- não inferir Unit/Setor para `supplier_prices`;
- não antecipar requisitos PENDING por conveniência;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente.
