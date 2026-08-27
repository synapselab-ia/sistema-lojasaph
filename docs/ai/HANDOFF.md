# Handoff — Sistema Lojasaph

## Frente em transição

**Fase 49 / Issue #136 — Dashboard de Fornecedores/Compras (`REQ-DASH-005`) implementada e validada no PR #137.**

Branch: `agent/dashboard-purchases-supplier-history`.

Baseline da frente:

- `main=e3583b14280e6919834e53e958d00cf8d3946434`;
- PR #135 merged;
- Issue #134 fechada;
- CI pós-merge da Fase 48 `33113803812`: success.

Não refazer Fase 48/#134.

## O que a Fase 49 entrega

### Compras

- pedido histórico = `ordered_at IS NOT NULL`;
- período de pedidos usa `ordered_at`;
- recebimento histórico usa `received_at`;
- recebimento dentro do período continua válido quando o pedido foi emitido antes dele;
- Unit/Setor usam somente `purchase_orders.stock_location_id`;
- sem período = histórico visível completo;
- `horizonDays` não recorta esse histórico.

### Fornecedores

O Dashboard mostra fatos, não avaliação inventada:

- quantidade de pedidos emitidos;
- quantidade de recebimentos;
- última atividade disponível.

Ficam fora:

- score;
- ranking/“melhor fornecedor”;
- SLA;
- lead time/atraso médio;
- qualidade inferida.

### Preços

- fonte: `supplier_prices`;
- período por `observed_at`;
- comparação somente das duas observações mais recentes do mesmo `supplier_item_id`;
- usa `unit_price` + `Money`;
- `package_price`/conversão de embalagem ficam fora;
- uma única observação não vira “variação 0”;
- preços iguais com histórico comparável não viram falsa alteração;
- Unit/Setor não recortam preços porque não existe relação local explícita; a UI informa que esse bloco permanece Organization-wide.

### Robustez adicionada

- período local da Organization convertido para UTC como `[start inclusive, end exclusive)`;
- timestamps comparados por instante (`Date.parse`) para suportar representações ISO equivalentes nos limites;
- paginação em blocos com ordenação estável;
- nenhuma migration/view/RPC;
- nenhum bypass de RLS.

## Arquivos principais

- `src/modules/dashboard/adapters/supabase-purchase-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-purchase-overview-query.test.ts`;
- `src/modules/dashboard/ui/purchase-overview-section.tsx`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

## Validação

Head de implementação: `f050bf5450958a2200e2571f4bc2c98202c22418`.

- CI #496 / `33116796708`: success;
  - database: success;
  - lint: success;
  - typecheck: success;
  - Vitest: success;
  - production build: success;
- Inventory Count Integration #239 / `33116796712`: success;
- Business Transactions Integration #223 / `33116796785`: success.

O commit documental final não altera runtime, mas o PR #137 só deve ser mergeado se os checks do head final também estiverem verdes.

## Production read-only

Projeto `fhbvwyttikrbeaanatlr`, em 2026-08-27:

- 2 suppliers;
- 1 supplier_contact;
- 0 supplier_terms;
- 2 supplier_items;
- 2 supplier_prices;
- 0 purchase_orders;
- 0 purchase_order_items;
- 0 purchase_receipts;
- 0 purchase_receipt_items;
- 0 vínculos com duas observações comparáveis.

As duas observações existentes são `demo_seed`, na mesma data, para vínculos distintos. Logo o empty state atual de compras/recebimentos e o aviso de histórico insuficiente de preços são o comportamento correto. Não criar fixtures Production para “provar” a tela.

## ON HOLD — #121

Issue #121 continua ON HOLD e não é frente ativa.

Última checagem válida:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos:

1. primeira execução agendada do `Production Storage Backup` — próxima janela esperada em 2026-08-28 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo pelo produto;
3. incidente/regressão real do pipeline.

Sem gatilho:

- não usar dispatch manual;
- não criar fixture Production;
- não repetir introspecção vazia;
- não refazer tooling/S3/R2/guardrails.

## Próxima ação

1. reconciliar PR #137, Issue #136 e `main`;
2. se #137 ainda estiver aberto, confirmar checks do head final e corrigir somente falha real;
3. com checks verdes, seguir o fluxo normal de merge; `Closes #136` deve encerrar a Issue;
4. após merge, confirmar o novo SHA de `main` e a CI pós-merge;
5. se a transição estiver íntegra, promover **`REQ-ITEM-003 — EAN/código de barras/dados fiscais`**;
6. não refazer a Fase 49 se #137 já estiver integrada.

## Restrições permanentes relevantes

- defaults profissionais, conservadores e reversíveis;
- GitHub/documentação são a fonte de continuidade;
- RLS é boundary de acesso;
- nenhum secret no browser/GitHub/docs;
- não resolver requisitos PENDING por inferência;
- sem deploy Vercel rotineiro;
- repo temporariamente public por decisão operacional; não alterar automaticamente.
