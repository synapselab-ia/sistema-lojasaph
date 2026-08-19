# Next Action — Sistema Lojasaph

## Contexto

A Fase 21 / Issue #53 está concluída e mergeada na `main` pelo PR #56.

Estado funcional final comprovado:

- head validado: `56d2e3026e9400add9778ce0c7193a9d81d46d05`;
- `CI` #263 — success;
- `Inventory Count Integration` #161 — success;
- `Business Transactions Integration` #144 — success;
- merge commit: `82372bc18bc54690eb5a4eca9d28554c32e76211`.

Supabase remoto:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- `stock_return_flow` — `20260819151007`;
- `stock_return_conflict_resolution` — `20260819151604`;
- smoke sintético em transação validado e rollback com zero resíduo;
- 0 devoluções reais criadas.

A próxima lacuna MUST objetiva é `REQ-ITEM-001`: categoria obrigatória no item canônico. Está registrada na Issue #57.

## Fazer agora

1. Confirmar estado real da Issue #57, `main`, branch `agent/item-category-required`, PRs e CI.
2. Usar a branch `agent/item-category-required` criada a partir da `main` pós-Fase 21; não criar branch duplicada.
3. Ler antes de editar:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` — `REQ-ITEM-001`;
   - documentação de catálogo e importação aplicável;
   - `supabase/migrations/20260817190000_foundation.sql`;
   - migrations de RLS/hardening atuais, especialmente `rls_grant_hardening`;
   - domínio/adapters/UI de stock item;
   - seed e todas as fixtures/testes que inserem `stock_items`.
4. Confirmar a lacuna atual em código/schema:
   - `public.stock_items.category_id` nullable;
   - `StockItem.categoryId` opcional;
   - create/update aceitam categoria ausente;
   - UI permite `Sem categoria`.
5. Localizar todos os pontos que criam item sem categoria em TypeScript, seed e SQL de testes.
6. Criar migration versionada com precondition explícita:
   - falhar com erro claro se existir `stock_items.category_id is null` no ambiente alvo;
   - não preencher categoria automaticamente;
   - após precondition, `ALTER TABLE public.stock_items ALTER COLUMN category_id SET NOT NULL`;
   - preservar o FK composto existente para mesma Organization.
7. Tornar `categoryId` obrigatório em `StockItem`, `CreateStockItemInput`, `UpdateStockItemInput` e adapters/repositories afetados.
8. Fazer validação de domínio estável para categoria ausente antes de persistir quando aplicável.
9. Atualizar `/workspace/produtos`:
   - select de categoria obrigatório;
   - remover opção persistível `Sem categoria`;
   - bloquear submit sem categoria;
   - não criar categoria genérica por conveniência.
10. Revisar importação/dry run:
    - ausência de categoria não pode ser auto-classificada;
    - manter rejeição/warning/pending mapping explícito conforme a arquitetura existente;
    - não aplicar dados reais.
11. Atualizar todas as fixtures/seed sintéticos para fornecer categoria válida da mesma Organization.
12. Criar/ajustar testes cobrindo:
    - domínio create/update exige categoria;
    - migration falha se houver nulo;
    - DB rejeita insert/update sem categoria;
    - FK bloqueia categoria de outra Organization;
    - UI/adapters enviam categoria obrigatória;
    - importação preserva categoria ausente como inconsistência;
    - regressão de estoque/compras/financeiro/importação continua verde.
13. Não ampliar grants/RLS se a fase não criar nova superfície. Se criar objeto novo por necessidade objetiva, seguir `security_hardening.sql` e deny-by-default.
14. Rodar lint, typecheck, Vitest, production build e todos os workflows PostgreSQL.
15. Só após CI verde aplicar a migration no Supabase remoto.
16. Antes e depois do DDL remoto, registrar IDs + `category_id` dos itens reais existentes e confirmar que nada foi alterado além do `NOT NULL` do schema.
17. Rodar Security/Performance Advisors e corrigir apenas problemas novos causados pela Fase 22.
18. Abrir/atualizar PR, marcar ready, mergear, fechar Issue #57 e atualizar continuidade.

## Estado remoto já confirmado para a Fase 22

No Supabase remoto atual:

- `stock_items_total = 3`;
- `stock_items_without_category = 0`;
- `stock_items_with_category = 3`;
- `categories_total = 3`.

Isto autoriza o endurecimento estrutural, mas não autoriza alterar ou recategorizar dado real.

## Política de segurança

- `supabase/tests/security_hardening.sql` continua obrigatório;
- não reaplicar migrations antigas;
- não depender de default privileges do provedor;
- não criar objeto manualmente no Dashboard;
- não conceder `anon` sem requisito explícito;
- RPC novo, se inevitável, deve revogar `PUBLIC/anon` e conceder EXECUTE explicitamente apenas ao papel necessário.

## Política de Vercel

- `git.deploymentEnabled=false` continua vigente;
- CI é o gate principal;
- não fazer deployment rotineiro para esta fase.

## Não fazer

- não reabrir Fase 21/Issue #53;
- não reabrir hardening/Issue #54;
- não criar categoria default como `Outros` ou `Sem categoria`;
- não alterar categorias dos 3 itens reais existentes;
- não implementar EAN/NCM/CEST (`SHOULD`) nesta fase;
- não implementar POS/produto de venda (`PENDING`);
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.

## Critério de conclusão da próxima fase

Não deve ser possível criar ou manter item canônico sem categoria válida da mesma Organization. Domínio, UI e PostgreSQL devem aplicar a mesma regra; seed/fixtures/CI devem refletir o contrato; a homologação remota deve confirmar `category_id NOT NULL` sem alterar os itens reais existentes.
