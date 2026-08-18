# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — **implementada e tecnicamente validada; aguardando gate documental/merge do PR #44**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #43 — open até o merge
- PR #44 — draft
- branch: `agent/observability`
- base da branch: `main` em `00e2f3c72c22f571a86b15dd52edd8873c9e5fef`
- SHA técnico validado: `8d52a03f778c5fa5e66773fef9fe30387a62b5eb`
- nenhuma migration/DDL da Fase 17 foi necessária.

## Fase 17 — implementado

A entrega cobre `REQ-PLAT-006` no escopo atual e reforça `REQ-SEC-004`:

- contrato vendor-neutral de log estruturado em JSON;
- níveis `debug`, `info`, `warn`, `error`;
- event codes estáveis;
- `x-correlation-id` validado/gerado no Proxy e devolvido na response;
- redaction por chave e por padrão de texto para tokens, JWT, cookies, senha, API keys, connection strings e PII comum;
- `src/instrumentation.ts` com `Instrumentation.onRequestError` para exceções server-side do Next;
- query string removida de paths registrados;
- `error.tsx` e `global-error.tsx` com fallback seguro e `digest` como referência quando disponível;
- `toPublicError()` impede exposição de mensagens de persistência/erros desconhecidos na UI;
- workspace deixou de devolver `Error.message` bruto ao usuário;
- eventos explícitos para falhas relevantes de Auth tratadas sem exceção;
- testes Vitest de envelope, níveis, redaction, correlation ID e error mapping;
- `ADR-007-observability-contract.md` e `docs/operations/observability.md`.

## Capacidades atuais verificadas

### Vercel

O projeto conectado expõe Runtime Logs e Runtime Errors, com filtros por deployment/ambiente/nível/status/origem/texto/request ID.

Antes da implementação não havia runtime errors/logs de aplicação nas últimas 24h.

O preview da Fase 17 foi validado no deployment `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9`, estado `READY`.

Smoke seguro executado em `/auth/callback` sem parâmetros reais:

- resposta exibiu mensagem genérica de autenticação inválida/expirada;
- response trouxe `x-correlation-id`;
- Runtime Logs registrou `auth.callback.failed` em JSON estruturado;
- nenhum token real, e-mail, cookie ou secret foi usado.

### Supabase

Projeto conectado permanece saudável, PostgreSQL 17, organização no plano Free.

A Fase 17 usou apenas consulta read-only de logs. Nenhuma migration, DDL, dado ou configuração remota foi alterada.

Log Drains não foram configurados porque a documentação atual exige plano Pro/Team/Enterprise. Logs Explorer/API permanecem fonte de diagnóstico separada para Postgres/Auth/Data API.

## CI técnico da Fase 17

No SHA `8d52a03f778c5fa5e66773fef9fe30387a62b5eb` passaram:

- `CI` #213 — success;
- `Inventory Count Integration` #128 — success;
- `Business Transactions Integration` #111 — success.

O CI cobriu lint, typecheck, Vitest, build, backup/restore efêmero e todas as suítes PostgreSQL existentes.

Duas incompatibilidades foram detectadas e corrigidas antes desse gate:

1. a documentação corrente do Next expõe `renderType`, mas os tipos instalados em `next@16.2.12` não; o logger usa somente campos suportados localmente;
2. o type guard de `Headers | Record` foi tornado explícito após o build da Vercel detectar narrowing insuficiente.

## Limites conscientes

- não existe vendor dedicado de browser error tracking nesta fase;
- erro puramente client-side pode não aparecer em Runtime Logs sem contraparte server-side;
- chamadas Supabase diretas do browser não recebem automaticamente o correlation ID do Next;
- retenção, SLA/SLO, alertas e on-call permanecem pendentes;
- nenhum fornecedor pago foi adotado por inferência;
- nenhum fluxo transacional, RLS ou RPC homologado foi alterado.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: exigir os três workflows verdes no SHA documental final da branch, atualizar o PR #44, marcar ready e fazer merge normal. Confirmar Issue #43 como closed/completed e somente então revisar requisitos MUST/Issues reais para a próxima frente.