# Next Action — Sistema Lojasaph

## Estado de transição

A **Fase 48 / Issue #134 (`REQ-DASH-004`)** foi implementada e validada no PR #135 (`agent/dashboard-stock-overview`).

Antes de iniciar nova implementação, o próximo chat deve confirmar o estado real do PR #135 / #134 / `main`. Se #135 já estiver mergeado e #134 fechada, **não refazer a Fase 48**.

## Próxima frente independente

**`REQ-DASH-005 — Fornecedores/compras`**.

O requisito pede exibir compras, variação de preço e desempenho/histórico por fornecedor **quando houver dados**. A próxima slice deve ser definida a partir do schema e dos dados realmente persistidos, sem inventar score de fornecedor, SLA ou regra comercial.

### 1. Inventário técnico primeiro

Na `main` integrada:

1. localizar schema, policies/RLS e adapters de:
   - `suppliers`;
   - `supplier_contacts`;
   - `supplier_terms`;
   - `supplier_items`;
   - `supplier_prices`;
   - `purchase_orders` / `purchase_order_items`;
   - `purchase_receipts` / itens de recebimento;
2. revisar `docs/modules/purchases.md`, master-data e requisitos/questões abertas relacionadas;
3. revisar o Dashboard atual após a Fase 48 e reaproveitar Unit/Setor/período já existentes;
4. consultar Production somente read-only para saber quais relações/históricos possuem dados reais;
5. identificar quais métricas são determinísticas com os campos existentes.

### 2. Delimitar a menor slice coerente

Priorizar analytics que possam ser derivados sem nova decisão de negócio, por exemplo apenas quando o modelo suportar de forma inequívoca:

- volume/quantidade de pedidos por fornecedor;
- histórico de preço persistido;
- variação de preço entre observações comparáveis;
- pedidos/recebimentos associados ao fornecedor.

Não criar por inferência:

- nota/score de fornecedor;
- “melhor fornecedor”;
- prazo médio/atraso se a semântica dos timestamps não for canônica;
- economia estimada sem baseline comprovado;
- comparação de embalagens/UOM incompatíveis;
- forecast/IA;
- decisão automática de compra.

### 3. Issue e branch

Se o gap for real e os dados/campos suportarem uma slice objetiva:

1. abrir a Issue da próxima fase registrando decisões e critérios;
2. criar branch a partir da `main` atual;
3. implementar somente o recorte aprovado pela evidência do repositório/schema;
4. manter leitura sob sessão autenticada + RLS;
5. usar `Money`/tipos exatos onde aplicável;
6. preservar filtros organizacionais/temporais sem heurísticas.

### 4. Validação

- testes unitários para agregação/comparação;
- regressão de Unit/Setor/período;
- lint;
- typecheck;
- Vitest;
- production build;
- workflows aplicáveis;
- Production apenas read-only se nenhuma DDL for necessária;
- se DDL realmente for necessária, CI verde antes de qualquer migration Production.

## #121 — continua ON HOLD

Não tocar #121 sem gatilho novo.

Última checagem única em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos:

- primeira execução **agendada** do Storage backup; próxima janela esperada: 2026-08-28 03:47 America/Sao_Paulo;
- anexo Production legítimo;
- incidente/regressão real.

Sem isso, não fazer dispatch manual, fixture Production ou revalidação repetitiva.

## Ordem posterior

Salvo regressão/nova prioridade:

1. `REQ-DASH-005` — fornecedores/compras;
2. `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após validação de negócio.

## Fora de escopo imediato

- reabrir #132/#134 sem regressão;
- valuation/CMV/forecast genérico;
- POS/vendas ou outras questões PENDING;
- deploy Vercel rotineiro;
- tornar o repositório private automaticamente.
