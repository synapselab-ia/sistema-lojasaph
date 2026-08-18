# Next Action — Sistema Lojasaph

## Contexto

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — está implementada na branch `agent/scoped-permissions` / PR #38, aplicada e homologada no Supabase remoto.

Não reiniciar a Fase 14 nem reaplicar `scoped_permissions`.

Estado real após a homologação remota de 2026-08-18:

- Issue #37 aberta;
- PR #38 aberto, draft e mergeable;
- head técnico `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b` já teve CI técnico verde;
- migration GitHub: `supabase/migrations/20260818143221_scoped_permissions.sql`;
- migration remota: `20260818150253` / `scoped_permissions`;
- Security/Performance Advisors já executados;
- estrutura remota de wrappers/helpers/trigger já verificada;
- homologação funcional remota em uma única transação `BEGIN/ROLLBACK` passou com `scoped permission tests passed`;
- checagem pós-rollback confirmou zero resíduos temporários.

## Fazer agora

1. Atualizar o corpo do PR #38 com:
   - CI técnico verde;
   - migration remota já aplicada;
   - advisors executados;
   - homologação funcional remota aprovada;
   - zero resíduos após rollback.
2. Rodar/confirmar o CI final no SHA documental da branch `agent/scoped-permissions`.
3. Se todos os checks obrigatórios permanecerem verdes, marcar o PR #38 como ready.
4. Mergear o PR #38 em `main`.
5. Confirmar a Issue #37 como completed/closed.
6. Só depois do merge, revisar os requisitos MUST ainda incompletos e escolher/criar a próxima Issue operacional.
7. Não resolver Q-022 por inferência; se o próximo MUST depender dela, manter a questão aberta e escolher outro MUST executável ou registrar o bloqueio real.

## Não fazer agora

- não recriar helpers/RLS/wrappers já implementados;
- não reaplicar `scoped_permissions`;
- não alterar o remoto para “corrigir” algo que já passou na homologação;
- não criar roles dinâmicas/ACL arbitrária;
- não definir pessoas reais por perfil enquanto Q-022 estiver aberta;
- não dar bypass a owner/admin scoped;
- não introduzir service role no browser;
- não iniciar outra frente funcional antes de fechar #38/#37.

## Critério para encerrar a Fase 14

O SHA documental final deve permanecer verde, o PR #38 deve estar merged e a Issue #37 deve estar closed. A próxima frente só é escolhida depois desse fechamento.
