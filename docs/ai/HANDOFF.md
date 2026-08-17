# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 5 está implementada na branch `agent/inventory-ledger`, PR #16, com CI completo passando.

A próxima Issue é #17 — Lotes, validades e inventário físico.

## Não repetir

- não refazer engenharia reversa;
- não reabrir defaults P0 sem evidência concreta;
- não ignorar ADR-001 a ADR-005;
- não criar Supabase por conveniência;
- não editar saldo diretamente;
- não misturar UI e persistência;
- não tratar adapters in-memory como produção.

## O sistema já possui

- Next.js/React/TypeScript strict, Tailwind, ESLint, Vitest e CI;
- package-lock e `npm ci`;
- estrutura multi-negócio/unidade;
- produtos e fornecedores com contatos/preços;
- `Money`, `Quantity`, `EntityId`, `DomainError`;
- StockMovement/InventoryBalance/StockTransfer;
- entrada, retirada e transferência em duas etapas;
- custo médio ponderado móvel;
- serialização lógica das mutações da demo;
- UI de saldos, movimentos e transferências.

## Persistência atual

Tudo continua em memória no navegador e reinicia em reload. A próxima fase também pode continuar assim para estabilizar lote/validade/inventário antes do banco real.

## Invariantes que não podem se perder

- saldo é projeção, nunca campo editável;
- toda alteração física gera movimento;
- retirada não pode gerar saldo negativo por padrão;
- transferência só entra no destino após recebimento;
- custo da saída é snapshot do custo vigente;
- custo médio é recalculado nas entradas;
- Quantity suporta até 3 casas sem float binário cru;
- mutações críticas reais precisarão de transação/locking no banco;
- SalesItem continua separado de StockItem;
- dados reais do cliente não são fixtures.

## Próxima implementação — Issue #17

- InventoryBatch por item + local + lote + validade + custo;
- entrada com lote/validade opcional;
- lotes vencidos/próximos do vencimento;
- sugestão FEFO;
- alocação de retirada a lote quando aplicável;
- InventoryCount com snapshot esperado;
- contagem física;
- confirmação gerando movimentos de ajuste;
- histórico de inventários e testes.

## Regra de eficiência

Usar defaults profissionais/reversíveis e interromper o usuário somente por risco estrutural real.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.