# Módulo — Dashboard operacional, alertas e KPIs

Status: **Fase 48 — cobertura gerencial mínima de Estoque (`REQ-DASH-004`)** sobre os filtros de Unit, Setor, horizonte e período já existentes.

## Objetivo

`/workspace` é um painel somente leitura orientado a ação. Ele consolida sinais persistentes de Financeiro, Caixa, Compras e Estoque sem criar uma segunda fonte de verdade, sem usar chave privilegiada e sem fabricar granularidade organizacional ou temporal.

## Princípios

- RLS + sessão autenticada são a fronteira de leitura;
- regras transacionais permanecem nos módulos de origem;
- ausência de dado não é convertida em dado inventado;
- Unit e Setor só atuam quando existe vínculo explícito;
- período só recorta métricas com evento/data canônica comprovada;
- indicadores de estado atual não viram histórico por conveniência;
- `horizonDays` e período explícito são conceitos distintos;
- quantidades de itens com unidades de medida heterogêneas não são somadas em um “saldo total”.

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

### Compras

Fonte: `purchase_orders` e local de estoque explícito.

- pedidos pendentes: estado atual;
- atrasos/próximas entregas: `expected_delivery_date`;
- ausência de data prevista não é fabricada.

### Estoque

A Fase 48 consolida a seção gerencial de Estoque com fontes já autoritativas.

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

## Testes e evidência

A regressão adicionada cobre:

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

## Fora do escopo

- valuation/valor financeiro total do estoque;
- CMV/analytics de custeio;
- gráficos e séries históricas avançadas;
- previsão de demanda/IA;
- pedido de compra automático ou sugestão de quantidade;
- analytics de fornecedor/compras (`REQ-DASH-005`);
- EAN/fiscal (`REQ-ITEM-003`);
- qualquer mudança nas regras transacionais de estoque;
- deploy Vercel rotineiro.
