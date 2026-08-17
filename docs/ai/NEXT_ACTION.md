# Next Action — Sistema Lojasaph

## Contexto

- Fase 8 está concluída na `main` pelo PR #23.
- Issue #24 — Fase 9 — estoque transacional completo no Supabase — permanece em andamento.
- PR #25 implementa a Fase 9A: retirada persistente com FEFO/lote preferido, idempotência, locks, audit e política configurável de estoque negativo.
- `record_stock_entry` e `record_stock_withdrawal` já estão aplicados no projeto Supabase homologado.
- `/workspace/estoque` já possui entrada e retirada reais após o PR #25.
- Transferência e inventário físico continuam in-memory até ganharem comandos PostgreSQL próprios.

## Objetivo atual

Depois que o PR #25 estiver integrado, continuar a Issue #24 com transferência transacional em duas etapas, preservando as regras já validadas no domínio: expedir reduz origem, receber credita destino, lote/custo/validade são preservados e recebimento parcial é possível.

## Fazer agora

1. Confirmar que o PR #25 está integrado na `main`.
2. Manter a Issue #24 aberta e como única frente em execução.
3. Criar branch nova a partir da `main`, sugerida: `agent/stock-transfer-runtime`.
4. Reabrir apenas o contexto necessário:
   - `docs/modules/inventory.md`;
   - ADR-002, ADR-003 e ADR-006;
   - `InventoryService.transfer` / `receiveTransfer` e testes atuais;
   - tabelas `stock_transfers`, `stock_transfer_items`, `stock_transfer_batch_allocations`;
   - padrões de `record_stock_entry` e `record_stock_withdrawal`.
5. Definir commands separados para as duas transições críticas:
   - dispatch/expedição;
   - receive/recebimento.
6. Dispatch deve:
   - exigir auth + role organizacional;
   - validar origem != destino e mesma Organization;
   - usar command ID/idempotência;
   - bloquear saldo/lotes da origem;
   - aplicar lote preferido/FEFO conforme domínio;
   - reduzir saldo/lotes da origem;
   - criar/atualizar `stock_transfers` e itens/alocações;
   - registrar movimento `transfer_out` e audit;
   - não creditar destino ainda.
7. Receive deve:
   - ser idempotente;
   - bloquear transferência/itens/alocações envolvidos;
   - nunca receber mais que o expedido ainda pendente;
   - aceitar recebimento parcial quando o domínio atual permitir;
   - criar/atualizar lote no destino preservando código, validade e custo snapshot da origem;
   - creditar saldo do destino com custo coerente com ADR-003;
   - registrar `transfer_in` + audit;
   - atualizar status para `partially_received` ou `received`.
8. Criar testes SQL para:
   - dispatch simples;
   - nenhuma entrada no destino antes do receive;
   - FEFO/lote preferido no dispatch;
   - estoque insuficiente;
   - origem=destino inválida;
   - retry idempotente;
   - payload conflitante;
   - receive parcial;
   - receive total;
   - over-receive bloqueado;
   - preservação de lote/validade/custo;
   - role sem permissão;
   - cross-Organization;
   - rollback atômico.
9. Só depois dos commands/testes verdes, criar gateways e ligar transferência ao `/workspace/estoque`.
10. Aplicar migrations ao Supabase remoto somente após CI em PostgreSQL limpo.
11. Rodar Security/Performance Advisors após DDL/RPC.
12. Homologar remotamente em transação com `ROLLBACK`.
13. Não importar dados reais do cliente nesta fase.
14. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION ao encerrar.

## Regras que não podem regredir

- migrations do GitHub são fonte de verdade;
- não editar saldo diretamente pela UI;
- não liberar INSERT/UPDATE direto no ledger;
- command RPC é transacional, idempotente e auditado;
- custo de saída usa snapshot do custo médio vigente;
- lote/validade desconhecidos permanecem `NULL`;
- destino só recebe estoque na etapa receive;
- não fabricar saldo de lote negativo;
- `SUPABASE_SECRET_KEY` continua fora das operações normais;
- autorização vem de `organization_memberships`;
- manter adapters in-memory para testes/demo até paridade real.

## Critério da próxima entrega

Um usuário autorizado deve conseguir expedir e receber uma transferência real entre locais da mesma Organization, inclusive recebimento parcial, sem crédito antecipado no destino, preservando custo/lote/validade, com idempotência, auditoria e isolamento por Organization.

## Regra de eficiência

Não refazer Auth, entrada ou retirada. Partir diretamente do modelo de transferência já consolidado e seguir o mesmo padrão de command RPC + CI + homologação remota usado nas duas mutações anteriores.
