# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 26 continua aberta somente para configuração/homologação operacional do primeiro owner. A implementação técnica inicial (PR #66) e a correção de compatibilidade com o Supabase Free real (PR #67) já estão integradas na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #65 — open
- PR #66 — merged
- PR #67 — merged
- head técnico final validado: `24bba6ef3e80c6c3897d302ea7182fb368005029`
- merge corretivo: `e26f5030b1fd7d7a12adfcae38667993b9382052`
- CI #291 — success
- nenhuma migration/DDL na correção
- nenhum usuário real, membership real ou convite criado
- nenhum deployment Vercel disparado nesta homologação

## Fase 26 — fluxo técnico vigente

O primeiro owner é provisionado sem signup público e sem senha conhecida pelo agente.

Fluxo padrão hospedado:

1. `inviteBootstrapOwnerAction` roda server-side e lê o destinatário somente de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
2. `auth.admin.inviteUserByEmail()` envia o convite com redirect para `/auth/invite`;
3. o Supabase valida o link e retorna o fluxo implícito no fragmento do browser;
4. `/auth/invite` exige `type=invite`, remove o fragmento da URL e envia access/refresh token apenas por POST same-origin para `/auth/invite/session`;
5. a rota server-side revalida o access token no Supabase, exige o e-mail autorizado e só então grava sessão SSR em cookie;
6. o usuário define sua própria senha em `/auth/atualizar-senha`;
7. `bootstrapOwnerAction` permanece o único caminho que cria `organization_memberships.role='owner'` e `audit_logs.action='membership.bootstrap_owner'`.

Guardrails:

- destinatário nunca vem do browser;
- sem SQL direto em `auth.users`;
- identidade `pending`/`confirmed` não recebe convite automático duplicado;
- owner existente encerra o bootstrap;
- `LOJASAPH_BOOTSTRAP_INVITE_READY=true` é gate temporário/fail-closed;
- `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY` existe apenas como compatibilidade antiga;
- `/auth/callback` com TokenHash continua disponível para instalações com template customizado, mas não é requisito do fluxo padrão;
- nenhum token/senha/secret é versionado ou logado.

Runbook: `docs/operations/bootstrap-owner.md`.

## Motivo do PR #67

Na homologação foi confirmado que a Supabase Organization está no plano Free e que o projeto foi criado em 2026-07-06. A documentação atual do Supabase informa que novos projetos Free criados após 2026-06-03 usando o SMTP padrão não podem customizar Auth Email Templates.

O PR #66 pressupunha template `Invite user` customizado com TokenHash. O PR #67 removeu essa dependência e passou a suportar o template padrão via fluxo implícito dedicado, mantendo o callback TokenHash como alternativa para SMTP/template customizado.

## Validação

Head `24bba6ef3e80c6c3897d302ea7182fb368005029`:

- CI #291 — success;
- lint — success;
- typecheck — success;
- Vitest — success, incluindo guardrails do fragmento implícito;
- production build — success;
- migrations + seed — success;
- backup/restore — success;
- schema/RLS smoke — success;
- `supabase/tests/security_hardening.sql` — success;
- auth/Organization isolation e suítes transacionais — success.

CI #289/#290 detectaram apenas problemas locais do novo client component (regra React e narrowing TypeScript), corrigidos antes do head final. O banco permaneceu verde.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17, Organization no plano Free.

Preflight read-only final:

- 1 Organization ativa;
- 0 Auth users;
- 0 memberships ativos;
- 0 owners ativos;
- identidade explicitamente autorizada pelo operador ainda ausente;
- 45/45 tabelas `public` com RLS;
- 0 tabelas sem policy;
- 0 DML para `anon`/`PUBLIC`;
- `payable_installment_summary.security_invoker=true`.

O operador forneceu explicitamente o e-mail do primeiro owner nesta sessão. O valor não é persistido no GitHub por política de PII/segurança. Se um novo chat não tiver esse contexto, deve solicitar que o operador repita o endereço; nunca inferi-lo de contas conectadas. O operador também ofereceu uma senha, mas ela foi deliberadamente ignorada e não deve ser usada/persistida: o usuário define a própria senha pelo convite.

## Vercel

Projeto `sistema-lojasaph`, auto-deploy continua desabilitado por `vercel.json`.

Último Production observado:

- deployment `dpl_Dx5wwzHUuc4hNG9D5sTGh6mqWSjB` — READY;
- commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca` — anterior às Fases 25/26;
- domínio canônico `https://sistema-lojasaph.vercel.app`;
- `/health`: `environment=production`, `supabaseAccess=allowed`, `adminAccess=blocked`.

A semântica do mesmo código nesse commit confirma que `adminAccess=blocked` significa que `SUPABASE_SECRET_KEY` não está configurada no runtime Production.

Nenhum deployment foi disparado nesta sessão.

## Bloqueio operacional atual

Os conectores disponíveis foram inspecionados antes de declarar o bloqueio:

- Supabase conectado permite projetos, SQL, logs, advisors e docs, mas não expõe escrita das configurações hospedadas de Auth URL/SMTP/Team;
- Vercel conectado permite projetos/deployments/logs/docs, mas não expõe CRUD das environment variables;
- não há `supabase`, `vercel` ou `gh` CLI autenticado nem tokens locais disponíveis para fallback.

Portanto a próxima ação exige uma configuração curta no Dashboard pelo operador antes de qualquer convite/deploy.

Configuração necessária:

1. Supabase Auth URL Configuration: permitir exatamente `https://sistema-lojasaph.vercel.app/auth/invite`;
2. confirmar que o e-mail autorizado é membro da Supabase Organization para o SMTP padrão, ou configurar SMTP próprio; não enviar convite só para testar entrega;
3. Vercel Production: configurar `SUPABASE_SECRET_KEY`, `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` e, somente após 1–2 estarem comprovados, `LOJASAPH_BOOTSTRAP_INVITE_READY=true`;
4. `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` não é necessária no estado atual porque existe exatamente uma Organization ativa;
5. só depois disso publicar uma única vez a `main` atual e confirmar `/health.adminAccess=allowed` + `/bootstrap` ready.

## Não repetir

- não refazer PR #66/#67;
- não reabrir Fases 24/25;
- não criar Auth user por SQL;
- não habilitar signup público;
- não persistir o e-mail autorizado em GitHub;
- não usar/armazenar senha fornecida no chat;
- não enviar convite antes de redirect + entrega + envs estarem prontos;
- não ampliar RLS/grants;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
