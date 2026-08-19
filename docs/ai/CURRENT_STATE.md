# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 22 foi concluída, homologada e integrada na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #58 — merged
- Issue #57 — closed/completed
- merge commit funcional: `26cf2a40e7c2c3948f5d82678408fe49e213ca16`
- head funcional final validado pré-merge: `4459de528de9dd0fa68e83a867ce866f3fb5b23e`
- `CI` #270 — success
- `Inventory Count Integration` #164 — success
- `Business Transactions Integration` #147 — success
- próxima Issue: #59 — `Fase 23 — vincular retirada de estoque ao Setor operacional`

## Fase 22 — categoria obrigatória no item canônico

`REQ-ITEM-001` está fechado para a obrigatoriedade de categoria no StockItem canônico.

Implementado:

- `StockItem.categoryId`, criação e edição agora exigem categoria;
- validação defensiva de domínio usa o código estável `STOCK_ITEM_CATEGORY_REQUIRED`;
- adapter Supabase não grava nem materializa item sem categoria;
- `/workspace/produtos` e a rota demo de produtos exigem seleção explícita e não oferecem estado persistível `Sem categoria`;
- providers runtime/demo usam o mesmo contrato obrigatório;
- importação/dry run não inventa categoria: ausência permanece `pending_mapping` com `ITEM_CATEGORY_REQUIRED`;
- migration fail-fast rejeita ambiente com legado `category_id IS NULL` antes do DDL;
- `public.stock_items.category_id` passou a `NOT NULL`, sem default;
- FK composto `(category_id, organization_id)` foi preservado;
- fixtures sintéticas de inventário, perdas, devoluções, escopo e cadastros foram alinhadas;
- suíte `supabase/tests/stock_item_category_required.sql` foi integrada aos três workflows PostgreSQL.

## Achados de validação

O primeiro ciclo de CI revelou fixtures SQL antigas que criavam StockItem sintético sem categoria em `stock_return.sql`, `stock_loss.sql` e `scoped_permissions.sql`. Elas foram corrigidas sem afrouxar o `NOT NULL`.

O CI principal também revelou três callers TypeScript restantes: a rota demo `/cadastros/produtos`, o teste de `InventoryService` e a inferência do callback no teste de importação. Esses pontos foram alinhados antes do head final.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17.

Migration da Fase 22:

- `stock_item_category_required` — versão remota `20260819181239`.

Antes do DDL remoto:

- 3 StockItems reais;
- 0 itens sem categoria;
- os três itens já tinham `category_id` explícito;
- `category_id` ainda era nullable.

Depois do DDL remoto:

- os mesmos 3 IDs mantiveram exatamente os mesmos `category_id`;
- 0 itens sem categoria;
- `category_id` está `NOT NULL` e sem default;
- `stock_items_category_id_organization_id_fkey` continua exigindo categoria da mesma Organization;
- não houve alteração em RLS, grants ou RPCs.

Smoke sintético executado em `BEGIN/ROLLBACK` confirmou:

- item com categoria válida é aceito;
- insert sem categoria é rejeitado;
- update removendo categoria é rejeitado;
- categoria de outra Organization é rejeitada pelo FK;
- rollback deixou zero Organization, categoria ou StockItem sintético.

Security e Performance Advisors foram executados após o DDL. Nenhum finding novo foi causado pelo `NOT NULL`; avisos históricos permanecem fora de escopo.

## Hardening vigente

A Issue #54 permanece concluída e `supabase/tests/security_hardening.sql` continua gate permanente. Objetos novos em `public` devem nascer deny-by-default e receber RLS/policies/grants explícitos. RPC público novo/substituído deve ter superfície mínima e não deixar assinatura legada autenticada como bypass.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`. Nenhum deploy manual foi usado na Fase 22. CI permanece o gate principal.

## Próxima lacuna MUST real

`REQ-STK-004` exige registrar retirada de estoque para consumo/operação em um Setor, com data, quantidade e responsável.

A implementação persistente atual já registra `occurred_at`, quantidade e `responsible_user_id`, porém:

- `public.record_stock_withdrawal(...)` não recebe Setor;
- o insert da retirada não preenche `stock_movements.sector_id`, embora a coluna exista;
- `SupabaseStockWithdrawalGateway` não modela `sectorId`;
- `/workspace/estoque` não solicita Setor para retirada.

A Fase 23 / Issue #59 deve fechar somente essa rastreabilidade: Setor explícito, válido, da mesma Organization e autorizado pelo escopo; sem default/inferência e sem alterar FEFO, custo médio, política de estoque negativo ou movimentos históricos.

## Não repetir

- não reabrir Fases 21/22, Issues #53/#57 ou hardening/Issue #54;
- não reaplicar migrations antigas;
- não remover/afrouxar `security_hardening.sql`;
- não reativar auto-deploy Vercel;
- não criar categoria ou Setor genérico/default;
- não alterar os 3 itens reais existentes nem movimentos históricos;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.
