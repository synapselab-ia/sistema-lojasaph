# Next Action — Sistema Lojasaph

## Contexto

A Fase 22 / Issue #57 está concluída e mergeada na `main` pelo PR #58.

Estado funcional final comprovado:

- head validado: `4459de528de9dd0fa68e83a867ce866f3fb5b23e`;
- `CI` #270 — success;
- `Inventory Count Integration` #164 — success;
- `Business Transactions Integration` #147 — success;
- merge commit funcional: `26cf2a40e7c2c3948f5d82678408fe49e213ca16`.

Supabase remoto:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- `stock_item_category_required` — `20260819181239`;
- `stock_items.category_id` está `NOT NULL`, sem default;
- os 3 itens reais mantiveram os mesmos IDs e categorias;
- smoke sintético em transação validado e rollback com zero resíduo;
- nenhuma alteração de RLS, grants ou RPCs na Fase 22.

A próxima lacuna MUST objetiva é `REQ-STK-004`: registrar a retirada para consumo/operação em um Setor. Está registrada na Issue #59.

## Fazer agora

1. Confirmar estado real da Issue #59, `main`, branch `agent/stock-withdrawal-sector` (se já existir), PRs e CI.
2. Se a branch ainda não existir, criá-la a partir da `main` atual; não reutilizar branch antiga da Fase 22.
3. Ler antes de editar:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` — `REQ-STK-004`;
   - `docs/modules/inventory.md`;
   - migration que define `record_stock_withdrawal`;
   - migrations/helpers de autorização escopada da Fase 14;
   - `supabase/tests/stock_withdrawal.sql` e `supabase/tests/scoped_permissions.sql`;
   - `src/modules/inventory/adapters/supabase-stock-withdrawal-gateway.ts`;
   - `src/modules/master-data/ui/runtime-workspace-provider.tsx`;
   - `src/app/workspace/(operacao)/estoque/page.tsx`.
4. Confirmar a lacuna antes do patch:
   - assinatura atual `record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text)` não recebe Setor;
   - insert em `stock_movements` não preenche `sector_id`;
   - gateway/provider/UI não enviam `sectorId`;
   - `stock_movements.sector_id` já existe e deve continuar nullable para movimentos que não representam consumo por Setor.
5. Verificar e reutilizar o helper escopado existente apropriado para autorizar Setor; não criar semântica paralela se a Fase 14 já oferece função equivalente.
6. Criar migration versionada para a command surface de retirada:
   - nova assinatura exige `p_sector_id uuid` sem default;
   - validar Setor existente e pertencente à mesma Organization;
   - validar que o usuário autenticado alcança esse Setor conforme memberships vigentes;
   - persistir `sector_id` em `stock_movements`;
   - manter `occurred_at=now()` e `responsible_user_id=auth.uid()`;
   - incluir Setor na comparação de retry/idempotência e em `audit_logs.after_data`;
   - remover ou revogar EXECUTE da assinatura legada para `authenticated`, evitando bypass.
7. Não tornar `stock_movements.sector_id` globalmente obrigatório e não backfillar movimentos antigos.
8. Atualizar `SupabaseStockWithdrawalGateway`, provider runtime e `/workspace/estoque` para `sectorId` obrigatório.
9. Na UI, exigir escolha explícita dentre `workspace.sectors`; não inferir Setor automaticamente pelo StockLocation e não criar opção default persistível.
10. Preservar sem alteração as regras de:
    - saldo projetado;
    - custo médio móvel;
    - lock/concurrency;
    - command ID idempotente;
    - lote preferido + FEFO;
    - política de estoque negativo;
    - atomicidade/rollback.
11. Atualizar testes cobrindo pelo menos:
    - retirada válida grava `stock_movements.sector_id`;
    - assinatura antiga não é executável por `authenticated`;
    - Setor de outra Organization é rejeitado;
    - Setor fora do escopo é rejeitado;
    - retry com mesmo Setor permanece idempotente;
    - retry com Setor diferente gera `IDEMPOTENCY_KEY_CONFLICT`;
    - falhas não deixam movimento, saldo, lote ou audit residual;
    - regressões existentes de withdrawal/return/loss/transfer/inventory continuam verdes.
12. Manter grants/RLS mínimos. Qualquer assinatura pública nova deve revogar `PUBLIC/anon` e conceder somente `authenticated`, seguindo o hardening vigente.
13. Rodar lint, typecheck, Vitest, production build e os três workflows PostgreSQL.
14. Só após CI verde aplicar a migration no Supabase remoto.
15. Na homologação remota, usar dados exclusivamente sintéticos dentro de `BEGIN/ROLLBACK`; comprovar Setor persistido, escopo, idempotência e zero resíduo.
16. Rodar Security/Performance Advisors e corrigir somente problemas novos causados pela Fase 23.
17. Abrir/atualizar PR, marcar ready, mergear, fechar Issue #59 e atualizar continuidade.

## Política de segurança

- `supabase/tests/security_hardening.sql` continua obrigatório;
- não reaplicar migrations antigas;
- não depender de default privileges do provedor;
- não criar objeto manualmente no Dashboard;
- não conceder `anon` sem requisito explícito;
- não deixar assinatura RPC legada executável como caminho alternativo sem Setor.

## Política de Vercel

- `git.deploymentEnabled=false` continua vigente;
- CI é o gate principal;
- não fazer deployment rotineiro para esta fase.

## Não fazer

- não reabrir Fase 22/Issue #57;
- não reabrir hardening/Issue #54;
- não criar/inferir Setor default;
- não alterar movimentos históricos;
- não tornar `stock_movements.sector_id` globalmente `NOT NULL`;
- não implementar empréstimo/retorno por funcionário;
- não implementar filtros de dashboard por Setor nesta fase;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.

## Critério de conclusão da próxima fase

Toda nova retirada operacional persistente deve registrar um Setor explícito, válido, da mesma Organization e autorizado pelo escopo do usuário. A assinatura legada sem Setor não pode permanecer como bypass autenticado; data/responsável atuais, saldo, custo, FEFO, política de estoque negativo, idempotência e atomicidade devem continuar preservados.
