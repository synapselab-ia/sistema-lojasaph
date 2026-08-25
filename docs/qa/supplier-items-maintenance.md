# QA — Fase 45 / Produtos por fornecedor

Data: 2026-08-25
Issue: #101 — `REQ-SUP-004 — Produtos por fornecedor`
PR: #102

## Objetivo

Determinar se o sistema possuía um caminho operacional normal para manter os vínculos `supplier_items` usados por compras e, se ausente, entregar somente a menor slice necessária ao MVP.

## Estado real na entrada

- `main`: `d774f5ea96d28bffb6fcf377427b0ff6845e458f`;
- nenhum PR aberto;
- única Issue aberta: #75 — backup Production, preservada/desarmada;
- CI de `main` #390: success;
- Fase 44 / #98 concluída e não refeita.

## Evidência da lacuna

### Runtime

`SupabasePurchaseGateway.listSupplierItems(...)` já lia `supplier_items` por Organization + fornecedor + `active=true` e enriquecia com nome do produto e último `supplier_prices`.

Porém:

- o gateway de compras não possui INSERT/UPDATE de `supplier_items`;
- `/workspace/compras` somente lista vínculos já existentes;
- quando o fornecedor não possui vínculos ativos, a UI mostra `Fornecedor sem itens de compra ativos`;
- `/workspace/fornecedores` mantinha fornecedor, contatos e condições comerciais, mas não produtos;
- o repository `SupplierItemOfferRepository` existente possuía apenas implementação in-memory e seu domínio antigo nem modelava `purchase_unit`/`units_per_package`.

Portanto o pedido dependia de dados previamente criados fora do fluxo normal da aplicação.

### Origem dos dados

`supabase/seed.sql` cria os dois vínculos demo usados no ambiente atual.

Production possuía exatamente 2 `supplier_items`, ambos ativos, coerentes com esses dados demo.

A infraestrutura de importação é explicitamente dry-run/staging e não escreve tabelas operacionais. Ela não pode ser tratada como caminho de manutenção de cadastro.

### Fonte histórica

`docs/source-data/field-catalog.md`, em `Fornecedores Tabatinga`, documenta:

- Produto;
- Medida;
- Quantidade;
- Valor;
- Valor Un.

Para `REQ-SUP-004`, a slice atual mapeia apenas Produto → `stock_item_id`, Medida → `purchase_unit` e Quantidade → `units_per_package`.

`Valor`/`Valor Un.` não foram puxados para esta tela: o fluxo de pedido já recebe preço efetivo e a emissão registra o observado em `supplier_prices`, cobrindo o núcleo de `REQ-SUP-005` sem criar cotação/comparação/BI.

## Schema e Production

Projeto: `fhbvwyttikrbeaanatlr`.

Inspeção somente leitura confirmou:

- `supplier_items` possui `supplier_id`, `stock_item_id`, `supplier_sku`, `purchase_unit`, `units_per_package`, `active`;
- `units_per_package` é `numeric` e possui CHECK `> 0` quando não nulo;
- FKs compostos garantem Organization consistente entre fornecedor/produto/vínculo;
- RLS está habilitado;
- `authenticated`: SELECT/INSERT/UPDATE = true;
- `authenticated`: DELETE = false;
- `anon`: SELECT = false;
- SELECT usa `supplier_items_member_select` para membro da Organization;
- INSERT/UPDATE usam `private.has_org_wide_role(... owner/admin/manager/purchases ...)`;
- nenhum DDL ou DML manual foi necessário.

A documentação atual do Supabase foi consultada e confirma o padrão Data API + browser client autenticado + RLS/grants e filtros explícitos. A URL prescrita `https://supabase.com/changelog.md` não pôde ser lida pelo fetch disponível porque respondeu `text/markdown` não suportado; nenhuma alteração de plataforma/schema foi necessária nesta slice.

## Slice entregue

Em `/workspace/fornecedores`, cada fornecedor passa a ter `Produtos do fornecedor`:

- leitura dos vínculos default (`supplier_sku IS NULL`);
- criação de vínculo para produto ativo do catálogo;
- unidade de compra opcional;
- quantidade por embalagem opcional;
- ativação/inativação;
- reuso/reativação de vínculo default existente para evitar duplicação acidental;
- sem DELETE;
- sem preço manual;
- sem conversão automática de embalagem no pedido.

A UI usa `manageSuppliers` somente como gating de experiência; a autorização final continua no RLS.

## Testes

Novos testes:

- `src/lib/suppliers/supplier-items.test.ts`
  - trim de unidade;
  - vazio → ausência/NULL;
  - decimal com vírgula;
  - precisão de até 3 casas;
  - rejeição de zero, negativo, >3 casas e texto inválido;
  - produto obrigatório.
- `src/lib/suppliers/supplier-items-boundary.test.ts`
  - browser client autenticado;
  - ausência de secret/admin client;
  - filtros explícitos Organization/fornecedor;
  - `supplier_sku IS NULL` para a slice default;
  - ausência de DELETE;
  - verificação/reuso antes de INSERT.

Primeiro head funcional validado: `bb63217131a5b57f8920b59a4f68694282e07988`.

- CI #391 — success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #189 — success;
- Inventory Count Integration #205 — success.

O head final com documentação deve ser revalidado antes do merge e registrado no PR #102.

## Conclusão

`REQ-SUP-004` tinha uma lacuna operacional real e independente de itens PENDING: o modelo e o consumidor em compras existiam, mas não havia manutenção persistente normal dos vínculos. A Fase 45 fecha somente essa lacuna básica.

Depois desta entrega, não resta justificativa automática para abrir SUP-005 avançado, cotação, comparação, sugestão, outra exportação, estoque mínimo, barcode/PWA ou dashboards avançados. O próximo ciclo deve tratar o núcleo funcional como reconciliado e separar prontidão operacional/homologação/cutover, #75 e novas prioridades explícitas de produto.
