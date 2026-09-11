# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI antes de executar qualquer etapa.** Depois conferir o estado do Supabase quando a ação envolver migrations/schema.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. ADRs/documentos da área afetada.

## Frente ativa

A frente ativa continua sendo **Fase 60 / Issue #190 — compositor modular do sistema para owner**, dentro da Fase 53 / #181.

#187 (custeio por camada/lote) e #183 (empréstimos) já estão concluídas. #190 permanece aberta porque o rollout deve avançar por poucas capabilities de cada vez.

## Primeira fatia da #190 — concluída

PR **#197 — `feat: iniciar compositor modular por Organization`** foi mergeado em `main` no commit `954192c7b2cc4af7a9cad530679ef38dcdac4a2c`.

Contrato implementado:

- registry estático/versionado;
- resolver de defaults, overrides e dependências;
- `organization_capability_settings` guarda somente override por Organization;
- `set_organization_capability(...)` é mutation RPC owner-only e auditável;
- `stock-loans -> inventory` é a primeira dependência operacional explícita;
- `inventory` permanece ativo/não configurável nesta etapa;
- `stock-loans` é configurável e default-enabled;
- `record_stock_loan(...)` é o gate autoritativo para impedir novos empréstimos quando off;
- restituição de empréstimos existentes continua permitida deliberadamente;
- shell/navegação consomem estado resolvido e removem Empréstimos quando off;
- `Administração -> Montar sistema` aparece apenas para owner Organization-wide;
- histórico/tabelas/audit permanecem intactos durante desativação.

A regressão de RLS encontrada no primeiro CI (`private.has_org_role(..., NULL)`) foi corrigida antes do merge usando `private.is_org_member(...)`.

## Production — rollout concluído

Migration: `20260911153000_modular_product_composition.sql`.

PR **#198 — `ops: reconciliar compositor modular em Production`** foi mergeado em `main` no commit `4823d58e4d6b1859da13b54daf85e5ed3dfaf379`.

Evidência:

- `Production Migration Reconcile 190` run `34617253893`: **success**;
- CI pós-merge #644 / run `34617253823`: **success**;
- migration history remoto termina em `20260911153000 / modular_product_composition`;
- dry-run pós-push confirmou remoto up to date;
- nenhum seed/reset/repair/DDL ad hoc foi usado;
- `organization_capability_settings`: RLS ativa, SELECT para `authenticated`, sem INSERT/UPDATE/DELETE direto;
- policy de leitura: `private.is_org_member(organization_id)`;
- `set_organization_capability(...)`: EXECUTE apenas para `authenticated` entre os papéis públicos verificados, guard Organization-wide `owner` no corpo;
- `record_stock_loan(...)`: gate `private.is_capability_enabled(...)` presente e `anon` sem EXECUTE;
- 0 overrides reais em Production; a Organization existente resolve `stock-loans` como ativa por default.

Advisors pós-DDL:

- Security: warning geral esperado para RPCs públicas `SECURITY DEFINER`; o novo RPC segue o padrão intencional já auditado, com auth + autorização explícita e sem EXECUTE para `anon`;
- Performance: INFO novo de FK sem índice em `organization_capability_settings.updated_by_user_id`; não há caminho operacional por esse campo nem cardinalidade que demonstre gargalo nesta fase, portanto não abrir migration apenas para silenciar INFO. Reavaliar com uso real.

O workflow `Production Migration Reconcile 190` é one-shot e deve estar **removido** após o PR de fechamento operacional. Se ele aparecer novamente na `main`, verificar antes de qualquer execução; não reutilizar automaticamente.

## Próxima fatia da #190

A próxima ação é **implementação**, não outro rollout/reconcile da primeira fatia.

### 1. Rota direta quando capability está off

Limite conhecido atual: `/workspace/emprestimos` pode ser digitada diretamente mesmo com `stock-loans` desativado. O backend continua seguro e recusa novos empréstimos, mas a UX fica incoerente.

Próximo chat deve:

- inspecionar a rota/layout server-side de Empréstimos e o ponto onde o contexto de capabilities já é carregado;
- reutilizar o resolver existente;
- produzir estado de produto coerente para capability desativada (redirect ou superfície informativa, conforme o padrão real do workspace), sem retornar `403` como se fosse falha de autorização se o usuário continua autorizado ao módulo historicamente;
- preservar leitura/histórico conforme ADR-010 e não bloquear restituições existentes;
- cobrir navegação + rota direta + backend em testes.

### 2. Auditar segunda capability de baixo risco

Candidato preferencial: **Estoque mínimo**.

Antes de criar toggle, mapear:

- `docs/modules/stock-minimum.md`;
- tabela `stock_minimum_policies`, RLS, grants e audit;
- UI de `/workspace/estoque`;
- sinal correspondente no Dashboard;
- adapters/repositories/actions que criam/atualizam policies;
- dependência real de `inventory` e qualquer outra capability;
- comportamento de histórico/configuração ao desabilitar e reativar.

Só torná-lo configurável se o mapa confirmar isolamento/dependências simples. Se não confirmar, documentar por que e escolher outro candidato com base em boundaries reais.

Não abrir Compras/Financeiro/Caixa/Cadastros em massa nesta etapa.

## Frentes ON HOLD

- #185 PDV Legal: aguarda amostra/estrutura oficial/documentação suficiente;
- #188: depende de #185;
- #189: depende de #185/#188;
- #184: aguarda definição real de origem/granularidade/estorno;
- #75/#121: TOTALMENTE ON HOLD até production-readiness;
- Q-022 segue necessário antes de usuários reais de go-live.

## Guardrails

GitHub é fonte de verdade; Supabase/schema/RLS/grants são hard boundaries; module gating não substitui autorização; nenhum secret; nenhuma fixture Production; nenhuma regra contábil/fiscal por inferência; nenhuma identidade pessoal hardcoded; nenhum deploy Vercel manual rotineiro; não repetir reconciliation sem drift comprovado.
