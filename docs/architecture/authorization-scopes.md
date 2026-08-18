# Authorization Scopes

## Objetivo

Aplicar `REQ-SEC-002` de forma consistente no backend e no banco: um usuário não é autorizado apenas por `role`, mas também pelo escopo do membership dentro da Organization.

## Hierarquia

`Organization -> Business -> Unit -> Sector`

Recursos operacionais herdam o escopo por sua relação física:

- `StockLocation -> Unit/Sector`;
- `CashRegister -> Unit`;
- `CashSession -> CashRegister -> Unit`;
- `PurchaseOrder -> StockLocation`;
- `PayableDocument -> Unit/Sector`;
- `InventoryCount -> StockLocation`;
- `StockTransfer -> source/destination StockLocation`.

## Semântica de memberships

- sem `business_id`, `unit_id` e `sector_id`: Organization-wide;
- `business_id`: Business + Units/Setores filhos;
- `unit_id`: própria Unit + setores/locais/caixas subordinados;
- `sector_id`: somente recursos explicitamente vinculados ao Sector;
- múltiplos memberships do mesmo usuário formam união dos escopos válidos;
- `owner/admin` com membership escopado continuam sujeitos ao escopo; não há bypass implícito.

A trigger `private.validate_membership_scope_hierarchy()` impede combinações inconsistentes de Business/Unit/Sector.

## Leituras

RLS usa helpers privados scope-aware para Business, Unit, Sector e recursos operacionais. Cadastros mestres compartilhados da Organization podem permanecer legíveis quando necessários para operação, desde que a leitura não exponha registros operacionais fora do escopo.

## Mutations

Commands transacionais públicos são wrappers `SECURITY DEFINER` que:

1. exigem `auth.uid()`;
2. validam role Organization-level;
3. validam o recurso real contra o escopo permitido;
4. somente então chamam a implementação transacional no schema `private`.

As implementações privadas não possuem `EXECUTE` para `authenticated`.

Erro de role permanece `INSUFFICIENT_ROLE`. Role válida fora do recurso permitido retorna `INSUFFICIENT_SCOPE`.

## Recursos globais

Mutation de catálogo, fornecedor e configurações que afetam a Organization inteira exige membership Organization-wide quando não existe regra de negócio explícita permitindo administração escopada.

No frontend, permissões globais e operacionais são derivadas separadamente. A UI não é a fronteira de segurança; RLS/RPC continuam autoridade final.

## Transferências

- dispatch exige autorização nos dois extremos;
- receive exige autorização no destino;
- acesso ao destino não amplia automaticamente o acesso à origem.

## Caixa

- criar `CashRegister` pode ser autorizado na Unit escopada;
- abrir/operar sessão depende do CashRegister/Unit;
- cadastrar meios de pagamento e regras de taxa continua configuração Organization-wide.

## Estado de validação — 2026-08-18

Migration canônica: `supabase/migrations/20260818143221_scoped_permissions.sql`.

CI do head técnico `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b` passou:

- lint;
- typecheck;
- Vitest;
- production build;
- PostgreSQL limpo;
- Inventory Count Integration;
- Business Transactions Integration;
- `supabase/tests/scoped_permissions.sql`.

A migration já foi aplicada no Supabase remoto e aparece no histórico como versão remota `20260818150253` / `scoped_permissions`. Não reaplicar.

Security Advisor continua sinalizando os wrappers públicos `SECURITY DEFINER`; isso é intencional nesta arquitetura porque eles são a API autorizada e revalidam identidade/role/escopo. Implementações ficam em `private` sem grant de execução para `authenticated`.

Pendência antes do merge: homologação funcional remota em `BEGIN/ROLLBACK` cobrindo Organization/Business/Unit/Sector, múltiplos memberships, transferências, Compras, Financeiro, Caixa e bloqueio das implementations privadas; confirmar zero resíduos após rollback.
