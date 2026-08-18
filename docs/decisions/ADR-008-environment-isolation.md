# ADR-008 — Isolamento de ambientes e backends

Status: **aceito tecnicamente; homologação do Preview final pendente por limite externo da Vercel**  
Data: 2026-08-18

## Contexto

`REQ-PLAT-007` exige que Development/Preview e Production não compartilhem inadvertidamente dados ou segredos.

No início da Fase 18, o estado verificável era:

- Vercel com ambientes de Preview/Production e suporte a variáveis escopadas por ambiente;
- um único projeto Supabase conectado, PostgreSQL 17;
- organização Supabase no plano Free;
- zero branches Supabase;
- nenhuma política versionada que provasse separação de backend/segredos;
- o conector Vercel disponível ao agente não expunha a listagem segura de targets/valores das environment variables.

A ausência de auditoria não prova que Preview usava Production. Ela significa somente que o isolamento não estava comprovado e, portanto, não podia ser tratado como seguro.

## Decisão

Adotar política **fail-closed**, independente do provedor, em `src/lib/runtime/environment.ts`.

### Identidade de ambiente

O servidor resolve `development`, `preview` ou `production` por:

1. `LOJASAPH_APP_ENV`, quando explicitamente configurada;
2. `VERCEL_ENV`, quando hospedado na Vercel;
3. `NODE_ENV=development|test` somente para execução local/testes.

Se `LOJASAPH_APP_ENV` e `VERCEL_ENV` divergirem, a identidade torna-se `unknown` e acesso operacional é bloqueado.

O browser usa `NEXT_PUBLIC_VERCEL_ENV` e apenas variáveis `NEXT_PUBLIC_*`; não recebe secrets server-side.

### Production

- pode continuar usando o projeto hospedado atual;
- URL local é rejeitada em Production;
- `NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF` pode fixar a identidade esperada do projeto e bloquear mismatch;
- admin client pode existir apenas com `SUPABASE_SECRET_KEY` server-only.

### Preview

Preview hospedado **não recebe acesso Supabase por padrão**.

Para liberar um backend Preview são necessários simultaneamente:

- `NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF`;
- `NEXT_PUBLIC_LOJASAPH_PREVIEW_SUPABASE_REF`;
- URL Supabase cujo project ref corresponda ao Preview;
- refs de Preview e Production obrigatoriamente diferentes.

Ausência ou inconsistência bloqueia a criação do cliente antes de qualquer chamada de Auth/Data API.

Enquanto não houver backend hospedado isolado aprovado, Preview permanece útil para build/UI/health, mas login, recuperação, callback, workspace e mutações ficam desabilitados.

### Development

- Supabase local (`localhost`, loopback ou `host.docker.internal`) é aceito por padrão;
- backend remoto só é aceito quando Development e Production possuem refs explicitamente distintas;
- fixtures fora de Production devem ser sintéticas.

### Credencial administrativa

`SUPABASE_SECRET_KEY` permanece server-only.

Fora de Production, o admin client é bloqueado mesmo se o secret tiver sido configurado acidentalmente. Exceção exige:

- backend já validado como isolado;
- `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN=true` explicitamente configurado;
- necessidade administrativa específica e aprovada.

A flag não transforma um backend não isolado em permitido.

### URLs e callbacks

- Preview usa `VERCEL_URL` do próprio deployment para callbacks;
- Production usa `NEXT_PUBLIC_APP_URL` HTTPS ou `VERCEL_PROJECT_PRODUCTION_URL`;
- Development usa somente URL local;
- configuração ambígua não reutiliza silenciosamente URL de Production em Preview.

## Implementação

- `src/lib/runtime/environment.ts`: política pura/testável;
- `src/lib/runtime/server.ts`: acesso a `process.env`, admin secret e app URL;
- `src/lib/supabase/env.ts`: facade marcada `server-only`;
- `src/lib/supabase/browser.ts`: configuração injetada ou política client-side restrita a variáveis públicas;
- Proxy ignora Supabase quando acesso está bloqueado, permitindo render seguro sem sessão;
- Auth/bootstrap/workspace aplicam bloqueio antes de operações remotas;
- `/health` expõe somente ambiente, estado permitido/bloqueado e reason codes não sensíveis.

## Consequências

### Positivas

- Preview não consegue usar silenciosamente o backend hospedado configurado sem prova de isolamento;
- segredo administrativo não é necessário nem utilizado por Preview/Development por padrão;
- isolamento pode evoluir para outro projeto/branch/provedor sem alterar domínio;
- a política é verificável por testes e independe de nomes frágeis de branch Git.

### Custos/limitações

- sem projeto/branch isolado, Preview não possui login nem dados persistentes;
- habilitar Preview operacional futuramente exige provisionar backend próprio e configurar refs públicas coerentes;
- auditoria dos targets das env vars no dashboard/CLI Vercel continua uma tarefa operacional quando houver acesso apropriado;
- Branching Supabase não é ativado automaticamente e deve ser reavaliado contra plano/custo vigente antes de qualquer contratação.

## Não decidido

Este ADR não aprova:

- upgrade de plano Supabase;
- criação de projeto Supabase adicional pago;
- cópia/sanitização de dados reais para não-produção;
- SLA/SLO, retenção ou política comercial de ambientes.
