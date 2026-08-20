# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 34 executou um preflight de RLS antes da auditoria de importação, conforme solicitado, e não encontrou bypass ou vazamento de autorização. O único finding acionável foi uma otimização de performance semanticamente neutra em `organization_memberships`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline inicial de `main`: `dfd3f517cecbf4111bf118e0e70eafcdab2850e4`
- Issue #80 — `RLS — otimizar auth.uid() da policy de memberships via initPlan`
- branch `agent/rls-initplan-optimization`
- PR #81 — `perf(rls): cache membership auth uid per statement`
- evidência: `docs/qa/rls-preflight.md`
- migration remota: `20260820184106 / membership_rls_initplan`
- Issue #75 de backup permanece aberta/bloqueada
- nenhum dado de negócio foi alterado
- nenhum deploy Vercel foi criado

## RLS remoto — resultado

Projeto Supabase `fhbvwyttikrbeaanatlr`:

- 45/45 tabelas de aplicação em `public` com RLS habilitado;
- 78 policies;
- 0 policies para `anon`/`PUBLIC`;
- 0 policies com predicado literal `true`, `auth.role()`, `user_metadata` ou `raw_user_meta_data`;
- `anon` sem privilégios de relação;
- `authenticated` sem `DELETE` direto;
- `payable_installment_summary` com `security_invoker=true`;
- 30 funções públicas `SECURITY DEFINER`, todas com `search_path=""`, guarda de identidade/escopo e 0 executáveis por `anon`.

Probe com UUID sintético `authenticated` sem membership retornou zero linhas em Organization, memberships, unidades, catálogo, ledger, financeiro, view financeira, importação e auditoria.

`anon` recebeu `permission denied` em tabela e RPC. A RPC de relatório de importação também recusou usuário autenticado sem membership com `IMPORT_SCOPE_NOT_ALLOWED`.

## Finding corrigido

O Performance Advisor reportava `auth_rls_initplan` na policy:

`public.organization_memberships.memberships_visible_to_self_or_admin`

A expressão de self-access foi alterada de:

```sql
user_id = auth.uid()
```

para:

```sql
user_id = (select auth.uid())
```

O ramo owner/admin via `private.has_org_wide_role(...)` foi preservado. Não houve mudança de regra de negócio ou de escopo.

A migration foi primeiro validada em CI e depois aplicada ao Supabase. O remoto registrou a versão canônica `20260820184106`, e o arquivo local foi reconciliado para o mesmo timestamp antes do merge.

Após a aplicação:

- `pg_policies.qual` confirma `(SELECT auth.uid())`;
- o warning `auth_rls_initplan` dessa policy desapareceu;
- 45/45 tabelas continuam com RLS;
- continuam 78 policies e 0 policies anon/PUBLIC;
- o probe outsider continua retornando zero linhas.

## Teste de regressão

`supabase/tests/security_hardening.sql` agora falha se `memberships_visible_to_self_or_admin`:

- desaparecer;
- voltar a usar `user_id = auth.uid()` diretamente;
- deixar de conter `SELECT auth.uid()`.

A suíte já cobria RLS integral, grants mínimos, ausência de policies inseguras, view `security_invoker`, bloqueio de `anon`, RPCs e default privileges deny-by-default.

## Advisors

Security Advisor:

- continua sinalizando as RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`;
- a auditoria confirmou que essa command surface é intencional e protegida por `auth.uid()`, helpers privados, `search_path=""`, escopo e testes;
- leaked-password protection do Auth permanece desabilitada e é configuração de Auth, não gap de RLS desta frente.

Performance Advisor:

- o warning `auth_rls_initplan` da policy de memberships foi eliminado;
- avisos de foreign keys sem índice e índices ainda sem uso observado permanecem fora do escopo desta correção.

## Validação

Head funcional inicial `49a67c975ebe96d5149b0df72a1b6e24f883d740`:

- CI #322 — database + validate success;
- Business Transactions Integration #156 — success;
- Inventory Count Integration #172 — success.

O database gate aplicou todas as migrations em PostgreSQL 17 limpo e passou schema/RLS smoke, `security_hardening.sql`, Auth/Organization isolation e todas as suites transacionais existentes.

Depois desse gate, a migration foi aplicada remotamente e o filename local foi reconciliado à versão canônica. O head final do PR #81 deve permanecer verde antes do squash merge; a evidência final fica registrada no próprio PR.

## REQ-PLAT-005 / Issue #75

A frente de backup continua bloqueada pelas decisões operacionais pendentes de RPO, RTO, destino off-site, retenção, proteção e alertas. Não inventar configuração nem fechar #75 sem automação real.

## Próxima ação

Após integrar a Fase 34, executar a auditoria conjunta de `REQ-IMP-001` a `REQ-IMP-004` e do suporte migratório de aliases de `REQ-ITEM-002`, usando a Fase 15 / Issue #39 / PR #40 como baseline, sem importar dados reais e sem reabrir o hardening de RLS salvo evidência concreta de regressão.

## Não repetir

- não reabrir a Fase 34 apenas por warnings genéricos das RPCs `SECURITY DEFINER`;
- não corrigir índices/FKs oportunisticamente na frente de importação sem evidência de impacto;
- não reaplicar migrations já presentes no remoto;
- não importar dados reais nem executar cutover;
- não fechar #75 sem backup automático real;
- não criar deploy Vercel para auditorias de banco que não dependem de runtime hospedado;
- não inferir Q-001..Q-025.
