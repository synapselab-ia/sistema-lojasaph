# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada e tecnicamente validada; PR #46 permanece draft até o gate final de Preview**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #45 — open
- PR #46 — draft/open
- branch: `agent/environment-isolation`
- base da branch: `main` em `5c617e7f26c514139be3b6171f38e28ae5ae30af`
- SHA técnico validado: `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`
- último SHA documental já validado antes desta atualização: `ca9aece949988404f33d5ee951ad36a6228f5503`
- nenhuma migration/DDL da Fase 18 foi necessária.

## Fase 18 — implementado

A entrega cobre a fundação de `REQ-PLAT-007` e reforça `REQ-SEC-004`:

- política central fail-closed em `src/lib/runtime/environment.ts`;
- ambientes `development`, `preview`, `production` e `unknown`;
- mismatch entre `LOJASAPH_APP_ENV` e `VERCEL_ENV` bloqueia acesso;
- Production rejeita backend local e pode fixar a ref esperada do Supabase;
- Preview bloqueia Supabase até existir backend próprio comprovado por ref distinta de Production;
- Development aceita Supabase local e exige identidade própria para backend remoto;
- `SUPABASE_SECRET_KEY` permanece server-only;
- admin client fora de Production fica bloqueado por padrão;
- callbacks de Preview usam o domínio do próprio deployment;
- Proxy não cria cliente Supabase quando acesso não está comprovado;
- Auth, callback, password reset, signout, bootstrap e workspace respeitam a política;
- browser usa apenas `NODE_ENV`/`NEXT_PUBLIC_*` e aplica a mesma política nos clientes diretos;
- `/health` expõe somente estado não sensível;
- login/recuperação ficam desabilitados quando não há backend operacional aprovado;
- `.env.example` documenta a configuração sem valores reais;
- testes cobrem parsing, refs, fail-closed, admin e fronteira client/server de secrets.

## Documentação

- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- `docs/modules/supabase-runtime.md` atualizado.

## CI

No SHA técnico `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0` passaram:

- `CI` #229;
- `Inventory Count Integration` #139;
- `Business Transactions Integration` #122.

No SHA documental `ca9aece949988404f33d5ee951ad36a6228f5503` passaram novamente:

- `CI` #235;
- `Inventory Count Integration` #145;
- `Business Transactions Integration` #128.

O CI final validou lint, typecheck, Vitest, build, migrations/seed, backup/restore e todas as suítes PostgreSQL existentes.

## Supabase remoto

Verificação somente leitura confirmou:

- um projeto conectado;
- saudável;
- PostgreSQL 17;
- organização no plano Free;
- zero branches.

A Fase 18 não criou migration, DDL, branch/projeto, configuração remota ou write de dados. Nenhum dado real foi copiado e nenhum upgrade foi contratado.

## Vercel — evidência atual

A plataforma ficou parte do ciclo em `build-rate-limit`, mas voltou a aceitar um build do commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`.

Esse commit já contém **todo o código funcional final da Fase 18**; depois dele foram alterados somente arquivos de continuidade.

Deployment validado:

- `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` — `READY`.

Smoke não mutável em `GET /health` retornou:

- `environment=preview`;
- `supabaseAccess=blocked`;
- `supabaseReason=preview_backend_unverified`;
- `adminAccess=blocked`.

Nenhuma autenticação, senha, token, reset ou mutação foi usada.

O SHA documental `ca9aece9...` ainda não recebeu deployment e o status Vercel continuou apontando para `build-rate-limit`. Portanto o PR permanece draft: não criar commit artificial nem fazer upgrade apenas para provocar deployment.

## Gate restante

Antes do merge:

1. revalidar os três workflows no head atual desta documentação;
2. conferir se a Vercel criou Preview `READY` do head atual;
3. se não criou, manter PR #46 draft e Issue #45 open;
4. quando houver Preview do head atual, repetir `GET /health` e confirmar o mesmo fail-closed;
5. se `supabaseAccess=allowed`, não executar mutação: primeiro comprovar backend distinto de Production;
6. só então atualizar PR, marcar ready, fazer merge normal e confirmar Issue #45 closed/completed.

## Não repetir

- não reimplementar Fase 18;
- não reabrir observabilidade ou backup/restore;
- não alterar código para contornar rate limit;
- não contratar recurso pago por inferência;
- não reaplicar migrations antigas;
- não importar dados reais/cutover;
- não inferir Q-001 a Q-025.
