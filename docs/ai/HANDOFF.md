# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 7 / Issue #19 está tecnicamente implementada na branch `agent/supabase-adapters` e precisa apenas passar pelo PR/CI final e merge.

A próxima Issue já criada é #21 — Fase 8 — Autenticação real e runtime Supabase.

## Não repetir

- não refazer engenharia reversa ou modelagem já consolidada;
- não reabrir ADRs sem evidência concreta;
- não editar saldo diretamente;
- não remover RLS para facilitar integração;
- não conceder write direto de cliente no ledger;
- não expor `SUPABASE_SECRET_KEY` no browser;
- não usar secret/admin client em operação normal quando JWT + RLS resolvem;
- não colocar dados reais do cliente no seed/demo;
- não recriar projeto Supabase: já existe projeto remoto homologado e com schema aplicado.

## O sistema já possui

- Next.js/React/TypeScript strict, Tailwind, Vitest e CI;
- multi-negócio/multi-unidade;
- produtos, fornecedores e preços;
- ledger de estoque, custo médio e transferências;
- lotes/validade/FEFO;
- inventário físico;
- schema PostgreSQL/Supabase versionado;
- RLS por membership organizacional;
- seed anonimizado;
- CI PostgreSQL efêmero;
- projeto Supabase remoto em `sa-east-1` com migrations aplicadas;
- factories Supabase browser/server;
- adapters Supabase para StockItem e Supplier;
- primeiro gateway transacional real de entrada de estoque.

## Segurança Supabase

Membership privilegiado:

- lógica `SECURITY DEFINER` vive no schema `private`;
- wrappers `public.is_org_member` e `public.has_org_role` são `SECURITY INVOKER`;
- `anon` não recebe execução das helpers;
- RLS continua a fronteira para consultas e cadastros.

`public.record_stock_entry` é uma exceção intencional `SECURITY DEFINER` exposta apenas a `authenticated`, porque precisa atualizar atomicamente tabelas que o usuário não pode escrever diretamente. A função valida `auth.uid()`, role organizacional, item/local, quantidade/custo e idempotência antes dos writes.

Não mover writes do ledger para chamadas `.from(...).insert()` no browser.

## Validação remota concluída

- migrations aplicadas no projeto remoto;
- Security Advisor sem findings inesperados;
- warning restante do RPC transacional é intencional/documentado;
- seed demo carregado;
- teste real do RPC em transação com rollback passou;
- entrada 100@2,10 + 10@3,00 resultou em 110@2,18;
- retry com mesmo command_id não duplicou movimento/lote/audit.

## Arquivos novos/relevantes

- `src/lib/supabase/env.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/modules/catalog/adapters/supabase-stock-item-repository.ts`
- `src/modules/suppliers/adapters/supabase-supplier-repository.ts`
- `src/modules/inventory/adapters/supabase-stock-entry-gateway.ts`
- `docs/modules/supabase-runtime.md`
- `supabase/migrations/*_private_membership_helpers.sql`
- `supabase/migrations/*_transactional_stock_entry.sql`

## Próxima fase — Issue #21

Implementar Auth/sessão real e ligar a UI aos adapters remotos:

1. login/logout e recuperação mínima;
2. sessão server-side no Next.js;
3. proteção de rotas;
4. resolução de `organization_memberships` após login;
5. onboarding inicial de membership por rotina server-only;
6. composição dos repositories/gateways com cliente autenticado RLS;
7. workspace autenticado usa persistência real por padrão;
8. usuário sem membership recebe estado explícito e não vê dados;
9. testes de isolamento e roles;
10. manter adapters in-memory para unit tests.

## Antes de iniciar #21

- abrir PR de `agent/supabase-adapters`;
- confirmar CI completo;
- mergear;
- encerrar Issue #19;
- criar branch nova a partir da `main`.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Perguntar ao usuário somente diante de custo, credencial externa inevitável ou decisão de negócio estrutural.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
