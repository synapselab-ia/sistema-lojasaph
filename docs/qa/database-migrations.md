# Linhagem de migrations — REQ-PLAT-004

Status: **verificado/corrigido em 2026-08-20 — Fase 30; paridade Production revalidada em 2026-08-31**.

## Problema histórico identificado na Fase 30

O PostgreSQL hospedado continha 27 migrations registradas em `supabase_migrations.schema_migrations`, com nomes semânticos correspondentes às migrations efetivas do repositório, porém os timestamps/versions locais haviam sido renumerados. O repositório também mantinha um placeholder vazio de `persistent_inventory_count` que nunca apareceu no histórico remoto.

Isso era um drift operacional real porque o Supabase CLI usa a version/timestamp para comparar migrations locais e remotas. Nomes ou conteúdo semanticamente equivalentes não substituem a identidade da version para `migration list`/`db push`.

## Correção histórica

Os 27 arquivos SQL efetivos foram renomeados para as versions já registradas no projeto hospedado, sem alterar os blobs/conteúdo SQL. O placeholder vazio foi removido. Nenhum registro de `supabase_migrations.schema_migrations` foi editado e nenhuma migration foi reaplicada remotamente.

## Matriz canônica inicial reconciliada

| Version hospedada/local | Migration |
| --- | --- |
| 20260817214612 | `foundation` |
| 20260817214649 | `inventory` |
| 20260817214711 | `rls` |
| 20260817214723 | `hardening` |
| 20260817215003 | `private_membership_helpers` |
| 20260817215345 | `transactional_stock_entry` |
| 20260817224031 | `transactional_stock_withdrawal` |
| 20260817230807 | `transactional_stock_transfer` |
| 20260817233517 | `persistent_inventory_count` |
| 20260817233535 | `inventory_count_cancel` |
| 20260818120743 | `reconcile_inventory_adjustment_type` |
| 20260818122426 | `purchases_operational_flow` |
| 20260818125037 | `finance_payables_flow` |
| 20260818135623 | `cash_sessions_flow` |
| 20260818150253 | `scoped_permissions` |
| 20260818180723 | `import_staging` |
| 20260818180738 | `import_staging_finalize_fix` |
| 20260818181051 | `import_staging_indexes` |
| 20260818215813 | `employees` |
| 20260818220222 | `employee_privilege_hardening` |
| 20260819004720 | `stock_loss_flow` |
| 20260819004730 | `stock_loss_reason_read_scope_fix` |
| 20260819141546 | `rls_grant_hardening` |
| 20260819151007 | `stock_return_flow` |
| 20260819151604 | `stock_return_conflict_resolution` |
| 20260819181239 | `stock_item_category_required` |
| 20260819184424 | `stock_withdrawal_sector` |

## Ordem histórica

Ignorando o placeholder vazio, a única diferença relativa encontrada entre a antiga ordem dos filenames locais e a ordem hospedada era:

- local antigo: `purchases_operational_flow` antes de `reconcile_inventory_adjustment_type`;
- remoto: `reconcile_inventory_adjustment_type` antes de `purchases_operational_flow`.

`reconcile_inventory_adjustment_type` apenas substitui o `CHECK` de `stock_movements.movement_type` para aceitar `inventory_adjustment`. `purchases_operational_flow` não referencia esse tipo. Portanto a reconciliação para a ordem remota não introduziu dependência funcional nova.

## Reprodutibilidade comprovada

Os workflows de CI iniciam PostgreSQL limpo, aplicam `supabase/tests/bootstrap.sql`, depois todos os arquivos `supabase/migrations/*.sql` ordenados lexicograficamente e só então seed/suites.

A linhagem continua reconstruível do zero: CI executa migrations, seed anonimizado, backup/restore isolado, schema/RLS, auth/Organization isolation e suites funcionais antes do merge.

## Incidente de paridade Production — 2026-08-31

Durante a Fase 51, a telemetria do runtime Production mostrou `/workspace/administracao/acessos` falhando porque o PostgREST não encontrava `public.admin_list_organization_access(...)`.

A auditoria read-only mostrou:

- Git já continha as migrations administrativas;
- Production terminava em `20260827195802_stock_minimum_policy_fk_indexes`;
- exatamente duas versions estavam pendentes:
  - `20260828130500_administration_access_management`;
  - `20260828132500_administration_employee_identity`.

Esse caso demonstrou que **CI verde não prova, sozinho, que Production recebeu todas as migrations mergeadas**.

### Remediação

PR #175 criou um reconciliador one-shot, fail-closed, usando a conexão Production já existente e `supabase db push`:

- dry-run antes da mutação;
- allowlist exata das duas migrations pendentes;
- falha em qualquer migration inesperada;
- aplicação das migrations versionadas preservando os timestamps Git;
- novo dry-run após aplicação exigindo zero migration local pendente;
- sem seed;
- sem reset;
- sem `migration repair`;
- sem DDL ad hoc;
- sem edição direta de `supabase_migrations.schema_migrations`.

Evidência:

- PR #175 merge `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI PR #593 / run `33436348276`: **success**;
- `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**.

Após a execução, o histórico remoto passou a incluir exatamente `20260828130500` e `20260828132500`. Os RPCs administrativos, grants e trigger introduzidos por essas migrations foram verificados read-only. O workflow one-shot foi removido depois do sucesso para não criar deploy automático permanente de schema sem uma decisão arquitetural própria.

## Procedimento obrigatório de paridade Production

Quando um recurso já existe em migration mergeada, mas Production relata relation/function ausente, **verificar paridade antes de alterar código**.

1. Confirmar o HEAD/CI reais no GitHub.
2. Comparar os filenames/versions de `supabase/migrations/*.sql` com o histórico remoto do projeto correto.
3. Identificar o conjunto exato de migrations locais ainda não aplicadas.
4. Revisar precondições e impacto das migrations pendentes no estado Production antes de executar.
5. Usar um mecanismo que preserve as identities/version timestamps dos arquivos Git; para migrations normais, preferir `supabase db push` com dry-run.
6. Em remediação extraordinária, usar allowlist fail-closed das versions esperadas; abortar diante de drift adicional.
7. Após aplicar, executar novo dry-run e conferir history remoto/read-only.
8. Verificar objetos/grants/policies/triggers afetados e advisors quando houver DDL.
9. Não tratar correção backend como evidência de UX live: a UI ainda precisa ser revalidada no mesmo tipo de evidência que revelou o problema quando aplicável.

## Política futura

1. Criar toda mudança estrutural em migration versionada antes de aplicá-la em ambiente compartilhado.
2. Depois que uma version entra no histórico hospedado, seu timestamp não deve ser renumerado no GitHub.
3. Validar migrations contra banco limpo antes do merge.
4. Para mudança que precisa chegar a Production, verificar explicitamente a paridade remota após o rollout; CI local/efêmero não substitui essa confirmação.
5. Executar `supabase db push --dry-run` antes de aplicar migrations Production quando o fluxo CLI estiver disponível.
6. Não usar `migration repair` como tentativa de alinhamento; só considerar quando schema e histórico já tiverem sido comparados e uma correção de history for explicitamente necessária/revisada.
7. Não editar `supabase_migrations.schema_migrations` diretamente.
8. Não executar seed/reset em Production.
9. Alterações feitas por Dashboard/SQL remoto precisam voltar para migration versionada antes de serem consideradas integradas.
10. Um erro `undefined function/table` após feature mergeada deve disparar primeiro a checagem de paridade Git ↔ Production.
