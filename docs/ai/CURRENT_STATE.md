# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — **implementada, aplicada e homologada no Supabase remoto; aguardando apenas CI documental final + ready/merge do PR #38**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch ativa: `agent/scoped-permissions`
- PR atual: #38 — `Fase 14 — permissões por escopo e hardening RLS` — aberto, draft, mergeable
- Issue atual: #37 — aberta
- Head técnico previamente validado: `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b`

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
- documentação de arquitetura em `docs/architecture/authorization-scopes.md`;
- suíte `supabase/tests/scoped_permissions.sql` cobre Organization/Business/Unit/Sector, múltiplos memberships, viewer, cross-scope, transferência, Compras, Financeiro, Caixa e acesso às implementações privadas.

## Validação CI técnica

No head técnico `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b` os três workflows estavam verdes:

- `CI` — lint, typecheck, Vitest, production build e banco principal;
- `Inventory Count Integration`;
- `Business Transactions Integration` — incluindo `scoped_permissions.sql`.

A regressão Organization-wide também permaneceu verde.

## Supabase remoto

A mudança de escopo **já foi aplicada** no projeto remoto. Não reaplicar a migration.

Histórico remoto contém:

- versão remota `20260818150253` — `scoped_permissions`.

Observação: a versão remota é diferente do timestamp do arquivo GitHub porque `apply_migration` registra sua própria versão no projeto remoto. O conteúdo aplicado corresponde à migration canônica validada no PR.

Verificação estrutural remota confirmou wrappers públicos, implementações privadas, helpers de escopo e trigger de hierarquia.

Security Advisor: warnings de `SECURITY DEFINER` nos wrappers públicos continuam esperados/intencionais; os wrappers são a API transacional e revalidam `auth.uid()`, role, Organization e escopo antes de chamar a implementação privada.

Performance Advisor: apenas recomendações de índices/FKs e `auth.uid()` em policy; não são bloqueantes para a Fase 14.

## Homologação funcional remota final

Homologação executada em 2026-08-18 no Supabase hospedado, reutilizando a suíte versionada `supabase/tests/scoped_permissions.sql` em **uma única transação `BEGIN/ROLLBACK`**.

Resultado: `scoped permission tests passed`.

Foi comprovado remotamente que:

- membership Organization-wide preserva comportamento amplo;
- Business limita às Units filhas;
- Unit A não lê nem opera Unit B;
- Sector não amplia recurso unit-wide sem vínculo explícito;
- múltiplos memberships formam união segura;
- dispatch exige autorização nos dois extremos;
- receive exige autorização no destino e não amplia acesso à origem;
- Compras valida StockLocation/PurchaseOrder real;
- Financeiro valida Unit/Sector do documento;
- Caixa valida Unit/CashRegister e bloqueia configuração Organization-wide para membership restrito;
- viewer permanece read-only;
- `authenticated` não possui `EXECUTE` nas implementations privadas testadas.

Após o `ROLLBACK`, uma verificação separada retornou zero resíduos para usuários/memberships temporários e para os artefatos temporários de hierarquia, catálogo, estoque, transferência, compras, financeiro e caixa.

## Pendência exata antes do merge

1. atualizar corpo do PR #38 com a evidência da homologação;
2. rodar CI final no SHA documental;
3. marcar PR #38 como ready;
4. mergear #38;
5. confirmar Issue #37 como completed;
6. só então escolher a próxima Issue a partir dos requisitos MUST ainda pendentes, sem resolver Q-022 por inferência.

## Não repetir

- não recriar a migration;
- não reaplicar `scoped_permissions` no Supabase;
- não reimplementar helpers/RLS/wrappers;
- não refazer a suíte de escopos salvo regressão real;
- não redefinir perfis/pessoas reais enquanto Q-022 estiver aberta;
- não dar bypass implícito a owner/admin com membership escopado.
