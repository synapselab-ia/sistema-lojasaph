# Next Action — Sistema Lojasaph

## Contexto

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — já está implementada na branch `agent/scoped-permissions` e no PR #38.

Não iniciar a Fase 14 do zero.

Estado real:

- Issue #37 aberta;
- PR #38 aberto, draft e mergeable;
- CI técnico verde no head `8bfbc3e397d3eb89ee7bcc55f89b8468985c030b`;
- migration GitHub: `supabase/migrations/20260818143221_scoped_permissions.sql`;
- migration já aplicada no Supabase remoto como versão `20260818150253` / `scoped_permissions`;
- Security/Performance Advisors já executados;
- estrutura remota de wrappers/helpers/trigger já verificada.

## Fazer agora

1. Ler `docs/ai/CURRENT_STATE.md`, `docs/ai/HANDOFF.md` e `docs/architecture/authorization-scopes.md` na branch `agent/scoped-permissions`.
2. Confirmar estado real do PR #38 e Issue #37 antes de agir.
3. **Não recriar nem reaplicar a migration `scoped_permissions`.**
4. Executar somente a homologação funcional remota final em `BEGIN/ROLLBACK` no Supabase:
   - criar usuários/memberships/dados temporários dentro da transação;
   - Organization-wide deve manter acesso amplo;
   - Business-scoped deve limitar a Units filhas;
   - Unit A não deve ler nem operar Unit B;
   - Sector-scoped deve limitar a recursos explicitamente ligados ao Sector;
   - múltiplos memberships devem formar união segura;
   - dispatch de transferência exige autorização nos dois extremos;
   - receive exige autorização no destino e não amplia acesso à origem;
   - Compras deve validar StockLocation/PurchaseOrder real;
   - Financeiro deve validar Unit/Sector do documento/parcela/pagamento;
   - Caixa deve validar Unit/CashRegister/CashSession;
   - mutation global de catálogo/fornecedor/configuração Organization-wide deve permanecer bloqueada para membership restrito;
   - tentativa de executar implementations do schema `private` como `authenticated` deve falhar;
   - confirmar rollback com zero resíduos.
5. Se a homologação falhar, corrigir a causa no GitHub primeiro, rodar todas as suites e só então reconciliar remoto por migration forward-only. Não editar o remoto fora de migration para corrigir regra.
6. Se a homologação passar:
   - registrar resultado em `CURRENT_STATE.md` e `HANDOFF.md`;
   - atualizar este `NEXT_ACTION.md` para a fase seguinte;
   - atualizar o corpo do PR #38 com CI, advisors e homologação;
   - rodar CI final no SHA documental;
   - marcar PR #38 como ready;
   - mergear PR #38;
   - confirmar Issue #37 como completed.
7. Só depois do merge escolher a próxima Issue a partir dos requisitos MUST ainda incompletos. Não resolver Q-022 por inferência.

## Não fazer agora

- não recriar helpers/RLS/wrappers já implementados;
- não reaplicar `scoped_permissions`;
- não criar roles dinâmicas/ACL arbitrária;
- não definir pessoas reais por perfil enquanto Q-022 estiver aberta;
- não dar bypass a owner/admin scoped;
- não introduzir service role no browser;
- não iniciar outra frente funcional antes de fechar #38/#37.

## Critério para encerrar a Fase 14

A homologação remota deve provar que os escopos Business/Unit/Sector restringem leitura e mutation nos recursos operacionais correspondentes, que memberships Organization-wide preservam compatibilidade e que o rollback não deixa resíduos. Depois, o SHA documental final deve permanecer verde antes do merge do PR #38.
