# Runtime Supabase — persistência, Auth e RLS

Status: Fase 8 — runtime autenticado implementado no PR #23.

## Princípio

O domínio não depende diretamente do SDK do Supabase. A integração entra por factories, repositories/adapters e gateways. A UI persistente usa a sessão do usuário e RLS; credenciais privilegiadas não são um atalho para operações normais.

## Factories e sessão SSR

- `createBrowserSupabaseClient()` usa `@supabase/ssr` com URL + publishable key.
- `createServerSupabaseClient()` cria um cliente por request com cookies da sessão.
- `createServerRlsSupabaseClient(accessToken)` permanece disponível para cenários server-side bearer explícitos, mas o runtime Next.js normal usa cookies SSR.
- `createServerAdminSupabaseClient()` usa `SUPABASE_SECRET_KEY`, importa `server-only` e é reservado a rotinas administrativas explícitas.
- `src/proxy.ts` delega a renovação de sessão para `src/lib/supabase/proxy.ts`.
- o Proxy chama `getClaims()` e propaga tanto cookies renovados quanto headers anti-cache produzidos por `@supabase/ssr`.

Páginas protegidas não tratam `getSession()`/cookie bruto como prova de identidade. A resolução de acesso começa por claims verificadas.

## Fluxos de autenticação

Implementados:

- login por e-mail/senha;
- logout server-side;
- recuperação de senha;
- callback PKCE por `exchangeCodeForSession`;
- suporte a callback `token_hash`/OTP quando usado por template server-side;
- atualização de senha somente após sessão de recuperação válida;
- redirects internos sanitizados para impedir open redirect.

Não existe cadastro público aberto nesta fase. Contas são provisionadas de forma administrativa até existir um fluxo de convite formal.

A recuperação exige `NEXT_PUBLIC_APP_URL` e que o URL/callback correspondente esteja permitido na configuração de redirects do Supabase do ambiente hospedado.

## Membership e Organization

`resolveMembershipContext()`:

1. valida a identidade com `getClaims()`;
2. consulta somente memberships ativos visíveis ao próprio usuário por RLS;
3. carrega Organizations ativas acessíveis;
4. agrega os papéis do usuário por Organization;
5. para múltiplas Organizations, aceita uma seleção em cookie `httpOnly`;
6. revalida o ID do cookie contra os memberships a cada carregamento, portanto alterar o cookie não concede acesso.

Estados explícitos:

- sessão ausente/expirada → login;
- usuário autenticado sem membership → `/sem-acesso`;
- múltiplas Organizations sem seleção válida → `/workspace/selecionar-organizacao`.

A autorização continua derivando de `organization_memberships`, nunca de `user_metadata`.

## Bootstrap do primeiro owner

A inicialização administrativa fica em `/bootstrap` e é deliberadamente restrita:

- exige sessão válida e usuário obtido pelo Auth server;
- exige correspondência exata com `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` server-only;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` é obrigatório quando não existe exatamente uma Organization ativa;
- se já existe outro owner ativo, o bootstrap é recusado;
- usa secret key apenas no servidor;
- cria o membership owner e `audit_logs`;
- se a auditoria falhar, o vínculo recém-criado é removido como compensação;
- após a inicialização, as variáveis de bootstrap devem ser removidas/desabilitadas.

Não existe regra automática de “primeiro usuário vira admin”.

## Workspace persistente x demonstração

### `/workspace`

Opera com Supabase real e sessão autenticada. Nesta fase suporta:

- leitura/manutenção de produtos via `SupabaseStockItemRepository`;
- leitura/manutenção de fornecedores e contatos via `SupabaseSupplierRepository`;
- leitura de categorias, unidades de medida, locais e saldos por RLS;
- entrada de estoque via `SupabaseStockEntryGateway` / `record_stock_entry`.

A UI apresenta permissões conforme papéis, mas isso é apenas UX; RLS/RPC continuam sendo a fronteira real.

### `/cadastros`

Continua explicitamente in-memory para os fluxos que ainda não possuem comandos PostgreSQL equivalentes:

- retirada/FEFO;
- transferência;
- lotes/validades avançados;
- inventário físico.

Não misturar operações persistentes e in-memory numa mesma tela evita que uma ação pareça salva quando não está.

## Escrita crítica de estoque

`public.record_stock_entry(...)` permanece o primeiro command RPC do ledger real.

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
11. lote/validade desconhecidos permanecem `NULL`.

A função é intencionalmente `SECURITY DEFINER` e executável somente por `authenticated`; `PUBLIC` e `anon` não possuem `EXECUTE`. O warning correspondente do Security Advisor é conhecido e aceito porque a função valida identidade, papel, inputs e referências antes dos writes.

## Testes de autorização

O CI PostgreSQL efêmero valida:

- `inventory` pode manter catálogo e executar entrada;
- `viewer` lê sua Organization, mas não mantém catálogo nem executa o RPC;
- `purchases` mantém fornecedores, mas não catálogo/entrada;
- outsider sem membership não vê Organizations;
- membro de outra Organization não vê os itens da Organization seed;
- anon não acessa tabelas operacionais/RPC;
- ledger não aceita escrita direta de cliente autenticado.

## Projeto remoto

O projeto Supabase homologado em `sa-east-1` continua com migrations versionadas e seed anonimizado. A Fase 8 não criou dados reais do cliente nem credenciais reais no GitHub.

## Próxima fase

Issue #24 — persistir retirada/FEFO, transferência e inventário físico com comandos transacionais, idempotência, locks e auditoria. Somente após isso o workspace real deve substituir a demonstração nos fluxos principais de estoque.
