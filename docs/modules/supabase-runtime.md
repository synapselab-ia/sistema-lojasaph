# Runtime Supabase — persistência, Auth e RLS

Status: Fase 9 em andamento. Runtime autenticado está estável; entrada e retirada de estoque já possuem commands PostgreSQL reais.

## Princípio

O domínio não depende diretamente do SDK do Supabase. A integração entra por factories, repositories/adapters e gateways. Operações normais usam sessão/JWT do usuário + RLS; secret/admin client permanece restrito a rotinas administrativas explícitas.

## Sessão SSR

- `createBrowserSupabaseClient()` usa `@supabase/ssr` com publishable key.
- `createServerSupabaseClient()` usa cookies por request.
- `createServerAdminSupabaseClient()` importa `server-only` e usa `SUPABASE_SECRET_KEY` somente quando necessário.
- Proxy renova/verifica sessão com `getClaims()` e propaga cookies + headers anti-cache.
- páginas protegidas resolvem acesso por claims verificadas + memberships, não por cookie bruto.

## Auth e Organization

Implementados:

- login/logout;
- recuperação/callback PKCE/OTP;
- atualização de senha;
- redirects internos sanitizados;
- membership por `organization_memberships`;
- seleção multi-Organization em cookie httpOnly revalidado;
- estado sem membership;
- bootstrap inicial de owner allowlisted e auditado.

Não existe cadastro público automático nem autorização por `user_metadata`.

## Workspace persistente

`/workspace` usa Supabase real e RLS.

Persistente:

- produtos;
- fornecedores/contatos;
- categorias/unidades/locais;
- saldos;
- lotes ativos;
- entrada via `record_stock_entry`;
- retirada via `record_stock_withdrawal` após PR #25.

Ainda in-memory/demo:

- transferência/recebimento;
- inventário físico;
- demais ajustes ainda sem command RPC.

A UI não mistura silenciosamente uma operação real com outra somente em memória.

## Commands do ledger

### `record_stock_entry`

- `SECURITY DEFINER`, EXECUTE somente `authenticated`;
- valida `auth.uid()` + role;
- quantidade/custo exatos;
- idempotência;
- balance lock;
- custo médio ponderado;
- lote opcional/rastreado;
- ledger + saldo + lote + audit atômicos.

### `record_stock_withdrawal`

- `SECURITY DEFINER`, EXECUTE somente `authenticated`;
- roles `owner/admin/manager/inventory`;
- advisory transaction lock por command ID;
- idempotência compara payload semântico;
- balance `FOR UPDATE`;
- lotes candidatos bloqueados em ordem determinística;
- lote preferido primeiro quando informado;
- restante por FEFO;
- snapshot do custo médio vigente;
- saldo/lote/movimento/alocações/audit na mesma transação;
- itens rastreados nunca criam lote negativo.

`PUBLIC` e `anon` não possuem EXECUTE nesses commands. O Security Advisor reporta ambos como `SECURITY DEFINER` executáveis por usuários autenticados; isso é intencional, pois eles são a API controlada das mutações críticas, com identidade, role, inputs e referências validados antes dos writes.

## Estoque negativo

`StockLocation.allow_negative_stock` agora é efetivo fisicamente:

- negativo é proibido por default;
- só local explicitamente configurado permite saldo negativo;
- não se permite desativar a flag enquanto existir saldo negativo no local;
- item rastreado continua limitado ao estoque físico em lotes.

## Testes

CI PostgreSQL efêmero valida migrations, seed, RLS, roles e commands.

Retirada cobre:

- FEFO;
- lote preferido;
- idempotência e conflito de payload;
- insuficiência/rollback;
- viewer/cross-Organization/anon;
- política configurável de negativo.

## Projeto remoto

O projeto homologado em `sa-east-1` possui as migrations de entrada e retirada aplicadas, usando apenas seed anonimizado.

A retirada foi homologada remotamente em transação com `ROLLBACK`: saldo/lote foram reduzidos durante o teste, retry não duplicou, e após rollback não restou movimento nem usuário de teste.

## Advisors

Security Advisor: warnings conhecidos/intencionais para `record_stock_entry` e `record_stock_withdrawal` por serem `SECURITY DEFINER` expostos somente a `authenticated`.

Performance Advisor: avisos informativos de FKs sem índice/índices ainda não usados permanecem como backlog de tuning orientado a carga real; não foi detectada regressão nova causada pela retirada.

## Próxima entrega

Issue #24 continua aberta. Depois do PR #25, implementar transferência em duas etapas (`dispatch`/`receive`) com idempotência, locks, preservação de custo/lote/validade e recebimento parcial. Inventário físico vem depois.
