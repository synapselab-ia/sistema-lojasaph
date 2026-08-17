# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 5 — estoque transacional: implementada na branch `agent/inventory-ledger`, PR #16, com CI completo passando.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #15 — Estoque transacional: entrada, retirada e transferência
- Branch atual: `agent/inventory-ledger`
- PR atual: #16 — estoque transacional com ledger
- Próxima Issue: #17 — Lotes, validades e inventário físico
- Supabase ainda não foi escolhido/configurado.

## Fases concluídas

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: modelo de domínio, ERD e ADR-001 a ADR-005.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base de estrutura, produtos e fornecedores.

## Fase 5 — implementado

- `Quantity` com milésimos inteiros e até três casas decimais;
- StockMovement e StockMovementItem lógicos;
- InventoryBalance por produto + local;
- entrada com custo unitário e custo médio ponderado móvel;
- retirada com bloqueio de estoque negativo;
- transferência com despacho separado de recebimento;
- estado em trânsito e recebimento parcial suportado pelo domínio;
- snapshots de custo nas saídas/transferências;
- repositories/adapters in-memory para saldo, movimentos e transferências;
- fila interna que serializa mutações do workspace demo;
- saldos iniciais anonimizados;
- página `/cadastros/estoque` com saldos, entrada, retirada, transferência e histórico;
- testes para custo médio, estoque negativo, transferência e retiradas concorrentes;
- documentação em `docs/modules/inventory.md`.

## Persistência atual

Todos os dados funcionais continuam em adapters in-memory/fixtures. O workspace reinicia ao recarregar. Isso é intencional enquanto domínio e UX estão sendo estabilizados.

A fila interna de mutações NÃO substitui transação de banco. Persistência real precisará executar validação + ledger + projeção de saldo atomicamente.

## Validação

O CI do PR #16 passou:

1. `npm ci`;
2. lint;
3. typecheck;
4. testes unitários/integração;
5. build de produção.

## Invariantes já implementadas

1. Saldo não é editado diretamente.
2. Entrada gera movimento e recalcula custo médio.
3. Retirada exige saldo disponível.
4. Transferência reduz origem no despacho e só aumenta destino no recebimento.
5. Custo da transferência é preservado por snapshot.
6. Mutações simultâneas da demonstração são serializadas.
7. Quantidades não usam float binário cru no domínio.

## Próxima ação

Após integrar o PR #16 e encerrar a Issue #15, iniciar a Issue #17 — lotes, validades e inventário físico — em branch criada a partir da `main` atualizada.

Consulte `docs/ai/NEXT_ACTION.md`.