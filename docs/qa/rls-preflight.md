# RLS preflight — 2026-08-20

## Objetivo

Revalidar a barreira de Row Level Security antes da próxima auditoria de importação, comparando o schema versionado com o estado real do Supabase e corrigindo somente gaps concretos.

Baseline inicial de `main`: `dfd3f517cecbf4111bf118e0e70eafcdab2850e4`.

Issue: #80.  
PR: #81.  
Branch: `agent/rls-initplan-optimization`.

## Resultado de segurança

Não foi identificado bypass, exposição cross-Organization ou acesso anônimo à superfície de dados do Sistema Lojasaph.

Estado remoto verificado no projeto `fhbvwyttikrbeaanatlr`:

- 45/45 tabelas de aplicação em `public` com RLS habilitado;
- 78 policies em `public`;
- 0 policies destinadas a `anon` ou `PUBLIC`;
- 0 policies com predicado literal `true`, `auth.role()`, `user_metadata` ou `raw_user_meta_data`;
- `anon` sem privilégios de relação em `public`;
- `authenticated` sem `DELETE` direto nas tabelas de aplicação;
- única view pública, `payable_installment_summary`, com `security_invoker=true`;
- 30 funções públicas `SECURITY DEFINER`, todas com `search_path=""`, guarda explícita de identidade/escopo e nenhuma executável por `anon`;
- migration de hardening `20260819141546 / rls_grant_hardening` presente no histórico remoto.

## Probes remotos

Um JWT sintético no papel `authenticated`, com UUID que não possui membership, retornou zero linhas em:

- `organizations`;
- `organization_memberships`;
- `units`;
- `stock_items`;
- `stock_movements`;
- `payable_documents`;
- `payable_installment_summary`;
- `import_batches`;
- `audit_logs`.

Além disso:

- `anon` recebeu `permission denied` ao tentar ler `organizations`;
- `anon` recebeu `permission denied` ao tentar executar `get_import_preview_report`;
- usuário `authenticated` sem membership recebeu `IMPORT_SCOPE_NOT_ALLOWED` ao tentar executar o relatório de importação.

Nenhum probe fez escrita de dados de negócio.

## Command surface `SECURITY DEFINER`

O Security Advisor sinaliza as RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`. Neste sistema isso é intencional: operações críticas de estoque, compras, financeiro, caixa, inventário e staging usam wrappers públicos controlados em vez de DML direto.

A auditoria revalidou que:

- as 30 funções públicas `SECURITY DEFINER` usam `search_path=""`;
- as 30 verificam `auth.uid()` e delegam autorização/escopo a helper privado;
- nenhuma é executável por `anon`;
- os testes PostgreSQL existentes impedem acesso direto às implementações privadas de escrita;
- `security_hardening.sql`, `schema_smoke.sql` e `scoped_permissions.sql` cobrem grants, RLS, outsider/anon e escopos de Organization/business/unit/sector.

Portanto esses warnings não foram tratados como defeito sem uma RPC específica demonstravelmente permissiva.

## Finding corrigido — `auth_rls_initplan`

O único finding acionável especificamente de RLS foi o Performance Advisor `auth_rls_initplan` na policy:

`public.organization_memberships.memberships_visible_to_self_or_admin`

Antes:

```sql
user_id = auth.uid()
```

Depois:

```sql
user_id = (select auth.uid())
```

A recomendação vigente do Supabase para funções Auth cujo resultado não depende da linha é envolvê-las em `select`, permitindo que o PostgreSQL use um initPlan e avalie o valor uma vez por statement.

A mudança não altera a regra de autorização. O ramo owner/admin via `private.has_org_wide_role(...)` foi preservado.

Migration remota registrada:

- `20260820184106 / membership_rls_initplan`.

O arquivo local foi reconciliado para a mesma versão antes do merge.

Após a migration:

- `pg_policies.qual` mostra `(SELECT auth.uid())`;
- 45/45 tabelas continuam com RLS;
- continuam 78 policies e 0 policies `anon`/`PUBLIC`;
- continuam 0 RPCs públicas `SECURITY DEFINER` executáveis por `anon`;
- o probe sintético sem membership continua retornando zero linhas;
- o warning `auth_rls_initplan` dessa policy não aparece mais no Performance Advisor.

## Regressão automatizada

`supabase/tests/security_hardening.sql` passou a exigir que `memberships_visible_to_self_or_admin`:

- exista;
- não reintroduza `user_id = auth.uid()` direto;
- contenha o `SELECT auth.uid()` necessário ao initPlan.

A suíte continua verificando também RLS em todas as tabelas, ausência de policies anon/PUBLIC, grants mínimos, view `security_invoker`, RPCs anônimas bloqueadas e default privileges deny-by-default.

## Validação

Head funcional inicial `49a67c975ebe96d5149b0df72a1b6e24f883d740`:

- CI #322: database e validate verdes;
- Business Transactions Integration #156: verde;
- Inventory Count Integration #172: verde.

O CI database aplicou todas as migrations em banco PostgreSQL 17 limpo e passou `schema_smoke.sql`, `security_hardening.sql`, isolamento de Auth/Organization e todas as suites transacionais existentes.

Depois desse gate, a migration foi aplicada remotamente e o filename local foi reconciliado à versão `20260820184106`. O head final do PR deve permanecer verde antes do squash merge; a evidência final fica também registrada no PR #81.

## Findings fora do escopo

O preflight não converteu em mudança oportunista:

- avisos INFO de foreign keys sem índice;
- índices ainda sem uso observado;
- leaked-password protection do Supabase Auth desabilitada.

Esses itens são independentes do isolamento de linhas e exigem avaliação própria de custo/benefício ou configuração Auth específica.

## Conclusão

A RLS está ativa e efetiva na superfície auditada. O único ajuste necessário nesta preflight foi uma otimização semanticamente neutra da policy de memberships, agora versionada, testada e aplicada no remoto.

A próxima frente pode prosseguir para `REQ-IMP-001..004` e aliases de migração sem reabrir o hardening de RLS, salvo evidência concreta de regressão durante os testes de importação.
