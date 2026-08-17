# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 6 está implementada na branch `agent/lots-expiry-inventory-count`, PR #18. O primeiro CI funcional passou e falta apenas a validação final dos commits documentais antes do merge.

A próxima Issue é #19 — Persistência PostgreSQL/Supabase e segurança base.

## Não repetir

- não refazer engenharia reversa;
- não reabrir defaults P0 sem evidência concreta;
- não ignorar ADR-001 a ADR-005;
- não editar saldo diretamente;
- não misturar UI e persistência;
- não tratar adapters in-memory como produção;
- não colocar segredos ou dados reais do cliente no GitHub;
- não espalhar chamadas Supabase pela UI quando a persistência real entrar.

## O sistema já possui

- Next.js/React/TypeScript strict, Tailwind, ESLint, Vitest e CI;
- package-lock e `npm ci`;
- estrutura multi-negócio/unidade;
- produtos e fornecedores com contatos/preços;
- `Money`, `Quantity`, `EntityId`, `DomainError`;
- ledger de estoque, saldos, entradas, retiradas e transferências;
- custo médio ponderado;
- InventoryBatch com lote/validade/custo/saldo remanescente;
- FEFO como default de alocação;
- preservação de lote em transferência;
- InventoryCount com snapshot e ajustes pelo ledger;
- bloqueio de contagem desatualizada;
- UI de estoque, validades e inventários;
- fixtures anonimizados.

## Persistência atual

Tudo continua em memória no navegador e reinicia em reload. A Fase 7 deve começar a substituir isso por adapters reais sem remover os adapters in-memory usados em testes/demonstração.

## Invariantes que não podem se perder

- saldo é projeção, nunca campo editável;
- toda alteração física gera movimento;
- transferência só entra no destino após recebimento;
- custo médio e snapshots são conceitos distintos;
- lote/validade pertence a produto + local + quantidade;
- lote desconhecido permanece desconhecido; não fabricar validade;
- inventário confirmado gera movimentos de ajuste;
- contagem com saldo alterado após início deve falhar;
- Quantity usa até 3 casas sem float binário cru;
- operações reais de estoque precisam de transação/locking;
- SalesItem continua separado de StockItem;
- dados reais do cliente não são fixtures.

## Direção de persistência aprovada

- PostgreSQL como modelo físico;
- Supabase como provedor hospedado inicial preferido;
- migrations/schema ficam versionados no repositório;
- RLS deve proteger tabelas expostas;
- Auth/Storage podem ser usados quando os módulos precisarem;
- domínio não importa SDK Supabase;
- repositories/adapters são a fronteira.

## Próxima implementação — Issue #19

- ADR de persistência;
- estrutura `supabase/` versionada;
- migrations para organização, catálogo, fornecedores e núcleo de estoque;
- constraints e tipos exatos;
- membership e RLS por Organization;
- seed somente com dados demo;
- validação de migrations em CI quando possível sem projeto remoto;
- adapters reais gradualmente, mantendo os in-memory.

## Regra de eficiência

Usar defaults profissionais/reversíveis e interromper o usuário somente por risco estrutural real ou dependência externa inevitável.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.