# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 7 — persistência PostgreSQL/Supabase e segurança base: implementação final na branch `agent/supabase-adapters`, aguardando CI/merge.

A Issue #19 pode ser encerrada após o PR desta branch ficar verde e ser integrado. A próxima Issue é #21 — Fase 8 — Autenticação real e runtime Supabase.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #19 — Persistência PostgreSQL/Supabase e segurança base
- Branch atual: `agent/supabase-adapters`
- Próxima Issue: #21 — Autenticação real e runtime Supabase
- PR desta branch: ainda deve ser aberto/validado.

## Fases concluídas antes desta branch

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: domínio, modelo lógico, ERD e ADRs fundamentais.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base e fornecedores.
- Fase 5: ledger de estoque, entrada, retirada, transferência e custo médio.
- Fase 6: lotes, validades, FEFO e inventário físico.
- Fase 7A: schema PostgreSQL, RLS, seed e CI de banco integrados pelo PR #20.

## Fase 7B — implementado nesta branch

### Projeto remoto

- projeto Supabase existente foi restaurado e inspecionado antes de qualquer DDL;
- não possuía migrations nem tabelas de aplicação, portanto foi reutilizado;
- região: `sa-east-1`;
- migrations versionadas foram aplicadas ao projeto remoto;
- seed anonimizado foi carregado;
- nenhum dado real do cliente e nenhum usuário real foram criados.

### Cliente e fronteiras

`@supabase/supabase-js` foi adicionado com versão exata e lockfile atualizado.

Factories:

- `src/lib/supabase/browser.ts` — publishable key;
- `src/lib/supabase/server.ts` — cliente RLS com access token e cliente admin server-only;
- `src/lib/supabase/env.ts` — validação das variáveis necessárias.

Nenhum segredo ou URL real foi versionado.

### Adapters reais

- `SupabaseStockItemRepository`;
- `SupabaseSupplierRepository`;
- `SupabaseStockEntryGateway`.

Os adapters recebem `SupabaseClient` por injeção. Domínio e UI continuam sem importar persistência diretamente.

### Segurança RLS

Os helpers privilegiados de membership foram movidos para schema `private` como `SECURITY DEFINER`. As funções homônimas no schema `public` agora são wrappers `SECURITY INVOKER`.

Depois dessa correção, o Supabase Security Advisor ficou sem alertas para helpers de membership.

### Primeiro comando crítico real

Migration `*_transactional_stock_entry.sql` adiciona `public.record_stock_entry(...)`.

O RPC:

- exige usuário autenticado;
- valida role organizacional `owner/admin/manager/inventory`;
- mantém o cliente sem grants diretos de escrita no ledger;
- usa `command_id` como idempotency key;
- trava a linha de saldo com `FOR UPDATE`;
- atualiza saldo e custo médio;
- cria movimento/item;
- cria lote/alocação quando aplicável;
- grava audit log;
- executa tudo na mesma transação PostgreSQL.

O Security Advisor sinaliza o RPC como `SECURITY DEFINER` executável por `authenticated`; este é um warning intencional e documentado porque o RPC é justamente a fronteira autorizada da mutação crítica. `PUBLIC` e `anon` não possuem EXECUTE e a função valida `auth.uid()` + role antes dos writes.

### Validação remota do RPC

Teste executado dentro de transação com `ROLLBACK`:

- saldo inicial: 100 a custo médio 2,10;
- entrada: 10 a custo 3,00;
- saldo esperado/obtido: 110;
- custo médio esperado/obtido: 2,18;
- exatamente um movimento, um lote e um audit log;
- segunda chamada com mesmo `command_id` não duplicou evento;
- cenário temporário descartado integralmente por rollback.

### Performance

A policy de membership foi ajustada para `(select auth.uid())`. Índices foram adicionados às relações operacionais mais relevantes. O advisor ainda lista FKs sem índice como `INFO` e índices recém-criados como `unused` porque o banco é praticamente vazio; isso não bloqueia a fase e deve ser revisitado com carga real/planos de consulta.

## Persistência da UI hoje

O workspace visual ainda usa adapters in-memory por padrão porque ainda não há login/sessão/membership real na aplicação. Isso é o escopo da Issue #21.

## Próxima ação

1. abrir PR desta branch contra `main`;
2. exigir CI de aplicação + banco verde;
3. integrar o PR e encerrar Issue #19;
4. iniciar Issue #21 em branch própria;
5. implementar Auth/sessão real e composição runtime dos adapters RLS.

Consulte `docs/ai/NEXT_ACTION.md` e `docs/modules/supabase-runtime.md`.
