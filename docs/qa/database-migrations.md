# Linhagem de migrations — REQ-PLAT-004

Status: auditoria/correção da Fase 30.

## Problema identificado

O PostgreSQL hospedado continha 27 migrations registradas em `supabase_migrations.schema_migrations`, com nomes semânticos correspondentes às migrations efetivas do repositório, porém os timestamps/versions locais haviam sido renumerados. O repositório também mantinha um placeholder vazio de `persistent_inventory_count` que nunca apareceu no histórico remoto.

Isso é um drift operacional real porque o Supabase CLI usa a version/timestamp para comparar migrations locais e remotas. Nomes ou conteúdo semanticamente equivalentes não substituem a identidade da version para `migration list`/`db push`.

## Correção

Os 27 arquivos SQL efetivos foram renomeados para as versions já registradas no projeto hospedado, sem alterar os blobs/conteúdo SQL. O placeholder vazio foi removido. Nenhum registro de `supabase_migrations.schema_migrations` foi editado e nenhuma migration foi reaplicada remotamente.

## Matriz canônica

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

`reconcile_inventory_adjustment_type` apenas substitui o `CHECK` de `stock_movements.movement_type` para aceitar `inventory_adjustment`. `purchases_operational_flow` não referencia esse tipo. Portanto a reconciliação para a ordem remota não introduz dependência funcional nova.

## Reprodutibilidade

Os workflows `CI`, `Inventory Count Integration` e `Business Transactions Integration` iniciam PostgreSQL 17 limpo, aplicam `supabase/tests/bootstrap.sql`, depois todos os arquivos `supabase/migrations/*.sql` ordenados lexicograficamente e só então seed/suites. Assim, o PR da Fase 30 deve demonstrar que a ordem canônica reconciliada continua reconstruindo o banco do zero.

A CI principal também executa backup lógico e restore isolado após a reconstrução.

## Evidência hospedada

A auditoria remota foi somente leitura.

- 27 registros em `supabase_migrations.schema_migrations`;
- 27 nomes semânticos correspondentes às 27 migrations SQL efetivas locais;
- introspecção de `public`/`private` não encontrou relation, function ou trigger atual cujo nome não apareça no texto de alguma migration registrada;
- nenhuma alteração de schema, função, policy, grant, dado ou migration history foi feita durante a auditoria.

## Política futura

1. Criar toda mudança estrutural em migration versionada antes de aplicá-la em ambiente compartilhado.
2. Depois que uma version entra no histórico hospedado, seu timestamp não deve ser renumerado no GitHub.
3. Validar migrations contra banco limpo antes do merge.
4. Quando o fluxo CLI remoto estiver disponível, executar `supabase migration list` e `supabase db push --dry-run` antes de aplicar mudanças.
5. Não usar `migration repair` como tentativa de alinhamento; só usar quando schema e histórico já tiverem sido comparados e a correção de history for explicitamente necessária.
6. Não editar `supabase_migrations.schema_migrations` diretamente.
7. Alterações feitas por Dashboard/SQL remoto precisam voltar para uma migration versionada antes de serem consideradas integradas.
