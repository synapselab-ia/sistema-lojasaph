# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 2 — modelo de domínio, dados e ADRs fundamentais: concluída na branch `agent/domain-model`, pronta para integração.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #8 — Fase 2 — Modelo de domínio, dados e ADRs fundamentais
- Branch: `agent/domain-model`
- Próxima Issue já criada: #10 — Fase 3 — Fundação técnica da aplicação
- Ainda não existe aplicação/toolchain de código na `main`.

## Histórico concluído

### Fase 0 — governança

Criados `AGENTS.md`, `START-HERE`, workflow, handoff, current state e NEXT_ACTION.

### Fase 1 — engenharia reversa

As seis planilhas foram analisadas e transformadas em documentação de campos, regras, requisitos, dúvidas e migração, sem versionar os arquivos reais.

### Defaults P0

`ADR-001` formaliza hierarquia multi-negócio e defaults revisáveis: Organization → Business → Unit → Sector/StockLocation, separação SalesItem/StockItem, transferência/empréstimo, caixa consolidado e custeio inicial.

### Fase 2 — modelo lógico

Entregáveis criados:

- `docs/architecture/domain-model.md`
- `docs/architecture/data-model.md`
- `docs/architecture/erd.md`
- `docs/architecture/phase-2-validation.md`
- `docs/decisions/ADR-002-inventory-ledger-and-balance.md`
- `docs/decisions/ADR-003-inventory-costing.md`
- `docs/decisions/ADR-004-payables-and-payments.md`
- `docs/decisions/ADR-005-cash-session-model.md`

## Decisões estruturais vigentes

1. GitHub é a fonte oficial de verdade.
2. O sistema é multi-negócio e multi-unidade.
3. Setor e local de estoque são conceitos distintos.
4. `StockItem` e `SalesItem` são conceitos distintos.
5. Saldo de estoque é projeção reconstruível de um ledger de movimentos confirmados.
6. Movimento confirmado é corrigido por reversão, não por exclusão silenciosa.
7. Transferência possui despacho e recebimento separados.
8. Empréstimo controla quantidade pendente de retorno.
9. Custeio gerencial padrão: custo médio ponderado móvel, preservando custo de lote e snapshots históricos.
10. Financeiro separa PayableDocument → Installment → Payment; parcela suporta múltiplos pagamentos.
11. Caixa é modelado por `CashSession`, com totais por forma de pagamento, entradas/sangrias e esperado x contado.
12. Operações críticas devem ser idempotentes, transacionais e auditáveis.
13. Supabase ainda não foi escolhido nem criado.

## Validação

A Fase 2 foi validada contra cenários de organização, estoque, fornecedores/compras, financeiro, caixa, migração e auditoria em `docs/architecture/phase-2-validation.md`.

Ainda não existem lint/typecheck/test/build porque a aplicação será criada na Fase 3.

## Próxima ação

Após integrar a Fase 2, executar a Issue #10 — Fundação técnica da aplicação.

Consulte `docs/ai/NEXT_ACTION.md`.

## Regra para o próximo chat

Ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md`, `WORKFLOW.md`, os ADRs e conferir o estado real de Issues/branches/PRs antes de agir.