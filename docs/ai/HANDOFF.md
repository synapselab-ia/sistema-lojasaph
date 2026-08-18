# Handoff — Sistema Lojasaph

## Estado

A Fase 18 foi encerrada e integrada.

- PR #46 — merged;
- Issue #45 — closed/completed;
- merge commit: `7aa98ebacb8eaed1587245fa04e19fc6a4e16f9c`;
- head final pré-merge: `596127843c671aea5ceca6a6abc1f79e3172fbc5`;
- `CI` #243 — success;
- `Inventory Count Integration` #149 — success;
- `Business Transactions Integration` #132 — success.

## Decisão operacional de Vercel

Não gastar tempo/quota tentando obter Preview para cada commit.

`vercel.json` mantém `git.deploymentEnabled=false` após os PRs #47/#48. A Fase 18 pôde fechar porque:

1. todo o código funcional do isolamento já havia sido homologado em Preview `READY` no commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`;
2. `/health` comprovou Preview fail-closed (`preview`, Supabase bloqueado, admin bloqueado);
3. não houve drift funcional posterior nesse código;
4. o head final passou 3/3 no CI.

Daqui em diante, **CI é o gate principal de desenvolvimento**. Usar Vercel manualmente apenas quando a validação dependa de hosting/browser real ou em milestone de release/produção.

## Supabase

Última checagem read-only: projeto `ACTIVE_HEALTHY`, PostgreSQL 17, zero branches. A Fase 18 não alterou banco/configuração/dados remotamente.

## Próxima frente — Issue #49

Título: `Fase 19 — funcionários operacionais e separação de identidade de acesso`.

Motivo objetivo:

- `REQ-ORG-004` é MUST;
- escopo MVP inclui funcionários básicos;
- modelo lógico possui `employees` separado de `users`;
- schema físico atual não possui `employees` na migration de fundação;
- autenticação hoje usa `auth.users` + `organization_memberships`;
- não existe módulo de funcionários dedicado.

### Defaults já registrados na Issue

- Employee é pessoa operacional e não identidade de login;
- cadastrar/inativar Employee não concede/revoga acesso automaticamente;
- vínculo com usuário autenticado é opcional e explícito;
- campos mínimos, sem folha/RH/dados sensíveis não requeridos;
- Unit/Sector padrão podem ser opcionais quando coerentes;
- Q-022 continua aberta;
- fixtures somente sintéticas;
- migration + RLS + testes antes de qualquer homologação remota.

## Próximo chat deve fazer

1. confirmar Issue #49 e estado real da `main`;
2. trabalhar em `agent/employees` (criar se ainda não existir);
3. ler `docs/architecture/data-model.md`, `docs/modules/master-data.md`, migrations de foundation/RLS/scoped permissions e contracts atuais de `src/modules/master-data`/`organization`;
4. definir a menor representação física coerente para `employees` e vínculo opcional com `auth.users`;
5. criar migration versionada e testes PostgreSQL primeiro;
6. implementar domínio/repository/adapter/UI administrativa mínima;
7. validar lint, typecheck, Vitest, build e suites PostgreSQL;
8. só após CI verde considerar aplicação remota no Supabase com fixtures sintéticas;
9. não usar Vercel salvo necessidade concreta de validação hospedada;
10. atualizar continuidade ao encerrar.

## Não fazer

- não reimplementar Fase 18;
- não reativar auto-deploy Vercel;
- não criar RH/folha/ponto/cargos e salários;
- não cadastrar/importar pessoas reais;
- não resolver Q-022 por inferência;
- não associar Employee a role/permissão automaticamente;
- não alterar módulos transacionais sem necessidade direta da Issue #49.
