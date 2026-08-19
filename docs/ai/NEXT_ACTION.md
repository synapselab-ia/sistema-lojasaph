# Next Action — Sistema Lojasaph

## Contexto

A Fase 23 / Issue #59 está concluída e mergeada na `main` pelo PR #60.

Estado funcional final comprovado:

- head validado: `608541980cc5264d17cbb847c13919d805699518`;
- `CI` #273 — success;
- `Inventory Count Integration` #165 — success;
- `Business Transactions Integration` #148 — success;
- merge commit funcional: `bdfc450c1095bd42e814fa1fee50dfcaad51a37e`.

Supabase remoto:

- projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17;
- `stock_withdrawal_sector` — `20260819184424`;
- nova retirada exige Setor explícito e autorizado;
- assinatura legada sem Setor foi removida;
- `stock_movements.sector_id` permanece nullable globalmente;
- 0 retiradas reais antes/depois da migration;
- smoke sintético validado em rollback com zero resíduo;
- `security_hardening.sql` permaneceu verde e o remoto continua 45/45 tabelas `public` com RLS.

A próxima lacuna MUST objetiva é a dimensão Setor de `REQ-DASH-002`, registrada na Issue #61 — `Fase 24 — filtro de Setor no dashboard gerencial`.

## Fazer agora

1. Confirmar estado real da Issue #61, `main`, branch `agent/dashboard-sector-filter` (se já existir), PRs e CI.
2. Se a branch ainda não existir, criá-la a partir da `main` atual; não reutilizar a branch da Fase 23.
3. Ler antes de editar:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` — `REQ-DASH-002`;
   - `docs/modules/dashboard.md`;
   - `src/modules/dashboard/application/dashboard-summary.ts`;
   - testes do resumo do Dashboard;
   - `src/modules/dashboard/adapters/supabase-dashboard-query.ts`;
   - testes do adapter/query quando existentes;
   - a rota/componente persistente que renderiza `/workspace` e seus filtros.
4. Confirmar a lacuna antes do patch:
   - `DashboardFilter` possui `today`, `horizonDays`, `unitId?`, mas não `sectorId`;
   - `SupabaseDashboardQuery.load(...)` recebe `unitId?` + `horizonDays`, sem Setor;
   - a UI/documentação oferece Unidade + horizonte;
   - a Fase 23 deixou filtro de Dashboard por Setor fora de escopo.
5. Confirmar a matriz real de granularidade antes de filtrar:
   - `payable_installment_summary` expõe `sector_id`;
   - `stock_locations` possui `sector_id`;
   - `cash_registers` não possui `sector_id`;
   - verificar no código as relações usadas por Compras, Transferências, Inventários e Validades; não deduzir Setor onde a FK explícita não existir.
6. Adicionar `sectorId?` ao filtro e disponibilizar Setores autorizados pela mesma leitura autenticada/RLS usada pelo Dashboard.
7. Manter Unit + Setor coerentes:
   - se ambos forem selecionados, o Setor deve pertencer à Unit selecionada;
   - impedir/rejeitar combinação incompatível;
   - nunca ampliar a consulta silenciosamente.
8. Aplicar filtro setorial somente às fontes com vínculo explícito:
   - Financeiro: usar `sector_id` do read model existente;
   - Compras/Inventários/Validades: usar Setor do `stock_location` quando explicitamente presente;
   - Transferências: definir e documentar semântica baseada apenas em origem/destino explicitamente vinculados;
   - Caixa: manter Unit-level enquanto não houver `sector_id`; a interface deve deixar claro que esse bloco não foi filtrado por Setor, em vez de simular granularidade inexistente.
9. Não criar KPI/gráfico novo e não mudar fórmulas/status já homologados.
10. Preservar timezone da Organization, `horizonDays`, filtro por Unit, links da fila de atenção e tratamento de respostas concorrentes.
11. Cobrir por testes pelo menos:
    - Setor autorizado filtra dados setoriais corretamente;
    - Unit + Setor coerentes funcionam;
    - combinação incompatível é rejeitada/impedida;
    - Setor de outra Organization/fora do RLS não é utilizável;
    - registros sem vínculo setorial não são atribuídos artificialmente;
    - Caixa não é apresentado como setorial;
    - filtro por Unit e horizonte existentes continuam sem regressão.
12. Preferir zero DDL: as fontes atuais já possuem relações suficientes para iniciar. Criar migration/view somente se uma lacuna física real for comprovada durante a implementação.
13. Manter RLS/grants atuais; Dashboard continua usando client autenticado normal, sem service role.
14. Rodar lint, typecheck, Vitest, production build e os workflows aplicáveis.
15. Se não houver DDL, homologar no Supabase somente por consultas/read-only com usuário/escopo sintético quando necessário. Se houver DDL, aplicar somente após CI verde e usar smoke `BEGIN/ROLLBACK`.
16. Rodar Security/Performance Advisors somente se houver DDL; corrigir apenas problema novo causado pela Fase 24.
17. Abrir/atualizar PR, marcar ready, mergear, fechar Issue #61 e atualizar continuidade.

## Política de segurança

- `supabase/tests/security_hardening.sql` continua obrigatório;
- não ampliar grants/RLS para facilitar Dashboard;
- não usar service role no read path do Dashboard;
- não fabricar relacionamento Setor para fonte que só possui Unit;
- qualquer view pública nova deve usar `security_invoker=true`, RLS das fontes e grant mínimo para `authenticated`.

## Política de Vercel

- `git.deploymentEnabled=false` continua vigente;
- CI é o gate principal;
- não fazer deployment rotineiro para esta fase.

## Não fazer

- não reabrir Fase 23/Issue #59;
- não reabrir Fase 22/Issue #57 ou hardening/Issue #54;
- não alterar novamente a retirada sem regressão comprovada;
- não atribuir Caixa a Setor por inferência;
- não criar novos KPIs/gráficos;
- não resolver nesta fase toda a semântica de período arbitrário de `REQ-DASH-002`;
- não redefinir roles/perfis reais/Q-022;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.

## Critério de conclusão da próxima fase

O Dashboard deve aceitar um Setor autorizado como filtro e aplicar esse escopo somente às fontes/KPIs com relação setorial explícita, mantendo transparentes os blocos que continuam Unit-level. Unit + Setor não podem formar escopo inconsistente; filtros atuais, cálculos, RLS e isolamento entre Organizations/Setores devem permanecer corretos.
