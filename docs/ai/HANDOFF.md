# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 3 está implementada na branch `agent/technical-foundation`, PR #12, com CI validando a fundação técnica.

A próxima Issue é #13 — Fase 4 — Cadastros base e primeiro fluxo funcional.

## Não repetir

- não refazer a engenharia reversa das seis planilhas;
- não reabrir defaults P0 sem evidência concreta do cliente;
- não redesenhar o domínio ignorando ADR-001 a ADR-005;
- não criar Supabase por conveniência;
- não substituir repositories por chamadas de banco espalhadas na UI;
- não remover o ledger de estoque nem transformar saldo em campo editável.

## Documentos centrais

- `docs/architecture/domain-model.md`
- `docs/architecture/data-model.md`
- `docs/architecture/erd.md`
- `docs/architecture/technical-foundation.md`
- `docs/decisions/ADR-001-organizational-and-p0-defaults.md`
- `docs/decisions/ADR-002-inventory-ledger-and-balance.md`
- `docs/decisions/ADR-003-inventory-costing.md`
- `docs/decisions/ADR-004-payables-and-payments.md`
- `docs/decisions/ADR-005-cash-session-model.md`
- `docs/qa/definition-of-done.md`

## Fundação técnica existente

- Next.js/React/TypeScript strict;
- Tailwind;
- ESLint;
- Vitest;
- CI por GitHub Actions;
- package-lock versionado e `npm ci` no CI;
- `Money`, `EntityId`, `DomainError`;
- `StockItem` inicial;
- repository contract + adapter in-memory;
- health endpoint;
- shell inicial da aplicação.

## Decisões que não podem se perder

- Organization → Business → Unit → Sector/StockLocation;
- SalesItem separado de StockItem;
- saldo de estoque derivado do ledger;
- transferência com despacho e recebimento separados;
- empréstimo distinto com retorno pendente;
- custo médio ponderado móvel como default gerencial;
- custo de lote e snapshots preservados;
- PayableDocument → Installment → Payment com múltiplos pagamentos por parcela;
- CashSession como unidade de fechamento;
- domínio independente de framework/banco;
- persistência por repositories/adapters;
- operações críticas com idempotência, transação e auditoria;
- dados reais das planilhas não são versionados.

## Próxima implementação

A Issue #13 deve criar o primeiro fluxo funcional de cadastros usando persistência in-memory/fixtures:

- estrutura organizacional;
- produtos/itens;
- fornecedores e contatos;
- vínculo fornecedor-item/preço básico;
- navegação administrativa inicial;
- casos de uso e testes.

Depois disso, o próximo fluxo deverá ser estoque transacional: entrada, retirada e transferência.

## Segurança

Nunca versionar tokens, senhas, chaves ou dados operacionais sensíveis. `.env.example` contém somente exemplos seguros.

## Regra de eficiência

Usar defaults profissionais e reversíveis quando possível. Só interromper para perguntar ao usuário quando houver risco real de retrabalho estrutural.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.