# Ambientes — Development, Preview e Production

Status: Fase 18 implementada tecnicamente; smoke do head final na Vercel pendente por build rate limit.

## Objetivo

Evitar que ambientes não-prod operem inadvertidamente sobre dados ou credenciais privilegiadas de Production.

## Matriz

| Ambiente | Backend padrão | Dados | Admin secret | Callback/App URL |
| --- | --- | --- | --- | --- |
| Development | Supabase/Postgres local | somente fixtures sintéticas | bloqueado por padrão | localhost |
| Preview | nenhum backend operacional até isolamento comprovado | nenhum dado real | bloqueado por padrão | `VERCEL_URL` do deployment |
| Production | projeto Supabase hospedado aprovado | dados operacionais | server-only quando necessário | domínio HTTPS canônico |

## Variáveis

### Públicas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF`
- `NEXT_PUBLIC_LOJASAPH_PREVIEW_SUPABASE_REF`
- `NEXT_PUBLIC_LOJASAPH_DEVELOPMENT_SUPABASE_REF`
- `NEXT_PUBLIC_APP_URL`

Project ref não é secret: ela já é observável na URL pública do Supabase. As refs são usadas apenas como identidade/guardrail.

### Server-only

- `LOJASAPH_APP_ENV` — override opcional; deve coincidir com `VERCEL_ENV` quando ambos existirem;
- `SUPABASE_SECRET_KEY` — nunca client-side;
- `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN` — opt-in excepcional para admin em backend já isolado;
- variáveis de bootstrap existentes.

## Regras de liberação

### Production

O runtime aceita backend hospedado. Quando `NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF` é configurada, a ref real da URL deve coincidir.

Recomendação antes de produção real: fixar a ref esperada para transformar troca acidental de backend em falha explícita.

### Preview

Para permitir acesso operacional:

1. existir backend hospedado próprio;
2. configurar ref de Production;
3. configurar ref de Preview;
4. refs serem diferentes;
5. URL real corresponder à ref de Preview.

Se qualquer item falhar, `supabaseAccess=blocked` e nenhum cliente Auth/Data API deve ser criado pelo Proxy/fluxos operacionais.

Não usar o projeto de Production apenas para “testar o Preview”.

### Development

Supabase local é o default. Backend hospedado de Development exige refs de Development/Production configuradas e distintas.

Nunca usar seed/dump com dados reais para desenvolvimento.

## Admin client

O código não utiliza `SUPABASE_SECRET_KEY` fora de Production por padrão.

Para uma exceção não-prod:

1. comprovar backend isolado;
2. comprovar necessidade administrativa;
3. configurar o secret somente no target necessário;
4. configurar `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN=true`;
5. remover a exceção após a rotina.

A flag não libera backend cuja identidade esteja bloqueada.

## Auditoria Vercel

Quando acesso de CLI/dashboard às environment variables estiver disponível, auditar **nomes e targets sem copiar valores para issues/docs/logs**:

- Production;
- Preview;
- Development;
- branch-specific Preview vars, se existirem.

Confirmar especialmente:

- `SUPABASE_SECRET_KEY` ausente de Preview/Development salvo exceção aprovada;
- refs coerentes com cada target;
- `NEXT_PUBLIC_APP_URL` não força callback de Preview para Production;
- Preview não recebe backend de Production.

O conector disponível durante a Fase 18 não expunha essa listagem; portanto o estado prévio foi tratado como **não comprovado**, não como comprovadamente compartilhado.

## Health check seguro

`GET /health` retorna apenas:

- `status`;
- `service`;
- `environment`;
- `supabaseAccess`;
- `supabaseReason`;
- `adminAccess`.

Não retorna URL Supabase, project ref, publishable key, secret ou conteúdo de dados.

### Preview sem backend isolado

O esperado é:

- `environment=preview`;
- `supabaseAccess=blocked`;
- reason code de backend Preview não comprovado/incompatível;
- `adminAccess=blocked`.

Se um Preview retornar `supabaseAccess=allowed`, **não executar mutações** até comprovar que a ref corresponde a backend não-prod realmente separado.

## Homologação segura

Smoke mínimo do Preview final:

1. abrir `/health`;
2. confirmar ambiente `preview`;
3. confirmar `supabaseAccess=blocked` enquanto não houver backend isolado;
4. abrir `/login` e confirmar formulário operacional desabilitado + aviso de isolamento;
5. chamar `/auth/callback` sem credencial real e confirmar redirecionamento seguro;
6. não enviar login, token, password reset ou mutações;
7. conferir Runtime Logs apenas por eventos não sensíveis, quando necessário.

## Estado da plataforma em 2026-08-18

- Supabase conectado: um projeto saudável, PostgreSQL 17, organização Free e zero branches;
- nenhum branch/projeto adicional foi criado na Fase 18;
- a documentação vigente do Supabase deve ser reconsultada antes de Branching porque disponibilidade/custo dependem do plano;
- Vercel suportava escopo Production/Preview/Development e variáveis branch-specific;
- o head técnico ficou 3/3 verde no GitHub;
- Vercel bloqueou deployments posteriores por build rate limit, portanto o smoke do head final deve ser repetido antes do merge/fechamento da Issue #45.

## Incidente de configuração

Se um ambiente não-prod for identificado apontando para Production:

1. não testar escrita;
2. bloquear/remover as variáveis do target não-prod;
3. verificar logs/auditoria por atividade no intervalo relevante sem expor PII;
4. rotacionar segredo administrativo se houver evidência de exposição indevida;
5. configurar backend isolado ou manter Preview desabilitado operacionalmente;
6. registrar evidência e ação corretiva no GitHub sem incluir valores secretos.
