# Handoff — Sistema Lojasaph

## Estado

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada e tecnicamente verde, mas ainda não encerrada porque o Preview do head documental atual precisa ser homologado**.

- Issue #45 — open;
- PR #46 — draft/open;
- branch: `agent/environment-isolation`;
- base: `main` em `5c617e7f26c514139be3b6171f38e28ae5ae30af`;
- SHA técnico: `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`;
- último SHA documental validado antes desta atualização: `ca9aece949988404f33d5ee951ad36a6228f5503`;
- nenhuma migration/DDL/write/config change remoto no Supabase.

## Já concluído — não refazer

### Política e runtime

- `src/lib/runtime/environment.ts`: política fail-closed pura/testável;
- `src/lib/runtime/server.ts`: acesso server-only a ambiente/admin secret;
- `development`, `preview`, `production` e `unknown`;
- mismatch `LOJASAPH_APP_ENV` x `VERCEL_ENV` bloqueia acesso;
- Preview só permite Supabase quando backend próprio e Production têm refs explícitas e distintas;
- Development aceita Supabase local; remoto exige identidade própria;
- Production rejeita backend local e pode fixar ref esperada;
- `SUPABASE_SECRET_KEY` continua server-only;
- admin não-prod bloqueado por padrão e só pode ser opt-in depois de backend isolado.

### Browser/Auth/UI

- `src/lib/supabase/env.ts` é `server-only`;
- browser client lê somente `NODE_ENV`/`NEXT_PUBLIC_*` e aplica a mesma validação;
- workspace recebe configuração já validada pelo servidor;
- clientes diretos de Caixa/Compras/Financeiro/Inventário/dashboard não bypassam Preview bloqueado;
- Proxy não cria cliente Supabase quando acesso não está comprovado;
- login, password reset/update, callback, signout, bootstrap e seleção de Organization respeitam a política;
- login/recuperação mostram estado isolado sem formulário operacional;
- `/health` não expõe URL, ref, key ou secret.

### Testes e docs

- `src/lib/runtime/environment.test.ts`;
- `src/lib/runtime/client-boundary.test.ts`;
- `.env.example` atualizado sem valores reais;
- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- `docs/modules/supabase-runtime.md` atualizado.

## CI

No SHA técnico `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`:

- `CI` #229 — success;
- `Inventory Count Integration` #139 — success;
- `Business Transactions Integration` #122 — success.

No SHA documental `ca9aece949988404f33d5ee951ad36a6228f5503`:

- `CI` #235 — success;
- `Inventory Count Integration` #145 — success;
- `Business Transactions Integration` #128 — success.

O CI passou lint, typecheck, Vitest, production build, migrations/seed, backup/restore e todas as suítes PostgreSQL.

## Supabase remoto

Estado read-only confirmado:

- um projeto conectado;
- saudável;
- PostgreSQL 17;
- organização Free;
- zero branches.

Nenhuma migration, DDL, branch/projeto adicional, configuração remota, write ou dado real foi usado na Fase 18. Não reaplicar migrations e não criar infraestrutura paga sem autorização.

## Vercel — evidência e bloqueio restante

A Vercel esteve em `build-rate-limit`, mas depois liberou Preview do commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`:

- deployment `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` — `READY`;
- esse commit já contém todo o **código funcional final** da Fase 18; commits posteriores mudaram apenas continuidade;
- `GET /health` respondeu:
  - `environment=preview`;
  - `supabaseAccess=blocked`;
  - `supabaseReason=preview_backend_unverified`;
  - `adminAccess=blocked`;
- smoke usou zero autenticação, senha, token ou mutação.

O SHA documental `ca9aece9...` não ganhou deployment e o status Vercel continuou `failure` por `build-rate-limit`. Não fazer upgrade nem commit artificial para contornar.

## Próxima ação exata

1. conferir Issue #45, PR #46 e o head atual da branch;
2. exigir `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes no head atual;
3. conferir Vercel para o mesmo head;
4. se não houver Preview `READY` do head:
   - não alterar código;
   - não criar commit artificial;
   - não contratar plano;
   - manter PR draft e Issue open;
5. quando houver Preview `READY` do head atual, fazer somente smoke não mutável:
   - `GET /health`;
   - esperar `environment=preview`;
   - enquanto não houver backend isolado, esperar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` se a proteção do Preview permitir e confirmar estado isolado;
   - callback somente sem credenciais reais, se necessário;
6. se `/health` indicar `supabaseAccess=allowed`, não testar escrita; primeiro provar que o backend é distinto de Production;
7. após smoke aprovado, atualizar PR #46, marcar ready e fazer merge normal;
8. confirmar Issue #45 closed/completed;
9. somente depois escolher a próxima lacuna MUST real;
10. atualizar continuidade na `main` pós-merge.

## Regras

- não reimplementar Fase 18;
- não reabrir Fase 17 ou backup/restore;
- secrets nunca no browser/Git/log;
- dados reais nunca em Preview/Development;
- nenhuma questão Q-001..Q-025 por inferência;
- nenhuma contratação ou operação destrutiva sem autorização explícita.
