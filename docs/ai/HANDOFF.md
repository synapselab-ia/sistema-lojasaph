# Handoff — Sistema Lojasaph

## Estado

A Fase 24 foi concluída, homologada e integrada na `main`.

- PR #62 — merged;
- Issue #61 — closed/completed;
- merge commit funcional: `e3eb02918f8fe95307b1728e6c2d27608cebc9d1`;
- head funcional final pré-merge: `44e47e92a3594757c08c5bd242872b3f5ecc2dbf`;
- `CI` #278 — success;
- `Inventory Count Integration` #166 — success;
- `Business Transactions Integration` #149 — success.

A próxima frente é a Issue #63 — `Fase 25 — período gerencial explícito no dashboard`.

## O que ficou pronto na Fase 24

A dimensão Setor de `REQ-DASH-002` está implementada no Dashboard:

- filtro opcional `sectorId` no summary/query/UI;
- Setores carregados pelo client autenticado e limitados pelo RLS existente;
- Unit/Setor invisível ou incompatível é rejeitado;
- Financeiro usa `payable_installment_summary.sector_id`;
- Compras, Inventários e Validades usam apenas `stock_locations.sector_id` explícito;
- Transferências consideram origem/destino separadamente e Unit + Setor precisam coincidir no mesmo endpoint;
- registros sem Setor não são classificados por inferência;
- Caixa permanece Unit-level porque `cash_registers` não possui `sector_id`, e a UI informa isso;
- horizonte, timezone, KPIs, fórmulas, links e proteção contra requests concorrentes foram preservados;
- não houve DDL nem ampliação de RLS/grants.

## Validação e Supabase

Head funcional `44e47e92a3594757c08c5bd242872b3f5ecc2dbf` passou 3/3 verde.

Estado remoto final:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- 3 Setores ativos;
- 3 locais ativos, todos com `sector_id IS NULL`;
- `payable_installment_summary.sector_id` existe;
- `cash_registers.sector_id` não existe;
- leitura de Setores continua protegida por `private.can_read_sector(...)`;
- nenhum schema/DDL foi alterado.

Smoke RLS em `BEGIN/ROLLBACK` criou apenas temporariamente um usuário `viewer` restrito ao Setor `Cozinha`. Sob `authenticated`, ele enxergou exatamente `Cozinha`, não enxergou `Quiosque`/`Empório`, e enxergou 0 locais para o Setor porque nenhum local real possui vínculo setorial. Rollback deixou zero usuário/membership sintético.

Nenhum deploy Vercel foi feito; `git.deploymentEnabled=false` permanece vigente.

## Próxima frente — Issue #63

Motivo objetivo:

`REQ-DASH-002` também exige **período**. O Dashboard atual possui `horizonDays` 7/15/30, mas isso é janela relativa de alertas, não intervalo gerencial `dateFrom/dateTo`.

A auditoria do schema confirmou datas canônicas diferentes por fonte:

- Financeiro/read model: `due_date`, `issued_at` e valores cumulativos;
- pagamentos: `payments.paid_at`;
- Caixa: `business_date`;
- Compras: `expected_delivery_date`, `ordered_at`;
- Transferências: `requested_at`, `dispatched_at`, `received_at`;
- Inventários: `started_at`, `confirmed_at`;
- Validades: `expiration_date`, `received_at`.

### Defaults da Issue #63

- período explícito é opcional; sem período, preservar comportamento atual;
- `dateFrom`/`dateTo` devem ser ISO válidas e `dateFrom <= dateTo`;
- `horizonDays` continua separado do período e não deve ser reinterpretado silenciosamente;
- usar a data de negócio própria de cada métrica, nunca `created_at` genérico por conveniência;
- Financeiro: `due_date` pode filtrar obrigações/vencimentos; não chamar `net_paid_amount` cumulativo de “pago no período” sem usar `payments.paid_at`;
- Caixa: usar `business_date`;
- Compras: `expected_delivery_date` somente para métricas de entrega; ausência permanece desconhecida;
- Validades: `expiration_date`;
- Transferências em trânsito e Inventários em andamento são snapshots atuais por padrão; não removê-los por período artificial sem semântica comprovada;
- preservar integralmente Unit + Setor da Fase 24 e Caixa sem Setor;
- preferir zero DDL; se read model novo se provar indispensável, usar migration versionada, `security_invoker=true` e grants mínimos;
- nenhum dado real.

## Próximo chat deve fazer

1. confirmar `main`, Issue #63, branch ativa, PRs e CI reais;
2. reler `AGENTS.md`, START-HERE, CURRENT_STATE, HANDOFF, NEXT_ACTION e WORKFLOW na branch ativa;
3. ler `REQ-DASH-002`, `docs/modules/dashboard.md`, summary/query/testes/UI do Dashboard e as fontes temporais Financeiro/Caixa/Compras/Estoque;
4. confirmar que hoje só existe `horizonDays`, sem `dateFrom/dateTo`;
5. inventariar a semântica temporal de cada KPI/fila antes de editar;
6. usar/criar `agent/dashboard-period-filter` a partir da `main` pós-handoff; não refazer Fase 24;
7. adicionar período opcional com validação estrita sem conflar com horizonte;
8. aplicar intervalo somente onde o campo temporal canônico é comprovado e rotular explicitamente métricas que permanecem cumulativas/current-state;
9. preservar Unit/Setor, RLS, timezone e sequência de requests;
10. cobrir boundaries inclusivos, intervalo inválido, timezone, fontes com/sem período e regressões de Unit/Setor/horizonte;
11. rodar lint, typecheck, Vitest, build e os três workflows;
12. se não houver DDL, homologar somente leitura no Supabase; se houver DDL indispensável, aplicar só após CI verde e executar advisors/smoke rollback;
13. atualizar PR/Issue e continuidade ao encerrar.

## Hardening obrigatório

- `supabase/tests/security_hardening.sql` é gate permanente;
- Dashboard continua com client autenticado normal;
- não usar service role/bypass;
- não ampliar grants/RLS para facilitar filtros;
- view pública nova, se realmente necessária, deve usar `security_invoker=true` e grant mínimo.

## Não fazer

- não reabrir Fase 24/Issue #61, Fase 23/Issue #59 ou hardening/Issue #54;
- não atribuir Setor aos locais atuais por inferência;
- não atribuir Caixa a Setor;
- não inventar uma data única para todos os módulos;
- não chamar valor cumulativo de valor “no período” sem fonte de eventos adequada;
- não apagar/mudar `horizonDays` por conveniência;
- não criar novos KPIs/gráficos sem necessidade comprovada;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não resolver Q-001..Q-025 por inferência;
- não corrigir advisors antigos fora de escopo.
