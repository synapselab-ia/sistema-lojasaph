# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A Fase 8 / Issue #21 foi implementada no PR #23 (`agent/auth-runtime`). Após o merge, a próxima frente é a Issue #24 — Fase 9 — estoque transacional completo no Supabase.

## Não repetir

- não refazer engenharia reversa/modelagem consolidada;
- não recriar o projeto Supabase;
- não reimplementar Auth SSR/login/recovery/membership da Fase 8;
- não editar saldo diretamente;
- não remover RLS;
- não conceder write direto no ledger;
- não usar secret/admin client em operações normais de usuário;
- não autorizar por `user_metadata`;
- não misturar no workspace real fluxos que continuam in-memory;
- não migrar dados reais do cliente antes da homologação planejada.

## O sistema já possui

- Next.js/React/TypeScript strict, Tailwind, Vitest e CI;
- domínio multi-negócio/multi-unidade;
- produtos, fornecedores, ledger, custo médio, transferências, lotes/FEFO e inventário no domínio;
- schema PostgreSQL/Supabase versionado;
- projeto remoto homologado em `sa-east-1`;
- RLS por membership organizacional;
- seed anonimizado e CI PostgreSQL efêmero;
- `record_stock_entry` transacional/idempotente;
- Auth SSR com `@supabase/ssr`;
- login/logout/recuperação/callback;
- resolução de memberships/Organizations;
- seleção multi-Organization com cookie httpOnly revalidado;
- bootstrap inicial de owner server-only e auditado;
- workspace persistente para produtos, fornecedores e entrada de estoque;
- workspace demo separado para os movimentos ainda não persistidos.

## Segurança Auth/Supabase

- browser usa somente publishable key;
- server client normal usa sessão/JWT do usuário e RLS;
- admin client importa `server-only` e usa `SUPABASE_SECRET_KEY` apenas em bootstrap administrativo;
- Proxy chama `getClaims()` para refresh/verificação e copia cookies + headers anti-cache;
- páginas protegidas resolvem acesso a partir de claims + `organization_memberships`;
- cookie de Organization nunca é aceito sem revalidação do membership;
- usuário sem membership recebe `/sem-acesso`;
- `record_stock_entry` continua a única mutação real de estoque disponível no workspace persistente;
- o RPC `SECURITY DEFINER` é warning conhecido/aceito e valida `auth.uid()` + role + inputs;
- helpers privilegiados de membership continuam em schema `private`.

## Bootstrap

Variáveis server-only:

- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` quando necessário;
- `SUPABASE_SECRET_KEY`.

A rotina:

1. exige usuário Auth válido;
2. compara e-mail com allowlist;
3. verifica owner existente;
4. cria membership `owner` somente se seguro;
5. grava audit log;
6. compensa removendo o membership se audit falhar.

Remover/desabilitar as variáveis de bootstrap depois do primeiro owner.

## Workspace persistente

Rotas principais:

- `/login`;
- `/recuperar-senha`;
- `/auth/callback`;
- `/bootstrap`;
- `/workspace`;
- `/workspace/produtos`;
- `/workspace/fornecedores`;
- `/workspace/estoque`;
- `/workspace/selecionar-organizacao`;
- `/sem-acesso`.

`/workspace` persiste produtos, fornecedores/contatos e entrada. `/cadastros` segue sendo demo para retirada, transferência, FEFO e inventário.

## Validação da Fase 8

PR #23:

- banco: migrations + seed + smoke RLS/RPC + novos testes de roles/Organization passaram;
- aplicação: lint, typecheck, Vitest e build passaram após uma correção estreita de narrowing de claims;
- tests de roles confirmam `inventory`, `viewer`, `purchases`, outsider, cross-Organization e anon;
- test unitário confirma bloqueio de open redirects.

## Configuração ainda necessária por ambiente

- preencher URL/publishable key/secret nos ambientes apropriados, nunca no GitHub;
- definir `NEXT_PUBLIC_APP_URL`;
- cadastrar o callback/redirect de recuperação na allowlist de URLs do Supabase do ambiente;
- provisionar a primeira conta Auth administrativamente antes do bootstrap do membership.

Esses itens são configuração de ambiente/deploy; não enfraquecer o código para contorná-los.

## Próxima fase — Issue #24

Objetivo: levar retirada/FEFO, transferência e inventário para PostgreSQL transacional e então remover a dependência do workspace demo para os fluxos principais de estoque.

Ordem recomendada:

1. retirada persistente com FEFO e lote preferido;
2. idempotência + lock de saldo/lotes + audit;
3. leitura real de lotes/movimentos;
4. transferência com expedição/recebimento preservando custo/lote/validade;
5. inventário físico com snapshot, stale detection e ajuste transacional;
6. integrar cada fluxo ao workspace real somente depois do respectivo comando estar testado.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Pedir decisão do usuário somente diante de custo, credencial externa inevitável ou decisão de negócio estrutural ainda aberta.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
