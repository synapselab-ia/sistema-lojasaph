# Handoff — Sistema Lojasaph

## Estado

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — está **implementada, com CI verde e migration aplicada no Supabase remoto**.

Frente única:

- Issue #37 — aberta;
- branch `agent/scoped-permissions`;
- PR #38 — aberto, draft, mergeable.

Head técnico validado antes da atualização documental: `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b`.

## Já concluído — não repetir

- migration `20260818143221_scoped_permissions.sql` criada e validada;
- helpers privados de escopo;
- trigger de hierarquia de membership;
- RLS scope-aware;
- wrappers públicos de todos os commands críticos;
- implementações transacionais movidas para `private` e sem `EXECUTE` para `authenticated`;
- política conservadora de transferências;
- mutation global bloqueada para membership restrito quando o recurso é Organization-wide;
- UI/runtime com distinção entre roles globais e escopadas;
- `docs/architecture/authorization-scopes.md`;
- `supabase/tests/scoped_permissions.sql`;
- CI completo verde;
- migration aplicada no Supabase remoto;
- advisors executados;
- verificação estrutural do remoto executada.

Não recriar nem reaplicar `scoped_permissions`.

## Estado remoto

O histórico do Supabase contém `scoped_permissions` como versão remota `20260818150253`.

O timestamp remoto não é o nome do arquivo versionado no GitHub; o conteúdo aplicado corresponde à migration canônica do PR.

Security Advisor mantém warnings de RPCs `SECURITY DEFINER` expostos a `authenticated`. São intencionais nesta arquitetura: wrappers públicos validam identidade, role, Organization e escopo; implementações internas ficam no schema `private` sem grant de execução para usuários autenticados.

Performance Advisor mostra otimizações de índices/FKs e uma policy com `auth.uid()` por linha. Tratar em fase de tuning/hardening posterior, salvo evidência de impacto real.

## Próxima ação exata

Executar a homologação funcional remota final em **uma transação `BEGIN/ROLLBACK`**, usando memberships temporários e dados temporários, provando:

1. Organization-wide preserva comportamento atual;
2. Business vê/opera apenas Units filhas;
3. Unit A não vê/opera Unit B;
4. Sector vê/opera somente recursos explicitamente vinculados;
5. múltiplos memberships formam união segura;
6. dispatch de transferência exige autorização nos dois extremos;
7. receive exige destino e não amplia acesso à origem;
8. Compras, Financeiro e Caixa respeitam o recurso real;
9. acesso direto às implementations `private` por `authenticated` é negado;
10. rollback deixa zero resíduos.

Se a homologação passar:

- atualizar os três arquivos de continuidade com o resultado;
- atualizar PR #38 com evidência de CI + remoto;
- rodar CI final do SHA documental;
- marcar PR ready;
- mergear PR #38;
- confirmar Issue #37 completed;
- escolher a próxima Issue com base nos MUST ainda incompletos.

## Regras que permanecem

- sem escopo = Organization-wide;
- Business limita a filhos;
- Unit limita à própria Unit/filhos;
- Sector não amplia recurso sem vínculo explícito;
- múltiplos memberships = união dos escopos válidos;
- owner/admin scoped continuam scoped;
- catálogo/fornecedores compartilhados podem ser lidos conforme RLS, mas mutation global exige escopo amplo quando aplicável;
- service role nunca no browser;
- Q-022 continua aberta para perfis/pessoas reais.
