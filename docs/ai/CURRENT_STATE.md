# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 27 foi concluída e `REQ-PLAT-001 — Responsivo` permanece fechada pela Issue #69 / PR #70.

A auditoria transversal de `REQ-PLAT-002 — Proteção contra duplicidade` foi concluída nesta sessão. O backend já possui proteção forte de idempotência nos write paths críticos, mas foi comprovada uma lacuna ponta a ponta na camada cliente. Por isso foi criada a Issue #71 — **Fase 28 — idempotência ponta a ponta das operações críticas**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #69 — closed/completed
- PR #70 — merged
- Issue #71 — open
- Fase 27 merge: `7fe0f574504a1cb7080a54e8391cb1f26ca31ce2`
- baseline documental anterior: `265c3262b8cfd0b22e549118505911950c5019f3`
- CI #297 — success
- Business Transactions Integration #152 — success
- nenhum patch funcional nesta sessão
- nenhuma migration/DDL
- nenhuma alteração de RLS, grants, roles, RPCs, Auth ou regras transacionais
- nenhum deployment Vercel

## REQ-PLAT-002 — auditoria concluída

Foram auditados 26 write paths críticos:

- Estoque: entrada, retirada, baixa/perda/vencimento e devolução relacionada;
- Transferências: despacho e recebimento;
- Inventário: início, atualização de linha, confirmação e cancelamento;
- Compras: criação, emissão, recebimento e cancelamento;
- Financeiro: criação/cancelamento de documento, pagamento e estorno;
- Caixa: criação de caixa, meio de pagamento e regra de taxa; abertura de sessão, total por meio, movimento, fechamento e cancelamento.

### Backend efetivo

O Supabase remoto foi inspecionado em modo leitura.

Os RPCs públicos atuais são wrappers de Auth/role/scope e delegam para implementações `private.*`. Nas implementações efetivas foi comprovado:

- `p_command_id` em todos os caminhos críticos;
- serialização concorrente por advisory lock da chave;
- replay idêntico reaproveitado sem duplicar efeitos;
- reutilização semântica incompatível rejeitada com `IDEMPOTENCY_KEY_CONFLICT`;
- `record_stock_loss` herda o contrato de `private.record_stock_outflow`;
- `record_stock_entry` já está endurecido na implementação privada atual, apesar da migration histórica original não representar a definição final.

Os testes SQL existentes já comprovam replay e/ou conflito em Retirada, Transferências, Inventário, Compras, Financeiro, Perdas e Devoluções. `schema_smoke.sql` comprova replay idêntico de entrada de estoque.

### Lacuna concreta no cliente

O requisito ainda não está fechado porque a chave não é preservada de ponta a ponta por intenção do usuário.

Foi comprovado que:

- `SupabaseStockEntryGateway`, `SupabaseStockWithdrawalGateway`, `SupabaseStockLossGateway`, `SupabaseStockReturnGateway` e `SupabaseStockTransferGateway` aceitam `commandId` opcional, mas os chamadores reais não o fornecem;
- `SupabaseInventoryCountGateway`, `SupabasePurchaseGateway`, `SupabaseFinanceGateway` e `SupabaseCashGateway` geram `newEntityId()` dentro de cada mutação;
- as telas desabilitam botões durante `saving`, o que reduz clique duplicado simultâneo, mas não cobre retry após resultado ambíguo de transporte;
- numa nova tentativa após falha de rede, outro UUID pode ser gerado e o PostgreSQL interpreta a operação como nova intenção legítima.

Portanto o backend é retry-safe quando a mesma chave chega novamente, mas o runtime atual não garante essa reapresentação.

## Fase 28

Issue #71 foi criada apenas para a lacuna comprovada.

Objetivo: gerar uma chave opaca uma vez por intenção crítica, reutilizá-la em retries da mesma intenção, invalidá-la somente após resultado definitivo ou mudança semântica do draft e cobrir double submit/retry com testes de regressão.

Defaults:

- preservar RPCs, domínio, RLS, roles, scopes e transações já corretos;
- não usar hash de payload como command ID;
- manter `IDEMPOTENCY_KEY_CONFLICT` explícito;
- erro ambíguo de transporte não cria nova intenção automaticamente;
- mudança semântica do draft gera nova intenção;
- sem Vercel durante iteração;
- nenhuma migration esperada para corrigir apenas o ciclo de vida da chave no client.

Branch de trabalho criada: `agent/idempotency-e2e`.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17, permanece `ACTIVE_HEALTHY`.

Nesta sessão houve somente introspecção SQL read-only de definições de funções. Nenhum dado operacional, schema, grant, RLS, RPC ou configuração foi alterado.

Estado operacional preservado:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- bootstrap desabilitado em Production.

Os avisos genéricos do advisor de segurança continuam fora do escopo da Fase 28 salvo regressão diretamente relacionada.

## Vercel Production

`git.deploymentEnabled=false` continua intacto.

Último Production intencional permanece:

- deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` — READY;
- commit funcional hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

Nenhum deployment foi criado nesta auditoria.

## Próxima ação

Executar a Issue #71 na branch `agent/idempotency-e2e` sem repetir a auditoria de backend.

A implementação deve focar o ciclo de vida do command ID no client/runtime, integrar os módulos críticos, adicionar regressão de retry/reset/double submit e completar apenas a cobertura SQL faltante de baixo custo.

## Não repetir

- não reabrir Fases 26/27;
- não refazer a auditoria transversal de `REQ-PLAT-002`;
- não criar outra Issue para a mesma lacuna;
- não reescrever RPCs já comprovadamente idempotentes sem regressão específica;
- não alterar RLS/grants para facilitar retry;
- não reativar bootstrap ou auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
