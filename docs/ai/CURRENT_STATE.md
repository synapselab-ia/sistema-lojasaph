# Current State — Sistema Lojasaph

Última atualização: 2026-09-14

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais antes de agir.** O estado documental registra contexto; não substitui GitHub nem a verificação do Supabase quando houver schema/migrations.

## Estado do produto

A frente guarda-chuva continua sendo **Fase 53 / #181 — decisões de negócio e perfis reais para conclusão**.

Concluídas e em Production:

- **#187 / Fase 57 — custeio por lote/camada física**;
- **#183 / Fase 54 — empréstimos com restituição física e/ou financeira**;
- **#190 / Fase 60 — compositor modular do sistema para owner**.

A Issue **#190 foi fechada como `completed` em 2026-09-14** após duas capabilities configuráveis de baixo risco e rollout Production completo.

## #190 — compositor modular concluído

Arquitetura: `docs/decisions/ADR-010-modular-product-composition.md`.

### Fundação

PR **#197 — `feat: iniciar compositor modular por Organization`**:

- registry estático/versionado de capabilities;
- core locked para Organization/contexto, autorização, auditoria e compositor;
- banco persiste somente override por Organization;
- alteração somente por `owner` Organization-wide;
- audit trail `organization_capability.changed`;
- primeira capability configurável `stock-loans`, default-enabled, com dependência `stock-loans -> inventory`;
- navegação resolvida a partir de registry + configuração + autorização;
- backend de criação de empréstimos bloqueia novas operações quando off;
- restituições/histórico permanecem disponíveis para não deixar obrigação sem liquidação.

Migration: `20260911153000_modular_product_composition.sql`.

PR **#198** reconciliou essa migration em Production de forma version-preserving. Run `34617253893`: **success**.

### Segunda capability e rota direta

PR **#200 — `feat: expandir compositor com estoque mínimo`** foi mergeado no commit `54e086830df37cf09de85b2622df80f90728b86e`.

Entrega:

- capability `stock-minimum`, default-enabled, dependente de `inventory`;
- `CapabilityProvider` distribui o mesmo estado resolvido server-side para superfícies client-side;
- Empréstimos off entra em modo histórico/liquidação: sem formulário de criação, com leitura, detalhe e restituição preservados;
- Estoque mínimo off desaparece da navegação, da posição de Estoque e dos cards/alertas correspondentes do Dashboard;
- rota direta de Estoque mínimo produz estado coerente de módulo desativado;
- RLS de `stock_minimum_policies` bloqueia SELECT/INSERT/UPDATE quando a capability está off;
- nenhuma policy é apagada: reativar recupera a configuração anterior;
- resolver interno `private.is_capability_enabled(...)` continua sem EXECUTE para `authenticated`; policy usa wrapper membership-safe dedicado;
- testes unitários e PostgreSQL cobrem default, disable, autorização, isolamento, audit, backend/RLS gate, preservação e reativação.

CI do PR #200:

- CI geral: success;
- Stock Loans Integration: success;
- Inventory Count Integration: success;
- Business Transactions Integration: success.

Migration: `20260914120000_stock_minimum_composition.sql`.

PR **#201 — `ops: reconciliar estoque mínimo modular em Production`** foi mergeado no commit `8473582e65266c2272a184be44bd306a98d2dd95`.

Evidência Production:

- drift pré-rollout: exatamente `20260914120000_stock_minimum_composition.sql`;
- `Production Migration Reconcile 190 Stock Minimum` run `34841150576`: **success**;
- CI pós-rollout #650 / run `34841150555`: **success**;
- histórico remoto confirmado até `20260914120000 / stock_minimum_composition`;
- constraint de capability aceita `stock-loans` e `stock-minimum`;
- policies RLS de `stock_minimum_policies` incluem `private.can_use_capability(..., 'stock-minimum')` + os escopos de estoque existentes;
- `authenticated`: sem EXECUTE em `private.is_capability_enabled(...)`, com EXECUTE apenas no wrapper RLS necessário; `anon` sem EXECUTE no wrapper;
- 0 overrides reais de `stock-minimum`; a Organization existente resolve a capability como ativa por default;
- 0 policies reais de estoque mínimo em Production no momento da verificação, portanto nenhuma configuração real foi alterada pelo rollout.

### Advisors pós-DDL

Security Advisor:

- mantém warning geral para RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`; o padrão é intencional apenas quando o RPC valida identidade/escopo no corpo;
- leaked-password protection continua finding independente da #190.

Performance Advisor:

- mantém INFOs históricos de FKs sem índice e índices sem uso observado;
- `organization_capability_settings.updated_by_user_id` continua INFO de FK sem índice; não há consulta operacional por esse campo que justifique migration apenas para silenciar o linter.

Nenhum advisor introduziu regressão bloqueante específica da segunda fatia.

## Situação após #190

O guardrail da Fase 60 exigia provar o padrão com 1–2 capabilities antes de abrir uma matriz ampla. Foram entregues exatamente duas:

- `stock-loans`;
- `stock-minimum`.

Expandir Compras, Financeiro, Caixa, Cadastros ou outras áreas deve ocorrer apenas em Issues futuras, com mapeamento real de dependências e gates equivalentes. **Não reabrir #190 por inércia para adicionar toggles.**

## Frentes abertas condicionadas

- **#185 — PDV Legal:** ON HOLD até existir amostra real anonimizada, estrutura oficial de colunas ou documentação/contrato oficial suficiente.
- **#188 — catálogo comercial, preços e margem:** ON HOLD por #185.
- **#189 — fichas técnicas/receitas:** ON HOLD por #185/#188.
- **#184 — consumo de funcionários:** ON HOLD até definir origem do lançamento, granularidade e estorno; a fonte real se relaciona com #185.
- **#75/#121 / REQ-PLAT-005:** TOTALMENTE ON HOLD até production-readiness ou nova decisão explícita.
- **Q-022:** ainda pendente antes de usuários reais de go-live; requer mapeamento de pessoas/cargos reais às capacidades técnicas existentes e não deve ser inferido pelo código.

## Estado executável da fila

Neste momento **não há nova implementação segura desbloqueada sem insumo externo ou decisão do operador**. A próxima ação deve seguir `docs/ai/NEXT_ACTION.md` e esperar um dos gatilhos documentados, em vez de fabricar trabalho técnico.

## Regras que não devem ser rediscutidas

- custeio físico segue `REQ-STK-010`, `BR-STK-010` e `ADR-003-inventory-costing.md`;
- FEFO é default quando não há seleção explícita; lote explícito prevalece;
- histórico econômico não é reprecificado por `average_cost`;
- módulo desabilitado nunca apaga histórico;
- frontend não é boundary de segurança;
- module gating complementa RLS/autorização, nunca substitui;
- nenhum deploy Vercel manual deve ser disparado por rotina documental/smoke.

## NEXT_ACTION

Seguir `docs/ai/NEXT_ACTION.md`. Não existe terceira fatia automática da #190.