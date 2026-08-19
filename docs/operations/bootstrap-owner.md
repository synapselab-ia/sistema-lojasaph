# Bootstrap seguro do primeiro owner

Status: runbook da Fase 26 para inicializar a primeira identidade Auth + membership owner sem signup público.

## Objetivo

Criar o primeiro acesso administrativo ao Workspace persistente sem:

- habilitar cadastro público;
- definir senha conhecida pelo operador/agente;
- inserir diretamente em `auth.users`;
- aceitar um destinatário arbitrário vindo do browser;
- duplicar a regra de criação de `organization_memberships`.

A identidade nasce pelo Supabase Auth Admin. O membership `owner` continua sendo criado somente pelo `bootstrapOwnerAction`, que também registra `membership.bootstrap_owner` em `audit_logs`.

## Pré-condições

Antes de habilitar qualquer convite real:

1. confirmar que o target é o backend Production aprovado;
2. confirmar que existe exatamente a Organization pretendida, ou configurar explicitamente `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID`;
3. confirmar que não existe owner ativo;
4. receber do operador o e-mail exato que será autorizado;
5. manter signup público ausente;
6. confirmar o domínio HTTPS canônico da aplicação;
7. confirmar a Auth Redirect URL Allow List e a capacidade real de entrega do e-mail.

Nunca inferir o e-mail do primeiro owner a partir de GitHub, Vercel, conta conectada, commit ou outro metadado.

## Variáveis temporárias server-only

No ambiente Production necessário para a inicialização:

- `SUPABASE_SECRET_KEY` — chave administrativa server-only;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` — e-mail explicitamente autorizado pelo operador;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` — opcional quando existe exatamente uma Organization ativa;
- `LOJASAPH_BOOTSTRAP_INVITE_READY=true` — somente depois das verificações de redirect e entrega descritas abaixo.

`NEXT_PUBLIC_APP_URL`/URL pública também precisa resolver para o domínio HTTPS canônico conforme o guardrail de ambientes.

Nenhuma senha deve ser armazenada em variável, Issue, commit, log ou documentação.

`LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY` é aceito apenas como compatibilidade temporária com o primeiro patch da Fase 26. Instalações novas devem usar `LOJASAPH_BOOTSTRAP_INVITE_READY`.

## Fluxo hospedado padrão — default

Convites enviados por `auth.admin.inviteUserByEmail()` usam o fluxo implícito do Supabase Auth, não PKCE. Depois que o Supabase valida o link do e-mail, o redirect para a aplicação recebe a sessão no fragmento do navegador (`#access_token=...&refresh_token=...&type=invite`). Fragmentos não são enviados ao servidor HTTP.

O Sistema Lojasaph suporta esse fluxo sem expor a escolha do destinatário:

```text
inviteUserByEmail(e-mail server-only)
  → Supabase valida o link do e-mail
  → /auth/invite#access_token=...&refresh_token=...&type=invite
  → browser remove o fragmento imediatamente da URL
  → POST same-origin /auth/invite/session
  → servidor valida access token + e-mail autorizado
  → servidor estabelece a sessão SSR em cookie
  → /auth/atualizar-senha?next=/bootstrap
  → usuário define sua própria senha
  → /bootstrap
  → bootstrapOwnerAction
  → membership owner + audit
```

Guardrails do handoff implícito:

- `/auth/invite` aceita somente `type=invite` com access + refresh token completos;
- o fragmento é removido do endereço do navegador antes da chamada ao servidor;
- o POST exige `Origin` exatamente igual ao origin da aplicação;
- o servidor valida o access token contra o Supabase antes de persistir sessão;
- o usuário validado precisa ter exatamente o e-mail configurado server-side para bootstrap;
- resposta é `no-store` e nenhum token é devolvido;
- nenhuma etapa cria membership até o usuário autenticado executar `bootstrapOwnerAction`.

## Por que o template customizado não é requisito

Na homologação de 2026-08-19, o projeto hospedado estava no plano Free e havia sido criado em 2026-07-06. A documentação vigente do Supabase informa que novos projetos Free usando o SMTP padrão não podem customizar Auth Email Templates. Por isso o fluxo operacional padrão do Sistema Lojasaph **não depende de template customizado**.

Se futuramente houver SMTP customizado ou plano que permita editar templates, o fluxo já existente de `/auth/callback` com `TokenHash` + `verifyOtp()` continua válido para callbacks SSR. Não substituir o fluxo padrão por template customizado apenas para concluir este bootstrap.

## Auth Redirect URL Allow List

Antes do convite real, incluir exatamente o redirect canônico usado pelo fluxo padrão:

```text
https://<dominio-canonico>/auth/invite
```

Evitar wildcard amplo apenas para facilitar o bootstrap.

O código passa essa URL em `redirectTo` para `inviteUserByEmail`. Se a URL não estiver autorizada no Supabase Auth, o provedor pode cair no Site URL e o convite não chegará ao fluxo correto.

## Entrega de e-mail

O SMTP padrão do Supabase é limitado e, conforme a documentação vigente, só entrega mensagens Auth a endereços previamente autorizados como membros da Supabase Organization. Também possui rate limit baixo.

Antes de `LOJASAPH_BOOTSTRAP_INVITE_READY=true`:

1. confirmar que o e-mail explicitamente autorizado está apto a receber pelo SMTP atual; ou
2. configurar SMTP próprio antes do convite, se necessário.

Não fazer tentativas repetidas para descobrir capacidade de entrega: cada tentativa pode criar uma identidade `pending` e consumir rate limit.

## Execução controlada

1. fazer a verificação remota read-only de Organization/Auth/membership/owner;
2. configurar temporariamente as variáveis server-only necessárias em Production;
3. confirmar `/auth/invite` na Redirect URL Allow List;
4. confirmar capacidade de entrega do e-mail autorizado;
5. somente então definir `LOJASAPH_BOOTSTRAP_INVITE_READY=true`;
6. publicar uma única vez a versão da Fase 26 se Production ainda estiver antiga;
7. abrir `/bootstrap`;
8. o estado deve indicar que o convite está pronto somente se:
   - não existe owner ativo;
   - não existe identidade Auth com o e-mail autorizado;
   - runtime/admin estão permitidos;
   - URL pública está validada;
   - readiness está habilitado;
9. clicar uma única vez em **Enviar convite ao owner autorizado**;
10. nenhum campo de e-mail é enviado pelo formulário; o destinatário vem apenas da env server-side;
11. o Supabase Auth Admin cria a identidade e envia o convite;
12. o usuário abre o link e define a própria senha;
13. ao retornar a `/bootstrap`, a sessão precisa corresponder exatamente ao e-mail autorizado;
14. clicar em **Criar vínculo owner inicial**;
15. somente nesse ponto `bootstrapOwnerAction` cria o membership e o audit.

## Idempotência e reenvio

A aplicação diferencia três estados Auth para o e-mail autorizado:

- `missing`: convite pode ser oferecido se todos os outros guardrails estiverem prontos;
- `pending`: já existe identidade não confirmada; o app **não reenvia automaticamente**;
- `confirmed`: a identidade já existe; o app orienta login/recuperação em vez de criar outra conta.

Se um convite pendente expirar, não criar outro usuário nem alterar membership por SQL. Revalidar ausência de owner e tratar a reemissão de forma administrativa e controlada. Evitar loops automáticos de e-mail.

## Verificação pós-bootstrap

Confirmar, sem expor PII além do necessário:

- existe exatamente o owner esperado na Organization;
- o membership está `active`;
- existe `audit_logs.action = 'membership.bootstrap_owner'` para o membership criado;
- login normal funciona com a credencial definida pelo próprio usuário;
- RLS continua limitando o Workspace conforme memberships/escopos;
- nenhum secret, token ou senha foi registrado em logs/GitHub.

## Encerramento obrigatório

Após a primeira inicialização:

1. remover/desabilitar `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
2. remover/desabilitar `LOJASAPH_BOOTSTRAP_INVITE_READY` e a compatibilidade antiga, se presente;
3. remover `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` se não houver mais necessidade operacional;
4. remover `SUPABASE_SECRET_KEY` do target se nenhuma outra rotina administrativa aprovada depender dela;
5. confirmar que `/bootstrap` aparece desabilitado/encerrado;
6. nunca habilitar signup público como substituto desse fluxo.

## Limites

Este bootstrap não é gestão geral de usuários. Convites de funcionários, troca de roles, desligamentos e Q-022 permanecem fora desta fase e exigem fluxo próprio quando priorizados.
