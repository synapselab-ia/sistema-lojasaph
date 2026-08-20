# Handoff — Sistema Lojasaph

## Estado

A Fase 34 executou o preflight de RLS solicitado antes da auditoria de importação.

Frente:

- baseline inicial de `main`: `dfd3f517cecbf4111bf118e0e70eafcdab2850e4`;
- Issue #80 — `RLS — otimizar auth.uid() da policy de memberships via initPlan`;
- branch `agent/rls-initplan-optimization`;
- PR #81 — `perf(rls): cache membership auth uid per statement`;
- evidência detalhada: `docs/qa/rls-preflight.md`;
- migration remota aplicada: `20260820184106 / membership_rls_initplan`;
- Issue #75 de backup permanece aberta e bloqueada;
- nenhum dado de negócio foi alterado;
- nenhum deployment Vercel foi criado.

## RLS — o que foi comprovado

No projeto Supabase `fhbvwyttikrbeaanatlr`:

- 45/45 tabelas públicas de aplicação têm RLS habilitado;
- existem 78 policies;
- 0 policies são destinadas a `anon`/`PUBLIC`;
- 0 policies têm predicado literal `true`, `auth.role()`, `user_metadata` ou `raw_user_meta_data`;
- `anon` não possui privilégios de relação em `public`;
- `authenticated` não possui `DELETE` direto;
- `payable_installment_summary` usa `security_invoker=true`;
- 30 RPCs públicas `SECURITY DEFINER` usam `search_path=""`, validam identidade/escopo e nenhuma é executável por `anon`.

Probe com usuário sintético `authenticated` sem membership retornou zero linhas em:

- `organizations`;
- `organization_memberships`;
- `units`;
- `stock_items`;
- `stock_movements`;
- `payable_documents`;
- `payable_installment_summary`;
- `import_batches`;
- `audit_logs`.

`anon` recebeu `permission denied` em tabela e RPC. Usuário autenticado sem membership recebeu `IMPORT_SCOPE_NOT_ALLOWED` na RPC de relatório de importação.

Não foi encontrado bypass de RLS ou vazamento cross-Organization.

## Ajuste da Fase 34

O único finding acionável de RLS era o Performance Advisor `auth_rls_initplan` em:

`public.organization_memberships.memberships_visible_to_self_or_admin`.

A regra permaneceu igual, mas `auth.uid()` passou a ser avaliado via initPlan:

```sql
user_id = (select auth.uid())
```

O ramo owner/admin com `private.has_org_wide_role(...)` foi preservado.

A migration foi validada antes de qualquer mudança remota. Depois do CI verde foi aplicada ao Supabase, que registrou:

- `20260820184106 / membership_rls_initplan`.

O arquivo local foi renomeado para essa mesma version, preservando a regra da Fase 30 de manter histórico local/remoto alinhado.

Após a aplicação:

- `pg_policies.qual` mostra `(SELECT auth.uid())`;
- `auth_rls_initplan` não aparece mais no Performance Advisor;
- RLS/policies e probes de isolamento continuam com o mesmo resultado seguro.

## Regressão

`supabase/tests/security_hardening.sql` agora impede:

- remoção da policy de self/admin membership;
- retorno a `user_id = auth.uid()` per-row;
- perda do `SELECT auth.uid()` usado pelo initPlan.

As suites existentes continuam cobrindo RLS geral, grants, outsider/anon, escopos business/unit/sector, Auth e command surface transacional.

## Advisors — não transformar em trabalho automático

O Security Advisor continua listando as RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`. Elas são a command surface intencional do sistema e foram revalidadas nesta fase:

- 30/30 com `search_path=""`;
- 30/30 com guarda de identidade/escopo;
- 0 executáveis por `anon`;
- implementações privadas de escrita permanecem inacessíveis diretamente ao cliente autenticado.

Não abrir nova Issue apenas pelo warning genérico sem encontrar uma RPC específica permissiva.

Também permanecem fora desta frente:

- leaked-password protection do Auth desabilitada;
- INFOs de foreign keys sem índice;
- índices sem uso observado.

## Validação

Head funcional inicial `49a67c975ebe96d5149b0df72a1b6e24f883d740`:

- CI #322 — success;
- Business Transactions Integration #156 — success;
- Inventory Count Integration #172 — success.

O database gate passou migrations, seed, backup/restore, schema/RLS smoke, `security_hardening.sql`, Auth/Organization isolation e suites transacionais.

Depois desse gate vieram apenas aplicação remota já validada, reconciliação do timestamp da migration e documentação. O PR #81 deve ser mergeado somente com o head final verde; consultar o PR para o run final.

## Issue #75 — backup

Continua bloqueada pelas decisões operacionais pendentes de RPO/RTO/destino/retenção/proteção/alerta. Não editar nem fechar sem decisão nova e automação real.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Confirmar que PR #81 já está integrado e que `main` contém `20260820184106_membership_rls_initplan.sql`; não reaplicar essa migration.
4. Se #75 continuar sem decisões operacionais novas, mantê-la bloqueada.
5. Auditar conjuntamente `REQ-IMP-001` a `REQ-IMP-004` e o suporte migratório de aliases de `REQ-ITEM-002`, usando a Fase 15 / Issue #39 / PR #40 como baseline.
6. Ler `docs/modules/imports.md`, `docs/source-data/migration-plan.md`, migrations `import_staging*`, `supabase/tests/import_staging.sql` e código atual de parsing/staging/dry-run.
7. Revalidar batch/origem/hash, idempotência, dry run, relatório de inconsistências, aliases explícitos, RLS/Organization e ausência de dados reais versionados.
8. O preflight de RLS já foi feito; não reabrir o hardening salvo falha concreta observada nos testes da importação.
9. Consultar Supabase read-only salvo correção versionada necessária; não reaplicar migrations.
10. Não importar as seis planilhas reais nem executar cutover.
11. Se os requisitos estiverem satisfeitos, documentar sem Issue artificial; se houver gap concreto, uma única Issue + branch/fix mínimo.
12. Não criar deploy Vercel para essa auditoria de banco/domínio.
13. Atualizar continuidade ao final.

## Não fazer

- não reimplementar Fase 34;
- não redesenhar RPCs `SECURITY DEFINER` só por warning genérico;
- não corrigir índices/FKs oportunisticamente sem evidência concreta;
- não reaplicar migrations existentes;
- não importar dados reais/cutover;
- não fechar #75 sem backup automático real;
- não reutilizar `easy-v2` como ambiente do Lojasaph por inferência;
- não reativar auto-deploy Vercel;
- não inferir Q-001..Q-025.
