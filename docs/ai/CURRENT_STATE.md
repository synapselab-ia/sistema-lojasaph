# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 47 / Issue #132 (`REQ-STK-011`) implementada, testada e homologada em Production.**

O PR #133 contém a integração da Fase 47. Após o merge, não refazer esta slice sem regressão concreta.

A Issue #121 — backup/recovery do Supabase Storage — permanece **ON HOLD** aguardando gatilho externo e não bloqueia o roadmap.

## Fase 47 — estoque mínimo por local

A implementação fechou o gap de estoque mínimo com estas regras:

- política autoritativa em `public.stock_minimum_policies` por `organization_id + stock_item_id + stock_location_id`;
- `minimum_quantity numeric(18,3)` e `minimum_quantity >= 0`;
- ausência de política significa `não configurado`;
- saldo crítico somente quando `inventory_balances.quantity_on_hand < minimum_quantity`;
- igualdade ao mínimo não gera alerta;
- `inventory_balances` continua projeção e não recebe configuração;
- nenhuma compra automática, previsão de demanda ou sugestão de quantidade foi criada.

Segurança e autorização:

- RLS ativa;
- leitura reutiliza `private.can_read_stock_location(...)`;
- INSERT/UPDATE reutilizam `private.has_stock_location_role(...)` para `owner/admin/manager/inventory`;
- `authenticated` possui SELECT/INSERT/UPDATE e não possui DELETE;
- `anon` não possui acesso;
- alterações de configuração são registradas em `audit_logs` por trigger privada sem EXECUTE público.

Aplicação:

- `/workspace/estoque` permite consultar e manter o mínimo sob sessão autenticada + RLS;
- o domínio usa `Quantity`, preservando decimal exato;
- o Dashboard deriva e exibe pendência acionável de estoque abaixo do mínimo;
- filtros/visibilidade continuam respeitando Organization + Unit + Sector e o local explícito;
- saldo ausente não é fabricado como zero.

## CI da Fase 47

Head técnico validado: `ae6dcafab306cb99ed3a57ab1279bff8574d2dbd`.

- CI `33110315259`: success;
- Inventory Count Integration `33110315235`: success;
- Business Transactions Integration `33110315213`: success.

O CI cobre migrations, RLS/grants, auditoria, isolamento de Organization/escopo, mínimo zero, negativo rejeitado, abaixo/igual/acima do mínimo, política ausente, unit tests, lint, typecheck e production build.

## Supabase Production

Projeto: `fhbvwyttikrbeaanatlr`.

Migrations homologadas:

- `20260827194813_stock_minimum_policies`;
- `20260827195802_stock_minimum_policy_fk_indexes`.

Validação pós-DDL:

- `stock_minimum_policies`: 0 linhas — nenhum threshold foi inventado para dados existentes;
- RLS e grants confirmados;
- trigger de auditoria confirmado;
- índices compostos de cobertura dos FKs de item e local confirmados;
- Performance Advisor não reporta mais `unindexed_foreign_keys` para `stock_minimum_policies`;
- `unused_index` nos índices recém-criados é esperado enquanto a tabela Production estiver vazia.

Nenhum deploy Vercel foi necessário.

## Issue #121 — ON HOLD

Não tocar #121 até existir um destes gatilhos:

1. primeira execução **agendada** do `Production Storage Backup` após o armamento — próxima janela esperada: 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo, permitindo prova binária real;
3. falha/incidente/regressão real do pipeline Storage.

Enquanto não houver gatilho:

- não usar `workflow_dispatch` só para antecipar prova;
- não criar bucket/anexo sintético em Production;
- não revalidar repetidamente ausência de run;
- não refazer tooling, S3, R2, guardrails ou PostgreSQL.

## Próxima frente prevista

Salvo bug/regressão ou prioridade explícita, a próxima frente independente é **`REQ-DASH-004` — evolução de Dashboard/relatórios de estoque**.

Ordem planejada depois da Fase 47:

1. `REQ-DASH-004` — estoque;
2. `REQ-DASH-005` — compras/fornecedores e histórico/variação;
3. `REQ-ITEM-003` — EAN/código de barras e dados fiscais.

Ver `docs/ai/NEXT_ACTION.md` antes de promover a próxima Issue.