# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 4 está implementada na branch `agent/base-catalogs`, PR #14, com CI completo passando.

A próxima Issue é #15 — Estoque transacional: entrada, retirada e transferência.

## Não repetir

- não refazer engenharia reversa das planilhas;
- não reabrir defaults P0 sem evidência concreta;
- não ignorar ADR-001 a ADR-005;
- não criar Supabase por conveniência;
- não espalhar acesso a persistência pela UI;
- não editar saldo diretamente;
- não tratar workspace in-memory como persistência de produção.

## Fundação existente

- Next.js/React/TypeScript strict;
- Tailwind, ESLint, Vitest;
- CI com `npm ci`, lint, typecheck, testes e build;
- package-lock versionado;
- value objects `Money`, `EntityId`, `DomainError`;
- arquitetura repositories/adapters;
- health endpoint;
- shell e navegação administrativa.

## Cadastros existentes

- estrutura organizacional visual;
- StockItem com categoria/unidade/tipo/flags;
- Supplier com múltiplos contatos;
- preço observado por fornecedor/produto;
- MasterDataService;
- adapters in-memory e fixtures anonimizados;
- páginas `/cadastros`, `/cadastros/estrutura`, `/cadastros/produtos`, `/cadastros/fornecedores`.

## Persistência atual

O workspace de cadastros vive na memória do navegador e reinicia em reload. Isso é explícito e aceitável apenas para desenvolvimento/demonstração.

## Decisões que não podem se perder

- Organization → Business → Unit → Sector/StockLocation;
- SalesItem separado de StockItem;
- saldo de estoque derivado do ledger;
- transferência com despacho e recebimento separados;
- empréstimo distinto;
- custo médio ponderado móvel como default;
- snapshots de custo preservados;
- financeiro PayableDocument → Installment → Payment;
- caixa por CashSession;
- domínio independente de framework/banco;
- operações críticas com idempotência, transação e auditoria;
- dados reais das planilhas não são fixtures.

## Próxima implementação — Issue #15

Implementar estoque transacional ainda em memória:

- StockMovement/StockMovementItem;
- projeção de saldo por StockItem + StockLocation;
- entrada com quantidade e custo;
- retirada com bloqueio de saldo negativo;
- transferência: despacho separado de recebimento;
- custo médio ponderado;
- histórico e tela de saldos;
- testes das invariantes.

## Segurança

Nunca versionar segredos ou dados operacionais sensíveis.

## Regra de eficiência

Usar defaults reversíveis e só interromper o usuário por risco estrutural real.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.