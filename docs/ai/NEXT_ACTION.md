# Next Action — Sistema Lojasaph

## Contexto

Fase 20 está concluída e mergeada na `main` pelo PR #52. Issue #51 está closed/completed.

O próximo requisito MUST verificavelmente incompleto é `REQ-STK-006 — Devolução/retorno relacionado`:

- o ledger já suporta tipos `return_in`/`return_out` e possui `reversal_of_movement_id`;
- retirada persistente já grava quantidade, custo snapshot e alocações de lote;
- não existe comando/UI persistente para relacionar devolução a um movimento anterior;
- Q-005 continua aberta, portanto devolução não deve ser confundida com empréstimo.

A Issue #53 documenta a Fase 21.

## Fazer agora

1. Confirmar estado real da Issue #53 e da `main`.
2. Criar/usar a branch `agent/stock-returns` a partir da `main` atual.
3. Ler antes de editar:
   - `docs/modules/inventory.md`;
   - `docs/product/requirements.md` — `REQ-STK-006`;
   - `docs/product/open-questions.md` — Q-003, Q-004 e Q-005;
   - ADR-002 e ADR-003;
   - migrations de inventory, withdrawal, stock loss e scoped permissions;
   - `supabase/tests/stock_withdrawal.sql` e `stock_loss.sql`;
   - gateway/UI persistentes de retirada e baixa.
4. Inspecionar `reversal_of_movement_id` e confirmar se a relação existente comporta múltiplos `return_in` parciais apontando para a mesma retirada. Preferir reutilizá-la; adicionar coluna/relação nova somente se houver incompatibilidade objetiva.
5. Definir elegibilidade mínima sem inferir Q-005:
   - origem deve ser movimento `withdrawal` confirmado da mesma Organization;
   - retorno volta ao local de origem da retirada;
   - item deve existir no movimento original;
   - quantidade retornada acumulada não pode exceder a quantidade retirada;
   - movimento original permanece imutável.
6. Preservar custo e lote:
   - usar custo snapshot da retirada original;
   - para item rastreado, derivar lotes das alocações históricas da retirada e restaurar somente identidade/quantidade comprovadas;
   - não inventar lote, validade ou custo.
7. Criar RPC/comando transacional idempotente com locks suficientes para impedir over-return concorrente.
8. Gerar novo `stock_movements.movement_type='return_in'`, relação explícita ao original e audit log.
9. Atualizar `inventory_balances` e lotes atomicamente conforme ADR de custeio; UI não edita projeções diretamente.
10. Criar testes PostgreSQL para:
    - retorno parcial e total;
    - múltiplos retornos até o limite;
    - over-return;
    - retry/idempotency conflict;
    - custo snapshot e recálculo da projeção;
    - restauração de lote/validade;
    - roles e escopo do local;
    - cross-Organization;
    - concorrência/locks quando viável;
    - rollback integral.
11. Implementar gateway/caso de uso e UI persistente para listar retiradas elegíveis, mostrar quantidade pendente e registrar retorno.
12. Atualizar `docs/modules/inventory.md`.
13. Rodar lint, typecheck, Vitest, build e todas as suites/workflows PostgreSQL.
14. Só após CI verde aplicar/homologar migration no Supabase remoto com dados sintéticos e rollback.
15. Atualizar PR/Issue e continuidade.

## Política de Supabase

- não reaplicar `stock_loss_flow` ou `stock_loss_reason_read_scope_fix`;
- migrations novas somente após CI local/GitHub verde no head da Fase 21;
- homologação remota deve usar dados sintéticos e deixar zero resíduo;
- checar grants/RLS/RPC após DDL, não presumir defaults do ambiente hospedado;
- advisor antigo não é autorização para ampliar escopo.

## Política de Vercel

- `git.deploymentEnabled=false` permanece vigente;
- não reativar deployments automáticos;
- CI é o gate principal;
- usar deployment manual apenas se surgir validação concreta que dependa de browser/hosting real.

## Não fazer

- não criar empréstimo, prazo ou quantidade pendente de empréstimo enquanto Q-005 estiver aberta;
- não implementar componente financeiro entre unidades ou interpretar `Valor total em haver` sem Q-004;
- não inferir o checkbox de Q-003;
- não implementar devolução a fornecedor/`return_out` sem requisito comprovado;
- não alterar movimento histórico original para representar devolução;
- não importar dados reais;
- não reabrir Fase 20.

## Critério de conclusão da próxima fase

Uma retirada persistente aceita retorno parcial/total ao estoque por novo movimento `return_in` relacionado ao original, sem over-return e sem editar o histórico. Custo/lote/auditoria permanecem rastreáveis, RLS/escopo e idempotência são garantidos no PostgreSQL, CI fica verde e a homologação remota deixa zero resíduo sintético.
