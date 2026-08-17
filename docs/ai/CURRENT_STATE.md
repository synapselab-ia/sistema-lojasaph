# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 8 — Autenticação real e runtime Supabase — implementada pelo PR #23.

A próxima frente é a Issue #24 — Fase 9 — estoque transacional completo no Supabase. Ela só deve ser iniciada depois do merge do PR #23 / fechamento da Issue #21.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- PR de conclusão da Fase 8: #23 — `agent/auth-runtime` → `main`
- Issue da Fase 8: #21
- Próxima Issue/backlog: #24 — estoque transacional completo no Supabase

## Fases concluídas

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: domínio, modelo lógico, ERD e ADRs fundamentais.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base e fornecedores in-memory.
- Fase 5: ledger de estoque, entrada, retirada, transferência e custo médio no domínio/in-memory.
- Fase 6: lotes, validades, FEFO e inventário físico no domínio/in-memory.
- Fase 7: PostgreSQL/Supabase, migrations, RLS, projeto remoto, adapters reais e primeiro RPC transacional de entrada.
- Fase 8: Auth SSR, membership/Organization e workspace persistente para os fluxos já seguros.

## Fase 8 — runtime autenticado

### Sessão SSR

- dependência `@supabase/ssr` pinada em `0.12.4` com lockfile;
- browser client com publishable key;
- server client por request usando cookies;
- admin client continua `server-only` com secret key;
- Proxy renova sessão com `getClaims()`;
- cookies renovados e headers anti-cache do SSR são propagados na resposta;
- páginas protegidas não usam sessão bruta como decisão de autorização.

### Fluxos Auth

Implementados:

- login e logout;
- recuperação de senha;
- callback PKCE por `exchangeCodeForSession`;
- callback OTP/token hash compatível com template server-side;
- atualização de senha após sessão válida;
- sanitização de redirects internos contra open redirect.

Cadastro público não foi aberto. Contas continuam sendo provisionadas administrativamente até existir um fluxo de convite formal.

### Membership / Organization

`resolveMembershipContext()` valida claims, consulta memberships ativos via RLS e resolve Organizations disponíveis.

- sem sessão → login;
- sessão sem membership → estado `/sem-acesso`;
- uma Organization → seleção implícita;
- múltiplas Organizations → seleção explícita;
- Organization selecionada fica em cookie `httpOnly`, mas é revalidada contra os memberships em cada carregamento protegido;
- roles vêm de `organization_memberships`, nunca de `user_metadata`.

### Bootstrap inicial

`/bootstrap` cria somente o primeiro vínculo owner:

- exige e-mail allowlisted em `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
- usa admin client somente server-side;
- exige Organization explícita quando houver múltiplas;
- recusa bootstrap se outro owner ativo já existir;
- registra audit log;
- se a auditoria falhar, remove o membership recém-criado como compensação;
- variáveis de bootstrap devem ser removidas após a inicialização.

Não existe regra “primeiro usuário vira admin”.

## Workspace real

`/workspace` usa Supabase real + JWT/RLS e está separado de `/cadastros`, que permanece demonstração in-memory.

Persistente hoje:

- produtos — leitura/manutenção por `SupabaseStockItemRepository`;
- fornecedores/contatos — leitura/manutenção por `SupabaseSupplierRepository`;
- categorias, unidades de medida, locais e saldos — leitura RLS;
- entrada de estoque — `SupabaseStockEntryGateway` → `record_stock_entry` transacional/idempotente.

Ainda demo/in-memory:

- retirada/FEFO;
- transferência;
- inventário físico;
- operações avançadas de lotes/validade.

Essa separação é intencional: não apresentar como persistente um fluxo que ainda grava somente em memória.

## Segurança e testes

CI da Fase 8 cobre:

### Aplicação

- `npm ci`;
- lint;
- typecheck;
- Vitest;
- production build.

### Banco

- PostgreSQL 17 efêmero;
- bootstrap Auth;
- todas as migrations;
- seed anonimizado;
- smoke tests de schema/RLS/RPC;
- matriz adicional de roles e isolamento.

Casos validados:

- `inventory` pode manter catálogo e registrar entrada;
- `viewer` não altera catálogo nem executa entrada;
- `purchases` altera fornecedores, mas não catálogo/entrada;
- outsider sem membership não vê Organization;
- membro de outra Organization não vê dados da Organization seed;
- anon não acessa tabelas operacionais/RPC;
- ledger continua sem escrita direta de cliente autenticado;
- redirect externo/protocol-relative é rejeitado pelo runtime.

O primeiro run do PR #23 encontrou apenas um narrow de TypeScript em claims opcionais; foi corrigido sem relaxar tipos. O run subsequente passou lint, typecheck, testes, build e banco.

## Configuração de ambiente

`.env.example` documenta:

- `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
- `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID`.

Nenhum valor real é versionado. Para recuperação de senha em ambiente hospedado, o callback da aplicação também precisa estar autorizado na configuração de redirect URLs do Supabase.

## Projeto remoto

O projeto Supabase homologado em `sa-east-1` continua com migrations e seed demo aplicados. Nenhum dado real do cliente foi migrado nesta fase.

## Próxima ação

Iniciar a Issue #24 somente após o PR #23 estar integrado. A primeira entrega da Fase 9 deve ser retirada persistente com FEFO/idempotência/locks; depois transferência e inventário físico.

Consulte `docs/ai/NEXT_ACTION.md`, `docs/modules/inventory.md`, `docs/modules/supabase-runtime.md`, ADR-002, ADR-003 e ADR-006.
