# Handoff — Sistema Lojasaph

## Estado

A Fase 26 / Issue #65 está tecnicamente pronta e aguarda apenas configuração/homologação operacional do primeiro owner.

- PR #66 — merged: convite server-only inicial;
- PR #67 — merged: compatibilidade com o fluxo padrão de convite no Supabase Free;
- head técnico final: `24bba6ef3e80c6c3897d302ea7182fb368005029`;
- merge corretivo: `e26f5030b1fd7d7a12adfcae38667993b9382052`;
- CI #291 — success;
- Issue #65 — open;
- nenhum DDL, usuário real, membership real ou convite criado;
- nenhum deployment Vercel disparado nesta homologação.

## Fluxo técnico final

O fluxo padrão não depende de template customizado:

1. destinatário vem somente de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` server-only;
2. `inviteBootstrapOwnerAction` revalida runtime/admin, Organization, ausência de owner e identidade Auth;
3. `inviteUserByEmail()` usa redirect `/auth/invite`;
4. o Supabase valida o convite e retorna access/refresh token apenas no fragmento do browser;
5. `/auth/invite` exige `type=invite`, apaga o fragmento imediatamente e faz POST same-origin para `/auth/invite/session`;
6. a rota valida access token real + e-mail autorizado antes de gravar sessão SSR;
7. o usuário define a própria senha;
8. `bootstrapOwnerAction` continua sendo o único criador do membership owner + audit.

O callback `/auth/callback` com TokenHash permanece disponível para ambientes com template customizado, mas não é requisito da homologação atual.

Runbook: `docs/operations/bootstrap-owner.md`.

## Por que o PR #67 foi necessário

O projeto Supabase real foi confirmado como:

- plano Free;
- criado em 2026-07-06.

A documentação vigente do Supabase passou a bloquear customização de Auth Email Templates em novos projetos Free usando SMTP padrão desde 2026-06-03. Assim, o pressuposto do PR #66 sobre template `Invite user` customizado era inviável neste projeto sem SMTP próprio/plano diferente.

O PR #67 corrigiu isso sem DDL, sem relaxar RLS e sem abrir signup.

## CI

Head `24bba6ef3e80c6c3897d302ea7182fb368005029` passou CI #291 integralmente:

- lint;
- typecheck;
- Vitest;
- production build;
- PostgreSQL 17;
- migrations + seed;
- backup/restore;
- schema/RLS smoke;
- `security_hardening.sql`;
- auth/Organization isolation;
- suítes transacionais.

`Inventory Count Integration` e `Business Transactions Integration` continuam não aplicáveis ao diff por `paths` dos workflows; não alterar filtros apenas para criar gate artificial.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`.

Preflight final read-only:

- 1 Organization ativa;
- 0 Auth users;
- 0 memberships ativos;
- 0 owners ativos;
- identidade autorizada ausente;
- RLS/hardening sem regressão: 45/45 tabelas public com RLS, zero sem policy, zero DML anon/PUBLIC.

## Dado explícito do operador

O operador forneceu explicitamente nesta sessão o e-mail que deve ser o primeiro owner. O valor foi usado apenas para preflight read-only e **não foi persistido no GitHub**. Se o próximo chat não tiver esse dado no contexto da conversa, pedir que o operador o repita; não inferir de GitHub/Vercel/Supabase.

O operador também ofereceu uma senha, mas ela foi deliberadamente ignorada e não deve ser usada, versionada ou configurada. O fluxo exige que o próprio destinatário defina a senha ao aceitar o convite.

## Vercel

- projeto: `sistema-lojasaph`;
- domínio canônico: `https://sistema-lojasaph.vercel.app`;
- `vercel.json`: `git.deploymentEnabled=false`;
- último Production observado: `dpl_Dx5wwzHUuc4hNG9D5sTGh6mqWSjB`, commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`, READY;
- `/health`: Production + Supabase allowed + admin blocked;
- código do próprio commit confirma que admin blocked nesse caso significa ausência de `SUPABASE_SECRET_KEY`;
- nenhuma tentativa de deploy foi feita nesta sessão.

## Ferramentas e bloqueio real

Conectores foram inspecionados:

- Supabase conectado não expõe escrita de Auth URL Configuration, SMTP ou Team membership;
- Vercel conectado não expõe create/edit/delete de environment variables;
- não há CLI/token autenticado local para fallback.

Não afirmar que essas ações foram feitas. Elas precisam ser realizadas pelo operador no Dashboard antes da próxima mutação.

## Próximo passo operacional exato

### Supabase Dashboard

1. Authentication → URL Configuration:
   - confirmar Site URL canônica;
   - adicionar exatamente `https://sistema-lojasaph.vercel.app/auth/invite` à Redirect URL Allow List.
2. Organization Settings → Team:
   - confirmar que o e-mail explicitamente autorizado é membro da Organization, porque o SMTP padrão só entrega Auth email a endereços do Team; ou
   - configurar SMTP próprio em Authentication → Email/SMTP antes de qualquer convite.
3. Não customizar template apenas para este bootstrap; o fluxo padrão já é suportado.

### Vercel Dashboard — Production only

Configurar sem copiar valores para o chat/GitHub:

- `SUPABASE_SECRET_KEY`;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` com o e-mail explicitamente autorizado;
- `LOJASAPH_BOOTSTRAP_INVITE_READY=true` **somente depois** das verificações Supabase acima.

Não é necessário `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` enquanto houver exatamente uma Organization ativa.

### Depois da configuração

1. revalidar remotamente 0 owner/0 identidade antes de escrever;
2. fazer um único deployment Production intencional da `main` atual;
3. verificar `/health` com `supabaseAccess=allowed` e `adminAccess=allowed`;
4. abrir `/bootstrap` e confirmar estado ready;
5. enviar exatamente um convite;
6. usuário abre o e-mail e define sua própria senha;
7. usuário conclui `Criar vínculo owner inicial`;
8. verificar membership owner, audit `membership.bootstrap_owner`, login e RLS;
9. remover/desabilitar envs temporárias e secret administrativo quando não houver outra necessidade;
10. confirmar bootstrap fail-closed/encerrado e fechar #65.

## Não fazer

- não refazer PR #66/#67;
- não enviar convite para testar SMTP;
- não criar usuário por SQL;
- não habilitar signup público;
- não usar a senha que apareceu no chat;
- não armazenar e-mail autorizado no GitHub;
- não ampliar RLS/grants;
- não fazer deploy antes das envs/redirect/entrega estarem prontos;
- não reativar auto-deploy;
- não importar dados reais;
- não inferir Q-001..Q-025.
