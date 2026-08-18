# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #44 — merged
- Issue #43 — closed/completed
- merge commit: `5dce4b75b76380b4d668debd399bdca079f6b3dd`
- SHA final pré-merge: `87c9a4e209eeb4a146d96cfaa26696fa8d159ca0`
- próxima Issue: #45 — `Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos`
- nenhuma branch funcional da Fase 18 foi criada ainda.

## Fase 17 — concluído

A entrega cobre `REQ-PLAT-006` no escopo atual e reforça `REQ-SEC-004`:

- contrato vendor-neutral de log estruturado em JSON;
- níveis `debug`, `info`, `warn`, `error` e event codes estáveis;
- `x-correlation-id` validado/gerado no Proxy e devolvido na response;
- redaction por chave e padrão de texto para credentials, tokens, JWT, cookies, senha, API keys, connection strings e PII comum;
- `src/instrumentation.ts` com `Instrumentation.onRequestError` para exceções server-side do Next;
- query string removida do path registrado;
- `error.tsx` e `global-error.tsx` com fallback seguro e `digest` como referência quando disponível;
- `toPublicError()` impede exposição de persistência/internals/unknown errors na UI;
- workspace deixou de devolver `Error.message` bruto;
- falhas relevantes de Auth tratadas sem exceção emitem eventos estruturados;
- testes Vitest de envelope, redaction, correlation ID e error mapping;
- ADR `docs/decisions/ADR-007-observability-contract.md`;
- runbook `docs/operations/observability.md`.

## CI final da Fase 17

No SHA `87c9a4e209eeb4a146d96cfaa26696fa8d159ca0` passaram:

- `CI` #219 — success;
- `Inventory Count Integration` #134 — success;
- `Business Transactions Integration` #117 — success.

O CI validou lint, typecheck, Vitest, build, migrations/seed, drill de backup/restore e todas as suítes PostgreSQL existentes.

## Homologação Vercel da Fase 17

Preview técnico validado: `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9` — `READY`.

Smoke sintético executado em `/auth/callback` sem `code`/`token_hash` real:

- UI exibiu somente mensagem segura;
- response trouxe `x-correlation-id`;
- Runtime Logs registrou `auth.callback.failed` em JSON estruturado;
- nenhum token real, e-mail, cookie, secret ou dado de cliente foi usado.

O preview do SHA documental final também ficou Ready antes do merge.

## Supabase remoto

A Fase 17 fez somente consultas read-only de logs.

- projeto conectado saudável;
- PostgreSQL 17;
- organização no plano Free;
- nenhuma migration, DDL, configuração ou write da Fase 17;
- Log Drains não foram configurados;
- não reaplicar migrations antigas.

## Próxima frente — Issue #45

Após o fechamento formal da Fase 17, os requisitos MUST e Issues reais foram revistos. Não havia outra Issue aberta.

A próxima lacuna executável é `REQ-PLAT-007 — Ambientes separados`.

Evidência atual:

- Vercel já possui Preview e Production;
- Preview da Fase 17 conseguiu inicializar o runtime Supabase, portanto existe configuração Supabase disponível em Preview;
- a conta Supabase conectada possui somente um projeto;
- `list_branches` retorna zero branches;
- a organização está no plano Free e a capacidade atual de Supabase Branching/preview environments exige plano compatível pago;
- busca no repositório não encontrou política/runbook que prove isolamento de dados/segredos entre Development, Preview e Production.

Isso **não prova vazamento ou compartilhamento indevido já ocorrido**. Significa que o isolamento obrigatório ainda não está demonstrado nem protegido por guardrails versionados.

A Issue #45 deve primeiro auditar targets/escopos de configuração sem revelar valores, definir uma estratégia sem custo automático e implementar fail-closed para impedir Preview/Development de operar inadvertidamente com credenciais/dados privilegiados de Production.

## Não repetir

- não reimplementar observabilidade da Fase 17;
- não reabrir backup/restore da Fase 16;
- não executar restore destrutivo no Supabase ativo;
- não reaplicar migrations antigas;
- não importar dados reais/cutover;
- não inferir Q-001 a Q-025;
- não contratar/ativar Supabase Pro/Branching ou outro recurso pago sem decisão explícita;
- não copiar dados reais de Production para Preview/Development.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: iniciar a Issue #45 em branch própria a partir da `main`, verificar primeiro a configuração real de ambientes Vercel/Supabase sem expor secrets e implementar somente a fundação de isolamento prevista na Issue.