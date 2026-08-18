# Handoff — Sistema Lojasaph

## Estado

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada e tecnicamente verde, mas ainda não encerrada por falta de homologação do Preview no head final**.

- Issue #45 — open;
- PR #46 — draft/open;
- branch: `agent/environment-isolation`;
- base: `main` em `5c617e7f26c514139be3b6171f38e28ae5ae30af`;
- SHA técnico validado antes dos commits documentais finais: `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`;
- nenhuma migration/DDL da Fase 18;
- nenhum write/config change remoto no Supabase.

## O que já está concluído — não refazer

### Política de ambiente

- `src/lib/runtime/environment.ts` contém a política pura/testável;
- `src/lib/runtime/server.ts` concentra acesso a `process.env`/admin secret;
- ambientes suportados: `development`, `preview`, `production`, com `unknown` fail-closed;
- `LOJASAPH_APP_ENV` e `VERCEL_ENV` divergentes bloqueiam acesso;
- Production pode fixar ref esperada e rejeita backend local;
- Preview exige backend próprio comprovado por refs distintas;
- Development aceita backend local; remoto exige identidade própria;
- project ref é usada como identidade pública, nunca como secret;
- `SUPABASE_SECRET_KEY` permanece server-only;
- admin fora de Production permanece bloqueado salvo opt-in explícito em backend já isolado.

### Runtime/Browser/Auth

- `src/lib/supabase/env.ts` é `server-only`;
- `src/lib/supabase/browser.ts` não lê nenhum secret e aplica a política usando apenas `NODE_ENV`/`NEXT_PUBLIC_*` quando não recebe config injetada;
- workspace principal recebe configuração Supabase validada pelo servidor;
- clientes diretos existentes em Caixa/Compras/Financeiro/Inventário/dashboard continuam compatíveis, mas não conseguem bypassar Preview bloqueado;
- Proxy não cria Supabase client quando acesso não está comprovado;
- login, password reset, password update e seleção de Organization falham fechado antes de acessar Supabase;
- callback bloqueado não troca código/token nem cria sessão;
- signout bloqueado só limpa estado local;
- bootstrap administrativo respeita a política de admin;
- login/recuperação exibem estado seguro quando Preview não possui backend operacional.

### Health e testes

`GET /health` retorna apenas:

- `status`;
- `service`;
- `environment`;
- `supabaseAccess`;
- `supabaseReason`;
- `adminAccess`.

Nunca retorna URL, ref, key ou secret.

Testes novos:

- `src/lib/runtime/environment.test.ts`;
- `src/lib/runtime/client-boundary.test.ts`.

Cobertura inclui Preview sem isolamento, Preview=Production, Preview distinto, Development local/remoto, mismatch de ambiente, admin não-prod, project ref e ausência de server-only secrets no browser.

### Documentação

- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- `docs/modules/supabase-runtime.md` atualizado;
- `.env.example` atualizado sem valores reais.

## CI técnico

Primeira tentativa:

- `CI` #225 — failure apenas no typecheck;
- causa: cinco páginas cliente preexistentes ainda chamavam `createBrowserSupabaseClient()` sem argumento;
- banco e workflows de integração não falharam.

Correção aplicada sem reescrever as páginas: fallback browser-side protegido usa somente variáveis públicas + mesma política fail-closed.

No SHA técnico `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`:

- `CI` #229 — success;
- `Inventory Count Integration` #139 — success;
- `Business Transactions Integration` #122 — success.

O CI #229 passou lint, typecheck, Vitest, production build, migrations/seed, backup/restore e todas as suítes PostgreSQL existentes.

## Supabase remoto

Estado verificado somente leitura:

- um projeto conectado;
- saudável;
- PostgreSQL 17;
- organização Free;
- zero branches.

Na Fase 18:

- nenhuma migration;
- nenhum DDL;
- nenhum branch/projeto adicional;
- nenhum write de dados;
- nenhum dado real copiado;
- nenhuma contratação/upgrade.

Não reaplicar migrations antigas e não criar ambiente pago sem autorização explícita.

## Vercel — bloqueio externo atual

Antes da Fase 18, a `main` já havia atingido `build-rate-limit`.

O primeiro commit da branch (`7307ccf8dc53295e0bf4c01448eac8bdbcd962db`) conseguiu gerar Preview `READY`:

- deployment `dpl_7f4gBBdmdTsRfWWiAz3ddCVzGnjT`.

Esse deployment contém somente o início da implementação e **não é evidência final**.

Os commits posteriores não receberam deployment. O status Vercel do head retorna failure apontando para `upgradeToPro=build-rate-limit`.

Não corrigir código por causa disso e não fazer upgrade de plano por inferência.

## Próxima ação exata

1. conferir Issue #45, PR #46 e o head atual de `agent/environment-isolation`;
2. conferir os workflows do head documental final; exigir `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes;
3. conferir o status/deployments Vercel do **mesmo head**;
4. se continuar `build-rate-limit`:
   - não alterar código;
   - não fazer commit artificial;
   - não contratar plano;
   - manter PR #46 draft e Issue #45 open;
5. quando existir deployment `READY` do head final, executar somente smoke não mutável:
   - `GET /health`;
   - esperar `environment=preview`;
   - enquanto não existir backend isolado configurado, esperar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` e confirmar aviso de isolamento + ausência do formulário operacional;
   - opcionalmente acessar `/auth/callback` sem `code`/`token_hash` real e confirmar redirecionamento seguro;
   - não autenticar, não enviar senha, não testar reset real e não executar mutação;
6. se `/health` indicar `supabaseAccess=allowed`, **parar o smoke operacional** e primeiro comprovar que a ref/backend é distinta de Production; não testar escrita;
7. após o smoke aprovado, atualizar corpo do PR #46 com:
   - SHA final;
   - IDs dos três workflows verdes;
   - deployment final;
   - resultado seguro do `/health`/login;
   - confirmação de zero write/config change no Supabase;
8. marcar PR #46 ready for review;
9. fazer merge normal em `main`;
10. confirmar Issue #45 closed/completed;
11. somente depois revisar requisitos MUST/Issues reais para selecionar a próxima frente;
12. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` pós-merge.

## Regras que permanecem

- não reimplementar a Fase 18;
- não reabrir observabilidade/backup;
- secrets nunca no browser/Git/log;
- nenhuma questão Q-001..Q-025 por inferência;
- dados reais não vão para Preview/Development;
- nenhuma migration/DDL é necessária nesta fase;
- nenhuma operação destrutiva ou contratação sem autorização explícita.