# Módulo — Estoque transacional

Status: ledger persistente com entrada, retirada, transferências, inventário físico e baixas por perda/quebra/vencimento.

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

## Baixas por perda, quebra e vencimento

A Fase 20 adiciona `stock_loss_reasons` e `record_stock_loss` para fechar `REQ-STK-008` e reforçar `REQ-STK-003`.

### Motivos estruturados

Cada Organization recebe quatro motivos conservadores:

- `loss` — Perda → movimento `loss`;
- `breakage` — Quebra → movimento `loss`;
- `expiration` — Vencimento → movimento `expiration`;
- `other` — Outro → movimento `loss`.

O catálogo é Organization-wide. Usuários autorizados no estoque podem ler os motivos, mas configuração exige membership Organization-wide com `owner`, `admin`, `manager` ou `inventory`. Os códigos/tipos dos quatro motivos-base não podem ser alterados; motivos adicionais podem ser criados sem inventar taxonomia específica do cliente.

### Comando transacional

`record_stock_loss`:

1. valida autenticação, role e escopo do local;
2. resolve `movement_type` no banco a partir do motivo ativo — a UI não escolhe o tipo livremente;
3. reutiliza o mesmo núcleo transacional de saída da retirada para lock do saldo, custo, política de negativo, lote preferido e FEFO;
4. registra `stock_movements` com `reason_code`, `stock_movement_items`, alocações de lote e `audit_logs` atomicamente;
5. preserva o custo médio vigente como snapshot e não recalcula custo em uma saída;
6. é idempotente por command ID e rejeita reuso com payload semântico diferente;
7. para vencimento de item rastreado exige lote explícito, com validade conhecida já atingida e quantidade suficiente no próprio lote — a operação não pode derramar para lote futuro;
8. falhas fazem rollback integral, sem movimento/audit/saldo parcial.

A tabela de motivos usa RLS e grants explícitos. `anon` não acessa o catálogo e `authenticated` não possui `DELETE`; ciclo de vida é por ativação/inativação.

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
6. diferenças positivas/negativas geram movimentos de ajuste separados e auditados;
7. ajuste negativo rastreado consome lotes por FEFO;
8. ajuste positivo não rastreado sem custo-base exige custo explícito;
9. ajuste positivo de item rastreado é bloqueado nesta versão, pois o sistema não inventa lote/validade desconhecidos;
10. ao final a sessão vira `confirmed` e fica imutável.

### Cancelamento

`cancel_inventory_count` encerra sessão `counting` sem ajuste, é idempotente/auditado e libera o local para nova contagem. Sessão confirmada não pode ser cancelada.

## Concorrência

Entrada, retirada, baixas, transferência e inventário usam row locks/advisory transaction locks no PostgreSQL. Retirada e baixa compartilham o núcleo privado de saída para que FEFO, custo, negativo e idempotência não tenham implementações concorrentes.

## Interfaces persistentes

- `/workspace/estoque` — saldo, entrada, retirada, lotes;
- `/workspace/baixas` — perda, quebra, vencimento, motivos e histórico recente;
- `/workspace/transferencias` — dispatch/receive;
- `/workspace/inventarios` — iniciar, contar, confirmar/cancelar e histórico.

## Testes

O CI cobre migrations/RLS, entrada, retirada, baixas, transferências base/multi-lote e inventário físico. A suíte de baixas valida motivo estruturado, custo, FEFO, vencimento com lote explícito, idempotência, política de estoque negativo, roles, escopo, cross-Organization, anon e rollback.

`REQ-STK-006` (devolução/retorno relacionado) permanece separado. Empréstimos continuam pendentes de Q-005.
