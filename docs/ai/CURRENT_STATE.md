# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A implementação técnica da Fase 26 foi concluída e integrada na `main`; a Issue #65 permanece aberta apenas para a homologação operacional do primeiro owner.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #66 — merged
- Issue #65 — open
- head técnico validado: `516562485dc1a2561add033cf5db1be4cac14ce5`
- merge commit: `677daa83b9e312199d06de4d85f46a3d6a3eb32c`
- CI #286 — success
- Inventory Count Integration / Business Transactions Integration — não aplicáveis ao diff por `paths` dos próprios workflows
- nenhuma migration/DDL nesta fase
- nenhum usuário real criado e nenhum convite enviado

## Fase 26 — convite seguro do primeiro owner

O sistema agora possui o caminho técnico para criar a primeira identidade Auth sem abrir cadastro público nem compartilhar senha.

Implementado:

- `inviteBootstrapOwnerAction` executa exclusivamente server-side;
- destinatário vem somente de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`; não existe campo de e-mail no browser;
- usa `createServerAdminSupabaseClient()` + `auth.admin.inviteUserByEmail()`; não há SQL direto em `auth.users`;
- Organization alvo continua resolvida fail-closed;
- owner ativo encerra o bootstrap;
- identidade autorizada é classificada como `missing`, `pending` ou `confirmed`; pending/confirmed não recebem convite automático duplicado;
- `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true` é gate temporário/fail-closed antes de qualquer envio;
- convite SSR usa o template Supabase com `TokenHash` + `type=invite` para o `/auth/callback` existente;
- `/auth/callback` continua usando `verifyOtp()` e sessão SSR em cookie;
- o fluxo de definição de senha aceita somente `next` interno validado e pode retornar à `/bootstrap`;
- `bootstrapOwnerAction` continua sendo o único caminho que cria `organization_memberships.role='owner'` e `audit_logs.action='membership.bootstrap_owner'`;
- signup público continua ausente;
- nenhuma senha padrão, token ou secret foi versionado.

Runbook: `docs/operations/bootstrap-owner.md`.

## Validação

Head final `516562485dc1a2561add033cf5db1be4cac14ce5`:

- CI #286 — success;
- lint — success;
- typecheck — success;
- Vitest — success;
- production build — success;
- PostgreSQL 17 client — success;
- migrations + seed — success;
- backup/restore — success;
- schema/RLS smoke — success;
- `supabase/tests/security_hardening.sql` — success;
- auth/Organization isolation e todas as suítes transacionais — success.

O CI #285 anterior teve o job de aplicação verde, mas o job de banco expirou antes das migrations porque o runner ficou bloqueado no mirror `azure.archive.ubuntu.com`. A correção `51656248` limitou o update ao PGDG com retries/timeouts; o CI #286 então completou o banco integralmente. Não houve alteração funcional para mascarar o incidente.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Read-only antes e depois da validação técnica:

- 1 Organization ativa;
- 0 Auth users;
- 0 memberships ativos;
- 0 owners ativos.

Portanto a Fase 26 ainda não teve efeito operacional no Auth ou nos dados. Como não houve DDL, advisors não foram reexecutados por causalidade.

## Pendência operacional — Issue #65

Para concluir a Issue #65 falta exclusivamente a homologação real do primeiro owner.

Pré-condição indispensável: o operador deve fornecer explicitamente o e-mail que será autorizado. Esse endereço **não pode ser inferido** de GitHub, Vercel, contas conectadas, commits ou metadados.

Depois do e-mail explícito, a próxima sessão deve:

- revalidar ausência de owner e estado da identidade Auth;
- configurar temporariamente Production conforme `docs/operations/bootstrap-owner.md`;
- confirmar Auth Redirect URL Allow List, template `Invite user` com TokenHash e entrega de e-mail;
- só então ativar `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true`;
- fazer um único deployment Production intencional se o código da Fase 26 ainda não estiver publicado;
- enviar um único convite controlado;
- o usuário convidado deve abrir o e-mail e definir a própria senha;
- concluir `/bootstrap` para criar membership + audit;
- verificar login/RLS/audit e remover/desabilitar as variáveis temporárias;
- fechar #65 somente depois dessa verificação.

## Vercel

`vercel.json` mantém `git.deploymentEnabled=false`. Nenhum deploy Vercel foi disparado durante a implementação técnica da Fase 26. O Production observado antes do encerramento técnico ainda estava no commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`, portanto a homologação real exigirá verificar novamente o estado e, se necessário, um único deployment deliberado.

## Não repetir

- não refazer PR #66 nem a implementação técnica do convite;
- não reabrir Fases 24/25 ou Issues #61/#63;
- não criar usuário diretamente em `auth.users` por SQL;
- não habilitar signup público;
- não inferir o e-mail do owner;
- não gerar/guardar senha padrão;
- não enviar convite antes de template/redirect/env estarem comprovados;
- não ampliar RLS/grants;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025;
- não fazer sweep de advisors antigos sem causalidade.
