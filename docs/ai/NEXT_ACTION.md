# Next Action — Sistema Lojasaph

## Contexto

- PR #27 conclui a Fase 9 e fecha a Issue #24 quando integrado.
- Entrada, retirada, transferência e inventário físico já possuem persistência PostgreSQL/Supabase real.
- Próxima Issue registrada: #28 — Fase 10 — Compras, pedidos e recebimento operacional.

## Fazer agora

1. Confirmar que o PR #27 foi integrado e a Issue #24 fechou.
2. Tornar a Issue #28 a única frente em andamento.
3. Criar branch nova a partir da `main`, sugerida `agent/purchases-runtime`.
4. Ler AGENTS, START-HERE, CURRENT_STATE, HANDOFF, Issue #28, ADR-002/003/006 e os módulos de fornecedores/estoque.
5. Reconciliar o domínio de compras com Supplier/SupplierItem existentes; não duplicar cadastros.
6. Modelar `purchase_orders` e itens por Organization/Unit/StockLocation.
7. Implementar status mínimos: draft, ordered, partially_received, received, cancelled.
8. Implementar commands transacionais/idempotentes para emitir, receber parcial/total e cancelar.
9. Recebimento deve gerar entrada de estoque atômica, preservando custo/lote e sem write direto no ledger.
10. Atualizar histórico de preço do fornecedor quando apropriado e auditável.
11. Criar testes SQL/RLS/concorrência antes da UI.
12. Integrar `/workspace/compras` somente depois do banco verde.
13. Aplicar/homologar remotamente somente após CI limpo, com dados demo/rollback.
14. Atualizar docs/handoff e só então integrar.

## Fora do escopo da Fase 10

- contas a pagar/parcelas/NF;
- caixa;
- dados reais do cliente;
- aprovações avançadas/cotações se não forem necessárias ao primeiro fluxo utilizável.

## Regra de eficiência

Não reabrir estoque/Auth sem evidência de bug ou requisito novo. Reutilizar os commands/invariantes já consolidados e manter migrations do GitHub como fonte de verdade.
