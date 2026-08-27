# Módulo — Cadastros base

Status: núcleo cadastral persistente; Fase 19 implementa funcionários operacionais separados da identidade de acesso; Fase 22 torna categoria obrigatória no item canônico; Fases 44–45 completam condições comerciais e produtos por fornecedor; Fase 50 expõe EAN/NCM/CEST já existentes no schema.

## Objetivo

Fornecer os dados mestres usados por estoque, compras, financeiro, caixa e administração.

## Escopo implementado

- estrutura Organization → Business → Unit → Sector/StockLocation;
- StockItem com categoria obrigatória, unidade, tipo, flags operacionais e identificadores opcionais EAN/NCM/CEST;
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

Desde a foundation, `public.stock_items` também possui:

- `internal_code text null` com unicidade por Organization;
- `ean text null` com unicidade por Organization;
- `ncm text null`;
- `cest text null`.

A Fase 50 não altera esse schema. Ela apenas passa a ler e manter `ean`, `ncm` e `cest` no domínio/adaptor/UI de StockItem. Valores são opcionais, recebem somente `trim`, e branco é persistido como `null`. Não há validação automática de dígito verificador, máscara, comprimento ou enquadramento tributário.

`internal_code` não faz parte da Fase 50 e permanece com sua semântica atual; não confundir código interno com EAN.

## EAN e dados fiscais — REQ-ITEM-003

A manutenção operacional de `/workspace/produtos` permite informar:

- EAN/código de barras;
- NCM;
- CEST.

Regras conservadoras:

1. todos são opcionais;
2. valores informados são preservados como texto após `trim`;
3. string vazia equivale a ausência;
4. EAN continua sujeito à unicidade por Organization já existente no banco;
5. NCM/CEST são dados informativos nesta fase e não disparam cálculo/regra fiscal;
6. não há consulta automática a catálogo externo;
7. não há validação de GTIN/dígito verificador;
8. a UI não decide se NCM/CEST são obrigatórios para determinado item/regime;
9. o browser usa a sessão autenticada e as mesmas policies/roles de manutenção do catálogo;
10. nenhuma migration, RPC, view ou chave privilegiada é necessária.

A planilha histórica `Gabarito` contém EAN/NCM/CEST, porém Q-006 continua aberta sobre representar produto de venda/POS separado de item de estoque. Por isso a Fase 50 **não** importa, associa ou transforma automaticamente linhas do `Gabarito` em `stock_items`.

## Employee

Employee é persistido em `public.employees` com Organization obrigatória, nome obrigatório, código operacional opcional, status, Unit/Sector padrão opcionais e `auth_user_id` opcional. A autorização continua pertencendo exclusivamente a `organization_memberships`.

- cadastrar Employee não cria login nem membership;
- vincular `auth_user_id` não concede role ou escopo;
- remover/inativar Employee não encerra sessão nem revoga membership;
- perfis operacionais sem papel administrativo não recebem manutenção do diretório apenas por pertencerem à Organization;
- ciclo de vida usa inativação em vez de apagar referência operacional.

## Condições comerciais de fornecedor

`REQ-SUP-003` reutiliza `suppliers.notes` e `supplier_terms` para pedido mínimo, condição de pagamento e agendas de pedido/entrega. A primeira slice trabalha com um termo corrente por fornecedor (`valid_to IS NULL`) e não cria versionamento temporal, cron ou sugestão de compra automaticamente.

Agenda de pedido/entrega permanece texto informativo, como na fonte histórica.

## Produtos por fornecedor

`REQ-SUP-004` usa `public.supplier_items`:

- `supplier_id` e `stock_item_id` definem o vínculo;
- `purchase_unit` é texto opcional;
- `units_per_package` é opcional e positivo;
- `active=false` inativa sem apagar histórico;
- `supplier_sku` permanece fora da primeira slice operacional;
- unidade/embalagem são informativas e pedidos continuam usando quantidade na unidade-base;
- preço efetivo é snapshot do pedido e a emissão alimenta `supplier_prices`.

RLS é a autoridade: membros autenticados da Organization podem ler, enquanto INSERT/UPDATE exigem papel Organization-wide autorizado. Não há service/admin client no browser.

## Regras consolidadas

- IDs de domínio são estáveis;
- todo StockItem canônico possui categoria explícita e válida da mesma Organization;
- criação/edição sem categoria falham antes da persistência;
- EAN/NCM/CEST são opcionais e não implicam regra tributária automática;
- fornecedor pode ter múltiplos contatos e condições comerciais livres;
- fornecedor pode manter catálogo básico de produtos compráveis sem seed/SQL;
- pedido mínimo usa precisão monetária exata;
- quantidade por embalagem deve ser positiva quando informada;
- dados de demonstração/teste devem ser sintéticos;
- correções críticas preservam rastreabilidade em vez de apagar histórico material;
- Q-006 continua aberta e não é resolvida pela existência dos campos fiscais em `stock_items`;
- Q-022 continua aberta para perfis/pessoas reais e não é respondida pelo cadastro de Employee.

## UI

`/workspace/produtos` exige categoria na criação e edição, permite EAN/NCM/CEST opcionais e mostra os identificadores cadastrados. Sem categorias disponíveis, a gravação fica bloqueada. Perfis sem `manageCatalog` permanecem somente leitura.

`/workspace/fornecedores` oferece cadastro de fornecedor/contatos, condições comerciais correntes e produtos compráveis. `/workspace/compras` reutiliza diretamente os vínculos ativos de `supplier_items`.

`/workspace/funcionarios` oferece manutenção administrativa mínima e persistente para os papéis autorizados.

## Fora do escopo desta slice

- resolver Q-006 ou criar produto de venda/POS;
- importar automaticamente EAN/NCM/CEST do `Gabarito`;
- consulta externa de GTIN/EAN;
- validação tributária de NCM/CEST;
- CFOP, CST, CSOSN, alíquotas, emissão NF-e/NFC-e;
- redefinir `internal_code`;
- versionamento automático de termos comerciais;
- cron/alerta de dia de pedido;
- sugestão automática de compra;
- cotações/aprovações e comparação avançada de fornecedores;
- conversão automática de unidade/embalagem no pedido;
- importação real/cutover de fornecedores.
