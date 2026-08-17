# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 8 foi concluída e integrada pelo PR #23. A Issue #24 — Fase 9 — estoque transacional completo no Supabase — está em andamento.

A primeira entrega da Fase 9 é o PR #25 (`agent/stock-transactional-runtime`): retirada persistente com FEFO/lote preferido, idempotência, locks, auditoria e política configurável de estoque negativo.

A Issue #24 não deve ser fechada com o PR #25. Depois dele, a próxima entrega é transferência transacional em duas etapas.

## Não repetir

- não refazer engenharia reversa/modelagem consolidada;
- não recriar o projeto Supabase;
- não reimplementar Auth SSR/login/recovery/membership;
- não reimplementar `record_stock_entry`;
- não reimplementar retirada/FEFO depois que o PR #25 estiver na `main`;
- não editar saldo diretamente;
- não remover RLS;
- não conceder write direto no ledger;
- não usar secret/admin client em operação normal;
- não autorizar por `user_metadata`;
- não migrar dados reais do cliente antes da homologação planejada.

## O sistema já possui

- Next.js/React/TypeScript strict, Tailwind, Vitest e CI;
- domínio multi-negócio/multi-unidade;
- schema PostgreSQL/Supabase versionado;
- projeto remoto homologado em `sa-east-1`;
- RLS por membership;
- Auth SSR e workspace autenticado;
- produtos e fornecedores persistentes;
- `record_stock_entry` transacional/idempotente;
- `record_stock_withdrawal` transacional/idempotente na Fase 9A;
- leitura persistente de saldos e lotes ativos;
- adapters/gateways Supabase sem acoplar domínio ao SDK;
- demo in-memory mantida para transferência/inventário até haver paridade real.

## Retirada persistente — Fase 9A

Arquivos principais:

- `supabase/migrations/20260817223301_transactional_stock_withdrawal.sql`;
- `supabase/tests/stock_withdrawal.sql`;
- `src/modules/inventory/adapters/supabase-stock-withdrawal-gateway.ts`;
- `src/modules/master-data/adapters/supabase-workspace-query.ts`;
- `src/modules/master-data/ui/runtime-workspace-provider.tsx`;
- `src/app/workspace/(operacao)/estoque/page.tsx`.

Garantias do RPC:

1. `auth.uid()` obrigatório;
2. roles `owner/admin/manager/inventory`;
3. advisory transaction lock por command ID;
4. payload idempotente validado;
5. balance `FOR UPDATE`;
6. lotes candidatos bloqueados em ordem determinística;
7. lote preferido primeiro;
8. restante por FEFO;
9. custo da saída = custo médio vigente no momento do movimento;
10. saldo/lotes/movimento/alocações/audit na mesma transação;
11. lote esgotado vira `depleted`;
12. nenhuma escrita direta cliente-side no ledger.

## Estoque negativo

ADR-002 prevê default proibido com exceção configurável por local. A implementação física agora respeita isso:

- saldo negativo só é aceito quando `stock_locations.allow_negative_stock=true`;
- item rastreado por lote/validade continua exigindo estoque físico/lotes suficientes;
- local não pode voltar a `allow_negative_stock=false` enquanto existir saldo negativo nele.

Não remover esses triggers para “simplificar”.

## Validação concluída da Fase 9A

CI do PR #25 passou:

- npm ci;
- lint;
- typecheck;
- Vitest;
- build;
- todas as migrations em PostgreSQL 17 limpo;
- seed demo;
- smoke RLS/RPC;
- role/Organization isolation;
- suíte de retirada.

Casos SQL:

- FEFO;
- lote preferido;
- retry idempotente;
- conflito de command ID com payload diferente;
- estoque insuficiente com rollback;
- viewer negado;
- cross-Organization negado;
- anon negado;
- negativo bloqueado por default;
- negativo permitido quando configurado;
- impossibilidade de desligar a exceção enquanto houver saldo negativo.

## Supabase remoto

A migration `transactional_stock_withdrawal` já foi aplicada no projeto homologado.

Teste remoto em `BEGIN/ROLLBACK`:

- saldo demo inicial: 100;
- retirada: 10;
- saldo/lote dentro da transação: 90;
- retry do mesmo command ID não duplicou;
- após rollback: saldo/lote 100, movimento de teste 0, usuário de teste 0.

Security Advisor mantém warnings intencionais para `record_stock_entry` e `record_stock_withdrawal` porque ambos são `SECURITY DEFINER` executáveis por `authenticated`. A exposição é intencional e protegida por identidade, role, validação de inputs/referências e grants restritos.

## Configuração de ambiente ainda necessária

- URL/publishable key/secret nos ambientes apropriados, nunca no GitHub;
- `NEXT_PUBLIC_APP_URL`;
- redirect/callback Auth permitido no Supabase;
- primeira conta Auth provisionada administrativamente antes do bootstrap owner.

## Próximo trabalho dentro da Issue #24

Depois de integrar o PR #25:

1. criar branch nova a partir da `main`;
2. implementar transferência transacional em duas etapas — dispatch e receive;
3. preservar custo, lote e validade do lote de origem no destino;
4. permitir recebimento parcial coerente com o domínio atual;
5. usar command IDs/idempotência, locks e audit;
6. não creditar destino no dispatch; somente no receive;
7. testar roles, cross-Organization, retry, estoque insuficiente, recebimento parcial/total e rollback;
8. integrar ao workspace real somente depois do SQL/CI estar verde;
9. depois avançar para inventário físico persistente.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Pedir decisão do usuário somente diante de custo, credencial externa inevitável ou decisão de negócio estrutural ainda aberta.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
