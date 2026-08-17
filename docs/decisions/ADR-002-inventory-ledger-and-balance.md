# ADR-002 — Ledger de estoque, saldo e reversões

Data: 2026-08-17
Status: aceito

## Contexto

As planilhas atuais registram retiradas, transferências, devoluções e ajustes de forma fragmentada. Um sistema multi-unidade precisa evitar saldo editável sem explicação, concorrência incorreta e perda de histórico.

## Decisão

### 1. Fonte de verdade

Movimentações de estoque confirmadas e seus itens formam o ledger transacional.

`InventoryBalance` será uma projeção/read model reconstruível por `StockItem + StockLocation`.

### 2. Sem edição direta de saldo

Nenhuma operação funcional poderá alterar `quantity_on_hand` isoladamente.

Toda alteração de quantidade exige um evento/movimento válido, inclusive:
- compra/recebimento;
- retirada;
- transferência;
- empréstimo/retorno;
- perda/vencimento;
- inventário;
- ajuste autorizado.

### 3. Movimentos confirmados não são apagados

Erro em movimento confirmado é corrigido por reversão/estorno relacionado ao original.

### 4. Transferência em duas etapas

Despacho gera saída da origem. Recebimento gera entrada no destino.

Enquanto não recebido, a operação permanece em trânsito. O modelo pode futuramente possuir local virtual `in_transit` ou projeção equivalente, sem alterar o conceito central.

### 5. Inventário físico

Inventário confirmado gera movimentos de ajuste pela diferença entre contado e esperado; nunca sobrescreve saldo diretamente.

### 6. Estoque negativo

Default: não permitir saldo negativo em locais normais.

Exceções precisam ser configuradas no StockLocation e auditadas. Importação legada pode usar processo especial controlado para reconstruir histórico.

### 7. Idempotência e concorrência

Comandos críticos devem aceitar chave de idempotência e executar validação + movimento + atualização de projeção dentro de transação atômica do banco quando houver persistência real.

Concorrência deve usar estratégia que impeça duas saídas simultâneas de consumirem o mesmo saldo disponível sem detecção.

## Consequências

- saldos são explicáveis e reconstruíveis;
- auditoria operacional melhora;
- relatórios podem ser recalculados;
- transferências suportam trânsito/divergência;
- implementação física precisa de transações e controle de concorrência;
- não dependeremos de uma coluna `stock` editável em `StockItem`.

## Não decidido aqui

- mecanismo físico de locking;
- materialização por trigger versus serviço;
- uso de views/materialized views;
- FEFO obrigatório.
