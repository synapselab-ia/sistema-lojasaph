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
6. confirmar que o domínio/URL pública da aplicação está correto;
7. confirmar a configuração Auth de redirect e template descrita abaixo.

Nunca inferir o e-mail do primeiro owner a partir de GitHub, Vercel, conta conectada, commit ou outro metadado.

## Variáveis temporárias server-only

No ambiente Production necessário para a inicialização:

- `SUPABASE_SECRET_KEY` — chave administrativa server-only;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` — e-mail explicitamente autorizado pelo operador;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` — opcional quando existe exatamente uma Organization ativa;
- `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true` — somente depois das verificações de template/redirect abaixo.

`NEXT_PUBLIC_APP_URL`/URL pública também precisa resolver para o domínio HTTPS canônico conforme o guardrail de ambientes.

Nenhuma senha deve ser armazenada em variável, Issue, commit, log ou documentação.

## Por que o template padrão não basta para SSR

O convite Admin do Supabase não é um fluxo PKCE. No template padrão, a confirmação pode entregar a sessão via fragmento de URL, que não chega ao servidor.

O Sistema Lojasaph já possui `/auth/callback`, que aceita `token_hash` + `type` e chama `verifyOtp()`. Para estabelecer a sessão em cookies no servidor, o template hospedado **Invite user** deve usar `TokenHash` e enviar o usuário diretamente para esse callback.

## Configuração do Supabase Auth hospedado

### Redirect URL Allow List

Na configuração de URL do Auth, incluir a URL canônica do callback da aplicação, por exemplo:

```text
https://<dominio-canonico>/auth/callback
```

Não usar wildcard mais amplo do que o necessário apenas para facilitar o bootstrap.

### Template `Invite user`

No Supabase Dashboard, em Authentication > Email Templates > Invite user, o link de aceitação deve encaminhar o `TokenHash` ao callback server-side. O formato esperado é:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite&next=%2Fauth%2Fatualizar-senha%3Fnext%3D%2Fbootstrap">
  Aceitar convite
</a>
```

A ação do Sistema Lojasaph passa `redirectTo` como a URL canônica `/auth/callback`. Assim o fluxo é:

```text
convite
  → /auth/callback?token_hash=...&type=invite&next=/auth/atualizar-senha?next=/bootstrap
  → verifyOtp(type=invite)
  → sessão SSR em cookie
  → /auth/atualizar-senha?next=/bootstrap
  → usuário define sua própria senha
  → /bootstrap
  → bootstrapOwnerAction
  → membership owner + audit
```

O parâmetro `next` é validado por `safeInternalPath`; destinos externos e URLs protocol-relative são rejeitados.

### Entrega de e-mail

Antes de marcar `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true`, confirmar que o provedor de e-mail do projeto consegue entregar ao endereço autorizado. A configuração padrão do Supabase pode impor limitações/rate limits; revalidar a documentação atual e usar SMTP apropriado quando necessário.

A flag `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY` é deliberadamente fail-closed: ela não configura o Supabase. Ela apenas registra que um operador já conferiu o template hospedado, a allowlist e a capacidade de entrega.

## Execução controlada

1. fazer a verificação remota read-only de Organization/Auth/membership/owner;
2. configurar temporariamente as variáveis server-only necessárias;
3. confirmar o template/allowlist e marcar `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true`;
4. abrir `/bootstrap` no código da Fase 26;
5. o estado deve indicar que o convite está pronto somente se:
   - não existe owner ativo;
   - não existe identidade Auth com o e-mail autorizado;
   - runtime/admin estão permitidos;
   - URL pública está validada;
   - flag do template está pronta;
6. clicar uma única vez em **Enviar convite ao owner autorizado**;
7. nenhum campo de e-mail é enviado pelo formulário; o destinatário vem apenas da env server-side;
8. o Supabase Auth Admin cria a identidade e envia o convite;
9. o usuário abre o link e define a própria senha;
10. ao retornar a `/bootstrap`, a sessão precisa corresponder exatamente ao e-mail autorizado;
11. clicar em **Criar vínculo owner inicial**;
12. somente nesse ponto `bootstrapOwnerAction` cria o membership e o audit.

## Idempotência e reenvio

A aplicação diferencia três estados Auth para o e-mail autorizado:

- `missing`: convite pode ser oferecido se todos os outros guardrails estiverem prontos;
- `pending`: já existe identidade não confirmada; o app **não reenvia automaticamente**;
- `confirmed`: a identidade já existe; o app orienta login/recuperação em vez de criar outra conta.

Se um convite pendente expirar, não criar outro usuário nem alterar membership por SQL. Revalidar ausência de owner e tratar a reemissão de forma administrativa e controlada no Supabase Auth antes de tentar novamente. Evitar loops automáticos de e-mail.

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
2. remover/desabilitar `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY`;
3. remover `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` se não houver mais necessidade operacional;
4. remover `SUPABASE_SECRET_KEY` do target se nenhuma outra rotina administrativa aprovada depender dela;
5. confirmar que `/bootstrap` aparece desabilitado/encerrado;
6. nunca habilitar signup público como substituto desse fluxo.

## Limites

Este bootstrap não é gestão geral de usuários. Convites de funcionários, troca de roles, desligamentos e Q-022 permanecem fora desta fase e exigem fluxo próprio quando priorizados.
