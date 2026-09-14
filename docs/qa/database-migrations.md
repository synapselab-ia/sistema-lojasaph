# Linhagem de migrations — REQ-PLAT-004

Status: **verificado/corrigido em 2026-08-20 — Fase 30; paridade Production revalidada em 2026-09-14 após o fechamento da #190**.

## Problema histórico identificado na Fase 30

O PostgreSQL hospedado continha migrations registradas em `supabase_migrations.schema_migrations` com nomes semânticos correspondentes às migrations efetivas do repositório, porém os timestamps/versions locais haviam sido renumerados. Isso era drift operacional real porque o Supabase CLI compara identities/version timestamps, não apenas nomes ou conteúdo equivalente.

## Correção histórica

Os arquivos SQL efetivos foram reconciliados com as versions já registradas no projeto hospedado, sem alterar o conteúdo SQL. Nenhum registro de `supabase_migrations.schema_migrations` foi editado e nenhuma migration foi reaplicada remotamente para corrigir apenas history.

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

## Reprodutibilidade

Os workflows de CI iniciam PostgreSQL limpo, aplicam `supabase/tests/bootstrap.sql`, depois todos os arquivos `supabase/migrations/*.sql` em ordem lexicográfica e só então seed/suites. A linhagem deve continuar reconstruível do zero.

## Incidente de paridade Production — 2026-08-31

Durante a Fase 51, o runtime Production mostrou RPC administrativo ausente apesar de o código já conter a migration. A auditoria read-only mostrou exatamente duas versions pendentes:

- `20260828130500_administration_access_management`;
- `20260828132500_administration_employee_identity`.

PR #175 criou reconciliador one-shot fail-closed usando `supabase db push`:

- dry-run antes da mutação;
- allowlist exata;
- aplicação version-preserving;
- dry-run pós-push exigindo zero migration local pendente;
- sem seed/reset/repair/DDL ad hoc;
- sem edição direta de history.

Evidência:

- PR #175 merge `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI PR #593 / run `33436348276`: success;
- Production Migration Reconcile run `33436481787`: success;
- CI pós-merge #594 / run `33436481833`: success.

O workflow one-shot foi removido depois do sucesso.

## Rollout version-preserving — Issue #190 / primeira fatia / 2026-09-11

A fundação do compositor modular adicionou:

- `20260911153000_modular_product_composition.sql`.

Antes do rollout, Production terminava em `20260911102500_stock_loan_allocation_order`. PR #198 adicionou reconciliador one-shot fail-closed com projeto Production esperado, Session pooler `:5432`, dry-run, allowlist exata, `supabase db push` e verificação pós-push.

Evidência:

- PR #198 merge `4823d58e4d6b1859da13b54daf85e5ed3dfaf379`;
- Production Migration Reconcile 190 run `34617253893`: success;
- CI pós-merge #644 / run `34617253823`: success;
- history remoto passou a conter `20260911153000 / modular_product_composition`.

Verificação read-only:

- `organization_capability_settings` com RLS ativa;
- `authenticated` com SELECT e sem INSERT/UPDATE/DELETE direto;
- policy de leitura baseada em `private.is_org_member(organization_id)`;
- `set_organization_capability(uuid,text,boolean)` owner-only no corpo e sem EXECUTE para `anon`;
- `record_stock_loan(...)` com gate de capability e `anon` sem EXECUTE;
- ausência de override preservando `stock-loans` ativo por default.

O reconciliador dessa primeira fatia foi removido após o rollout.

## Rollout version-preserving — Issue #190 / segunda capability / 2026-09-14

PR #200 adicionou a segunda capability controlada, `stock-minimum`, e a migration:

- `20260914120000_stock_minimum_composition.sql`.

Antes do rollout, a listagem remota confirmou Production alinhada até `20260911153000_modular_product_composition`. O drift era **exatamente uma migration**, sem version intermediária inesperada.

PR **#201 — `ops: reconciliar estoque mínimo modular em Production`** criou um reconciliador one-shot com:

- alvo fixo no projeto Production esperado `fhbvwyttikrbeaanatlr`;
- Session pooler `:5432` obrigatório;
- `supabase db push --dry-run` antes da mutação;
- allowlist exata de `20260914120000_stock_minimum_composition.sql`;
- falha se houvesse zero, mais de uma ou qualquer pending migration diferente;
- aplicação via `supabase db push --yes`, preservando a version Git;
- dry-run pós-push exigindo ausência de filename pendente e `Remote database is up to date.`;
- sem seed, reset, `migration repair`, DDL ad hoc ou edição manual de history.

Evidência:

- PR #200 merge `54e086830df37cf09de85b2622df80f90728b86e`;
- PR #201 merge `8473582e65266c2272a184be44bd306a98d2dd95`;
- `Production Migration Reconcile 190 Stock Minimum` run `34841150576`: **success**;
- CI pós-rollout #650 / run `34841150555`: **success**;
- `supabase_migrations.schema_migrations` contém `20260914120000 / stock_minimum_composition`;
- listagem remota termina nessa version.

Verificação read-only pós-DDL:

- `organization_capability_settings_capability_id_check` aceita `stock-loans` e `stock-minimum`;
- policies de `stock_minimum_policies` combinam `private.can_use_capability(organization_id, 'stock-minimum')` com os escopos de leitura/mutation de estoque já existentes;
- `authenticated` continua **sem** EXECUTE em `private.is_capability_enabled(uuid,text)`;
- `authenticated` possui EXECUTE no wrapper RLS `private.can_use_capability(uuid,text)`; `anon` não possui;
- `set_organization_capability(uuid,text,boolean)` continua executável por `authenticated` conforme o contrato owner-only no corpo;
- Production possuía 0 overrides de `stock-minimum`; a Organization existente resolvia a capability como ativa por default;
- Production possuía 0 linhas em `stock_minimum_policies` no momento da verificação, portanto o rollout não alterou configuração real existente.

Advisors pós-DDL:

- Security Advisor manteve warning geral para RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`; não apareceu regressão nova específica do RLS wrapper, e o resolver interno permaneceu não executável pelo papel autenticado;
- leaked-password protection continuou finding Auth independente desta migration;
- Performance Advisor manteve INFOs históricos de FKs sem índice e índices sem uso observado, incluindo `organization_capability_settings.updated_by_user_id`; não existe consulta operacional atual por esse campo que justifique migration apenas para silenciar o linter.

O workflow `production-migration-reconcile-190-stock-minimum.yml` foi criado apenas para esse rollout e **deve permanecer removido após o closeout**. Não transformar reconciliadores one-shot em deploy automático permanente.

## Procedimento obrigatório de paridade Production

Quando um recurso já existe em migration mergeada, mas Production relata relation/function ausente, **verificar paridade antes de alterar código**.

1. Confirmar HEAD/CI reais no GitHub.
2. Comparar filenames/versions de `supabase/migrations/*.sql` com o history remoto do projeto correto.
3. Identificar o conjunto exato de migrations locais ainda não aplicadas.
4. Revisar precondições e impacto no estado Production.
5. Usar mecanismo que preserve identities/version timestamps; para migrations normais, preferir `supabase db push` com dry-run.
6. Em remediação extraordinária, usar allowlist fail-closed das versions esperadas e abortar diante de drift adicional.
7. Após aplicar, executar novo dry-run e conferir history remoto/read-only.
8. Verificar objetos/grants/policies/triggers afetados e advisors quando houver DDL.
9. Não tratar backend corrigido como evidência automática de UX live quando a falha original era de produto/UI.

## Política futura

1. Criar toda mudança estrutural em migration versionada antes de aplicá-la em ambiente compartilhado.
2. Depois que uma version entra no history hospedado, seu timestamp não deve ser renumerado no GitHub.
3. Validar migrations contra banco limpo antes do merge.
4. Para mudança que precisa chegar a Production, verificar explicitamente a paridade remota após o rollout; CI efêmero não substitui essa confirmação.
5. Executar `supabase db push --dry-run` antes de aplicar migrations Production quando o fluxo CLI estiver disponível.
6. Não usar `migration repair` como tentativa genérica de alinhamento.
7. Não editar `supabase_migrations.schema_migrations` diretamente.
8. Não executar seed/reset em Production.
9. Alterações feitas por Dashboard/SQL remoto precisam voltar para migration versionada antes de serem consideradas integradas.
10. Erro `undefined function/table` após feature mergeada deve disparar primeiro a checagem Git ↔ Production.