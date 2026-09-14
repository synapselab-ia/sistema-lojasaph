# Módulo — Estoque mínimo e alertas de reposição

Status: Fase 47 concluída (`REQ-STK-011`); integrado ao compositor modular na segunda fatia da Issue #190.

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

## Autorização, auditoria e compositor

RLS é a fronteira de segurança dos dados. A capability de produto é `stock-minimum`, depende de `inventory` e é **ativa por default** quando não existe override na Organization.

Leitura e mutation continuam exigindo os escopos originais, mas agora também respeitam a composição:

- quando `stock-minimum` está ativa, SELECT segue `private.can_read_stock_location(...)`;
- INSERT/UPDATE continuam exigindo `private.has_stock_location_role(...)` para `owner`, `admin`, `manager` ou `inventory` no local autorizado;
- quando a capability está desativada, `private.can_use_capability(...)` faz as policies negarem SELECT/INSERT/UPDATE;
- DELETE continua sem grant;
- create/update continuam auditados pelo trigger em `audit_logs`.

O helper interno `private.is_capability_enabled(...)` permanece sem EXECUTE para `authenticated`; a policy usa um wrapper que confirma membership antes de consultar a composição.

Desativar o módulo **não altera nem apaga** linhas de `stock_minimum_policies`. Elas ficam fora da superfície operacional enquanto off e reaparecem intactas quando a capability é reativada.

## Aplicação

### `/workspace/estoque/minimos`

Com a capability ativa, a tela consulta policies visíveis pelo mesmo client Supabase da sessão e permite manutenção somente onde a RLS autoriza.

Com a capability desativada, a rota direta exibe um estado explícito de módulo desativado, sem formulário nem lista de configuração. A navegação principal também remove a entrada.

### `/workspace/estoque`

Quando `stock-minimum` está ativa, a posição de Estoque mostra:

- resumo “Abaixo do mínimo”;
- atalho para Estoque mínimo;
- filtro de situação mínima;
- coluna Mínimo e status derivado por posição.

Quando a capability está off, esses elementos desaparecem e a tela continua operando como posição normal de Estoque.

### Dashboard

A Fase 47 adicionou estoque abaixo do mínimo à fila de atenção do Dashboard. Como a leitura das policies é RLS-gated, a capability off produz zero sinais derivados; além disso, o card específico de Estoque mínimo é omitido da visão de Estoque.

O sinal, quando ativo:

- usa `inventory_balances` como saldo atual;
- usa `stock_minimum_policies` como configuração;
- mantém os filtros e escopos Organization + Unit + Sector já existentes;
- não atribui Setor por heurística;
- navega o usuário para o fluxo de Estoque mínimo;
- não cria pedido de compra automaticamente.

## Migrations Production

Projeto Supabase Production: `fhbvwyttikrbeaanatlr`.

Base histórica:

- `20260827194813_stock_minimum_policies`;
- `20260827195802_stock_minimum_policy_fk_indexes`.

Integração ao compositor:

- `20260914120000_stock_minimum_composition` — adiciona a capability ao override por Organization e aplica gating de RLS sem alterar as linhas de configuração.

A migration do compositor só deve ser considerada em Production após merge e rollout version-preserving conforme `docs/qa/database-migrations.md`.

## Testes

Cobertura existente inclui mínimo zero, negativo rejeitado, abaixo/igual/acima do mínimo, policy ausente, FK cross-Organization, escopo setorial/local, viewer sem mutation efetiva, `anon` sem grants e auditoria.

A integração modular adiciona regressão para:

- default enabled;
- owner-only disable/enable;
- configuração existente preservada fisicamente durante desativação;
- SELECT oculto enquanto off;
- INSERT bloqueado e UPDATE afetando zero linhas enquanto off;
- reativação restaurando a mesma configuração;
- audit trail da mudança de composição.

## Fora de escopo

- compra automática;
- sugestão de quantidade;
- estoque máximo/target;
- lead time;
- previsão de demanda/IA;
- notificações externas;
- inventar thresholds para dados existentes.

A evolução analítica desses dados pertence a `REQ-DASH-004` e fases posteriores.
