# Handoff — Sistema Lojasaph

## Estado

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — **implementada e tecnicamente validada; PR #44 deve ser fechado corretamente**.

- Issue #43 — open até o merge;
- PR #44 — draft;
- branch: `agent/observability`;
- base: `main` em `00e2f3c72c22f571a86b15dd52edd8873c9e5fef`;
- SHA técnico verde antes dos commits documentais: `8d52a03f778c5fa5e66773fef9fe30387a62b5eb`;
- nenhuma migration/DDL da Fase 17;
- nenhum write remoto no Supabase.

## O que já está concluído

- capacidades atuais de Vercel/Supabase verificadas contra documentação oficial e conectores reais;
- logger estruturado vendor-neutral em `src/lib/observability/`;
- envelope JSON com timestamp/service/level/event/correlation/context/error;
- correlation ID propagado pelo Proxy via `x-correlation-id`;
- redaction explícita de credentials/tokens/PII comum;
- `Instrumentation.onRequestError` cobre erros server-side de render/route/action/proxy;
- query string não entra no path de erro;
- `error.tsx` e `global-error.tsx` mostram fallback sem internals;
- `toPublicError()` mantém regras de negócio seguras e esconde persistência/unknown errors;
- RuntimeWorkspaceProvider não exibe mais `Error.message` bruto;
- falhas relevantes de Auth tratadas explicitamente geram event codes;
- testes Vitest novos cobrem estrutura, redaction, correlação e error mapping;
- ADR: `docs/decisions/ADR-007-observability-contract.md`;
- runbook: `docs/operations/observability.md`.

## Validação técnica

No SHA `8d52a03f778c5fa5e66773fef9fe30387a62b5eb`:

- `CI` #213 — success;
- `Inventory Count Integration` #128 — success;
- `Business Transactions Integration` #111 — success.

O CI passou lint, typecheck, Vitest, build e todas as suítes PostgreSQL, inclusive o drill de backup/restore da Fase 16.

### Preview Vercel

Deployment validado: `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9` — `READY`.

Smoke sintético/não sensível:

1. `GET /auth/callback` sem `code`/`token_hash`;
2. aplicação redirecionou para login com mensagem segura;
3. response continha `x-correlation-id`;
4. Runtime Logs mostrou `auth.callback.failed` em `warn` com JSON estruturado;
5. nenhum token real, e-mail, cookie ou secret foi usado.

## Supabase remoto

Estado verificado:

- projeto saudável;
- PostgreSQL 17;
- organização no plano Free;
- logs consultáveis read-only;
- Log Drains não disponíveis no plano atual;
- nenhuma migration/DDL/configuração/dado alterado na Fase 17.

Não reaplicar migrations anteriores.

## Limitações intencionais

- sem Sentry/Datadog/Axiom/vendor pago por padrão;
- sem telemetria dedicada de browser;
- erros puramente client-side podem ficar somente no fallback local;
- chamadas Supabase browser-side não carregam automaticamente correlation ID do Next;
- retenção, SLA/SLO, alertas e on-call não foram inventados;
- não houve mudança de regras transacionais/RLS/RPC.

## Próxima ação exata

1. conferir o head documental atual de `agent/observability` e o PR #44;
2. confirmar `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes no SHA documental final;
3. atualizar o corpo do PR #44 com:
   - SHA final validado;
   - CI final;
   - deployment preview/smoke `auth.callback.failed`;
   - confirmação de zero alteração remota no Supabase;
   - limitações conscientes sem vendor pago;
4. marcar o PR #44 ready for review;
5. fazer merge normal em `main`;
6. confirmar Issue #43 como closed/completed; fechar explicitamente se necessário;
7. somente depois, revisar requisitos MUST/Issues reais e escolher a próxima frente;
8. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` para o estado pós-merge.

## Não fazer

- não reimplementar backup/restore;
- não adicionar vendor pago sem decisão explícita;
- não logar JWT, password, connection string, cookie ou PII desnecessária;
- não criar telemetria client-side invasiva sem requisito;
- não alterar transações/RLS/RPC para “facilitar logs”;
- não importar dados reais/cutover;
- não reaplicar migrations antigas;
- não responder Q-001 a Q-025 por inferência.