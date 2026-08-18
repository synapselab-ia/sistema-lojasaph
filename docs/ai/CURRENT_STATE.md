# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #38 — merged
- Issue #37 — closed/completed
- merge commit: `0cbb6ed38add92fb220f575cad17c6983d700ed3`
- head documental final validado antes do merge: `8795f4b3aca0d1693da3ede0c4fc68e3f024ba56`
- próxima Issue: #39 — `Fase 15 — staging de importação, dry run e reconciliação rastreável`
- nenhuma branch funcional da Fase 15 foi iniciada ainda.

## Fase 14 — concluído

- migration canônica no GitHub: `supabase/migrations/20260818143221_scoped_permissions.sql`;
- helpers privados para Organization-wide, Business, Unit, Sector e recursos operacionais;
- trigger de integridade da hierarquia de `organization_memberships`;
- RLS operacional scope-aware;
- commands públicos como wrappers de autorização e implementations transacionais no schema `private`;
- `authenticated` sem `EXECUTE` direto nas implementations privadas testadas;
- transferências com regra conservadora de origem/destino;
- mutation global bloqueada para membership restrito quando o recurso é Organization-wide;
- UI/runtime distingue permissões globais das operacionais escopadas;
- documentação em `docs/architecture/authorization-scopes.md`;
- suíte `supabase/tests/scoped_permissions.sql`.

## Validação final da Fase 14

No SHA `8795f4b3aca0d1693da3ede0c4fc68e3f024ba56` os três workflows finais passaram:

- `CI`;
- `Inventory Count Integration`;
- `Business Transactions Integration`.

A homologação funcional remota foi executada no Supabase hospedado em uma única transação `BEGIN/ROLLBACK`, reutilizando `supabase/tests/scoped_permissions.sql`.

Resultado: `scoped permission tests passed`.

Foi comprovado remotamente:

- Organization-wide preserva acesso amplo;
- Business limita às Units filhas;
- Unit A não lê/opera Unit B;
- Sector não amplia recurso sem vínculo explícito;
- múltiplos memberships formam união segura;
- dispatch exige autorização nos dois extremos;
- receive exige autorização no destino sem ampliar acesso à origem;
- Compras, Financeiro e Caixa validam o recurso real;
- mutation Organization-wide permanece bloqueada para membership restrito;
- viewer permanece read-only;
- implementations privadas testadas não são executáveis por `authenticated`.

Após o `ROLLBACK`, checagem separada confirmou zero resíduos temporários em usuários/memberships, hierarquia, catálogo, estoque, transferências, compras, financeiro e caixa.

## Supabase remoto

A migration de escopos já está aplicada como versão remota `20260818150253` / `scoped_permissions`.

**Não reaplicar.**

Security Advisor mantém warnings esperados dos wrappers públicos `SECURITY DEFINER`; eles são a fronteira RPC autorizada e revalidam identidade, role, Organization e escopo antes da implementation privada.

Performance Advisor mantém recomendações de tuning não bloqueantes para esta fase.

## Próxima frente — Issue #39

A próxima lacuna executável foi escolhida a partir dos requisitos MUST ainda incompletos:

- `REQ-IMP-001` — importação rastreável;
- `REQ-IMP-002` — idempotência;
- `REQ-IMP-003` — preview/dry run;
- `REQ-IMP-004` — relatório de inconsistências;
- suporte de aliases necessário à migração conforme `REQ-ITEM-002`.

A Issue #39 cobre somente a **fundação de staging/importação com dados sintéticos**. Não importar planilhas reais, não executar cutover e não resolver questões abertas por inferência.

## Não repetir

- não recriar/reaplicar `scoped_permissions`;
- não reimplementar a Fase 14;
- não redefinir perfis/pessoas reais enquanto Q-022 estiver aberta;
- não iniciar migração definitiva sem staging, validação, backup/reconciliação e regras aprovadas;
- não versionar arquivos reais das planilhas nem segredos.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: iniciar a Issue #39 em branch própria a partir da `main`, implementando somente a fundação de staging/dry run com fixtures sintéticos e mantendo CI/Supabase/documentação coerentes.
