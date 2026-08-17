# Módulo — Estoque transacional

Status: Fase 6 implementada em demonstração in-memory

## Objetivo

Manter estoque rastreável por ledger, com custo, transferências, lotes, validades e inventário físico, antes de introduzir persistência real.

## Ledger e saldo

`InventoryBalance` é projeção por `StockItem + StockLocation`. A UI nunca oferece edição direta de saldo.

Toda alteração física passa por `StockMovement`:

- saldo inicial;
- entrada;
- retirada;
- saída de transferência;
- recebimento de transferência;
- ajustes de inventário representados por movimentos de entrada/retirada com `reasonCode` próprio.

Movimentos preservam snapshots de custo e, quando aplicável, alocações de lote.

## Entrada

- item + local + quantidade + custo unitário;
- lote e validade podem ser informados;
- itens configurados para rastreamento mantêm `InventoryBatch` mesmo quando o legado não possui lote/validade conhecidos;
- saldo aumenta;
- custo médio ponderado é recalculado;
- lote preserva custo de origem, quantidade original e remanescente.

## Retirada

- quantidade positiva;
- saldo negativo é bloqueado;
- itens rastreados consomem lotes;
- sem lote preferencial informado, a alocação segue FEFO;
- o domínio aceita lote preferencial, portanto FEFO é recomendação/default e não regra irreversível;
- movimento guarda custo médio vigente e alocações físicas de lote.

## Transferência

1. despacho valida saldo e reduz a origem;
2. lotes de origem são consumidos e seus atributos ficam no snapshot da transferência;
3. operação permanece em trânsito;
4. destino não recebe saldo no despacho;
5. recebimento pode ser parcial;
6. lotes equivalentes são materializados no destino preservando código, validade e custo físico;
7. ao receber tudo, status vira `received`.

## Quantidades

`Quantity` usa milésimos inteiros, aceitando até três casas decimais sem depender de float binário cru.

## Custeio

O saldo usa custo médio ponderado móvel conforme ADR-003. Lote preserva seu custo de origem e movimentos preservam snapshot do custo usado na operação.

## Lotes e validades

`InventoryBatch` contém:

- produto;
- local;
- código de lote opcional;
- validade opcional;
- data de recebimento;
- quantidade original;
- quantidade remanescente;
- custo unitário de origem;
- tipo/referência de origem.

Validade nunca pertence diretamente ao cadastro mestre do produto.

### Classificação de validade

A UI classifica lotes em:

- vencido;
- vence em até 7 dias;
- até 15 dias;
- até 30 dias;
- acima de 30 dias;
- validade desconhecida.

Lote sem validade conhecida não recebe uma data inventada. Ele permanece como pendência explícita de qualidade do dado.

## FEFO

Lotes com saldo são ordenados pela validade mais próxima e depois pela data de recebimento. Lotes sem validade ficam por último.

FEFO é o default de alocação quando nenhum lote específico é solicitado. A política pode ser refinada futuramente sem mudar o ledger.

## Inventário físico

`InventoryCount` captura:

- local;
- horário de início;
- snapshot do saldo esperado por item;
- quantidade contada;
- status;
- confirmação.

### Confirmação

Antes de confirmar, o sistema verifica se o saldo atual ainda é igual ao snapshot inicial.

Se houve qualquer movimentação depois do início, a confirmação é rejeitada como `INVENTORY_COUNT_STALE` e uma nova contagem deve ser iniciada.

Quando a contagem é válida:

- diferença positiva gera movimento de entrada/ajuste;
- diferença negativa gera movimento de retirada/ajuste;
- saldo nunca é sobrescrito sem movimento;
- itens rastreados mantêm coerência de lotes;
- ajuste positivo de item rastreado sem origem conhecida cria lote de ajuste com validade desconhecida, em vez de fabricar informação.

## Concorrência da demonstração

`InventoryService` serializa mutações em uma fila interna para evitar duas operações simultâneas consumirem o mesmo saldo dentro do workspace in-memory.

Essa fila NÃO substitui transação de banco. Persistência real deverá gravar validação + ledger + lotes + projeção de saldo atomicamente, com controle de concorrência apropriado.

## Persistência atual

Adapters continuam in-memory. Reload restaura fixtures anonimizados.

Isso é intencional: domínio e UX foram estabilizados antes de introduzir banco real.

## Interfaces atuais

- `/cadastros/estoque`: saldos, entrada, retirada, transferências e ledger;
- `/cadastros/validades`: lotes, alertas, prioridade FEFO e entrada com lote;
- `/cadastros/inventarios`: início de contagem, quantidades físicas, confirmação e histórico.

## Próxima camada recomendada

Com o ciclo de estoque suficientemente definido, a próxima fase pode iniciar schema físico PostgreSQL/Supabase por migrations, RLS e adapters, preservando as interfaces de domínio existentes.