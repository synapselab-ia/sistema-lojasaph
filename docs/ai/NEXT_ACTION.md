# Next Action — Sistema Lojasaph

## Contexto

- Fase 5 implementada na branch `agent/inventory-ledger`.
- PR atual: #16 — estoque transacional com ledger.
- CI passou `npm ci`, lint, typecheck, testes e build.
- Próxima Issue: #17 — Lotes, validades e inventário físico.

## Objetivo atual

Integrar o ledger básico e estender o estoque para lote/validade e inventário físico antes da decisão de persistência real.

## Fazer agora

1. Integrar o PR #16 na `main` e encerrar a Issue #15.
2. Criar branch dedicada à Issue #17 a partir da `main` atualizada.
3. Implementar InventoryBatch associado a item + local, com custo, lote e validade.
4. Permitir entrada com lote/validade opcional quando o item exigir rastreamento.
5. Manter quantidade remanescente do lote coerente com movimentos alocados.
6. Exibir alertas de vencido e janelas 7/15/30 dias.
7. Implementar sugestão FEFO, sem tornar a automação obrigatória ainda.
8. Implementar InventoryCount com snapshot de saldo esperado por local.
9. Registrar contagens e confirmar inventário gerando movimentos de ajuste positivos/negativos.
10. Nunca sobrescrever saldo diretamente durante inventário.
11. Integrar lotes, alertas e inventários à UI demo.
12. Criar testes para validade, lote, consumo, FEFO e ajustes de contagem.
13. Rodar CI e corrigir falhas.
14. Atualizar CURRENT_STATE, HANDOFF e NEXT_ACTION.

## Não fazer ainda

- Não criar Supabase.
- Não migrar dados reais.
- Não implementar compras/financeiro/caixa completos.
- Não criar autenticação real.
- Não forçar FEFO sem necessidade operacional confirmada.

## Critério de conclusão

O workspace deve registrar lotes/validades, sinalizar vencimentos e executar um inventário físico que gere ajustes rastreáveis no ledger, com CI passando.

## Regra estrutural

Validade pertence ao lote/quantidade/local, nunca ao produto mestre. Inventário confirmado gera movimentos; saldo continua derivado.