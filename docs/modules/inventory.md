# Módulo — Estoque transacional

Status: Fase 5 em implementação

## Objetivo

Implementar o ledger de estoque definido no ADR-002 e o custeio do ADR-003 antes de introduzir banco real.

## Fluxos desta fase

### Entrada

- item + local + quantidade + custo unitário;
- quantidade precisa ser positiva;
- custo não pode ser negativo;
- saldo aumenta;
- custo médio ponderado é recalculado;
- movimento de entrada guarda snapshot do custo informado.

### Retirada

- item + local + quantidade + motivo/observação;
- saldo negativo é bloqueado;
- saldo diminui;
- movimento guarda o custo médio vigente no momento da saída.

### Transferência

1. despacho valida saldo e reduz a origem;
2. transferência fica `dispatched`/em trânsito;
3. destino não recebe saldo no despacho;
4. recebimento aumenta destino usando o custo snapshot do envio;
5. recebimento parcial é suportado pelo domínio;
6. ao receber tudo, status vira `received`.

## Quantidades

`Quantity` usa milésimos inteiros, aceitando até três casas decimais sem float binário para o saldo operacional da fase atual.

## Concorrência da demonstração

`InventoryService` serializa mutações em uma fila interna. Isso impede duas saídas simultâneas no mesmo workspace de consumirem o mesmo saldo.

Essa fila NÃO substitui transação de banco. Quando persistência real entrar, validação, ledger e projeção deverão ser gravados atomicamente com locking/controle de concorrência apropriado.

## Read model

`InventoryBalance` é projeção por item + local e continua reconstruível conceitualmente a partir do ledger. A UI nunca oferece edição direta de saldo.

## Persistência

Adapters continuam in-memory. Reload restaura os fixtures.

## Próximos passos após esta fase

- lotes e validades;
- inventário físico;
- recebimento de compra integrado;
- persistência real após decisão específica de infraestrutura.