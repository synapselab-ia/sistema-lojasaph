# ADR-003 — Custeio de estoque

Data: 2026-08-17
Status: aceito como default revisável

## Contexto

As planilhas registram custo unitário em alguns lançamentos, mas há lacunas e não existe método de custeio formal consistente. O sistema precisa valorar estoque, retiradas e perdas sem depender de digitação manual em cada saída.

## Decisão

### 1. Método gerencial padrão

Adotar custo médio ponderado móvel por `StockItem + StockLocation` como default de valorização gerencial.

Em cada entrada com custo conhecido:

```text
novo_custo_medio =
  ((saldo_anterior × custo_medio_anterior) + (quantidade_entrada × custo_entrada))
  / (saldo_anterior + quantidade_entrada)
```

Regras de borda serão formalizadas na implementação para saldo zero, ajustes e migração.

### 2. Preservar custo de origem

Cada lote/recebimento preserva seu custo unitário original.

Cada movimento relevante preserva `unit_cost_snapshot` e `total_cost_snapshot` para que relatórios históricos não mudem quando o custo médio futuro mudar.

### 3. Transferências

Transferência entre locais do mesmo grupo preserva o custo econômico do item no momento da saída. O recebimento não deve criar ganho/perda artificial apenas por trocar de local.

Se futuramente houver política de preço de transferência entre empresas jurídicas, ela será uma camada financeira separada.

### 4. Perdas e retiradas

O valor gerencial da saída usa o custo médio vigente no momento da operação, preservado no snapshot do movimento.

### 5. Custo físico de lote versus valorização

FEFO/FIFO e seleção de lote tratam qual quantidade física sai. O custo médio ponderado trata valorização gerencial. São decisões independentes.

### 6. Histórico de fornecedor

`SupplierPrice` guarda preço observado/contratado de fornecedor e não é substituto do custo do estoque.

## Consequências

- retiradas e perdas terão valor consistente mesmo sem digitação manual;
- relatórios históricos permanecem estáveis por snapshots;
- custo de compra/lote continua disponível para análise;
- o sistema poderá comparar custo médio, custo de lote e preço de fornecedor sem misturar conceitos.

## Revisão futura

Se o cliente exigir método fiscal/contábil específico, o modelo físico poderá adicionar outra camada de valorização. O ledger de quantidades e os snapshots preservados permitem essa evolução sem reescrever movimentos históricos.
