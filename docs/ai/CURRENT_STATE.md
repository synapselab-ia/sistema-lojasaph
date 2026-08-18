# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — **implementada e aplicada no Supabase remoto, aguardando apenas homologação funcional remota final + fechamento documental/merge**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch ativa: `agent/scoped-permissions`
- PR atual: #38 — `Fase 14 — permissões por escopo e hardening RLS` — aberto, draft, mergeable
- Issue atual: #37 — aberta
- Head validado: `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b`

## O que já foi concluído na Fase 14

- migration canônica no GitHub: `supabase/migrations/20260818143221_scoped_permissions.sql`;
- helpers privados para Organization-wide, Business, Unit, Sector, StockLocation, PurchaseOrder, PayableDocument, CashRegister e demais recursos operacionais;
- validação de hierarquia de `organization_memberships` por trigger;
- RLS operacional scope-aware;
- commands públicos preservados como wrappers de autorização e implementações transacionais movidas para `private`;
- implementations privadas sem `EXECUTE` para `authenticated`;
- wrappers públicos continuam a fronteira RPC e validam role + escopo real;
- transferências: dispatch exige os dois extremos; receive exige destino;
- catálogo/fornecedores/configurações globais: mutation exige membership Organization-wide quando a alteração afeta a Organization inteira;
- UI/runtime distingue role Organization-wide de role operacional escopada;
- Caixa separa cadastro de caixa local de configuração global de meios/taxas;
- documentação de arquitetura criada em `docs/architecture/authorization-scopes.md`;
- suíte `supabase/tests/scoped_permissions.sql` cobre Organization/Business/Unit/Sector, múltiplos memberships, viewer, cross-scope, transferência, Compras, Financeiro, Caixa e acesso às implementações privadas.

## Validação CI

No head `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b` os três workflows estão verdes:

- `CI` — lint, typecheck, Vitest, production build e banco principal;
- `Inventory Count Integration`;
- `Business Transactions Integration` — incluindo `scoped_permissions.sql`.

A regressão Organization-wide também permanece verde.

## Supabase remoto

A mudança de escopo **já foi aplicada** no projeto remoto. Não reaplicar a migration.

Histórico remoto contém:

- versão remota `20260818150253` — `scoped_permissions`.

Observação: a versão remota é diferente do timestamp do arquivo GitHub porque `apply_migration` registra sua própria versão no projeto remoto. O conteúdo aplicado corresponde à migration canônica validada no PR.

Verificação estrutural remota confirmou:

- wrappers públicos existentes;
- implementações privadas existentes;
- helpers de escopo existentes;
- trigger de hierarquia existente.

Security Advisor: warnings de `SECURITY DEFINER` nos wrappers públicos continuam esperados/intencionais; os wrappers são a API transacional e revalidam `auth.uid()`, role, Organization e escopo antes de chamar a implementação privada.

Performance Advisor: apenas recomendações de índices/FKs e `auth.uid()` em policy; não são bloqueantes para a Fase 14.

## Pendência exata antes do merge

Falta **somente a homologação funcional remota final em `BEGIN/ROLLBACK`** para provar no Supabase hospedado, com memberships temporários, que:

- Unit A não lê/opera Unit B;
- Business limita às Units filhas;
- Sector não amplia recurso unit-wide sem vínculo;
- múltiplos memberships formam união segura;
- transferência respeita origem/destino;
- membership Organization-wide preserva o comportamento amplo;
- implementations em `private` continuam inacessíveis ao usuário autenticado;
- rollback deixa zero resíduos.

Depois disso:

1. atualizar `CURRENT_STATE.md`, `HANDOFF.md` e `NEXT_ACTION.md` com o resultado da homologação;
2. atualizar corpo do PR #38;
3. rodar CI final no SHA documental;
4. marcar PR #38 como ready;
5. mergear #38;
6. confirmar Issue #37 como completed;
7. definir a próxima Issue a partir dos MUST ainda pendentes, sem inventar Q-022.

## Não repetir

- não recriar a migration;
- não reaplicar `scoped_permissions` no Supabase;
- não reimplementar helpers/RLS/wrappers;
- não refazer a suíte de escopos;
- não redefinir perfis/pessoas reais enquanto Q-022 estiver aberta;
- não dar bypass implícito a owner/admin com membership escopado.
