# Handoff — Sistema Lojasaph

## Estado

A auditoria de `REQ-PLAT-002 — Proteção contra duplicidade` foi concluída após a Fase 27.

Resultado: o PostgreSQL/Supabase já protege corretamente os write paths críticos quando recebe a mesma chave de comando, mas o cliente real não preserva essa chave por intenção do usuário. A lacuna foi convertida na Issue #71 — **Fase 28 — idempotência ponta a ponta das operações críticas**.

Estado antes deste commit documental:

- `main`: `265c3262b8cfd0b22e549118505911950c5019f3`;
- `agent/responsive-workspace`: idêntica à `main`;
- Issue #71 — open;
- PRs abertos — 0;
- CI #297 — success;
- Business Transactions Integration #152 — success;
- nenhum patch funcional nesta auditoria;
- nenhum DDL/RLS/grant/RPC/Auth change;
- nenhum deployment Vercel.

Branch nova de continuidade: `agent/idempotency-e2e`.

## Auditoria concluída — não repetir

Foram auditados 26 write paths críticos:

- Estoque: entrada, retirada, perda/vencimento e devolução;
- Transferências: despacho e recebimento;
- Inventário: início, linha, confirmação e cancelamento;
- Compras: criação, emissão, recebimento e cancelamento;
- Financeiro: documento, cancelamento, pagamento e estorno;
- Caixa: caixa, meio de pagamento, regra de taxa, abertura, total por meio, movimento, fechamento e cancelamento.

### Backend

No Supabase remoto, os RPCs públicos atuais são wrappers de autorização/escopo e delegam a `private.*`.

A introspecção read-only comprovou que as implementações privadas efetivas possuem, direta ou indiretamente:

- `p_command_id`;
- advisory lock por command ID;
- replay compatível sem efeitos duplicados;
- `IDEMPOTENCY_KEY_CONFLICT` quando a mesma chave é reaproveitada com payload semântico incompatível.

`private.record_stock_loss` delega a `private.record_stock_outflow`, onde estão o lock e a comparação semântica. `private.record_stock_entry` também já contém lock e comparação completa de payload; não usar a migration histórica inicial como representação da definição final.

Testes SQL existentes já cobrem replay/conflito em vários módulos. Evitar duplicar suites já suficientes.

### Cliente — lacuna comprovada

- gateways de Estoque/Perdas/Devoluções/Transferências aceitam `commandId` opcional, mas os chamadores reais não o passam;
- gateways de Inventário/Compras/Financeiro/Caixa geram `newEntityId()` dentro de cada mutação;
- botão em `saving` evita parte dos double-clicks, mas retry após falha ambígua de transporte produz nova chave;
- nova chave significa nova intenção legítima para o banco, portanto existe risco de duplicidade apesar do backend idempotente.

Esse é o único motivo para `REQ-PLAT-002` continuar aberto.

## Issue #71 / Fase 28

Objetivo: tornar o command ID estável por intenção do usuário no runtime real.

Defaults definidos na Issue:

- UUID opaco, sem PII;
- gerar uma vez por intenção;
- retry da mesma intenção reutiliza a mesma chave;
- alteração semântica do draft cria nova intenção;
- sucesso definitivo encerra a intenção;
- erro de validação definitivo pode encerrar a intenção;
- erro ambíguo de transporte preserva a chave;
- double submit não pode gerar duas intenções concorrentes;
- `IDEMPOTENCY_KEY_CONFLICT` continua explícito;
- preservar backend, RLS, roles, scopes e regras de negócio já corretos;
- sem deploy Vercel durante iteração.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Confirmar estado real de `main`, `agent/idempotency-e2e`, Issue #71, PRs e workflows antes de editar.
3. Não repetir a auditoria de backend; usar a Issue #71 e este handoff como baseline.
4. Implementar uma abstração pequena/testável de ciclo de vida de command ID por intenção.
5. Integrá-la progressivamente em Estoque, Baixas, Devoluções, Transferências, Inventários, Compras, Financeiro e Caixa.
6. Garantir que adapters/gateways possam receber command ID explicitamente onde hoje o geram internamente.
7. Cobrir retry após falha ambígua, reset após sucesso/mudança semântica e double submit/concurrent submit.
8. Completar apenas a cobertura SQL faltante de baixo custo, principalmente conflito explícito de entrada de estoque e mutações de Caixa ainda sem caso dedicado na suite.
9. Rodar lint, typecheck, Vitest, build e workflows PostgreSQL aplicáveis.
10. Se houver mudança de banco realmente necessária, justificar antes; migration não é esperada para o problema já comprovado.
11. Não fazer Vercel deploy durante implementação; homologação hospedada só se houver motivo real ao final.
12. Atualizar continuidade ao encerrar a próxima sessão.

## Supabase / Production

Projeto `fhbvwyttikrbeaanatlr` permanece `ACTIVE_HEALTHY` em PostgreSQL 17.

A auditoria usou apenas queries read-only de definição de funções. Nenhuma tabela, função, policy, grant, dado operacional ou configuração foi modificada.

Production Vercel continua deliberadamente no deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`, commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`, com auto-deploy desabilitado.

## Não fazer

- não reabrir #69;
- não criar outra Issue para `REQ-PLAT-002` enquanto #71 estiver ativa;
- não reescrever idempotência do banco já comprovada;
- não ampliar RLS/grants;
- não tratar advisor genérico como regressão desta fase;
- não reativar bootstrap ou auto-deploy;
- não usar dados/credenciais reais em testes;
- não inferir Q-001..Q-025.
