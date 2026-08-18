# ADR-007 — Contrato vendor-neutral de observabilidade

Data: 2026-08-18  
Status: aceito como decisão revisável

## Contexto

`REQ-PLAT-006` exige que erros relevantes sejam rastreáveis antes de produção. O runtime atual usa Next.js na Vercel e PostgreSQL/Auth/Data API no Supabase, mas o repositório não possuía logger estruturado, correlation ID, error boundary próprio nem política explícita de redaction.

A solução não deve acoplar o domínio a Sentry, Datadog, Axiom ou outro fornecedor e não deve contratar recursos pagos por inferência.

## Decisão

### 1. Contrato de log

Logs de aplicação server-side são emitidos em JSON de uma linha para stdout/stderr com envelope mínimo:

- `timestamp` ISO-8601;
- `service = sistema-lojasaph`;
- `level` (`debug`, `info`, `warn`, `error`);
- `event` estável;
- `correlationId`;
- `context` técnico opcional e já sanitizado;
- `error` sanitizado opcional, sem stack por padrão.

O contrato fica em `src/lib/observability/core.ts`; o sink server-side fica em `src/lib/observability/server.ts`.

### 2. Correlation ID

O Proxy aceita `x-correlation-id` somente quando respeita formato seguro e, caso contrário, gera UUID novo. O ID é propagado para a request interna e devolvido na response.

Handlers que tratam falhas sem lançar exceção reutilizam esse ID quando possível. Não é permitido derivar correlation ID de token, e-mail ou outro identificador sensível.

### 3. Erros não tratados do Next.js

`src/instrumentation.ts` usa `Instrumentation.onRequestError` para registrar exceções capturadas pelo servidor em render, Route Handlers, Server Actions e Proxy.

Não são copiados headers completos. O path registrado perde query string para não carregar tokens/parâmetros acidentais. O contexto usa apenas método, rota/tipo do boundary e metadados técnicos suportados pela versão instalada do Next.js.

### 4. UI segura

`src/app/error.tsx` e `src/app/global-error.tsx` exibem fallback estável sem mostrar `error.message`. Quando o Next fornece `digest`, ele é apresentado apenas como referência técnica.

Erros esperados continuam tratados explicitamente. `toPublicError()` preserva mensagens de `DomainError` de regra de negócio, mas converte erros de persistência/internals e erros desconhecidos para mensagem genérica.

### 5. Redaction

O logger mascara por chave e por padrão de texto, incluindo:

- Authorization/cookies;
- passwords;
- tokens/JWTs;
- API keys/secrets/service role;
- connection strings/URLs com credenciais;
- e-mail e identificadores pessoais comuns quando aparecem em contexto genérico.

Payloads financeiros completos, documentos e PII não devem ser enviados ao logger mesmo quando a redaction exista. Redaction é defesa adicional, não licença para logar dados sensíveis.

### 6. Destinos atuais

- Vercel Runtime Logs é o destino operacional imediato dos `console.*` server-side.
- Supabase Logs Explorer/API continua uma fonte separada para falhas do Postgres/Auth/API.
- Não há Log Drain configurado no Supabase porque a organização conectada está no plano Free e esse recurso exige plano compatível.
- Nenhum fornecedor externo de observabilidade é obrigatório nesta decisão.

### 7. Retenção e alertas

Retenção contratual, SLA/SLO, on-call, alertas pagos e destino de longo prazo não são definidos por esta ADR. Devem ser decididos quando houver requisitos operacionais e plano compatível.

## Consequências

- erros server-side ganham estrutura e correlação sem alterar domínio/transações;
- o runtime pode mudar de destino de logs sem reescrever chamadas de domínio;
- mensagens de infraestrutura deixam de vazar pela UI do workspace;
- erros puramente client-side continuam limitados ao fallback local quando não houver `digest`; telemetria de browser dedicada poderá ser adicionada futuramente se houver requisito/provedor aprovado;
- logs do Supabase permanecem uma trilha separada e não recebem automaticamente o `correlationId` das operações browser-side atuais.

## Validação da decisão

A fase foi validada com dados não sensíveis em preview Vercel: `GET /auth/callback` sem parâmetros gerou `auth.callback.failed`, response com `x-correlation-id` e registro JSON estruturado em Runtime Logs. Nenhum token real foi usado.

## Fontes verificadas em 2026-08-18

- Next.js 16 — `instrumentation.ts` / `onRequestError` e `error.tsx` / `global-error.tsx`.
- Vercel — Runtime Logs e Runtime Errors do projeto conectado.
- Supabase — Logs/Logs Explorer, Log Drains e changelog da Management API de logs.

Reavaliar esta ADR somente quando surgir requisito concreto de retenção, tracing, alertas, telemetria client-side ou adoção de um destino externo.