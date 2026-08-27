# Módulo — Estoque mínimo e alertas de reposição

Status: Fase 47 concluída (`REQ-STK-011`).

## Objetivo

Permitir configurar estoque mínimo por item + local e transformar saldo efetivamente abaixo desse threshold em sinal operacional, sem duplicar a fonte de saldo e sem criar compra automática.

## Persistência

Fonte autoritativa de configuração: `public.stock_minimum_policies`.

Chave de negócio:

- `organization_id`;
- `stock_item_id`;
- `stock_location_id`.

Regras:

- uma policy por item/local;
- `minimum_quantity numeric(18,3)`;
- `minimum_quantity >= 0`;
- ausência de policy = `não configurado`;
- ciclo de vida por `active`; DELETE não faz parte do fluxo normal;
- FKs compostas garantem que item e local pertençam à mesma Organization.

`inventory_balances` permanece somente a projeção de saldo; configuração de reposição não é gravada nela.

## Estado derivado

O domínio usa `Quantity` e define:

`below_minimum := policy.active && quantity_on_hand < policy.minimum_quantity`

Consequências:

- saldo igual ao mínimo não alerta;
- saldo acima do mínimo não alerta;
- policy ausente não alerta;
- saldo ausente não é convertido em zero por inferência.

## Autorização e auditoria

RLS é a fronteira de segurança.

Leitura:

- `private.can_read_stock_location(organization_id, stock_location_id)`.

INSERT/UPDATE:

- `private.has_stock_location_role(...)`;
- papéis permitidos: `owner`, `admin`, `manager`, `inventory`;
- escopo do local continua obrigatório.

Grants:

- `authenticated`: SELECT, INSERT, UPDATE;
- `authenticated`: sem DELETE;
- `anon`: sem acesso.

Create/update são auditados por trigger em `audit_logs`. A função de trigger fica em schema privado e não possui EXECUTE público.

## Aplicação

### `/workspace/estoque`

A tela consulta policies visíveis pelo mesmo client Supabase da sessão e permite manutenção somente onde a RLS autoriza.

O adapter é browser-safe: não usa service role/admin key e não contorna RLS.

### Dashboard

A Fase 47 adiciona estoque abaixo do mínimo à fila de atenção do Dashboard.

O sinal:

- usa `inventory_balances` como saldo atual;
- usa `stock_minimum_policies` como configuração;
- mantém os filtros e escopos Organization + Unit + Sector já existentes;
- não atribui Setor por heurística;
- navega o usuário para o fluxo de Estoque;
- não cria pedido de compra automaticamente.

## Migrations Production

Projeto Supabase Production: `fhbvwyttikrbeaanatlr`.

- `20260827194813_stock_minimum_policies`;
- `20260827195802_stock_minimum_policy_fk_indexes`.

A segunda migration cobre as FKs compostas de item e local apontadas pelo Performance Advisor.

Pós-DDL validado em 2026-08-27:

- RLS ativa;
- grants/policies coerentes;
- audit trigger presente;
- 0 policies reais em Production;
- índices de FK presentes;
- nenhum `unindexed_foreign_keys` remanescente para `stock_minimum_policies`.

`unused_index` é esperado no ambiente Production enquanto a tabela permanecer vazia.

## Testes

Cobertura inclui:

- mínimo zero;
- negativo rejeitado;
- abaixo/igual/acima do mínimo;
- policy ausente;
- FK cross-Organization;
- escopo setorial/local;
- viewer sem mutation efetiva;
- `anon` sem grants;
- auditoria de create/update;
- Unit/Sector do Dashboard;
- wiring do Workspace;
- lint, typecheck, Vitest, production build e regressões PostgreSQL.

Em RLS, UPDATE fora da policy pode afetar zero linhas em vez de lançar exception. A regressão valida explicitamente `ROW_COUNT = 0`, sem tratar isso como autorização concedida.

## Fora de escopo

- compra automática;
- sugestão de quantidade;
- estoque máximo/target;
- lead time;
- previsão de demanda/IA;
- notificações externas;
- inventar thresholds para dados existentes.

A evolução analítica desses dados pertence a `REQ-DASH-004` e fases posteriores.