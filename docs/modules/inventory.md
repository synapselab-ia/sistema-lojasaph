# Módulo — Estoque transacional

Status: Fase 9 concluída tecnicamente no PR #27. Entrada, retirada, transferência e inventário físico possuem caminho PostgreSQL/Supabase real.

## Princípios

- `InventoryBalance` é projeção; a UI nunca edita saldo diretamente.
- toda alteração física gera `StockMovement` e audit trail;
- commands críticos são transacionais/idempotentes;
- quantidade usa `numeric(18,3)` e dinheiro/custo `numeric(18,2)`;
- RLS + membership são a fronteira de autorização;
- lote/validade desconhecidos nunca são fabricados.

## Entrada

`record_stock_entry` valida role, command ID, quantidade/custo, bloqueia saldo, recalcula custo médio e cria lote quando aplicável. Reposição sobre saldo anterior `<= 0` usa o custo recebido como novo custo-base.

## Retirada

`record_stock_withdrawal` bloqueia saldo/lotes, usa lote preferido quando informado e FEFO para o restante, registra custo médio vigente e respeita a política configurável de estoque negativo. Item rastreado nunca cria lote negativo.

## Transferência

`dispatch_stock_transfer` reduz somente a origem e grava `transfer_out`. `receive_stock_transfer` credita o destino apenas no recebimento real, aceita parcial/total e preserva `allocation_order`, código, validade e custo físico do lote. O saldo agregado do destino usa o snapshot do custo médio da linha transferida.

## Inventário físico persistente

### Início

`start_inventory_count`:

- uma sessão `counting` por Organization + local;
- captura todos os itens ativos;
- snapshot de `expected_quantity` e `expected_average_cost`;
- command ID idempotente;
- audit `inventory_count.started`.

O saldo esperado pode ser negativo quando a exceção do local permitir; a contagem física continua não negativa.

### Registro de linhas

`set_inventory_count_line` grava `counted_quantity` e custo de ajuste opcional, somente enquanto a sessão está `counting`. Cada alteração é auditada e o command é retry-safe.

### Confirmação

`confirm_inventory_count`:

1. bloqueia command, sessão, linhas e saldos em ordem determinística;
2. exige todas as linhas contadas;
3. compara quantidade **e custo médio** atuais com o snapshot;
4. qualquer divergência externa gera `INVENTORY_COUNT_STALE` e rollback integral;
5. diferença zero não gera movimento;
6. diferenças positivas/negativas geram movimentos `inventory_adjustment` separados e auditados;
7. ajuste negativo rastreado consome lotes por FEFO;
8. ajuste positivo não rastreado sem custo-base exige custo explícito;
9. ajuste positivo de item rastreado é bloqueado nesta versão, pois o sistema não inventa lote/validade desconhecidos;
10. ao final a sessão vira `confirmed` e fica imutável.

### Cancelamento

`cancel_inventory_count` encerra sessão `counting` sem ajuste, é idempotente/auditado e libera o local para nova contagem. Sessão confirmada não pode ser cancelada.

## Concorrência

Entrada, retirada, transferência e inventário usam row locks/advisory transaction locks no PostgreSQL. A fila in-memory continua apenas como mecanismo de demonstração/teste isolado.

## Interfaces persistentes

- `/workspace/estoque` — saldo, entrada, retirada, lotes;
- `/workspace/transferencias` — dispatch/receive;
- `/workspace/inventarios` — iniciar, contar, confirmar/cancelar e histórico.

## Testes

O CI cobre migrations/RLS, entrada, retirada, transferências base/multi-lote e inventário físico: snapshot, incompleto, stale, ajuste positivo/negativo, custo, FEFO, idempotência, cancelamento/reabertura, roles, anon e isolamento por Organization.
