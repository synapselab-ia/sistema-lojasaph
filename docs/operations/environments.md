# Ambientes — Development, Preview e Production

Status: Fase 18 implementada e revalidada na Fase 33; bootstrap inicial deve respeitar os mesmos guardrails de isolamento.

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

A Vercel fornece `VERCEL_ENV` no servidor e `NEXT_PUBLIC_VERCEL_ENV` para frameworks quando as system/framework environment variables estão expostas ao build correspondente.

### Server-only

- `LOJASAPH_APP_ENV` — override opcional; deve coincidir com `VERCEL_ENV` quando ambos existirem;
- `SUPABASE_SECRET_KEY` — nunca client-side;
- `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN` — opt-in excepcional para admin em backend já isolado;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` — primeiro owner explicitamente autorizado;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` — Organization alvo quando necessária para eliminar ambiguidade;
- `LOJASAPH_BOOTSTRAP_INVITE_READY` — gate temporário que só deve ser `true` após verificar redirect e entrega do convite.

`LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY` existe somente para compatibilidade temporária e não deve ser usado em instalação nova.

## Regras de liberação

### Production

O runtime aceita backend hospedado e rejeita backend local. Quando `NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF` é configurada, a ref real da URL deve coincidir.

Antes de produção real, manter a ref esperada configurada para transformar troca acidental de backend em falha explícita.

Rotinas administrativas continuam exigindo `SUPABASE_SECRET_KEY` apenas server-side. A presença do secret não habilita sozinha o bootstrap.

### Preview

Para permitir acesso operacional, todos os itens abaixo precisam ser verdadeiros:

1. existir backend hospedado próprio;
2. configurar ref de Production;
3. configurar ref de Preview;
4. refs serem diferentes;
5. URL real corresponder à ref de Preview e não à Production.

Se qualquer item falhar, `supabaseAccess=blocked` e nenhum cliente Auth/Data API deve ser criado pelo Proxy/fluxos operacionais.

Não usar o projeto de Production apenas para testar Preview. Não executar bootstrap real do primeiro owner em Preview apontando para Production.

### Development

Supabase local é o default. Backend hospedado de Development exige refs Development/Production configuradas, distintas e coerentes com a URL real.

Nunca usar seed/dump com dados reais em desenvolvimento. Testes devem usar fixtures sintéticas.

## Admin client

O código não utiliza `SUPABASE_SECRET_KEY` fora de Production por padrão.

Exceção não-prod exige simultaneamente:

1. backend isolado comprovado;
2. necessidade administrativa aprovada;
3. secret somente no target necessário;
4. `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN=true`;
5. remoção da exceção após a rotina.

A flag não libera backend cuja identidade esteja bloqueada.

## Bootstrap do primeiro owner

Runbook específico: `docs/operations/bootstrap-owner.md`.

A janela de bootstrap deve ser curta e explícita. Não copiar e-mail, secret, token ou senha para Issue, log ou documentação.

## Auditoria Vercel

Quando a ferramenta disponível expuser environment variables, auditar **nomes e targets sem copiar valores** em:

- Production;
- Preview;
- Development;
- branch-specific Preview vars, se existirem.

Confirmar especialmente:

- `SUPABASE_SECRET_KEY` ausente de Preview/Development salvo exceção aprovada;
- refs coerentes com cada target;
- `NEXT_PUBLIC_APP_URL` não força callback Preview → Production;
- Preview não recebe backend de Production;
- variáveis temporárias de bootstrap não permanecem ativas.

A documentação/API atual da Vercel suporta auditoria por ambiente (`env ls`/API de project envs), mas a conexão disponível na Fase 33 não expôs a ação de listagem. Portanto targets/nomes atuais continuam **não observáveis por esta conexão**, não comprovadamente compartilhados.

## Health check seguro

`GET /health` retorna apenas:

- `status`;
- `service`;
- `environment`;
- `supabaseAccess`;
- `supabaseReason`;
- `adminAccess`.

Não retorna URL Supabase, project ref, publishable key, secret ou conteúdo de dados.

### Production observado em 2026-08-20

`https://sistema-lojasaph.vercel.app/health` respondeu:

- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

O payload não continha dados sensíveis.

### Preview sem backend isolado

O esperado e já homologado na Fase 18 é:

- `environment=preview`;
- `supabaseAccess=blocked`;
- `supabaseReason=preview_backend_unverified` ou outro reason code de mismatch;
- `adminAccess=blocked`.

Se um Preview retornar `supabaseAccess=allowed`, **não executar mutações** até comprovar que a ref corresponde a backend não-prod realmente separado.

## Homologação segura

Smoke mínimo de Preview:

1. abrir `/health`;
2. confirmar `environment=preview`;
3. confirmar `supabaseAccess=blocked` enquanto não houver backend isolado;
4. abrir `/login` e confirmar fluxo operacional bloqueado;
5. chamar `/auth/callback` sem credencial real somente quando necessário;
6. não enviar login, token, password reset, convite ou mutações;
7. conferir logs apenas por eventos não sensíveis.

Não criar deployment apenas para repetir esse smoke quando o código funcional é idêntico ao Preview já homologado.

## Estado da plataforma — revalidação 2026-08-20

### Vercel

- projeto `sistema-lojasaph`;
- latest deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`, `READY`, target Production;
- commit hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- deployments mais recentes que os Previews da Fase 18 são de Production;
- `vercel.json` mantém `git.deploymentEnabled=false`;
- Production e `main` mantêm o mesmo blob de `src/lib/runtime/environment.ts` do Preview homologado (`fc39f1a2b393815a6d1a853a23a4fbcff86614b0`).

### Supabase

Projeto do Sistema Lojasaph:

- `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- PostgreSQL `17.6.1.141`;
- região `sa-east-1`;
- zero development branches.

Organização `wopgwaqlnksvqavegljp` permanece no plano Free.

A mesma organização possui agora um segundo projeto, `easy-v2` (`hrmkkhqfyfoqucwbcszq`), com migrations próprias que não correspondem ao histórico do Lojasaph. Não há evidência de que ele seja ambiente Preview/Development do Lojasaph; **não reutilizá-lo por inferência**.

A documentação atual do Supabase recomenda desenvolvimento local e oferece Branching como ambiente isolado sem dados Production quando o recurso/plano for adotado. Não criar branch/projeto ou custo para esta auditoria sem autorização explícita.

Evidência detalhada: `docs/qa/environment-isolation.md`.

## Incidente de configuração

Se um ambiente não-prod for identificado apontando para Production:

1. não testar escrita;
2. bloquear/remover as variáveis do target não-prod;
3. verificar logs/auditoria do intervalo sem expor PII;
4. rotacionar segredo administrativo se houver evidência de exposição indevida;
5. configurar backend isolado ou manter Preview desabilitado operacionalmente;
6. registrar evidência e ação corretiva sem valores secretos.
