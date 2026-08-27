# Handoff — Sistema Lojasaph

## Fase concluída nesta frente

**Fase 47 / Issue #132 — estoque mínimo por local e alertas de reposição (`REQ-STK-011`) está implementada, testada e homologada em Production.**

PR de integração: #133.

Não refazer a Fase 47 sem bug/regressão concreta.

## O que foi entregue

Persistência:

- `public.stock_minimum_policies` por Organization + item + local;
- `minimum_quantity numeric(18,3)` não negativo;
- uma política por item/local;
- ativação/inativação sem DELETE no fluxo normal;
- `inventory_balances` permanece a projeção autoritativa de saldo.

Autorização/auditoria:

- RLS por visibilidade real de `stock_location`;
- leitura por `private.can_read_stock_location(...)`;
- manutenção por `private.has_stock_location_role(...)` para `owner/admin/manager/inventory`;
- `anon` sem acesso;
- `authenticated` sem DELETE;
- trigger privada registra create/update em `audit_logs`.

Aplicação:

- manutenção do mínimo em `/workspace/estoque` via client Supabase autenticado + RLS;
- domínio usa `Quantity`, sem float como fonte de verdade;
- `below_minimum` é estritamente `quantity_on_hand < minimum_quantity`;
- igualdade não alerta;
- ausência de policy não alerta;
- saldo ausente não é inferido como zero;
- Dashboard mostra pendência acionável respeitando escopo Unit/Sector/local;
- nenhuma compra automática ou previsão foi criada.

## Evidência CI

Head validado: `ae6dcafab306cb99ed3a57ab1279bff8574d2dbd`.

- CI `33110315259`: success;
- Inventory Count Integration `33110315235`: success;
- Business Transactions Integration `33110315213`: success.

O primeiro CI da implementação falhou apenas por uma asserção incorreta no teste de RLS: UPDATE filtrado pela policy retornava zero rows em vez de exception. O teste foi corrigido para provar `ROW_COUNT = 0`; não houve relaxamento de autorização.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`.

Migrations registradas no histórico remoto:

- `20260827194813_stock_minimum_policies`;
- `20260827195802_stock_minimum_policy_fk_indexes`.

Pós-DDL confirmado:

- 0 linhas em `stock_minimum_policies`;
- nenhum threshold real inventado;
- RLS/grants/audit trigger corretos;
- índices de cobertura de FK de item/local presentes;
- os dois `unindexed_foreign_keys` introduzidos inicialmente pela nova tabela desapareceram do Performance Advisor.

`unused_index` nos índices da tabela nova é esperado enquanto Production permanecer sem políticas configuradas.

## ON HOLD — Issue #121

A #121 continua parada por evidência externa. Não é frente ativa e não bloqueia o roadmap.

Gatilhos válidos:

1. primeira execução agendada do `Production Storage Backup` após armamento — próxima janela esperada em 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. anexo Production legítimo criado pelo fluxo normal;
3. falha/incidente/regressão do pipeline Storage.

Até lá:

- não usar `workflow_dispatch` para fabricar prova;
- não criar fixture/bucket/anexo em Production;
- não refazer S3/R2/tooling/guardrails/PostgreSQL;
- não declarar recuperação binária completa sem anexo legítimo + backup + restore drill.

A Issue #75 continua umbrella de proteção de dados.

## Próxima frente

Salvo regressão/prioridade explícita, promover **`REQ-DASH-004` — Dashboard/relatórios de estoque** como próxima fase independente.

Antes de criar código:

1. confirmar `main`, Issues/PRs/CI reais;
2. confirmar que #133 está mergeado e #132 encerrada;
3. verificar se o cron da #121 já gerou evidência nova; se não, mantê-la ON HOLD sem rechecagens inúteis;
4. abrir uma Issue própria para a próxima fase;
5. inventariar o que `REQ-DASH-004` ainda não cobre sobre saldos, movimentos, perdas, inventários e validades, reutilizando o threshold da Fase 47.

Depois seguem `REQ-DASH-005` e `REQ-ITEM-003`.

## Restrições preservadas

- não tocar #121 sem gatilho;
- não usar service/admin key no browser;
- não inventar dados Production;
- não promover requisitos PENDING por inferência;
- não fazer deploy Vercel rotineiro;
- não registrar secrets.