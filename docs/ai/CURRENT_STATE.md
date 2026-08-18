# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #46 — merged
- Issue #45 — closed/completed
- merge commit: `7aa98ebacb8eaed1587245fa04e19fc6a4e16f9c`
- head final validado pré-merge: `596127843c671aea5ceca6a6abc1f79e3172fbc5`
- próxima Issue: #49 — `Fase 19 — funcionários operacionais e separação de identidade de acesso`
- nenhuma migration/DDL da Fase 18 foi necessária.

## Fase 18 — concluído

A entrega cobre `REQ-PLAT-007` e reforça `REQ-SEC-004`:

- política fail-closed explícita para `development`, `preview` e `production`;
- mismatch de identidade de ambiente bloqueia acesso;
- Preview sem backend próprio comprovado não cria acesso Supabase operacional;
- Development aceita backend local por padrão e exige identidade distinta para remoto;
- Production rejeita backend local e pode fixar project ref esperada;
- `SUPABASE_SECRET_KEY` permanece server-only;
- admin não-prod fica bloqueado por padrão;
- Proxy/Auth/callback/reset/signout/bootstrap/workspace respeitam a política;
- `/health` expõe somente estado não sensível;
- testes cobrem parsing, refs, fail-closed e fronteira client/server de secrets;
- ADR-008 e runbook de ambientes versionados.

## Validação final da Fase 18

No head `596127843c671aea5ceca6a6abc1f79e3172fbc5` passaram:

- `CI` #243 — success;
- `Inventory Count Integration` #149 — success;
- `Business Transactions Integration` #132 — success.

O CI validou lint, typecheck, Vitest, build, migrations/seed, backup/restore e suítes PostgreSQL existentes.

### Vercel

O código funcional da Fase 18 já havia sido homologado no Preview do commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`, deployment `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2`, com `/health` confirmando:

- `environment=preview`;
- `supabaseAccess=blocked`;
- `supabaseReason=preview_backend_unverified`;
- `adminAccess=blocked`.

Depois desse commit não houve drift funcional no isolamento; as mudanças posteriores foram continuidade e política de deployment. Por isso a Fase 18 foi encerrada com **Preview funcional homologado + ausência comprovada de drift funcional + CI 3/3 verde no head final**.

Os PRs #47/#48 desativaram Git deployments automáticos em `vercel.json` com `git.deploymentEnabled=false` após consumo excessivo da quota Hobby.

**Política vigente:** Vercel não é gate rotineiro de desenvolvimento. Deploy manual só deve ocorrer quando uma validação realmente depender de ambiente hospedado, em milestone apropriada ou preparação para produção.

## Supabase remoto

Última revalidação read-only:

- projeto `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero branches.

Na Fase 18 não houve migration, DDL, projeto/branch adicional, alteração de configuração, write de dados, dado real ou contratação.

## Próxima lacuna MUST real

`REQ-ORG-004` exige distinguir funcionário operacional de usuário autenticado, e `docs/product/scope.md` inclui funcionários básicos no MVP.

O modelo lógico já prevê `employees`, mas a migration física de fundação cria `organization_memberships` ligadas a `auth.users` e não materializa `employees`. Também não existe módulo dedicado de funcionários.

Issue #49 foi aberta para fechar essa lacuna com escopo mínimo e reversível:

- Employee separado de identidade autenticada;
- vínculo opcional e explícito;
- cadastro persistente básico;
- RLS/escopo;
- UI administrativa mínima;
- fixtures exclusivamente sintéticas;
- sem RH/folha, dados reais ou redefinição de Q-022.

## Não repetir

- não reabrir Fase 18;
- não voltar a exigir Preview Vercel para cada head/commit;
- não reativar deployment automático;
- não importar dados reais;
- não reaplicar migrations antigas;
- não inferir Q-001 a Q-025;
- não transformar cadastro de Employee em concessão automática de acesso.
