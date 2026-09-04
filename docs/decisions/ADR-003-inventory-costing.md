# ADR-003 — Custeio de estoque

Data original: 2026-08-17  
Última revisão: 2026-09-04  
Status: **aceito — revisado por decisão explícita do operador**

## Contexto

As planilhas registram custo unitário em parte dos lançamentos, mas não possuíam método formal consistente. O sistema já preserva `unit_cost` por lote/recebimento e snapshots monetários em movimentos relevantes.

O default inicial deste ADR adotava custo médio ponderado móvel como valorização gerencial. Em 2026-09-04 o operador definiu uma regra empresarial mais específica:

> quando uma quantidade física sai, é perdida, vence, é transferida ou emprestada, o valor econômico deve acompanhar o custo real da camada/lote físico efetivamente movimentado.

Exemplo aprovado: se uma unidade perdida pertence a um lote adquirido por R$ 5, a perda vale R$ 5; se pertence a um lote adquirido por R$ 2, vale R$ 2. Custo médio ou última compra não devem substituir silenciosamente o custo real conhecido daquele lote.

Essa decisão substitui o default anterior de custo médio para saídas físicas identificáveis.

## Decisão

### 1. Camada de custo por lote/recebimento

Cada entrada/recebimento deve preservar seu custo unitário de origem em uma camada rastreável de estoque.

Quando houver lote operacional explícito, ele é a camada natural. Quando o item não exigir código de lote/validade visível, a implementação ainda deve preservar uma camada de aquisição/recebimento suficiente para explicar o custo da quantidade física. Não é aceitável perder a origem econômica apenas porque o usuário não precisa visualizar um código de lote.

### 2. Saídas físicas usam o custo da camada consumida

Toda saída com origem física conhecida deve preservar:

- quantidade;
- lote/camada de origem;
- `unit_cost_snapshot` correspondente à camada;
- `total_cost_snapshot = quantidade × custo_unitário_da_camada`.

Aplica-se, conforme o processo:

- retiradas;
- perdas/quebras;
- vencimentos;
- transferências;
- devoluções relacionadas;
- empréstimos;
- demais baixas físicas rastreáveis.

Movimentos históricos não devem mudar de valor quando compras futuras ocorrerem.

### 3. FEFO e seleção explícita de lote

FEFO decide **qual quantidade física deve sair** quando houver múltiplas camadas elegíveis e o usuário não estiver registrando um lote específico já conhecido.

Se o usuário informar explicitamente um lote/camada válida — por exemplo, ao registrar a perda de um lote determinado — essa seleção representa a realidade física e seu custo prevalece.

FEFO não deve reatribuir uma perda conhecida a outro lote apenas por vencer antes.

### 4. Transferências

Transferência entre locais preserva a identidade econômica da quantidade transferida. O destino recebe a quantidade com o mesmo custo da camada de origem; trocar de local não cria ganho ou perda artificial.

Política futura de preço de transferência entre pessoas jurídicas, se necessária, é uma camada financeira separada e não altera retroativamente o custo físico de aquisição.

### 5. Devoluções e restituições físicas

Quando uma devolução/restituição estiver relacionada a uma saída anterior, o custo deve manter vínculo com a origem correspondente, preservando rastreabilidade e evitando criar custo novo por conveniência.

### 6. Empréstimos

O valor físico de referência de um empréstimo é formado pelos custos das camadas/lotes efetivamente emprestados.

Uma restituição em mercadoria preserva a trilha física correspondente. Uma restituição em valor quita obrigação monetária do empréstimo conforme a regra específica da Issue #183; ela não reescreve o custo histórico da saída original.

### 7. Valor do estoque

A valorização gerencial do estoque disponível deve ser explicável pela soma das quantidades remanescentes de suas camadas de custo:

```text
valor_estoque = Σ (quantidade_remanescente_da_camada × custo_unitário_da_camada)
```

Relatórios podem apresentar custo médio **derivado para análise** (`valor total / quantidade total`), mas esse indicador não substitui a origem econômica dos lotes nem deve ser usado para reprecificar saídas físicas conhecidas.

### 8. Casos sem custo rastreável

Dados legados, estoque negativo ou ajustes podem produzir situações em que nenhuma camada de custo confiável exista.

Nesses casos:

- não inventar custo silenciosamente;
- não cair automaticamente para custo médio ou última compra sem regra explícita;
- registrar o caso como custo desconhecido/fallback auditável conforme desenho da implementação;
- tornar a limitação visível em relatórios e validações quando material;
- definir estratégia de correção/migração sem destruir histórico.

A Issue #187 deve fechar os fallbacks concretos necessários ao runtime.

### 9. Preço de fornecedor e preço de venda são conceitos distintos

`SupplierPrice`/histórico de compras representa preço observado ou contratado do fornecedor e não substitui o custo da camada física recebida.

Preço de venda pertence ao catálogo comercial e deve possuir histórico/vigência próprios. Margem bruta é derivada de receita menos custo aplicável; não confundir com lucro líquido.

Refs: #187, #188 e #189.

## Consequências

- perdas e retiradas passam a refletir o custo da mercadoria realmente afetada;
- itens iguais comprados por valores diferentes continuam economicamente explicáveis;
- transferências, devoluções e empréstimos preservam custo de origem;
- relatórios históricos permanecem estáveis;
- custo médio pode continuar como métrica analítica, não como mecanismo de reprecificação de saídas;
- implementação pode exigir ajustes no runtime atual onde ainda houver custo médio como fonte de snapshot;
- migração de dados sem custo conhecido precisa de tratamento explícito.

## Não decidido por este ADR

Este ADR trata custeio gerencial/operacional por camada física. Ele não declara método fiscal/contábil oficial para demonstrações financeiras externas. Se houver obrigação fiscal/contábil específica, criar decisão própria sem reescrever o ledger físico ou seus snapshots históricos.
