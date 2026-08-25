# Módulo — Cadastros base

Status: núcleo cadastral persistente; Fase 19 implementa funcionários operacionais separados da identidade de acesso; Fase 22 torna categoria obrigatória no item canônico; Fase 44 expõe condições comerciais; Fase 45 fecha a manutenção básica de produtos por fornecedor.

## Objetivo

Fornecer os dados mestres usados por estoque, compras, financeiro, caixa e administração.

## Escopo implementado

- estrutura Organization → Business → Unit → Sector/StockLocation;
- StockItem com categoria obrigatória, unidade, tipo e flags operacionais;
- Supplier com múltiplos contatos;
- condições comerciais correntes de Supplier: pedido mínimo, agenda de pedido/entrega, condição de pagamento e observações;
- vínculo Supplier ↔ StockItem com unidade de compra, quantidade por embalagem e status ativo/inativo;
- histórico de preço observado do fornecedor alimentado pelo fluxo de compras;
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

## Condições comerciais de fornecedor

`REQ-SUP-003` reutiliza estruturas existentes desde a foundation:

- `suppliers.notes` para observações gerais;
- `supplier_terms.minimum_order_value` para pedido mínimo;
- `supplier_terms.payment_terms` para condição/forma de pagamento;
- `supplier_terms.order_schedule` para agenda/dia de pedido;
- `supplier_terms.delivery_schedule` para agenda/dia de entrega;
- `supplier_terms.valid_from/valid_to` para permitir evolução futura sem exigir nova modelagem.

A primeira slice operacional trabalha com **um termo corrente por fornecedor**:

1. leitura considera `valid_to IS NULL`;
2. em caso de mais de um registro legado corrente, usa deterministicamente o mais recente por `valid_from` e criação;
3. se ainda não existe termo e algum campo comercial foi informado, cria uma linha corrente usando o `valid_from` default do banco;
4. edições posteriores atualizam a mesma linha corrente;
5. limpar os campos não executa `DELETE`;
6. nenhum versionamento temporal automático é criado sem regra de negócio específica para vigência.

Agenda de pedido/entrega permanece texto informativo, como na fonte histórica. Esta entrega não agenda pedidos, não sugere compras e não compara fornecedores automaticamente.

## Produtos por fornecedor

`REQ-SUP-004` usa `public.supplier_items`, estrutura já existente desde a foundation:

- `supplier_id` e `stock_item_id` definem o vínculo comercial;
- `purchase_unit` registra a unidade informada pelo fornecedor;
- `units_per_package` registra a quantidade da unidade-base contida na embalagem, quando conhecida;
- `active` controla disponibilidade sem apagar histórico;
- `supplier_sku` continua fora da primeira slice operacional; a UI mantém apenas o vínculo default com `supplier_sku IS NULL`.

A Fase 45 adiciona um caminho persistente normal em `/workspace/fornecedores` para listar, criar, reativar, editar e inativar esses vínculos. Antes dela, `/workspace/compras` apenas consumia `supplier_items` preexistentes; os registros disponíveis em Production eram demo/seed e não havia UI/adaptor Supabase de manutenção.

Regras desta slice:

1. leituras filtram explicitamente `organization_id`, `supplier_id` e `supplier_sku IS NULL`;
2. um novo vínculo verifica primeiro se já existe linha default para o mesmo fornecedor/produto e a reutiliza/reativa em vez de inserir duplicata acidental;
3. edição não permite trocar silenciosamente o produto da linha; para outro produto cria-se outro vínculo;
4. `purchase_unit` é texto opcional normalizado;
5. `units_per_package` é opcional, positivo e usa precisão de até três casas via `Quantity`;
6. inativação usa `active=false`; o cliente autenticado nem possui `DELETE` em `supplier_items`;
7. unidade/embalagem são informativas nesta fase: pedidos continuam usando quantidade na unidade-base e não fazem conversão automática de caixa/pacote;
8. preço não é cadastrado nesta tela. O preço efetivo continua sendo informado no pedido e, na emissão, o fluxo de compras registra o observado em `supplier_prices`.

RLS é a autoridade: membros autenticados da Organization podem ler, enquanto INSERT/UPDATE exigem papel Organization-wide `owner/admin/manager/purchases`. `manageSuppliers` apenas espelha essa regra para UX. Não há service/admin client.

Nenhuma migration foi necessária nas Fases 44–45 porque schema, grants e policies já estavam presentes e foram verificados read-only em Production.

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
- fornecedor pode registrar condições comerciais livres sem transformar texto histórico em regra automática;
- fornecedor pode manter o catálogo básico de produtos compráveis sem depender de seed/SQL;
- pedido mínimo é monetário não-negativo e usa precisão decimal exata;
- quantidade por embalagem deve ser positiva quando informada;
- catálogo e fornecedores são compartilhados conforme autorização da Organization;
- escopos Business/Unit/Sector são aplicados conforme a política homologada na Fase 14;
- dados de demonstração/teste devem ser sintéticos;
- correções críticas preservam rastreabilidade em vez de apagar histórico material;
- Employee não contém folha, salário, jornada, CPF ou outros dados pessoais não exigidos pelo escopo atual;
- Q-022 continua aberta para definir pessoas/perfis reais e não é respondida pela existência do cadastro.

## UI

`/workspace/produtos` exige seleção de categoria tanto na criação quanto na edição. Quando não há categorias disponíveis, a gravação fica bloqueada em vez de criar classificação implícita.

`/workspace/fornecedores` oferece cadastro de fornecedor/contatos e, em cada fornecedor, consulta/manutenção das condições comerciais correntes e dos produtos compráveis. Perfis sem `manageSuppliers` continuam com leitura, enquanto a gravação permanece condicionada ao papel Organization-wide autorizado pelo RLS.

`/workspace/compras` reutiliza diretamente os vínculos ativos de `supplier_items`; uma alteração feita no fornecedor passa a definir quais produtos aparecem para um novo pedido daquele fornecedor. O preço do pedido permanece um snapshot operacional e a emissão continua alimentando `supplier_prices`.

`/workspace/funcionarios` oferece listagem e manutenção administrativa mínima, responsiva e persistente para `owner`, `admin` e `manager`. As opções de Unit/Sector já chegam filtradas por RLS, e o banco reaplica a autorização na gravação.

O ID de usuário autenticado pode ser informado explicitamente quando conhecido. Essa associação serve somente para identidade da pessoa; administração de acesso permanece separada.

## Fora do escopo desta slice

- versionamento automático de termos comerciais;
- cron/alerta de dia de pedido;
- sugestão automática de compra;
- cotações/aprovações e comparação avançada de fornecedores;
- preço/package price manual no cadastro de vínculo;
- múltiplos SKUs/variantes do mesmo fornecedor/produto;
- conversão automática de unidade/embalagem no pedido;
- BI/análise avançada de `REQ-SUP-005`;
- importação real/cutover de fornecedores.
