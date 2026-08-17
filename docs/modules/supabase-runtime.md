# Runtime Supabase — fronteiras de persistência

Status: Fase 7 — fundação remota implementada; autenticação/runtime completo fica para a fase seguinte.

## Princípio

O domínio e a UI não dependem diretamente do SDK do Supabase. A integração entra por factories e adapters.

## Factories

- `createBrowserSupabaseClient()` usa somente URL + publishable key.
- `createServerRlsSupabaseClient(accessToken)` executa consultas com o JWT do usuário e, portanto, preserva RLS.
- `createServerAdminSupabaseClient()` usa `SUPABASE_SECRET_KEY` e é reservado a rotinas administrativas server-only. Não deve ser usado por conveniência em operações normais de usuário.

Nenhuma credencial real é versionada no GitHub.

## Adapters reais implementados

- `SupabaseStockItemRepository` — leitura e manutenção de StockItem respeitando RLS.
- `SupabaseSupplierRepository` — leitura/manutenção de Supplier e contatos respeitando RLS.
- `SupabaseStockEntryGateway` — primeira mutação crítica via RPC transacional.

Adapters in-memory continuam disponíveis para testes rápidos e workspace de demonstração enquanto Auth/UI real não forem ligados.

## Escrita crítica de estoque

`public.record_stock_entry(...)` é o primeiro command RPC do ledger real.

Garantias:

1. exige `auth.uid()`;
2. exige papel `owner`, `admin`, `manager` ou `inventory` na Organization;
3. cliente autenticado continua sem INSERT/UPDATE direto no ledger;
4. valida item/local da mesma Organization;
5. valida quantidade positiva e custo não negativo com escalas exatas;
6. usa `command_id` como chave de idempotência;
7. bloqueia a projeção de saldo com `FOR UPDATE`;
8. recalcula custo médio ponderado;
9. grava movimento + item + saldo + lote/alocação, quando aplicável, na mesma transação PostgreSQL;
10. grava `audit_logs`;
11. lote/validade desconhecidos permanecem `NULL`, sem fabricar informação.

A função é intencionalmente `SECURITY DEFINER` e exposta somente a `authenticated`. O Supabase Security Advisor sinaliza esse fato por design. Essa exceção é aceita porque a função é o endpoint autorizado da mutação: valida `auth.uid()`, papel organizacional, inputs e referências antes de qualquer write; `PUBLIC` e `anon` não possuem `EXECUTE`.

## Helpers de autorização

As consultas privilegiadas de membership vivem em `private.is_org_member` e `private.has_org_role` como `SECURITY DEFINER`, num schema não exposto. As funções homônimas em `public` são wrappers `SECURITY INVOKER` usados pelas policies.

Após essa mudança, o Security Advisor ficou sem alertas, exceto o RPC transacional intencional descrito acima.

## Projeto remoto

Um projeto Supabase existente e vazio foi reutilizado na região `sa-east-1`. As migrations do GitHub foram aplicadas na ordem e o seed anonimizado foi carregado. Não há dados reais do cliente nem usuários reais cadastrados nesta fase.

## Validação remota

Foi executado teste real dentro de transação com `ROLLBACK`:

- usuário/membership temporários;
- entrada de 10 unidades sobre saldo 100 com custo 3,00 sobre custo médio 2,10;
- saldo resultante 110;
- custo médio resultante 2,18;
- criação de um único movimento, lote e audit log;
- repetição com mesmo `command_id` não duplicou o evento.

Tudo do cenário temporário foi descartado por `ROLLBACK`.

## Próxima fase

A próxima fase deve implementar Auth/sessão real, onboarding seguro de membership, proteção de rotas e composição runtime dos adapters. Só então o workspace visual deixa de usar dados in-memory por padrão.
