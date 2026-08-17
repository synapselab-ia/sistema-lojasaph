# Runtime Supabase — persistência, Auth e RLS

Status: Auth/runtime estabilizados e núcleo de estoque persistente completo.

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

## Homologação remota

As migrations da Fase 9 foram aplicadas ao projeto homologado em `sa-east-1`. Entrada, retirada, transferência e inventário foram validados com dados demo em transações `BEGIN/ROLLBACK`; os cenários de teste não deixam usuários/movimentos artificiais.

## Advisors

O Security Advisor reporta os command RPCs `SECURITY DEFINER` executáveis por `authenticated`; isso é intencional porque são a API controlada de mutações críticas, com role/inputs/referências validados. Performance INFO permanece backlog orientado a carga real; não criar índices indiscriminadamente para zerar linter em banco demo.
