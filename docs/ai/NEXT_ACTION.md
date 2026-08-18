# Next Action — Sistema Lojasaph

## Contexto

- Fase 12 — Caixa — integrada na `main` e Issue #33 completed.
- Fase 13 — Dashboard — concluída tecnicamente no PR #36, sem migration nova, com CI verde e homologação remota de leitura sob RLS.
- Issue #35 deve ser encerrada pelo merge do PR #36.
- Próxima Issue registrada: #37 — Fase 14 — Permissões por escopo de unidade/setor e hardening RLS.

## Fazer agora

1. Confirmar que o PR #36 foi integrado e a Issue #35 fechou como completed.
2. Tornar a Issue #37 a única frente em andamento.
3. Criar branch nova a partir da `main`, sugerida `agent/scoped-permissions`.
4. Ler antes de implementar:
   - `docs/product/requirements.md` — REQ-SEC-002 e REQ-SEC-003;
   - `docs/product/open-questions.md` — Q-022;
   - `docs/architecture/data-model.md` — Organization/Business/Unit/Sector/StockLocation e memberships;
   - `supabase/migrations/20260817190000_foundation.sql` — estrutura atual de membership;
   - `supabase/migrations/20260817214846_private_membership_helpers.sql`;
   - RLS e commands atuais de Estoque, Transferência, Inventário, Compras, Financeiro e Caixa;
   - ADR-001 e ADR-006, além dos ADRs de cada módulo afetado.
5. Mapear cada recurso operacional para seu escopo físico antes de mudar policy/RPC:
   - Unit direta;
   - Sector direto quando existir;
   - StockLocation → Unit/Sector;
   - CashRegister → Unit;
   - PurchaseOrder → StockLocation;
   - PayableDocument → Unit/Sector;
   - InventoryCount → StockLocation;
   - Transfer → origem/destino.
6. Gerar uma migration nova somente via Supabase CLI pinado.
7. Implementar helpers privados de escopo com defaults conservadores:
   - membership sem business/unit/sector = Organization-wide;
   - Business autoriza apenas filhos;
   - Unit autoriza própria Unit/filhos;
   - Sector autoriza apenas recursos explicitamente vinculados ao Sector;
   - múltiplos memberships formam união dos escopos válidos;
   - owner/admin não ignoram escopo explicitamente informado.
8. Preservar leitura de cadastros mestres compartilhados necessária à operação, mas exigir membership Organization-wide para mutation global que afete outras unidades, salvo regra explicitamente documentada.
9. Atualizar RLS das tabelas operacionais para usar os helpers de escopo.
10. Atualizar RPCs `SECURITY DEFINER` para validar o recurso real dentro do escopo, não apenas Organization + role.
11. Transferências:
   - criação/despacho exige autorização nos dois extremos;
   - recebimento exige autorização no destino;
   - não usar destino para ampliar leitura da origem.
12. Alinhar queries/UI para não listar unidades, locais, caixas ou operações fora do escopo efetivo.
13. Criar testes SQL antes de aplicar remotamente para:
   - Organization-wide;
   - Business-scoped;
   - Unit-scoped;
   - Sector-scoped;
   - múltiplos memberships;
   - viewer/roles;
   - cross-Unit/cross-Sector/cross-Organization;
   - transferências com autorização parcial/total;
   - anon;
   - regressão dos commands existentes.
14. Rodar lint, typecheck, testes, build e todas as suites SQL afetadas.
15. Aplicar migration remotamente somente após CI limpo; rodar advisors e homologar em `BEGIN/ROLLBACK` com memberships temporários.
16. Documentar a política em arquivo de arquitetura/autorização, atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION e somente então integrar.

## Não fazer na Fase 14

- definir pessoas reais em cada role enquanto Q-022 estiver aberta;
- introduzir ACL arbitrária/roles dinâmicas;
- criar SSO/2FA;
- alterar regras de negócio de Estoque/Compras/Financeiro/Caixa fora do necessário para autorização;
- dar bypass implícito a owner/admin scoped;
- usar service role no browser.

## Critério de conclusão da próxima fase

Memberships limitados a Business/Unit/Sector restringem de fato leitura e mutation nos recursos operacionais correspondentes, inclusive RPCs `SECURITY DEFINER`, enquanto memberships sem escopo preservam o comportamento Organization-wide atual. A política deve estar comprovada por PostgreSQL limpo, CI e homologação remota sem resíduos.
