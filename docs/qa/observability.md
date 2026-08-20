# Auditoria de observabilidade — REQ-PLAT-006

Data: 2026-08-20  
Requisito: `REQ-PLAT-006 — Logs e erros`  
Resultado: **atendido para o requisito atual, com limitações operacionais explícitas**

## Objetivo

Revalidar a Fase 17 contra o código e os provedores reais sem reimplementar a solução nem adotar retenção, alertas ou fornecedores pagos por inferência.

`REQ-PLAT-006` exige que erros relevantes sejam rastreáveis por logs/observabilidade antes de Production. O requisito atual não define prazo mínimo de retenção, SLA/SLO, on-call ou ferramenta externa obrigatória.

## Baseline reaproveitado

A Issue #43 / PR #44 já entregaram:

- contrato vendor-neutral de logs JSON server-side;
- `x-correlation-id` propagado pelo Proxy;
- `Instrumentation.onRequestError` para exceções do runtime Next.js;
- redaction de credentials, tokens e PII comum;
- error boundaries seguros;
- mapeamento de erros internos para mensagens públicas genéricas;
- logs explícitos para falhas tratadas de Auth;
- runbook em `docs/operations/observability.md`;
- testes unitários do envelope, redaction, correlação e mensagens públicas.

A auditoria atual não alterou essas regras.

## Matriz de atendimento

| Área | Estado | Evidência atual |
| --- | --- | --- |
| Erros server-side inesperados | Atendido | `src/instrumentation.ts` registra `runtime.request.error` via `onRequestError`. |
| Estrutura de log | Atendido | `src/lib/observability/core.ts` gera envelope estável com timestamp, service, level, event, correlationId, context e error. |
| Correlação | Atendido | `src/proxy.ts` aceita ID válido ou gera UUID, propaga na request e devolve na response. |
| Redaction | Atendido | chaves sensíveis e padrões de texto são mascarados; stack não é emitida por padrão. |
| UI segura | Atendido | `error.tsx`, `global-error.tsx` e `toPublicError()` não expõem internals de persistência/erro desconhecido. |
| Auth tratado | Atendido | callback e demais fluxos relevantes emitem eventos estáveis sem logar token real. |
| Runtime Vercel pesquisável | Atendido | erros reais de `/workspace` foram localizados por Runtime Errors e continham `runtime.request.error`, correlationId e digest. |
| Supabase pesquisável | Atendido | API/Auth logs atuais foram consultados read-only e permitem investigar requests, status e request IDs do provedor. |
| Retenção de longo prazo | Não definida | a janela disponível no plano Vercel atual é curta; não existe requisito de retenção aprovado. |
| Alertas/on-call | Não definido | não exigido pelo requisito atual e não deve ser inventado. |
| Telemetria browser dedicada | Limitação conhecida | erros puramente client-side podem não chegar ao sink server-side. |
| Correlação Next → chamadas Supabase feitas no browser | Limitação conhecida | o correlationId do Next não é propagado automaticamente pelo SDK/browser para logs do Supabase. |

## Evidência real de Vercel

Projeto Vercel conectado:

- projeto `sistema-lojasaph`;
- project id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`;
- latest Production deployment auditado: `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- commit hospedado: `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- estado do deployment: `READY`.

A consulta de Runtime Errors dos últimos sete dias encontrou um erro histórico real no deployment anterior `dpl_B4sEUBkD4X8KCrS6ZqZPst7mbNRD`: objetos de domínio `Money`/`Quantity` estavam sendo enviados de Server Components para Client Components.

O ponto relevante para esta auditoria é que a observabilidade funcionou como desenhada. O erro gerou registros estruturados contendo:

- `event = runtime.request.error`;
- `correlationId`;
- método e rota;
- `routerKind` / `routeType` / `renderSource`;
- `digest` do Next;
- mensagem técnica sanitizada.

Esse defeito funcional não é uma pendência desta auditoria: deployments posteriores estão no commit `046c4a...`, cuja entrega da Fase 26 corrigiu a serialização/reidratação de `Money`/`Quantity` na fronteira Server → Client.

A consulta do latest deployment na última hora mostrou tráfego `200` em `/workspace` e módulos de Estoque, Baixas, Devoluções, Transferências, Inventários, Compras, Financeiro, Caixa, Funcionários, Fornecedores e Produtos, sem novo `error`/`warning` retornado nessa janela.

## Ausência de drift do contrato hospedado

O latest Production deployment ainda não está no head atual de `main`, porque Git deployment automático permanece desabilitado por política do projeto. Isso não exige novo deploy para esta auditoria.

Foi comparado o código de observabilidade essencial do commit hospedado `046c4a...` com `main`:

- `src/lib/observability/core.ts`: mesmo blob SHA `2fbbf0ea31de5c46f66bb997a986823a0d002f83`;
- `src/instrumentation.ts`: mesmo blob SHA `efa32f5d9e947835e5bc9017b54462c7995077df`.

Portanto a evidência runtime real é representativa do contrato de logger/captura presente na `main` para esses componentes centrais. Não foi criado deployment somente para repetir uma prova já existente.

## Retenção Vercel

Uma consulta de Runtime Logs de sete dias ao deployment atual não retornou registros e a própria API informou que a janela solicitada excede a retenção do plano, indicando Hobby com Runtime Logs de aproximadamente uma hora; a consulta restrita à última hora funcionou.

Consequência:

- diagnóstico recente continua possível e foi comprovado;
- não há garantia atual de investigação histórica por Runtime Logs além da janela do plano;
- isso deve ser reavaliado se o negócio definir retenção mínima, compliance, SLA/SLO ou necessidade de alertas;
- não contratar Observability Plus, Drain ou vendor externo apenas para eliminar essa limitação sem requisito aprovado.

## Evidência real de Supabase

Projeto `fhbvwyttikrbeaanatlr` em 2026-08-20:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL `17.6.1.141`.

Consultas read-only aos logs atuais confirmaram capacidade de diagnóstico:

- API logs mostram método, endpoint, status e timestamp para REST/RPC/Auth;
- Auth logs mostram eventos e request IDs do provedor;
- operações recentes de aplicação aparecem no histórico do provedor.

Os logs nativos do Supabase podem conter informações que o próprio provedor registra, como IP, referer, UUIDs e dados de identidade Auth. Por isso o runbook continua correto ao proibir copiar logs brutos para Issues/PRs. A política de redaction do logger da aplicação não deve ser confundida com uma transformação dos logs internos do provedor.

A documentação atual do Supabase continua tratando Log Drains como recurso de planos Pro/Team/Enterprise. A organização atual permanece Free; nenhum Drain ou serviço pago foi habilitado.

A remoção anunciada do endpoint antigo da Management API `logs.all` não exige patch: o Sistema Lojasaph não possui integração direta com esse endpoint e usa apenas capacidades vigentes do provedor para consulta operacional.

## Segurança revalidada no código

`src/lib/observability/core.ts`:

- limita texto livre;
- mascara Bearer tokens, JWTs, Supabase keys, URLs com credenciais e parâmetros sensíveis;
- mascara por chave Authorization/cookie/password/token/secret/API key/service role/database URL/e-mail/telefone/documentos comuns;
- limita profundidade/arrays e trata ciclos;
- não serializa stack por padrão.

`src/lib/observability/core.test.ts` cobre envelope, PII/credentials, secrets embutidos, correlation ID e mensagens públicas.

`src/lib/observability/public-error.ts` preserva apenas `DomainError` de regra de negócio e converte persistência/internals/erros desconhecidos para mensagem genérica.

`src/app/error.tsx` e `src/app/global-error.tsx` exibem somente fallback seguro e `digest` quando disponível, nunca `error.message`.

`src/app/auth/callback/route.ts` registra estados de falha com booleans (`hasCode`, `hasTokenHash`, `hasType`) em vez dos valores reais dos tokens e devolve o correlation ID na response.

## Conclusão

`REQ-PLAT-006` está atendido no escopo aprovado:

- erros server-side relevantes são capturáveis e pesquisáveis;
- há correlação técnica suficiente para triagem;
- UI não expõe internals;
- redaction possui testes;
- Vercel e Supabase oferecem evidência operacional real de diagnóstico;
- limitações de retenção, browser telemetry, tracing cross-provider e alertas estão explicitamente registradas sem serem confundidas com requisitos aprovados.

Não foi aberta nova Issue porque a auditoria não encontrou defeito concreto contra o requisito vigente.

## Não fazer sem novo requisito

- não contratar Sentry/Datadog/Axiom/Observability Plus/Log Drain por inferência;
- não copiar logs brutos com PII para GitHub;
- não logar headers/cookies completos;
- não adicionar payload financeiro/documentos a logs;
- não prometer retenção/SLA/SLO/on-call não aprovados;
- não fazer deploy Vercel apenas para repetir o smoke da Fase 17.
