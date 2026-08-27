# Módulo — Dashboard operacional, alertas e KPIs

Status: **Fase 49 — cobertura determinística de Fornecedores/Compras (`REQ-DASH-005`) em implementação sobre a baseline integrada da Fase 48.**

## Objetivo

`/workspace` é um painel somente leitura orientado a ação. Ele consolida sinais persistentes de Financeiro, Caixa, Compras, Fornecedores e Estoque sem criar uma segunda fonte de verdade, sem usar chave privilegiada e sem fabricar granularidade organizacional, temporal ou critérios de desempenho.

## Princípios

- RLS + sessão autenticada são a fronteira de leitura;
- regras transacionais permanecem nos módulos de origem;
- ausência de dado não é convertida em dado inventado;
- Unit e Setor só atuam quando existe vínculo explícito;
- período só recorta métricas com evento/data canônica comprovada;
- indicadores de estado atual não viram histórico por conveniência;
- `horizonDays` e período explícito são conceitos distintos;
- quantidades de itens com unidades de medida heterogêneas não são somadas em um “saldo total” ou “volume de compras” fictício;
- fornecedor não recebe score/ranking/SLA por inferência.

## Filtros

O Dashboard mantém:

- Unidade: todas ou uma Unit ativa autorizada;
- Setor: todos os Setores autorizados ou um Setor explícito;
- horizonte de alertas: 7, 15 ou 30 dias;
- período gerencial opcional `dateFrom + dateTo`, inclusivo, em datas de negócio da Organization.

A combinação Unit + Setor é validada contra as linhas visíveis por RLS. Caixa continua Unit-level porque o modelo não possui `sector_id` em `cash_registers`.

## Semântica temporal preservada

### Financeiro

Fonte: `payable_installment_summary`.

Período canônico: `due_date`. `net_paid_amount` continua cumulativo por obrigação e não é apresentado como evento de pagamento do intervalo.

### Caixa

Fonte: `cash_sessions`.

- caixas abertos: estado atual;
- fechamentos/divergências: `business_date`;
- Setor não é inferido para Caixa.

### Compras — estado operacional

Fonte: `purchase_orders` e local de estoque explícito.

- pedidos pendentes: estado atual;
- atrasos/próximas entregas: `expected_delivery_date`;
- ausência de data prevista não é fabricada.

### Compras — histórico da Fase 49

Fontes: `purchase_orders`, `purchase_receipts`, `suppliers` e `stock_locations`.

- pedido histórico = pedido efetivamente emitido, identificado por `ordered_at IS NOT NULL`;
- período de pedidos usa `ordered_at`;
- recebimento histórico usa `purchase_receipts.received_at`;
- um recebimento dentro do período continua válido mesmo quando o pedido foi emitido antes do período;
- Unit/Setor recortam compras exclusivamente pelo `purchase_orders.stock_location_id` e pelos locais visíveis/compatíveis;
- sem período explícito: histórico visível completo;
- `horizonDays` não recorta pedidos emitidos nem recebimentos;
- histórico por fornecedor expõe fatos: quantidade de pedidos emitidos, quantidade de recebimentos e última atividade disponível;
- nenhuma quantidade de itens é somada entre UOMs diferentes.

As datas `ordered_at` e `received_at` são `timestamptz`. O período local da Organization é convertido para UTC como `[início inclusivo, fim exclusivo)`, reutilizando a mesma semântica comprovada na Fase 48.

### Preços de fornecedor — Fase 49

Fonte: `supplier_prices`, vinculada por `supplier_item_id` a `supplier_items`, `suppliers` e `stock_items`.

- período usa `supplier_prices.observed_at` com os mesmos limites UTC do calendário local;
- comparação usa exclusivamente `unit_price`;
- `package_price` não participa da análise;
- uma variação só existe quando há pelo menos duas observações do **mesmo `supplier_item_id`** no recorte;
- as duas observações mais recentes do vínculo são comparadas por `observed_at`, com `id` como desempate estável;
- observações iguais contam como histórico comparável, mas não como alteração de preço;
- quando não existem duas observações comparáveis, a UI mostra ausência de histórico suficiente em vez de “0 variações” como se a estabilidade estivesse comprovada;
- `Money` preserva comparação e delta em centavos exatos.

` supplier_prices` não possui Unit, Sector, StockLocation ou referência ao pedido que originou a observação. Portanto, **preço permanece Organization-wide mesmo quando Unit/Setor está ativo**. A UI declara esse limite; não existe tentativa de atribuir preço a um escopo local por heurística.

### Estoque

A Fase 48 consolidou a seção gerencial de Estoque com fontes já autoritativas.

#### Posições com saldo

Fonte: `inventory_balances`.

- conta combinações `stock_item_id + stock_location_id` com `quantity_on_hand != 0`;
- é estado atual e não é recortado por período;
- não soma `quantity_on_hand` entre itens/UOMs diferentes;
- `inventory_balances` continua projeção reconstruível, nunca ledger histórico.

#### Movimentações

Fonte: `stock_movements` confirmado.

- conta `status='confirmed'`;
- sem período explícito: histórico visível completo, sem janela arbitrária;
- com período: `occurred_at` é o evento temporal canônico;
- os limites locais da Organization são convertidos para UTC como `[início inclusivo, fim exclusivo)` antes da consulta;
- `horizonDays` não altera a contagem de movimentos.

#### Perdas e vencimentos registrados

Fonte: o mesmo ledger, limitado a `movement_type in ('loss', 'expiration')` e `status='confirmed'`.

- usa exatamente a mesma semântica de `occurred_at` do período;
- não infere perda de saldo negativo, diferença de inventário ou outra heurística.

#### Transferências

`dispatched` / `partially_received` continuam **estado atual**. Não existe recorte histórico artificial de “em trânsito no período”.

#### Inventários

`counting` / `review` continuam **estado atual**. O painel não transforma `started_at`/`confirmed_at` em uma série histórica nesta slice.

#### Validades

Fonte: `inventory_batches.expiration_date` para lotes ativos com saldo.

- vencidos e vencendo respeitam `expiration_date`;
- horizonte controla a janela de próximos vencimentos;
- quando há período, o intervalo é aplicado à data de validade;
- lote sem validade continua desconhecido.

#### Estoque mínimo

Fonte: `stock_minimum_policies + inventory_balances`, entregue na Fase 47.

- estado atual;
- abaixo do mínimo somente quando `quantity_on_hand < minimum_quantity`;
- igualdade não alerta;
- ausência de política não alerta;
- saldo ausente não é convertido em zero.

## Escopo de movimentações

A consulta da Fase 48 usa somente relações explícitas:

- `source_location_id`;
- `destination_location_id`;
- `sector_id`.

Unit/Setor são resolvidos por `stock_locations`/`sectors` visíveis sob RLS. Nenhum movimento é atribuído a escopo por nome, usuário, referência textual ou heurística.

## Implementação da Fase 48

### `supabase-stock-overview-query.ts`

Read adapter browser-safe:

- usa `createBrowserSupabaseClient()` / sessão autenticada normal;
- usa `count: exact` + `head: true` para posições, movimentos e perdas;
- não recebe `horizonDays`, portanto o horizonte não pode recortar o ledger por acidente;
- converte período local para UTC considerando timezone e transições de DST;
- falha fechado quando um escopo explícito não resolve locais/Setores visíveis;
- não cria RPC, view, migration nem bypass de RLS.

### `stock-overview-section.tsx`

A seção de Estoque centraliza:

- posições com saldo;
- movimentos;
- perdas/vencimentos registrados;
- abaixo do mínimo;
- transferências em trânsito;
- inventários em andamento;
- lotes vencidos;
- lotes vencendo no horizonte.

Os indicadores de Estoque foram removidos da seção genérica “Operação” para não aparecerem duplicados.

## Implementação da Fase 49

### `supabase-purchase-overview-query.ts`

Read adapter browser-safe que:

- usa apenas o client autenticado normal;
- consulta relações já protegidas por RLS;
- pagina resultados em blocos para não transformar o limite padrão do PostgREST em contagem silenciosamente incompleta;
- mantém pedidos/recebimentos escopados pelo local explícito;
- preserva `ordered_at`, `received_at` e `observed_at` como eventos distintos;
- agrega histórico por fornecedor em memória sem somar quantidades heterogêneas;
- compara preços somente dentro do mesmo `supplier_item_id`;
- não cria view, RPC, migration ou nova regra transacional.

### `purchase-overview-section.tsx`

A seção “Compras e fornecedores” expõe:

- pedidos emitidos;
- recebimentos;
- fornecedores distintos com pedidos emitidos;
- histórico factual por fornecedor;
- quantidade de observações de preço;
- disponibilidade de histórico comparável;
- itens cujo último preço comparável mudou;
- últimas alterações com preço anterior, preço atual e delta monetário exato.

Quando Unit/Setor está ativo, a seção explicita que o bloco de preços permanece Organization-wide por ausência de vínculo local no schema.

## Testes e evidência

### Fase 48

A regressão cobre:

- conversão de data de negócio `America/Sao_Paulo` para UTC;
- dia de mudança de DST em `America/New_York`;
- construção de escopo somente com local/Setor explícitos;
- ausência de escopo inventado.

CI da implementação corrigida:

- CI #492 / `33113200782`: database, lint, typecheck, Vitest e production build verdes;
- Inventory Count Integration #236 / `33113200850`: success;
- Business Transactions Integration #220 / `33113200888`: success.

Validação read-only em Production em 2026-08-27, sem fixtures:

- 4 posições item/local com saldo diferente de zero;
- 6 movimentos confirmados;
- 1 movimento `loss/expiration`;
- datas de negócio observadas: 2026-08-01 (3 movimentos) e 2026-08-20 (3 movimentos, incluindo a perda).

### Fase 49 — inventário Production read-only

Sem qualquer DDL/DML/fixture:

- `suppliers`: 2;
- `supplier_contacts`: 1;
- `supplier_terms`: 0;
- `supplier_items`: 2;
- `supplier_prices`: 2;
- `purchase_orders`: 0;
- `purchase_order_items`: 0;
- `purchase_receipts`: 0;
- `purchase_receipt_items`: 0;
- as 2 observações de preço atuais têm `source='demo_seed'`, `observed_at=2026-08-01 12:00:00+00` e pertencem a pares fornecedor/item distintos;
- pares com duas ou mais observações comparáveis em Production: 0.

Logo, Production hoje comprova o **estado vazio correto** para compras e a **ausência correta de variação calculável**. Não criar pedido, recebimento ou preço artificial para fabricar demonstração.

Testes adicionados na branch cobrem:

- limites UTC do período local usados pelo histórico;
- recebimento no período cujo pedido foi emitido antes dele;
- agrupamento factual por fornecedor;
- ausência de variação com observações de vínculos distintos;
- comparação das duas observações mais recentes do mesmo vínculo;
- histórico comparável com preços iguais sem falsa alteração.

CI completa da Fase 49 deve ser reconciliada no PR antes do merge.

## Fora do escopo

- score/ranking de fornecedor;
- SLA, lead time médio, atraso médio ou qualidade sem modelo canônico aprovado;
- valuation/valor financeiro total do estoque;
- CMV/analytics de custeio;
- gráficos e séries históricas avançadas;
- previsão de demanda/IA;
- pedido de compra automático ou sugestão de quantidade;
- economia estimada sem baseline comprovado;
- comparação/conversão automática de embalagens;
- EAN/fiscal (`REQ-ITEM-003`);
- qualquer mudança nas regras transacionais de estoque/compras;
- deploy Vercel rotineiro.
