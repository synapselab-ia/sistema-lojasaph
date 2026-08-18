# Registro corretivo — restauração da transferência

Data: 2026-08-18

Durante a validação da Fase 10 foi comprovado que o PR #26, embora tecnicamente validado e referido como integrado na documentação posterior, permaneceu aberto e não entrou na `main`.

Consequências observadas:

- ausência da migration `20260817224800_transactional_stock_transfer.sql` no GitHub `main`;
- ausência das suítes `stock_transfer.sql` e `stock_transfer_multibatch.sql`;
- ausência do gateway/runtime persistente de transferência;
- workflow de inventário referenciando testes inexistentes;
- Fase 10 dependendo do helper de custeio definido naquela migration.

A restauração também expôs três inconsistências posteriores que estavam mascaradas:

- `confirm_inventory_count` usa o tipo genérico `inventory_adjustment`, mas a constraint física ainda aceitava apenas os tipos históricos positivo/negativo;
- `InventoryService` dependia de `createStockTransfer` e `createInventoryCount`, factories que haviam desaparecido do arquivo de domínio;
- a tela demo de estoque ainda não possuía rótulo para `inventory_adjustment`.

A migration `20260818120359_reconcile_inventory_adjustment_type.sql` foi criada pelo Supabase CLI pinado `2.111.0`. Ela é forward-only e retrocompatível: acrescenta `inventory_adjustment` sem retirar os valores históricos aceitos pela constraint.

A correção não redefine regras de negócio. Ela restaura os artefatos originalmente validados do PR #26 sobre a `main` atual e reconcilia CI, navegação, domínio e o contrato físico do inventário.

O Supabase remoto já possui transferência e inventário aplicados sob versões de migration anteriores/diferentes; portanto a migration de transferência restaurada no GitHub não deve ser reaplicada no remoto. Apenas a nova reconciliação de `inventory_adjustment` deve ser aplicada após CI verde.

Após o reparo verde e integrado, a Issue #24 pode voltar a `completed`; a Issue #28 retoma como única frente funcional.
