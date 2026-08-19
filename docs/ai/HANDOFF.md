# Handoff — Sistema Lojasaph

## Estado

A parte técnica da Fase 26 / Issue #65 está concluída e mergeada na `main` pelo PR #66.

- head técnico validado: `516562485dc1a2561add033cf5db1be4cac14ce5`;
- merge commit: `677daa83b9e312199d06de4d85f46a3d6a3eb32c`;
- CI #286 — success;
- Issue #65 continua aberta somente para homologação operacional;
- nenhum DDL, usuário real, membership real ou convite foi criado;
- nenhum deployment Vercel foi feito.

## O que ficou pronto

O bootstrap do primeiro owner agora possui um fluxo técnico seguro:

1. o destinatário é lido exclusivamente de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` server-only;
2. `/bootstrap` nunca recebe e-mail arbitrário do browser;
3. `inviteBootstrapOwnerAction` valida runtime/admin, Organization, ausência de owner e estado da identidade Auth;
4. identidade `pending` ou `confirmed` não recebe convite automático duplicado;
5. o envio exige `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true` e URL pública válida;
6. `inviteUserByEmail()` é chamado somente pelo admin client server-side;
7. o template hospedado `Invite user` deve enviar `TokenHash` + `type=invite` ao `/auth/callback`;
8. o callback existente usa `verifyOtp()` para criar a sessão SSR;
9. o usuário define sua própria senha e retorna a `/bootstrap`;
10. `bootstrapOwnerAction` continua sendo o único criador do membership owner + audit.

Runbook obrigatório: `docs/operations/bootstrap-owner.md`.

## CI

O primeiro run, CI #285, revelou uma falha externa do runner: `apt-get update` ficou preso em `azure.archive.ubuntu.com` e o job de banco expirou antes de migrations/testes. A aplicação já estava verde.

A correção de CI no head final:

- evita o mirror Azure instável;
- atualiza apenas o repositório PGDG;
- usa retries/timeouts;
- continua instalando `postgresql-client-17`;
- não altera nenhuma suíte de banco.

CI #286 passou integralmente: lint, typecheck, Vitest, production build, migrations, seed, backup/restore, schema/RLS, hardening, auth/Organization isolation e todas as suítes transacionais.

`Inventory Count Integration` e `Business Transactions Integration` não foram disparados porque os `paths` versionados desses workflows não incluem Auth/bootstrap/CI; não modificar paths apenas para produzir um gate artificial.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Estado final read-only:

- 1 Organization ativa;
- 0 Auth users;
- 0 memberships ativos;
- 0 owners ativos.

Nenhum convite foi enviado. Não há nada para rollback.

## Pendência exata da Issue #65

A próxima frente não é mais desenvolvimento do convite; é **homologação operacional controlada do primeiro owner**.

Bloqueio atual: ainda não existe no contexto do projeto um e-mail explicitamente fornecido pelo operador para ser o primeiro owner. Não usar o e-mail de GitHub/Vercel/conta conectada por inferência.

Quando o operador fornecer o e-mail explicitamente:

1. revalidar `main`, #65, PRs/CI, Supabase e Vercel;
2. ler `docs/operations/bootstrap-owner.md` e os documentos AI;
3. confirmar novamente 0 owner e verificar se a identidade Auth continua ausente;
4. descobrir primeiro as ferramentas disponíveis para configuração Auth/Vercel; não afirmar indisponibilidade sem tentar o conector adequado;
5. preparar Production temporariamente:
   - `LOJASAPH_BOOTSTRAP_OWNER_EMAIL=<e-mail explícito>`;
   - `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` se necessário;
   - `SUPABASE_SECRET_KEY` server-only somente no target necessário;
   - callback canônico na Auth Redirect URL Allow List;
   - template `Invite user` com TokenHash conforme runbook;
   - confirmar capacidade de entrega;
   - somente então `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true`;
6. verificar o Production Vercel: antes deste handoff o último deployment observado ainda apontava para `a0ab92b`; se a Fase 26 não estiver publicada, executar **um único deployment Production intencional**;
7. enviar exatamente um convite pelo fluxo da aplicação;
8. o usuário precisa abrir o convite e definir a própria senha — o agente não deve conhecer essa senha;
9. após o usuário concluir a etapa do e-mail/senha, finalizar `/bootstrap` e confirmar membership owner + `membership.bootstrap_owner`;
10. testar login/RLS sem expor credenciais;
11. remover/desabilitar as envs temporárias de bootstrap;
12. confirmar bootstrap encerrado e fechar Issue #65.

Se o operador ainda não tiver fornecido o e-mail, não fazer mutação Auth/env/deploy apenas para avançar artificialmente. Manter #65 aberta e registrar a pendência.

## Vercel

- projeto: `sistema-lojasaph`;
- `vercel.json`: `git.deploymentEnabled=false`;
- nenhum deploy nesta sessão;
- não reativar deploy automático;
- deployment somente no ponto final de homologação, depois de e-mail + template + env estarem prontos.

## Não fazer

- não refazer código da Fase 26 já mergeado;
- não fechar #65 antes da homologação completa;
- não inferir e-mail do primeiro owner;
- não criar Auth user por SQL;
- não habilitar signup público;
- não criar/compartilhar senha temporária;
- não expor secret/admin key;
- não ampliar RLS/grants;
- não fazer múltiplos deploys Vercel;
- não resolver Q-001..Q-025 por inferência.
