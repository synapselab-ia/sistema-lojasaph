# Módulo — Cadastros base

Status: núcleo cadastral persistente; Fase 19 implementa funcionários operacionais separados da identidade de acesso; Fase 22 torna categoria obrigatória no item canônico.

## Objetivo

Fornecer os dados mestres usados por estoque, compras, financeiro, caixa e administração.

## Escopo implementado

- estrutura Organization → Business → Unit → Sector/StockLocation;
- StockItem com categoria obrigatória, unidade, tipo e flags operacionais;
- Supplier com múltiplos contatos;
- SupplierItem/offer e histórico de preço observado;
- Employee operacional separado de `auth.users`;
- vínculo opcional e explícito de Employee com identidade autenticada;
- escopo operacional padrão opcional por Unit/Sector;
- persistência PostgreSQL/Supabase protegida por RLS;
- autenticação e memberships por Organization/escopo;
- UI integrada ao workspace;
- adapters in-memory preservados onde úteis para testes isolados.

## Persistência

Migrations versionadas no GitHub são a fonte de verdade do schema. Operações do workspace persistente usam adapters Supabase/PostgreSQL e respeitam RLS; credenciais privilegiadas permanecem server-only.

`public.stock_items.category_id` é obrigatório. O FK composto existente continua exigindo que item e categoria pertençam à mesma Organization. A migration da Fase 22 não cria categoria genérica nem faz backfill silencioso: se houver qualquer item legado com `category_id IS NULL`, ela aborta com `STOCK_ITEM_CATEGORY_REQUIRED_PRECONDITION` e exige classificação explícita antes de prosseguir.

Employee é persistido em `public.employees` com:

- Organization obrigatória;
- nome obrigatório;
- código operacional opcional;
- status `active`/`inactive`;
- Unit e Sector padrão opcionais e hierarquicamente coerentes;
- `auth_user_id` opcional, referenciando `auth.users` sem criar autorização por efeito colateral.

Não existe `DELETE` para o cliente autenticado em Employee. Correções de ciclo de vida usam inativação para preservar a referência operacional.

## Autorização de Employee

A autorização continua pertencendo exclusivamente a `organization_memberships`.

- cadastrar Employee não cria login nem membership;
- vincular `auth_user_id` não concede role, Organization, Unit ou Sector;
- remover/inativar Employee não encerra sessão nem revoga membership;
- leitura e manutenção do diretório exigem `owner`, `admin` ou `manager` dentro do escopo permitido;
- Employee sem Unit/Sector é Organization-wide e exige membership administrativo Organization-wide;
- Employee de Unit/Setor só é visível e mutável para membership administrativo que alcance aquele escopo;
- perfis operacionais como `viewer`, `inventory`, `purchases`, `finance` e `cashier` não recebem o diretório administrativo apenas por pertencerem à Organization.

## Regras consolidadas

- IDs de domínio são estáveis;
- todo StockItem canônico deve possuir categoria explícita, válida e da mesma Organization;
- criação e edição de StockItem sem categoria falham antes da persistência;
- a UI não oferece estado `Sem categoria` para item canônico e bloqueia submit sem opção válida;
- fornecedor pode ter múltiplos contatos;
- catálogo e fornecedores são compartilhados conforme autorização da Organization;
- escopos Business/Unit/Sector são aplicados conforme a política homologada na Fase 14;
- dados de demonstração/teste devem ser sintéticos;
- correções críticas preservam rastreabilidade em vez de apagar histórico material;
- Employee não contém folha, salário, jornada, CPF ou outros dados pessoais não exigidos pelo escopo atual;
- Q-022 continua aberta para definir pessoas/perfis reais e não é respondida pela existência do cadastro.

## UI

`/workspace/produtos` exige seleção de categoria tanto na criação quanto na edição. Quando não há categorias disponíveis, a gravação fica bloqueada em vez de criar classificação implícita.

`/workspace/funcionarios` oferece listagem e manutenção administrativa mínima, responsiva e persistente para `owner`, `admin` e `manager`. As opções de Unit/Sector já chegam filtradas por RLS, e o banco reaplica a autorização na gravação.

O ID de usuário autenticado pode ser informado explicitamente quando conhecido. Essa associação serve somente para identidade da pessoa; administração de acesso permanece separada.
