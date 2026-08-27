# Módulo — Dashboard operacional, alertas e KPIs

Status: **Fase 49 — cobertura determinística de Fornecedores/Compras (`REQ-DASH-005`) implementada e validada no PR #137.**

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
- quantidades de itens com UOMs heterogêneas não são somadas em um “saldo total” ou “volume de compras” fictício;
- fornecedor não recebe score/ranking/SLA por inferência.

## Filtros

O Dashboard mantém:

- Unidade: todas ou uma Unit ativa autorizada;
- Setor: todos os Setores autorizados ou um Setor explícito;
- horizonte de alertas: 7, 15 ou 30 dias;
- período gerencial opcional `dateFrom + dateTo`, inclusivo, em datas de negócio da Organization.

A combinação Unit + Setor é validada contra linhas visíveis por RLS. Caixa continua Unit-level porque o modelo não possui `sector_id` em `cash_registers`.

## Semântica temporal por domínio

### Financeiro

Fonte: `payable_installment_summary`.

- período canônico: `due_date`;
- `net_paid_amount` continua cumulativo por obrigação e não é apresentado como evento de pagamento do intervalo.

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

- pedido histórico = `ordered_at IS NOT NULL`;
- período de pedidos usa `ordered_at`;
- recebimento histórico usa `purchase_receipts.received_at`;
- recebimento dentro do período continua válido quando o pedido foi emitido antes dele;
- Unit/Setor recortam compras exclusivamente por `purchase_orders.stock_location_id` e pelos locais visíveis/compatíveis;
- sem período explícito: histórico visível completo;
- `horizonDays` não recorta pedidos emitidos nem recebimentos;
- histórico por fornecedor expõe somente quantidade de pedidos emitidos, quantidade de recebimentos e última atividade;
- nenhuma quantidade de item/UOM é agregada em volume global.

`ordered_at` e `received_at` são `timestamptz`. O período local da Organization é convertido para UTC como `[início inclusivo, fim exclusivo)` e a comparação em memória usa o instante (`Date.parse`), não a string ISO, para tratar representações equivalentes corretamente nos limites.

### Preços de fornecedor — Fase 49

Fonte: `supplier_prices`, ligada por `supplier_item_id` a `supplier_items`, `suppliers` e `stock_items`.

- período usa `supplier_prices.observed_at` com os mesmos limites UTC;
- comparação usa exclusivamente `unit_price`;
- `package_price` não participa;
- uma variação exige pelo menos duas observações do **mesmo `supplier_item_id`** dentro do recorte;
- as duas observações mais recentes são comparadas por instante, com `id` como desempate estável;
- observações iguais contam como histórico comparável, mas não como alteração;
- ausência de duas observações comparáveis aparece como histórico insuficiente, nunca como estabilidade comprovada;
- `Money` preserva preço e delta em centavos exatos.

`supplier_prices` não possui Unit, Sector, StockLocation nem referência ao pedido que originou a observação. Portanto o bloco de preços permanece **Organization-wide** quando Unit/Setor está ativo. A UI declara esse limite; nenhuma atribuição local é inventada.

### Estoque — Fase 48 preservada

#### Posições com saldo

Fonte: `inventory_balances`.

- conta combinações `stock_item_id + stock_location_id` com `quantity_on_hand != 0`;
- é estado atual e não é recortado por período;
- não soma quantidades entre itens/UOMs diferentes;
- `inventory_balances` continua projeção reconstruível, não ledger histórico.

#### Movimentações e perdas

Fonte: `stock_movements` confirmado.

- movimentos: `status='confirmed'`;
- perdas/vencimentos: `movement_type in ('loss', 'expiration')` + `status='confirmed'`;
- sem período: histórico visível completo;
- com período: `occurred_at`;
- período local convertido para UTC como `[início inclusivo, fim exclusivo)`;
- `horizonDays` não recorta movimentos/perdas.

Unit/Setor usam somente relações explícitas:

- `source_location_id`;
- `destination_location_id`;
- `sector_id`.

#### Transferências e inventários

- `dispatched` / `partially_received`: estado atual;
- `counting` / `review`: estado atual;
- não são transformados artificialmente em série histórica pelo período.

#### Validades

Fonte: `inventory_batches.expiration_date` para lotes ativos com saldo.

- vencidos e vencendo usam `expiration_date`;
- horizonte controla próximos vencimentos;
- período, quando presente, atua sobre a data de validade;
- lote sem validade continua desconhecido.

#### Estoque mínimo

Fonte: `stock_minimum_policies + inventory_balances`.

- estado atual;
- abaixo do mínimo somente se `quantity_on_hand < minimum_quantity`;
- igualdade não alerta;
- ausência de política não alerta;
- saldo ausente não é convertido em zero.

## Implementação da Fase 49

### `supabase-purchase-overview-query.ts`

Read adapter browser-safe:

- usa `createBrowserSupabaseClient()` / sessão autenticada normal;
- respeita RLS das tabelas de suppliers, preços, pedidos e recebimentos;
- pagina resultados em blocos para não depender silenciosamente do limite padrão do PostgREST;
- usa ordenação estável em consultas paginadas;
- mantém `ordered_at`, `received_at` e `observed_at` como eventos distintos;
- mantém pedidos/recebimentos escopados pelo local explícito;
- agrega histórico por fornecedor sem somar UOMs heterogêneas;
- compara preços somente dentro do mesmo `supplier_item_id`;
- não cria view, RPC, migration ou bypass de RLS.

### `purchase-overview-section.tsx`

A seção “Compras e fornecedores” expõe:

- pedidos emitidos;
- recebimentos;
- fornecedores distintos com pedidos emitidos;
- histórico factual por fornecedor;
- quantidade de observações de preço;
- disponibilidade de histórico comparável;
- itens cujo último preço comparável mudou;
- últimas alterações com preço anterior, preço atual e delta monetário.

Quando Unit/Setor está ativo, a seção informa que preços continuam Organization-wide por ausência de vínculo local no schema.

## Testes e evidência

### Fase 48

CI corrigida da implementação de Estoque:

- CI #492 / `33113200782`: success;
- Inventory Count Integration #236 / `33113200850`: success;
- Business Transactions Integration #220 / `33113200888`: success.

Production read-only em 2026-08-27:

- 4 posições item/local com saldo diferente de zero;
- 6 movimentos confirmados;
- 1 movimento `loss/expiration`;
- datas observadas: 2026-08-01 e 2026-08-20.

### Fase 49

Head de implementação validado: `f050bf5450958a2200e2571f4bc2c98202c22418`.

- CI #496 / `33116796708`: database + lint + typecheck + Vitest + production build verdes;
- Inventory Count Integration #239 / `33116796712`: success;
- Business Transactions Integration #223 / `33116796785`: success.

Regressão adicionada cobre:

- período local da Organization → UTC;
- representações ISO equivalentes nos limites temporais;
- recebimento no período cujo pedido foi emitido antes dele;
- agrupamento factual por fornecedor;
- vínculos de preço distintos não comparáveis;
- comparação das duas observações mais recentes do mesmo vínculo;
- preços iguais com histórico comparável sem falsa alteração.

Production `fhbvwyttikrbeaanatlr`, consultada read-only em 2026-08-27:

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

As duas observações atuais têm `source='demo_seed'`, a mesma data e vínculos fornecedor/item distintos. O empty state de compras e o aviso de histórico insuficiente são, portanto, a evidência Production correta. Nenhum dado artificial foi criado.

## Fora do escopo

- score/ranking/“melhor fornecedor”;
- SLA, lead time médio, atraso médio ou qualidade sem modelo canônico;
- valuation/CMV;
- gráficos/séries históricas avançadas;
- forecast/IA;
- pedido de compra automático ou sugestão de quantidade;
- economia estimada sem baseline comprovado;
- comparação/conversão automática de embalagens;
- EAN/fiscal (`REQ-ITEM-003`);
- mudanças nas regras transacionais de Estoque/Compras;
- deploy Vercel rotineiro.
