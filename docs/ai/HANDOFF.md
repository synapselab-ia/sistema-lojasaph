# Handoff — Sistema Lojasaph

## Frente atual

**Fase 49 / Issue #136 — Dashboard de Fornecedores/Compras (`REQ-DASH-005`).**

Branch: `agent/dashboard-purchases-supplier-history`.

Baseline da frente:

- `main=e3583b14280e6919834e53e958d00cf8d3946434`;
- PR #135 merged;
- Issue #134 fechada;
- CI pós-merge `33113803812`: success.

Não refazer a Fase 48 / #134.

## O que foi inventariado

A #136 foi aberta somente após reconciliar schema, RLS, docs e Production.

Relações consideradas:

- `suppliers`;
- `supplier_contacts`;
- `supplier_terms`;
- `supplier_items`;
- `supplier_prices`;
- `purchase_orders` / `purchase_order_items`;
- `purchase_receipts` / `purchase_receipt_items`;
- `stock_locations` para o escopo explícito de compras.

Production `fhbvwyttikrbeaanatlr`, read-only em 2026-08-27:

- 2 suppliers;
- 1 supplier_contact;
- 0 supplier_terms;
- 2 supplier_items;
- 2 supplier_prices;
- 0 purchase_orders;
- 0 purchase_order_items;
- 0 purchase_receipts;
- 0 purchase_receipt_items.

As duas observações de preço são `demo_seed`, na mesma data, para vínculos distintos. Portanto não existe variação comparável real em Production hoje.

## Decisões da Fase 49

### Compras

- histórico de pedido usa `ordered_at IS NOT NULL`;
- período de pedidos usa `ordered_at`;
- período de recebimentos usa `received_at`;
- recebimento no período não depende de o pedido ter sido emitido no mesmo período;
- Unit/Setor somente por `purchase_orders.stock_location_id`;
- sem período = histórico visível completo;
- `horizonDays` não recorta o histórico.

### Fornecedores

O Dashboard mostra apenas fatos:

- quantidade de pedidos emitidos;
- quantidade de recebimentos;
- última atividade disponível.

Não existe nesta fase:

- score;
- ranking;
- “melhor fornecedor”;
- SLA;
- lead time/atraso médio;
- qualidade inferida.

### Preços

- fonte: `supplier_prices`;
- período: `observed_at`;
- comparação: duas observações mais recentes do mesmo `supplier_item_id`;
- valor: `unit_price` via `Money`;
- `package_price`/conversão de embalagem ficam fora;
- uma observação isolada não vira “variação 0”;
- Unit/Setor não recortam preço porque `supplier_prices` não possui vínculo local explícito; a UI informa que esse bloco permanece Organization-wide.

## Implementação na branch

Arquivos principais:

- `src/modules/dashboard/adapters/supabase-purchase-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-purchase-overview-query.test.ts`;
- `src/modules/dashboard/ui/purchase-overview-section.tsx`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

O adapter:

- usa client Supabase browser-safe + RLS;
- pagina leituras para não depender silenciosamente do limite padrão do PostgREST;
- mantém pedidos/recebimentos separados temporalmente;
- agrupa atividade por fornecedor sem somar quantidades/UOMs;
- calcula somente comparação de preço determinística;
- não cria RPC/view/migration nem bypass de segurança.

A UI adiciona a seção **Compras e fornecedores** ao Dashboard com:

- pedidos emitidos;
- recebimentos;
- fornecedores com pedidos;
- histórico por fornecedor;
- observações/comparabilidade de preço;
- alterações de preço com valor anterior, atual e delta exato;
- empty states explícitos quando não existe histórico suficiente.

## Testes adicionados

`supabase-purchase-overview-query.test.ts` cobre:

- timezone/período local → UTC;
- recebimento no período de pedido antigo;
- agrupamento factual por fornecedor;
- vínculos de preço distintos não comparáveis;
- comparação das duas observações mais recentes do mesmo vínculo;
- preços iguais com histórico comparável sem falsa alteração.

A validação final deve ser lida no PR real da branch. Se o PR ainda não existir, abri-lo; se já existir, não abrir duplicata.

Exigir antes do merge:

- lint verde;
- typecheck verde;
- Vitest verde;
- production build verde;
- workflows aplicáveis verdes;
- nenhuma migration Production necessária para esta slice.

## ON HOLD — #121

Issue #121 continua **ON HOLD** e não é a frente ativa.

Última checagem válida em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos para retomar:

1. primeira execução agendada do `Production Storage Backup` — próxima janela esperada em 2026-08-28 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo pelo produto;
3. incidente/regressão real do pipeline.

Sem gatilho:

- não usar dispatch manual;
- não criar fixture Production;
- não repetir introspecção vazia;
- não refazer tooling/S3/R2/guardrails.

## Próxima ação

1. reconciliar Issue #136 + branch `agent/dashboard-purchases-supplier-history` + PR associado;
2. se não houver PR, abrir um único PR contra `main`;
3. se houver PR, verificar checks reais e corrigir somente falhas/regressões;
4. com CI verde, fazer review/merge conforme o fluxo normal e fechar #136;
5. confirmar CI pós-merge da `main`;
6. então promover **`REQ-ITEM-003 — EAN/código de barras/dados fiscais`**, salvo bug/regressão/nova prioridade explícita.

## Restrições permanentes relevantes

- defaults profissionais, conservadores e reversíveis;
- GitHub/documentação são a fonte de continuidade;
- RLS é boundary de acesso;
- nenhum secret no browser/GitHub/docs;
- não resolver requisitos PENDING por inferência;
- não criar dados Production para provar Dashboard;
- sem deploy Vercel rotineiro;
- repo temporariamente public por decisão operacional; não alterar automaticamente.
