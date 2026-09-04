# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI.** Não usar SHAs documentais como estado permanente.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. documentos/ADRs da área afetada.

## Frente ativa

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva é **Fase 53 / #181 — conclusão de negócio**.

A frente principal agora é **Fase 54 / Issue #183 — empréstimos com restituição física e/ou financeira**.

A dependência técnica anterior, **Issue #187 / Fase 57 — custeio por lote/camada**, foi concluída e não é mais blocker.

## Fechamento da #187

PR #192 foi mergeado em `main` no commit `1b795bf358a417e6f3e8dbaf9e574e2b3383ad93` e fechou #187.

Validação:

- CI do PR: CI + Inventory Count Integration + Business Transactions Integration verdes;
- CI pós-merge #623 / run `33907422006`: verde;
- Production Migration Reconcile 187 / run `33907623545`: verde;
- Production `fhbvwyttikrbeaanatlr` alinhada pelas migrations:
  - `20260904101500_layer_costing_runtime`;
  - `20260904102000_layer_costing_immediate_runtime`;
  - `20260904102500_preserve_average_cost_cache_semantics`;
  - `20260904103000_negative_stock_cost_fallback`;
- dry-run posterior confirmou `Remote database is up to date`.

O reconciliador foi one-shot/fail-closed, sem seed, reset, repair ou edição direta de migration history. A branch operacional foi reposicionada para o mesmo commit de `main`, removendo o workflow temporário do tip.

## Regra de custeio que NÃO deve ser rediscutida

A regra final é **custo por lote/camada física efetivamente movimentada**.

- camada a R$ 5 movimentada → custo R$ 5/unidade;
- camada a R$ 2 movimentada → custo R$ 2/unidade;
- FEFO escolhe quando não há seleção explícita;
- lote explicitamente informado prevalece;
- perdas/vencimentos usam o lote/camada real;
- transferências e devoluções preservam custo de origem;
- `average_cost` é analítico e não reprecifica saída conhecida;
- legado sem camada = `legacy_estimate`;
- excedente de estoque negativo permitido = `negative_estimate`;
- combinação de custo rastreável/estimado pode ser `mixed_estimate`;
- fallback é explícito, auditável e visível;
- ajuste positivo sem custo explícito é bloqueado.

Autoridade: `REQ-STK-010`, `BR-STK-010`, `ADR-003-inventory-costing.md`.

## #183 — Empréstimos: contrato aprovado

Empréstimo é processo **distinto de transferência**.

Deve:

- registrar origem, contraparte/destino, item, quantidade e valor de referência;
- preservar as camadas/lotes efetivamente emprestados;
- formar valor histórico por `quantidade × custo da camada`, somando múltiplas camadas quando necessário;
- manter saldo físico pendente;
- manter saldo monetário pendente quando aplicável;
- aceitar retorno físico parcial/total;
- aceitar restituição monetária parcial/total;
- aceitar combinação das duas formas;
- ligar cada restituição ao empréstimo original;
- preservar o empréstimo original e seu histórico;
- bloquear over-return/over-settlement;
- ser concorrência-safe, transacional e idempotente;
- manter RLS/roles/escopo coerentes com Estoque;
- usar ledger de estoque somente para movimentos físicos reais;
- manter audit trail.

### Boundary financeiro

Não inventar integração automática com Caixa/Financeiro. O primeiro boundary obrigatório é registrar a liquidação monetária do empréstimo de forma auditável. Reflexos adicionais exigem regra explícita e devem evitar dupla contabilização.

### UX obrigatória

Jornada `lista → detalhe → restituir`, com saldos físico/monetário claros, histórico compreensível e ações para restituição física, financeira ou ambas. Não entregar tabela CRUD bruta como produto final.

### Testes mínimos

- mesmo item em múltiplas camadas de custos diferentes;
- empréstimo consumindo mais de uma camada e preservando valor histórico exato;
- retorno físico parcial e total;
- liquidação monetária parcial e total;
- combinação de retorno físico + monetário;
- idempotência;
- over-return/over-settlement;
- concorrência;
- Organization isolation / escopo / grants;
- audit trail;
- PostgreSQL + aplicação + CI.

## Advisors Production após #187

- nenhum erro crítico novo específico da #187;
- warnings de Security continuam apontando RPCs públicos `SECURITY DEFINER` executáveis por `authenticated` e leaked-password protection desabilitada;
- helpers internos da #187 ficam em `private` e não são executáveis por `anon`/`authenticated`;
- Performance mantém INFOs de FKs sem índice e índices não usados.

Não ampliar #183 para esses temas sem vínculo real. Abrir/usar frente própria de hardening/performance se priorizado.

## Outras decisões que NÃO devem ser perguntadas novamente

### FEFO

Aprovado: prioriza vencimento mais próximo quando não houver lote físico específico.

### Pagamento parcial/múltiplo

Não é requisito do primeiro go-live. Não remover capacidade técnica existente nem expandir por inércia.

### Consumo de funcionários — #184

É venda atribuída ao funcionário, compõe faturamento e é descontada em folha. Não é recebimento imediato em caixa e não transforma Lojasaph em folha/RH.

### PDV Legal — #185

PDV Legal permanece o PDV. Estudar importação oficial, preferencialmente Excel/CSV com staging/dry-run/idempotência enquanto não houver API/integrador oficial comprovado.

### Produto vendável / catálogo — #188

Lojasaph não vira POS, mas deve poder representar produto vendido para mapear PDV, preço/histórico, estoque, ficha técnica e margem. Preço de fornecedor, custo real do lote e preço de venda são conceitos distintos.

### Ficha técnica — #189

Está de volta ao roadmap. Deve suportar preparação, versão, rendimento e ingredientes. Ficha técnica por si só não baixa estoque automaticamente.

### Compositor modular — #190

Área inicialmente para `owner` Organization-wide; desligar módulo não apaga dados; backend deve aplicar gating; dependências explícitas; core de auth/RLS/Organization/auditoria não removível.

## Qualidade visual

“Funciona” não basta. Novas áreas exigem linguagem operacional, hierarquia visual, progressive disclosure, feedback, acessibilidade e consistência com design system da Fase 51.

## Ordem vigente

1. **#183 — empréstimos**;
2. **#185 — PDV Legal** quando houver estrutura/amostra oficial;
3. **#188 — catálogo comercial, preços e margem**;
4. **#189 — fichas técnicas/receitas**;
5. **#184 — consumo de funcionários**;
6. **#190 — compositor modular**;
7. **Q-022 — perfis/pessoas reais** antes do go-live;
8. homologação → migração/cutover → production-readiness.

#75/#121 permanecem **TOTALMENTE ON HOLD** até production-readiness.

## Estado infra/UX que não deve ser refeito

- Fase 51 UX concluída dentro da limitação tablet aceita;
- desktop/mobile possuem evidência representativa;
- tablet permanece deferido;
- Git/Production alinhados até `20260904103000`;
- não repetir migration reconciliation sem drift;
- não disparar deploy Vercel manual por rotina.

## NEXT_ACTION

### Executar #183 — empréstimos com restituição física e/ou financeira

O próximo chat deve:

1. ler governança e estado real GitHub;
2. abrir Issue #183, `REQ-STK-007`, `REQ-STK-010` e ADR-003;
3. auditar modelos/movimentos existentes para reaproveitar somente primitives adequadas, sem converter empréstimo em transferência;
4. desenhar modelo persistente de empréstimo + alocações de camada + restituições;
5. preservar custo histórico das camadas consumidas;
6. implementar commands transacionais/idempotentes e RLS/escopo;
7. implementar UX `lista → detalhe → restituir`;
8. cobrir os cenários de restituição física/monetária/combinação e múltiplos custos;
9. CI verde → PR → merge → CI pós-merge;
10. verificar paridade Production somente se houver migration mergeada para rollout e seguir o procedimento version-preserving;
11. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`.

## Guardrails

GitHub é fonte de verdade; RLS/backend são boundaries; nenhum secret; nenhuma fixture Production; nenhuma regra contábil/fiscal por inferência; nenhum deploy Vercel manual rotineiro; não retomar #75/#121 nesta fase.
