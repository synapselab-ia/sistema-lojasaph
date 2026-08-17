# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 6 — lotes, validades e inventário físico: implementada na branch `agent/lots-expiry-inventory-count`, PR #18, com CI completo passando antes do fechamento documental.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #17 — Fase 6 — Lotes, validades e inventário físico
- Branch atual: `agent/lots-expiry-inventory-count`
- PR atual: #18 — Fase 6 — lotes, validades e inventário físico
- Próxima Issue criada: #19 — Fase 7 — Persistência PostgreSQL/Supabase e segurança base
- Projeto remoto Supabase ainda não está conectado.

## Fases concluídas

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: modelo de domínio, ERD e ADR-001 a ADR-005.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base de estrutura, produtos e fornecedores.
- Fase 5: ledger de estoque com entrada, retirada, transferência e custo médio.

## Fase 6 — implementado

- `InventoryBatch` por produto + local;
- código de lote e validade opcionais, sem inventar dados desconhecidos;
- quantidade original e remanescente por lote;
- custo físico do lote preservado;
- alocação FEFO como default quando nenhum lote é preferido;
- possibilidade de lote preferencial no domínio;
- transferência preservando lote/validade e materializando lote no destino;
- classificação de vencido / 7 / 15 / 30 dias / validade desconhecida;
- UI `/cadastros/validades` com alertas, prioridade FEFO e entrada com lote;
- `InventoryCount` com snapshot do saldo esperado;
- bloqueio de confirmação de contagem quando o saldo mudou após o início (`INVENTORY_COUNT_STALE`);
- ajuste positivo/negativo por movimentos do ledger;
- UI `/cadastros/inventarios` para contagem e histórico;
- adapters in-memory de lotes e inventários;
- fixtures anonimizados de lotes;
- testes de validade, FEFO, transferência de lote e inventário físico;
- documentação de estoque atualizada.

## Persistência atual

A aplicação ainda usa repositories/adapters in-memory no workspace de demonstração. Reload restaura fixtures anonimizados.

Isso foi mantido até esta fase para estabilizar o ciclo físico de estoque antes de criar schema e políticas reais.

## Validação

O CI do PR #18 passou:

1. `npm ci`;
2. lint;
3. typecheck;
4. testes unitários/integração;
5. build de produção.

Uma nova execução de CI deve validar os commits documentais finais antes do merge.

## Decisão para a próxima fase

PostgreSQL será o modelo físico relacional. Supabase passa a ser o provedor hospedado inicial preferido, mantendo o domínio e a UI desacoplados através de repositories/adapters.

A escolha é revisável: nenhuma regra de negócio passa a depender do SDK do Supabase.

## Próxima ação

Após integrar o PR #18 e encerrar a Issue #17, iniciar a Issue #19 em branch própria a partir da `main`: schema/migrations PostgreSQL/Supabase, RLS e segurança base.

Consulte `docs/ai/NEXT_ACTION.md`.