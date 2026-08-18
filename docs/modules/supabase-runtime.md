# Runtime Supabase — persistência, Auth e RLS

Status: Auth/runtime estabilizados, núcleo transacional persistente e fronteira de observabilidade documentada.

## Sessão e autorização

- `@supabase/ssr` no browser/server;
- `getClaims()` + cookies por request;
- memberships por Organization;
- secret/admin client somente `server-only`;
- operações normais usam JWT do usuário + RLS.

## Commands críticos do ledger

Executáveis somente por `authenticated`, todos revalidando `auth.uid()` + role organizacional:

- `record_stock_entry`;
- `record_stock_withdrawal`;
- `dispatch_stock_transfer`;
- `receive_stock_transfer`;
- `start_inventory_count`;
- `set_inventory_count_line`;
- `confirm_inventory_count`;
- `cancel_inventory_count`.

`PUBLIC`/`anon` não possuem EXECUTE e clientes não recebem INSERT/UPDATE direto no ledger.

## Inventário

A sessão captura quantidade e custo médio esperados. Confirmação usa locks, rejeita stale, gera ajustes de ledger e nunca materializa lote desconhecido. Cancelamento é explícito e auditado.

## Observabilidade do runtime

A Fase 17 adicionou logging estruturado no Next.js sem alterar schema, RLS ou RPCs.

- Vercel Runtime Logs recebe os eventos server-side do app;
- Supabase Logs Explorer/API permanece a fonte de diagnóstico para Postgres/Auth/Data API;
- consultas feitas nesta fase foram somente leitura;
- a organização Supabase conectada permanece no plano Free;
- Log Drains não foram configurados porque a capacidade exige plano compatível;
- chamadas Supabase feitas diretamente pelo browser não recebem automaticamente o `correlationId` do Next.js, então a correlação entre as duas fontes usa horário, RPC/rota e código de erro quando necessário.

Nunca registrar JWT, cookies, e-mail, secrets, connection strings ou payloads sensíveis para tentar facilitar correlação.

Runbook: `docs/operations/observability.md`. Decisão: `docs/decisions/ADR-007-observability-contract.md`.

## Homologação remota

As migrations da Fase 9 foram aplicadas ao projeto homologado em `sa-east-1`. Entrada, retirada, transferência e inventário foram validados com dados demo em transações `BEGIN/ROLLBACK`; os cenários de teste não deixam usuários/movimentos artificiais.

Fases posteriores aplicaram migrations adicionais conforme seus handoffs. A Fase 17 não cria migration nem executa DDL no projeto remoto.

## Advisors

O Security Advisor reporta os command RPCs `SECURITY DEFINER` executáveis por `authenticated`; isso é intencional porque são a API controlada de mutações críticas, com role/inputs/referências validados. Performance INFO permanece backlog orientado a carga real; não criar índices indiscriminadamente para zerar linter em banco demo.
