# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 32 auditou `REQ-PLAT-006 — Logs e erros` sem refazer a Fase 17 e concluiu que o requisito vigente está atendido, com limitações operacionais explicitamente documentadas.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline de `main` no início da fase: `246f5f557ddc1b188aa482fe77070313cb0b30fc`
- branch: `agent/observability-audit`
- nova matriz/evidência: `docs/qa/observability.md`
- nenhuma nova Issue de observabilidade, porque não foi encontrado defeito concreto contra `REQ-PLAT-006`
- Issue #75 permanece aberta e bloqueada por decisões operacionais de backup
- nenhum código de aplicação, migration, RLS/grant/Auth ou dado remoto alterado
- nenhum deploy Vercel criado para esta auditoria

## REQ-PLAT-006 — auditoria da Fase 32

A Fase 17 / Issue #43 / PR #44 continua válida. O código atual mantém:

- logs JSON server-side vendor-neutral;
- `x-correlation-id` seguro e propagado pelo Proxy;
- `Instrumentation.onRequestError` para exceções do runtime Next.js;
- redaction por chave e padrões de credentials/tokens/PII;
- `error.tsx` / `global-error.tsx` sem exposição de `error.message`;
- `toPublicError()` convertendo erros internos/persistência para mensagem pública genérica;
- eventos estáveis para falhas tratadas de Auth;
- testes unitários do envelope, redaction, correlação e mensagens públicas.

A matriz detalhada está em `docs/qa/observability.md` e o runbook foi atualizado em `docs/operations/observability.md`.

## Evidência runtime real — Vercel

Projeto `sistema-lojasaph`, project id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`.

Latest Production deployment auditado:

- deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- estado `READY`;
- commit hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

Runtime Errors dos últimos sete dias localizaram um erro real histórico em deployment anterior de `/workspace`: objetos `Money`/`Quantity` cruzavam a fronteira Server → Client. A observabilidade registrou esse erro com `runtime.request.error`, `correlationId`, rota, contexto do App Router e `digest`.

Esse defeito funcional já foi corrigido pela Fase 26 e deployments posteriores estão no commit que inclui a serialização/reidratação correspondente. Na janela recente disponível do latest deployment, foram observadas respostas `200` em `/workspace` e diversos módulos, sem novo `error`/`warning` retornado para esse deployment.

Os blobs centrais de observabilidade do commit hospedado e da `main` coincidem:

- `src/lib/observability/core.ts` — SHA `2fbbf0ea31de5c46f66bb997a986823a0d002f83`;
- `src/instrumentation.ts` — SHA `efa32f5d9e947835e5bc9017b54462c7995077df`.

Portanto não foi necessário gastar quota criando deployment apenas para repetir o smoke da Fase 17.

## Retenção / alertas

A consulta Vercel de sete dias excedeu a janela de Runtime Logs do plano atual; a consulta da última hora funcionou. Assim:

- diagnóstico recente está comprovado;
- retenção histórica maior não é garantida pelo estado atual;
- `REQ-PLAT-006` não define retenção mínima, SLA/SLO, on-call ou alertas;
- nenhum Observability Plus, Drain, Sentry, Datadog, Axiom ou outro serviço foi contratado por inferência.

Esses pontos permanecem limitações operacionais e devem virar requisito/Issue somente quando houver necessidade concreta aprovada.

## Supabase atual

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL `17.6.1.141`.

Consultas read-only aos logs de API e Auth confirmaram capacidade real de diagnóstico de requests, RPCs, status e request IDs do provedor.

Os logs nativos do Supabase podem conter PII/metadados próprios do provedor; não devem ser copiados brutos para GitHub. A redaction do logger da aplicação não transforma os logs internos do Supabase.

Log Drains continuam dependentes de plano compatível (Pro/Team/Enterprise); a organização permanece Free. Nenhuma configuração remota foi alterada.

## REQ-PLAT-005 / Issue #75

A Issue #75 continua sendo o único blocker aberto do backup automático de Production. Não houve comentários/decisões novas sobre RPO, RTO, destino off-site, retenção, proteção ou alertas; portanto a frente continua bloqueada e não foi modificada nesta fase.

## Validação

Esta fase altera apenas documentação. O baseline integrado anterior foi validado pelo CI #310 com:

- lint;
- typecheck;
- Vitest;
- production build;
- migrations + seed;
- dump/checksum/restore isolado;
- suites PostgreSQL.

O PR documental da Fase 32 deve repetir o CI antes do merge. Workflows especializados de Inventory/Business não devem ser disparados por `docs/**` segundo seus filtros atuais.

## Próxima ação

Após integrar esta auditoria, avançar para `REQ-PLAT-007 — Ambientes separados`, usando a Fase 18 como baseline e sem refazê-la.

A próxima auditoria deve verificar o estado real de Development/Preview/Production, guardrails de refs, configuração Vercel por target quando acessível, `git.deploymentEnabled=false`, `/health`, ausência de backend Production em Preview e ausência de secret administrativa em não-prod salvo exceção aprovada.

## Não repetir

- não reimplementar a Fase 17;
- não abrir Issue só por não existir retenção/SLA/alerta não requerido;
- não contratar vendor/Drain/Observability Plus por inferência;
- não copiar logs brutos contendo PII para GitHub;
- não criar deployment Vercel apenas para repetir smoke já comprovado;
- não fechar #75 sem backup automático real;
- não inventar RPO/RTO, cron, retenção ou destino de backup;
- não renumerar migrations;
- não inferir Q-001..Q-025.
