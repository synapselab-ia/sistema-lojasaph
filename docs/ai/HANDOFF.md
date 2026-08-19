# Handoff — Sistema Lojasaph

## Estado

A Fase 23 foi concluída, homologada e integrada na `main`.

- PR #60 — merged;
- Issue #59 — closed/completed;
- merge commit funcional: `bdfc450c1095bd42e814fa1fee50dfcaad51a37e`;
- head funcional final pré-merge: `608541980cc5264d17cbb847c13919d805699518`;
- `CI` #273 — success;
- `Inventory Count Integration` #165 — success;
- `Business Transactions Integration` #148 — success.

A próxima frente é a Issue #61 — `Fase 24 — filtro de Setor no dashboard gerencial`.

## O que ficou pronto na Fase 23

`REQ-STK-004` está atendido pela retirada persistente com Setor explícito:

- `sectorId` obrigatório no RPC, gateway, provider e UI;
- Setor ativo da mesma Organization e autorizado por `private.has_sector_role`;
- local de origem continua validado por `private.has_stock_location_role`;
- `stock_movements.sector_id` persistido somente na retirada, sem `NOT NULL` global;
- `sector_id` incluído no audit e na comparação de idempotência;
- retry idêntico permanece retry-safe; Setor divergente com mesma chave conflita;
- assinaturas legadas sem Setor removidas da superfície pública e privada;
- implementação privada continua não executável por `authenticated`;
- nenhuma inferência/default de Setor e nenhum backfill histórico;
- FEFO, lote preferido, saldo, custo médio, estoque negativo, locks e rollback continuam no núcleo compartilhado `private.record_stock_outflow`;
- regressões de withdrawal/return/loss/transfer/inventory permaneceram verdes.

## Validação e Supabase

Head funcional `608541980cc5264d17cbb847c13919d805699518` passou 3/3 verde.

Migration remota:

- `stock_withdrawal_sector` — `20260819184424`.

Estado remoto final da Fase 23:

- projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17;
- 0 retiradas reais antes/depois da migration;
- `stock_movements.sector_id` continua nullable;
- assinatura antiga sem Setor ausente;
- nova assinatura setorial presente;
- `authenticated` executa somente o wrapper público necessário;
- `anon` não executa a nova RPC e a implementação privada não é executável por `authenticated`;
- smoke sintético em `BEGIN/ROLLBACK` comprovou Setor/responsável/audit, idempotência, conflitos e escopo, com zero resíduo;
- hardening remoto continuou com 45/45 tabelas `public` usando RLS;
- advisors pós-DDL não exigiram correção causal nesta fase.

Nenhum deploy Vercel foi feito; `git.deploymentEnabled=false` permanece vigente.

## Próxima frente — Issue #61

Motivo objetivo:

`REQ-DASH-002` é MUST e pede filtros gerenciais por escopos relevantes como Unidade/Setor. O Dashboard persistente atual só modela `unitId?` + `horizonDays`.

Evidência verificada:

- `DashboardFilter` não possui `sectorId`;
- `SupabaseDashboardQuery.load(...)` não recebe Setor;
- `docs/modules/dashboard.md` documenta somente Unidade + horizonte;
- `payable_installment_summary` já expõe `sector_id`;
- `stock_locations` já possui `sector_id`;
- `cash_registers` não possui `sector_id`;
- o Supabase remoto possui 3 Setores ativos no dataset atual;
- a Fase 23 marcou filtros de Dashboard por Setor como fora de escopo.

### Defaults da Issue #61

- adicionar filtro opcional de Setor sem criar KPI novo;
- Setores da UI devem vir da leitura autenticada/RLS, nunca de lista hardcoded;
- Unit + Setor devem permanecer coerentes quando ambos selecionados;
- Financeiro pode usar o `sector_id` explícito do read model atual;
- Compras, Inventários e Validades só podem ser filtrados por Setor quando o `stock_location` possui vínculo setorial explícito;
- Transferências devem usar somente vínculos explícitos de origem/destino; documentar a semântica exata antes de implementar;
- Caixa permanece Unit-level enquanto `cash_registers` não possuir Setor; não apresentar KPI de Caixa como setorial se ele não foi filtrado;
- preservar horizonte e filtro por Unit atuais;
- não reinterpretar toda a semântica de período de `REQ-DASH-002` nesta fase;
- evitar migration se as fontes atuais forem suficientes; se DDL se provar necessário, versionar e aplicar somente após CI verde;
- nenhum dado real e nenhuma inferência de escopo.

## Próximo chat deve fazer

1. confirmar `main`, Issue #61, branch ativa, PRs e CI reais;
2. reler `AGENTS.md`, START-HERE, CURRENT_STATE, HANDOFF, NEXT_ACTION e WORKFLOW na branch ativa;
3. ler `REQ-DASH-002`, `docs/modules/dashboard.md`, `dashboard-summary.ts`, `supabase-dashboard-query.ts`, testes do Dashboard e a UI `/workspace` correspondente;
4. confirmar em código/schema quais fontes possuem associação explícita com Setor e quais não possuem;
5. usar a branch `agent/dashboard-sector-filter` criada a partir da `main` pós-handoff; não refazer Fase 23;
6. adicionar `sectorId?` ao contrato de filtro e carregar somente Setores visíveis ao usuário autenticado;
7. implementar filtragem apenas onde a relação setorial é comprovada, sem inferência por Unit/nome/usuário;
8. preservar/explicitar métricas que continuarem sem granularidade setorial, especialmente Caixa;
9. impedir combinação Unit/Setor inconsistente e garantir isolamento cross-Sector/cross-Organization;
10. manter timezone, horizonte, KPIs e links existentes sem mudança semântica desnecessária;
11. adicionar testes de resumo/query/UI para Setor, Unit+Setor e fontes sem Setor;
12. rodar lint, typecheck, Vitest, build e os três workflows aplicáveis;
13. se não houver DDL, fazer homologação Supabase somente leitura; se houver DDL comprovadamente necessário, aplicar apenas após CI verde e usar smoke rollback;
14. rodar advisors apenas se houver DDL e corrigir somente regressão causal;
15. atualizar PR/Issue e continuidade ao encerrar.

## Hardening obrigatório

- `supabase/tests/security_hardening.sql` continua gate permanente;
- não ampliar grants/RLS para facilitar consulta de Dashboard;
- Dashboard usa client autenticado normal, sem service role/bypass;
- qualquer view nova deve preservar `security_invoker=true` e grants mínimos;
- preferir fontes/read models existentes se suficientes.

## Não fazer

- não reabrir Fase 23/Issue #59, Fase 22/Issue #57 ou hardening/Issue #54;
- não alterar `record_stock_withdrawal` novamente sem regressão comprovada;
- não inventar Setor para Caixa ou fonte sem relação explícita;
- não criar novos KPIs/gráficos na Fase 24;
- não redefinir roles/memberships/Q-022;
- não implementar intervalo de datas arbitrário junto com esta fase sem requisito adicional comprovado;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não resolver Q-001..Q-025 por inferência;
- não corrigir advisors antigos fora de escopo.
