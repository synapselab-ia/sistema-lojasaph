# Handoff — Sistema Lojasaph

## Estado

A Fase 32 auditou `REQ-PLAT-006 — Logs e erros` sem refazer a Fase 17 e não encontrou gap funcional novo contra o requisito vigente.

Frente desta fase:

- branch `agent/observability-audit`;
- baseline inicial de `main`: `246f5f557ddc1b188aa482fe77070313cb0b30fc`;
- matriz/evidência: `docs/qa/observability.md`;
- runbook atualizado: `docs/operations/observability.md`;
- nenhuma nova Issue de observabilidade;
- Issue #75 de backup permanece aberta/bloqueada;
- nenhum DDL/DML remoto;
- nenhuma alteração de Auth/RLS/grants/dados;
- nenhum deploy Vercel criado.

## Fase 17 — o que continua válido

A Issue #43 / PR #44 já entregaram e não devem ser reimplementadas:

- logger JSON server-side vendor-neutral;
- correlation ID via `x-correlation-id`;
- `Instrumentation.onRequestError`;
- redaction de secrets/tokens/PII comum;
- error boundaries seguros;
- `toPublicError()` para impedir vazamento de internals;
- eventos estáveis para falhas tratadas de Auth;
- testes unitários;
- ADR-007 e runbook operacional.

## Evidência atual de Vercel

Projeto `sistema-lojasaph`, id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`.

Latest Production deployment auditado:

- `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- `READY`;
- commit hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

Runtime Errors encontrou falhas históricas reais de `/workspace` no deployment anterior `dpl_B4sEUBkD4X8KCrS6ZqZPst7mbNRD`, causadas por `Money`/`Quantity` não serializados na fronteira Server → Client.

A observabilidade capturou corretamente essas exceções com:

- `event=runtime.request.error`;
- `correlationId`;
- método/rota;
- contexto do App Router;
- `digest`;
- mensagem técnica sanitizada.

Esse erro funcional já foi corrigido na Fase 26. A janela recente do latest deployment apresentou respostas `200` em `/workspace` e módulos operacionais sem novo `error`/`warning` retornado para esse deployment.

O Production deployment está atrás do head atual da `main` por política deliberada de deploy manual. Para o contrato central de observabilidade não existe drift entre o commit hospedado e a `main`:

- `core.ts`: blob SHA `2fbbf0ea31de5c46f66bb997a986823a0d002f83` em ambos;
- `instrumentation.ts`: blob SHA `efa32f5d9e947835e5bc9017b54462c7995077df` em ambos.

Não gastar quota criando deployment apenas para repetir esse smoke.

## Retenção Vercel

Consulta de Runtime Logs de sete dias excedeu a retenção disponível do plano atual; a consulta da última hora funcionou.

Consequência:

- rastreabilidade recente existe e foi comprovada;
- investigação histórica de longo prazo não é garantida;
- retenção mínima, SLA/SLO, alerta e on-call não existem como requisito aprovado;
- não criar Issue nem contratar Observability Plus/vendor externo só para preencher esses itens por inferência.

Se futuramente surgir requisito de retenção/compliance/alertas, abrir frente específica preservando ADR-007 e redaction.

## Evidência atual de Supabase

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- `sa-east-1`;
- PostgreSQL `17.6.1.141`.

Logs de API/Auth foram consultados somente por leitura e comprovam diagnóstico atual de requests, RPCs, status e request IDs.

Atenção: logs nativos do provedor podem conter IP, referer, UUIDs e identidade Auth. Não copiar conteúdo bruto para Issues/PRs. O logger da aplicação continua mais restritivo e sanitizado.

Log Drains continuam dependentes de plano compatível; organização Free. Nenhuma configuração foi alterada.

## Issue #75 — backup

A Issue #75 continua aberta, sem comentários ou decisões novas de RPO/RTO/destino/retenção/proteção/alerta. Portanto permanece bloqueada por decisão operacional e não deve ser fechada nem receber cron/storage inventados.

## Validação

O baseline integrado anterior passou no CI #310 com lint, typecheck, Vitest, production build, migrations, seed, backup/checksum/restore e suites PostgreSQL.

Esta Fase 32 altera somente documentação. Antes do merge, o PR deve passar pelo CI normal. Os workflows especializados de Inventory/Business não devem disparar para `docs/**` conforme seus filtros atuais.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Conferir `main`, Issue #75, PRs, branches e CI reais.
3. Se #75 ainda não tiver decisões operacionais novas, mantê-la bloqueada e não editar backup.
4. Auditar `REQ-PLAT-007 — Ambientes separados` usando a Fase 18 / Issue #45 / PR #46 como baseline, sem refazê-la.
5. Ler `ADR-008-environment-isolation.md`, `docs/operations/environments.md`, código de `src/lib/runtime/`, Proxy/Auth/workspace, `/health`, testes e `vercel.json`.
6. Verificar Vercel por target sem copiar valores secretos: escopos de env vars quando disponíveis, Git deployment policy, Production/Preview e qualquer evidência de backend compartilhado.
7. Verificar Supabase atual e branches/projetos adicionais somente por leitura; não criar ambiente pago sem autorização.
8. Tratar configuração não observável como não comprovada, nunca como automaticamente segura ou insegura.
9. Se a configuração/código satisfizerem PLAT-007, documentar sem Issue artificial. Se houver gap concreto, uma única Issue + branch/fix mínimo.
10. Não criar deployment Vercel apenas para auditoria e não reativar auto-deploy.
11. Atualizar continuidade ao final.

## Não fazer

- não reimplementar Fase 17;
- não copiar logs brutos com PII;
- não contratar observabilidade paga por inferência;
- não inventar retenção/SLA/alerta;
- não fechar #75 sem automação real;
- não inventar política de backup;
- não criar backend Supabase pago sem autorização;
- não reativar bootstrap/auto-deploy;
- não renumerar migrations;
- não inferir Q-001..Q-025.
