# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 2 está concluída na branch `agent/domain-model` e pronta para integração.

A próxima Issue é #10 — Fase 3 — Fundação técnica da aplicação.

## Não repetir

- não refazer a engenharia reversa das seis planilhas;
- não reabrir defaults P0 sem evidência concreta do cliente;
- não redesenhar o domínio ignorando os ADRs existentes;
- não criar Supabase antes da fase específica.

## Documentos centrais

Ler, além dos arquivos obrigatórios:

- `docs/architecture/domain-model.md`
- `docs/architecture/data-model.md`
- `docs/architecture/erd.md`
- `docs/architecture/phase-2-validation.md`
- `docs/decisions/ADR-001-organizational-and-p0-defaults.md`
- `docs/decisions/ADR-002-inventory-ledger-and-balance.md`
- `docs/decisions/ADR-003-inventory-costing.md`
- `docs/decisions/ADR-004-payables-and-payments.md`
- `docs/decisions/ADR-005-cash-session-model.md`

## Decisões que não podem se perder

- Organization → Business → Unit → Sector/StockLocation;
- saldo de estoque não é campo editável; é derivado do ledger;
- transferência: despacho e recebimento em etapas separadas;
- empréstimo: processo distinto com retorno pendente;
- custo médio ponderado móvel como default gerencial;
- custo de lote e snapshots históricos preservados;
- PayableDocument → Installment → Payment, com múltiplos pagamentos por parcela;
- CashSession como unidade de fechamento, sem tabelas mensais;
- SalesItem separado de StockItem;
- operações críticas com idempotência, transação e auditoria;
- dados reais das planilhas não são versionados no GitHub.

## Próxima implementação

A Fase 3 deve criar a aplicação web e toolchain de qualidade, mantendo persistência desacoplada por repositories/adapters e usando fixtures/in-memory inicialmente.

Ela não deve implementar módulos completos nem escolher Supabase por conveniência.

## Segurança

Nunca versionar tokens, senhas, chaves ou dados operacionais sensíveis. `.env.example` pode conter apenas nomes de variáveis e exemplos inofensivos.

## Regra de eficiência

Usar defaults profissionais e reversíveis quando possível. Só interromper para perguntar ao usuário quando uma decisão tiver risco real de retrabalho estrutural.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.