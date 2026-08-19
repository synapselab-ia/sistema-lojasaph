# Next Action — Sistema Lojasaph

## Contexto

A Fase 24 / Issue #61 está concluída e mergeada na `main` pelo PR #62.

Estado funcional final comprovado:

- head validado: `44e47e92a3594757c08c5bd242872b3f5ecc2dbf`;
- `CI` #278 — success;
- `Inventory Count Integration` #166 — success;
- `Business Transactions Integration` #149 — success;
- merge commit funcional: `e3eb02918f8fe95307b1728e6c2d27608cebc9d1`.

Supabase remoto:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- nenhuma migration/DDL na Fase 24;
- 3 Setores ativos;
- os 3 locais ativos atuais têm `sector_id IS NULL`;
- RLS de Setores comprovado com smoke sintético em `BEGIN/ROLLBACK`, zero resíduo;
- Caixa continua sem relação setorial explícita.

A próxima lacuna MUST objetiva é a dimensão **período** de `REQ-DASH-002`, registrada na Issue #63 — `Fase 25 — período gerencial explícito no dashboard`.

## Fazer agora

1. Confirmar estado real da Issue #63, `main`, branch `agent/dashboard-period-filter` (se já existir), PRs e CI.
2. Se a branch ainda não existir, criá-la a partir da `main` atual; não reutilizar a branch da Fase 24.
3. Ler antes de editar:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` — `REQ-DASH-002`;
   - `docs/modules/dashboard.md`;
   - `src/modules/dashboard/application/dashboard-summary.ts` e testes;
   - `src/modules/dashboard/adapters/supabase-dashboard-query.ts` e testes;
   - `src/app/workspace/(operacao)/page.tsx`;
   - read model/tabelas/adapters relevantes de Financeiro (`payable_installment_summary`, `payments`), Caixa, Compras, Transferências, Inventários e Validades.
4. Confirmar a lacuna antes do patch:
   - o filtro atual possui `unitId?`, `sectorId?` e `horizonDays`;
   - não existe `dateFrom/dateTo` gerencial explícito;
   - `horizonDays` é janela relativa de alertas e não deve ser confundido com período.
5. Inventariar a semântica temporal de cada KPI/fila atual e registrar a decisão no módulo antes de generalizar qualquer filtro.
6. Usar somente campos temporais canônicos já comprovados:
   - Financeiro/obrigações: `due_date` quando a métrica é de vencimento/obrigação;
   - pagamentos efetivos: `payments.paid_at` se e somente se for necessário representar pagamento realizado no período;
   - Caixa: `cash_sessions.business_date`;
   - Compras/entrega: `expected_delivery_date`;
   - Validades: `inventory_batches.expiration_date`;
   - revisar `ordered_at`, `requested_at`, `dispatched_at`, `received_at`, `started_at`, `confirmed_at` apenas conforme a semântica real da métrica existente.
7. Adicionar período opcional `dateFrom`/`dateTo`:
   - aceitar ambos ausentes para preservar comportamento atual;
   - validar formato ISO `YYYY-MM-DD`;
   - exigir par completo ou definir explicitamente a política de intervalo aberto antes de implementar; preferir par completo para evitar ambiguidade;
   - exigir `dateFrom <= dateTo`;
   - boundaries inclusivos;
   - preservar timezone da Organization para datas de negócio.
8. Não transformar valores cumulativos/snapshots em valores de período por rótulo:
   - `net_paid_amount` do read model é cumulativo; não chamá-lo de “pago no período” sem eventos de `payments.paid_at`;
   - Transferências em trânsito e Inventários em andamento permanecem current-state enquanto não houver semântica temporal específica aprovada;
   - se uma métrica não obedecer ao período, a UI deve declarar isso claramente.
9. Preservar integralmente o filtro de Unit + Setor da Fase 24, inclusive:
   - Setores limitados por RLS;
   - Unit + Setor no mesmo endpoint para Transferências;
   - Caixa sem filtro de Setor.
10. Preservar `horizonDays` como conceito separado. Não removê-lo nem alterar seus cálculos silenciosamente.
11. Preferir zero DDL. Se uma fonte adicional de leitura for realmente necessária:
   - provar a lacuna física primeiro;
   - versionar migration;
   - view pública deve usar `security_invoker=true`;
   - manter grants mínimos e RLS das fontes;
   - aplicar remotamente somente depois de CI verde.
12. Atualizar testes cobrindo pelo menos:
   - intervalo válido e boundaries inclusivos;
   - datas inválidas e `dateFrom > dateTo`;
   - timezone;
   - Financeiro/obrigações;
   - Caixa por `business_date`;
   - Compras por data de entrega conhecida;
   - Validades;
   - ausência de data sem fabricação;
   - métricas current-state/cumulativas explicitamente preservadas;
   - regressões de Unit, Setor e `horizonDays`.
13. Rodar lint, typecheck, Vitest, production build e os três workflows aplicáveis.
14. Se não houver DDL, homologar no Supabase por consultas/RLS somente leitura. Se houver DDL indispensável, aplicar somente após CI verde, executar smoke sintético `BEGIN/ROLLBACK` e Security/Performance Advisors.
15. Abrir/atualizar PR, marcar ready, mergear, fechar Issue #63 e atualizar continuidade.

## Política de segurança

- `supabase/tests/security_hardening.sql` continua obrigatório;
- não ampliar grants/RLS para facilitar Dashboard;
- não usar service role no read path;
- não usar `created_at` como data de negócio genérica quando existe campo canônico;
- qualquer view pública nova deve usar `security_invoker=true` e grant mínimo.

## Política de Vercel

- `git.deploymentEnabled=false` continua vigente;
- CI é o gate principal;
- não fazer deployment rotineiro para esta fase.

## Não fazer

- não reabrir Fase 24/Issue #61;
- não reabrir Fase 23/Issue #59 ou hardening/Issue #54;
- não regredir o filtro Setor nem inferir vínculos para locais nulos;
- não atribuir Caixa a Setor;
- não substituir `horizonDays` por período sem preservar sua semântica;
- não inventar um campo temporal único para todos os módulos;
- não apresentar valores cumulativos/current-state como “do período” sem base de dados apropriada;
- não criar novos KPIs/gráficos por conveniência;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.

## Critério de conclusão da próxima fase

O Dashboard aceita um intervalo gerencial explícito e o aplica apenas segundo campos temporais canônicos e documentados. Métricas cumulativas ou de estado atual que não sejam semanticamente “do período” permanecem corretas e transparentes; `horizonDays`, Unit, Setor, timezone, RLS e isolamento continuam sem regressão.
