# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 24 foi concluída, homologada e integrada na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #62 — merged
- Issue #61 — closed/completed
- merge commit funcional: `e3eb02918f8fe95307b1728e6c2d27608cebc9d1`
- head funcional final validado pré-merge: `44e47e92a3594757c08c5bd242872b3f5ecc2dbf`
- `CI` #278 — success
- `Inventory Count Integration` #166 — success
- `Business Transactions Integration` #149 — success
- próxima Issue: #63 — `Fase 25 — período gerencial explícito no dashboard`

## Fase 24 — filtro de Setor no Dashboard

A dimensão Setor de `REQ-DASH-002` foi fechada sem fabricar granularidade para fontes que não possuem relação setorial explícita.

Implementado:

- `DashboardFilter` e a query persistente aceitam `sectorId?`;
- o Dashboard carrega Setores pelo client Supabase autenticado normal, sob RLS;
- Unit e Setor são validados contra as linhas que o próprio usuário pode enxergar;
- combinação Unit + Setor incompatível é rejeitada e a UI remove seleção incompatível ao trocar Unit;
- Financeiro usa `payable_installment_summary.sector_id` diretamente;
- Compras, Inventários e Validades só recebem Setor por `stock_locations.sector_id` explícito;
- Transferências avaliam origem e destino separadamente e exigem que Unit + Setor coincidam no mesmo endpoint;
- linhas/locais sem `sector_id` não são atribuídos por inferência;
- Caixa permanece Unit-level porque `cash_registers` não possui `sector_id`; a UI deixa essa limitação explícita;
- horizonte, timezone, KPIs, status, links e proteção contra respostas concorrentes foram preservados;
- nenhum KPI/gráfico novo foi criado;
- não houve migration, view, RPC, grant ou policy nova.

## Validação funcional

Head `44e47e92a3594757c08c5bd242872b3f5ecc2dbf` passou 3/3:

- `CI` #278 — lint, typecheck, Vitest, production build, backup/restore e todas as suítes PostgreSQL — success;
- `Inventory Count Integration` #166 — success;
- `Business Transactions Integration` #149 — success.

O gate `supabase/tests/security_hardening.sql` permaneceu verde. Não houve ciclo corretivo após abertura do PR; o primeiro head completo passou integralmente.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17.

A Fase 24 não teve DDL e não adicionou migration remota.

Baseline verificado:

- 3 Setores ativos;
- `payable_installment_summary` possui `sector_id`;
- `stock_locations` possui `sector_id`;
- os 3 locais ativos atuais possuem `sector_id IS NULL`;
- `cash_registers` não possui `sector_id`;
- `authenticated` possui SELECT nas fontes necessárias;
- a policy de leitura de Setores usa `private.can_read_sector(...)`.

Homologação RLS em `BEGIN/ROLLBACK`:

- foi criado apenas dentro da transação um usuário sintético `viewer` restrito ao Setor `Cozinha`;
- sob `role authenticated`, esse usuário enxergou exatamente 1 Setor (`Cozinha`);
- `Quiosque` e `Empório` ficaram invisíveis pelo RLS;
- a consulta de locais do Setor retornou 0 porque os locais atuais não têm vínculo setorial, comprovando que nenhum vínculo é inferido;
- Financeiro filtrado por esse Setor retornou 0 no dataset atual, sem converter ausência em dado;
- rollback deixou 0 usuário e 0 membership sintéticos;
- estado real final permaneceu com 3 Setores ativos e 0 locais ativos vinculados a Setor.

Como não houve DDL, Security/Performance Advisors não foram reexecutados por causalidade da Fase 24.

## Próxima lacuna MUST real

A Issue #63 registra a dimensão restante de `REQ-DASH-002`: **período gerencial explícito**.

Hoje:

- o Dashboard possui somente `horizonDays` (7/15/30), uma janela relativa de alertas;
- não existe `dateFrom/dateTo` gerencial explícito;
- as fontes possuem semânticas temporais diferentes e não podem receber um único campo de data por conveniência.

Campos canônicos já verificados no schema remoto:

- Financeiro/read model: `due_date`, `issued_at` e valores cumulativos;
- pagamentos: `payments.paid_at`;
- Caixa: `cash_sessions.business_date`;
- Compras: `expected_delivery_date`, `ordered_at`;
- Transferências: `requested_at`, `dispatched_at`, `received_at`;
- Inventários: `started_at`, `confirmed_at`;
- Validades: `expiration_date`, `received_at`.

A Fase 25 deve adicionar período opcional somente onde a semântica temporal é comprovada, sem chamar valores cumulativos/snapshots de “do período” indevidamente e sem quebrar Unit + Setor da Fase 24.

## Hardening vigente

A Issue #54 permanece concluída e `supabase/tests/security_hardening.sql` continua gate permanente. Objetos novos em `public` devem nascer deny-by-default; views públicas novas devem usar `security_invoker=true`; grants/RLS não devem ser ampliados apenas para facilitar Dashboard.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`. Nenhum deploy Vercel foi usado na Fase 24. CI permanece o gate principal.

## Não repetir

- não reabrir Fases 23/24, Issues #59/#61 ou hardening/Issue #54;
- não reaplicar migrations antigas;
- não atribuir Setor a `stock_locations` nulos por inferência;
- não atribuir Caixa a Setor enquanto não houver relação explícita;
- não enfraquecer RLS/grants para Dashboard;
- não transformar `horizonDays` silenciosamente em período gerencial;
- não inventar uma única data de negócio para todos os KPIs;
- não chamar `net_paid_amount` cumulativo de “pago no período” sem usar eventos de pagamento adequados;
- não criar novos KPIs/gráficos na Fase 25 sem necessidade comprovada;
- não reativar auto-deploy Vercel;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.
