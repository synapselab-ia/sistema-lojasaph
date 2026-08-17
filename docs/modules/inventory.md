# Módulo — Estoque transacional

Status: Fase 9 em andamento. Entrada e retirada já possuem caminho PostgreSQL/Supabase real; transferência e inventário permanecem próximos incrementos.

## Objetivo

Manter estoque rastreável por ledger, com custo, lotes, validades, transferências e inventário físico, sem edição direta de saldo e com operações críticas transacionais/idempotentes.

## Ledger e saldo

`InventoryBalance` é projeção por `StockItem + StockLocation`. A UI nunca oferece edição direta de saldo.

Toda alteração física passa por `StockMovement`:

- saldo inicial;
- entrada;
- retirada;
- saída de transferência;
- recebimento de transferência;
- ajustes de inventário representados por movimentos próprios/razão explícita.

Movimentos preservam snapshots de custo e, quando aplicável, alocações físicas de lote.

## Entrada — persistente

`record_stock_entry` já está aplicado no Supabase e integrado ao `/workspace/estoque`.

Garantias:

- quantidade positiva e custo não negativo;
- auth + role organizacional;
- command ID/idempotência;
- lock da projeção de saldo;
- saldo aumenta;
- custo médio ponderado é recalculado;
- lote é criado quando configurado/informado;
- movimento, item, lote/alocação, saldo e audit ficam na mesma transação.

## Retirada — persistente

`record_stock_withdrawal` implementa a regra do domínio no banco.

Garantias:

- quantidade positiva;
- auth + role `owner/admin/manager/inventory`;
- advisory transaction lock por command ID;
- idempotência valida Organization, item, local, quantidade, lote preferido e observação;
- saldo bloqueado com `FOR UPDATE`;
- item/local precisam estar ativos e na mesma Organization;
- custo da saída usa o custo médio vigente, sem recalcular custo médio por causa da retirada;
- saldo zerado zera a projeção de custo médio;
- movimento, item, alocações, saldo/lotes e audit são atômicos.

### FEFO e lote preferido

Para item rastreado:

1. todos os lotes candidatos positivos são bloqueados em ordem determinística;
2. se `preferredBatchId` foi informado, ele é validado e consumido primeiro;
3. o restante é consumido por FEFO;
4. FEFO ordena validade mais próxima, depois recebimento mais antigo;
5. validade desconhecida fica por último;
6. lote com saldo zero recebe status `depleted`;
7. nunca é criado saldo negativo de lote.

Sem lote preferido, FEFO é o comportamento padrão da UI e do RPC.

## Estoque negativo

ADR-002 define negativo proibido por default, com exceção configurável no `StockLocation`.

A implementação física usa triggers:

- `inventory_balances` aceita negativo apenas quando o local possui `allow_negative_stock=true`;
- item rastreado continua exigindo saldo/lotes físicos suficientes, mesmo se o local permitir negativo;
- não é possível mudar um local para `allow_negative_stock=false` enquanto houver saldo negativo nele.

Isso substitui o antigo CHECK global que tornava a configuração por local inoperante.

## Transferência — domínio consolidado, persistência pendente

Regra atual:

1. despacho valida saldo e reduz a origem;
2. lotes de origem são consumidos e seus atributos entram no snapshot da transferência;
3. destino não recebe saldo no despacho;
4. operação fica em trânsito;
5. recebimento pode ser parcial;
6. destino materializa lotes preservando código, validade e custo físico;
7. recebimento total encerra como `received`.

Próxima entrega da Issue #24 deve implementar dispatch/receive como commands PostgreSQL separados, idempotentes, auditados e concorrentes com segurança.

## Quantidades e custeio

- `Quantity`: precisão de até três casas decimais.
- PostgreSQL: `numeric(18,3)` para quantidade e `numeric(18,2)` para dinheiro/custo.
- saldo: custo médio ponderado móvel conforme ADR-003.
- saída: snapshot do custo médio vigente.
- lote: preserva custo físico de origem.

## Lotes e validades

`InventoryBatch` contém produto, local, código opcional, validade opcional, recebimento, quantidade original/remanescente, custo e origem.

Validade nunca pertence diretamente ao cadastro mestre do produto. Informação desconhecida permanece `NULL`; não fabricar datas/lotes para completar cadastro.

## Inventário físico — domínio consolidado, persistência pendente

`InventoryCount` captura snapshot esperado e contagem física. Confirmação rejeita contagem stale se o saldo mudou após o início. Diferenças geram movimentos, nunca overwrite direto de saldo.

Persistência real do inventário deve ser implementada depois da transferência na mesma Issue #24.

## Concorrência

### In-memory

`InventoryService` usa fila interna apenas para a demonstração/testes.

### PostgreSQL

Entrada e retirada usam transação/locks no banco. Essa é a fronteira real para concorrência multiusuário. Novos movimentos persistentes devem seguir o mesmo padrão.

## Interfaces

### Persistente

`/workspace/estoque`:

- saldos reais;
- entrada real;
- lotes ativos reais;
- retirada real com FEFO/lote preferido.

### Demonstração

- `/cadastros/estoque`;
- `/cadastros/validades`;
- `/cadastros/inventarios`.

A demo permanece para transferência/inventário até os commands reais estarem verdes.

## Testes

Além dos testes de domínio, o CI PostgreSQL cobre entrada e retirada contra schema/migrations reais, RLS, papéis, isolamento entre Organizations, idempotência, rollback e integridade de lote/saldo.

## Próxima camada

Implementar transferência persistente em duas etapas e, depois, inventário físico persistente. Não iniciar financeiro/caixa sacrificando a consistência do ledger principal.
