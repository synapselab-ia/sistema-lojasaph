# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI antes de executar qualquer etapa.** Depois conferir Supabase quando a ação envolver migrations/schema.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. ADRs/documentos da área afetada.

## Frente atual

A frente guarda-chuva segue sendo **Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**.

A **Fase 60 / Issue #190 — compositor modular do sistema para owner** está concluída e foi fechada como `completed` em 2026-09-14.

Também já estão concluídas #187 (custeio por camada/lote) e #183 (empréstimos).

## #190 — estado final

Arquitetura: `docs/decisions/ADR-010-modular-product-composition.md`.

### PR #197 — fundação

Implementou:

- registry estático/versionado;
- resolver de defaults, overrides e dependências;
- `organization_capability_settings` guarda somente override por Organization;
- mutation `set_organization_capability(...)` owner-only e auditável;
- core de Organization/contexto, autorização, auditoria e compositor locked;
- `stock-loans -> inventory` como primeira dependência operacional;
- `stock-loans` configurável/default-enabled;
- navegação resolvida por capability;
- backend bloqueando novos empréstimos quando off;
- restituição/histórico preservados.

Migration Production: `20260911153000_modular_product_composition.sql`.

PR #198 reconciliou a migration. Run `34617253893`: success.

### PR #200 — segunda capability

Merge: `54e086830df37cf09de85b2622df80f90728b86e`.

Implementou:

- `stock-minimum -> inventory`, configurável/default-enabled;
- estado resolvido compartilhado com UI client-side via `CapabilityProvider`;
- Empréstimos desativado em modo histórico/liquidação, sem criação nova;
- rota direta de Estoque mínimo coerente quando off;
- remoção do sinal de Estoque mínimo na navegação, posição de Estoque e Dashboard quando off;
- RLS gate de `stock_minimum_policies` para SELECT/INSERT/UPDATE;
- preservação física das policies durante desativação e restauração automática ao reativar;
- wrapper RLS membership-safe sem ampliar EXECUTE do resolver interno;
- regressões unitárias e PostgreSQL do ciclo completo.

Todos os workflows do PR #200 ficaram verdes: CI, Stock Loans Integration, Inventory Count Integration e Business Transactions Integration.

### PR #201 — rollout Production da segunda capability

Merge: `8473582e65266c2272a184be44bd306a98d2dd95`.

Migration: `20260914120000_stock_minimum_composition.sql`.

Evidência:

- drift remoto pré-rollout: exatamente uma migration pendente;
- reconciliador fail-closed/version-preserving;
- `Production Migration Reconcile 190 Stock Minimum` run `34841150576`: success;
- CI pós-merge #650 / run `34841150555`: success;
- histórico remoto confirmado até `20260914120000 / stock_minimum_composition`;
- constraint de capability contém `stock-loans` e `stock-minimum`;
- policies de Estoque mínimo usam capability gate + escopos de estoque existentes;
- `authenticated` continua sem EXECUTE em `private.is_capability_enabled(...)`;
- wrapper RLS necessário é executável por `authenticated` e não por `anon`;
- 0 overrides de `stock-minimum`; default ativo confirmado;
- 0 policies reais de Estoque mínimo no momento da verificação;
- advisors executados sem regressão bloqueante específica desta fatia.

O workflow one-shot `production-migration-reconcile-190-stock-minimum.yml` deve permanecer removido após o closeout. Não reutilizar reconciliadores antigos sem drift comprovado.

## Por que #190 está fechada

O guardrail da própria Issue exigia começar por 1–2 capabilities de baixo risco. Foram entregues exatamente duas, com registry, dependency graph, UX, navegação/dashboard, backend/RLS, audit, preservação de histórico e reativação comprovados.

Expandir o compositor para Compras/Financeiro/Caixa/Cadastros é evolução futura, não condição pendente da Fase 60.

## Fila restante

Nenhuma implementação nova está desbloqueada com segurança sem input externo ou nova decisão:

- #185 PDV Legal: aguarda amostra anonimizada, estrutura de colunas ou documentação/contrato oficial suficiente;
- #188 depende de #185;
- #189 depende de #185/#188;
- #184 aguarda origem/granularidade/estorno e se relaciona com a fonte real de vendas;
- Q-022 exige mapeamento de pessoas/cargos reais antes de usuários reais de go-live;
- #75/#121 permanecem TOTALMENTE ON HOLD até production-readiness ou nova decisão explícita.

## Próximo gatilho

Seguir `docs/ai/NEXT_ACTION.md`. O próximo chat não deve inventar uma terceira capability nem reabrir #190. Deve primeiro verificar se algum dos gatilhos acima recebeu novo insumo.

## Guardrails

GitHub é fonte de verdade; Supabase/schema/RLS/grants são hard boundaries; module gating não substitui autorização; nenhum secret; nenhuma fixture Production; nenhuma regra contábil/fiscal por inferência; nenhuma identidade pessoal hardcoded; nenhum deploy Vercel manual rotineiro; nenhuma reconciliation sem drift comprovado.