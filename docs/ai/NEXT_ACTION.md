# Next Action — Sistema Lojasaph

## Contexto

- Fase 4 implementada na branch `agent/base-catalogs`.
- PR atual: #14 — Cadastros base e primeiro fluxo funcional.
- CI passou lint, typecheck, testes e build.
- Próxima Issue: #15 — Estoque transacional: entrada, retirada e transferência.

## Objetivo atual

Integrar os cadastros base e implementar o primeiro fluxo transacional de estoque usando o ledger definido no ADR-002 e o custeio do ADR-003.

## Fazer agora

1. Integrar o PR #14 na `main` e encerrar a Issue #13.
2. Criar branch dedicada à Issue #15 a partir da `main` atualizada.
3. Implementar `StockMovement` e `StockMovementItem`.
4. Implementar uma projeção reconstruível de saldo por `StockItem + StockLocation`.
5. Implementar entrada simplificada com quantidade e custo unitário.
6. Implementar retirada com motivo/local e bloqueio de estoque negativo por padrão.
7. Implementar transferência em duas etapas:
   - despacho reduz saldo da origem;
   - recebimento aumenta saldo do destino;
   - operação permanece em trânsito entre as etapas.
8. Aplicar custo médio ponderado móvel nas entradas e preservar snapshots de custo nas saídas.
9. Integrar saldos e histórico ao workspace de demonstração.
10. Criar testes para entrada, retirada, transferência, recebimento, estoque negativo e custo médio.
11. Rodar CI completo e corrigir qualquer falha.
12. Atualizar CURRENT_STATE, HANDOFF e NEXT_ACTION ao concluir.

## Não fazer ainda

- Não criar Supabase.
- Não implementar lotes/FEFO completos.
- Não implementar inventário físico completo.
- Não criar autenticação real.
- Não migrar dados reais.
- Não iniciar financeiro/caixa antes do ledger básico de estoque estar estável.

## Critério de conclusão

No workspace de demonstração deve ser possível registrar entrada, retirada, despachar uma transferência e recebê-la no destino, com saldos/custos/histórico coerentes e CI passando.

## Regra estrutural

Saldo nunca é editado diretamente. Toda mudança física deve ter movimento rastreável e respeitar ADR-002/ADR-003.