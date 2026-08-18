# Next Action — Sistema Lojasaph

## Contexto

Fase 19 está concluída e mergeada na `main` pelo PR #50. Issue #49 está closed/completed.

O próximo requisito MUST verificavelmente incompleto selecionado é `REQ-STK-008 — Perdas e vencimentos`, reforçando também `REQ-STK-003 — Tipos/motivos estruturados`.

Evidência:

- `stock_movements` já reserva `loss` e `expiration` e possui `reason_code`;
- o fluxo persistente atual cobre entrada, retirada, transferência e inventário;
- não existe comando/UI persistente documentado para perda, quebra ou vencimento;
- a Issue #51 documenta a Fase 20.

## Fazer agora

1. Confirmar estado real da Issue #51, `main`, PRs e branches.
2. Criar/usar a branch `agent/stock-losses` a partir da `main` atual.
3. Ler antes de editar:
   - `docs/product/requirements.md` — `REQ-STK-001`, `REQ-STK-003`, `REQ-STK-008`;
   - `docs/modules/inventory.md`;
   - ADRs de ledger/custeio;
   - migrations de inventory, transactional withdrawal, multi-batch/scoped permissions;
   - gateway/UI atuais de retirada e lotes.
4. Definir motivo estruturado mínimo e reversível:
   - perda;
   - quebra;
   - vencimento;
   - outro motivo configurado, sem inventar taxonomia real do cliente.
5. Versionar migration necessária para motivos/RLS/constraints e comando transacional idempotente de baixa.
6. Reutilizar as invariantes já homologadas de estoque:
   - row/advisory locks;
   - saldo nunca editado diretamente;
   - estoque negativo conforme política vigente;
   - lote preferido/FEFO quando aplicável;
   - item rastreado não fabrica lote/validade;
   - custo histórico preservado;
   - command ID idempotente;
   - audit log obrigatório.
7. Registrar `stock_movements.movement_type` como `loss` ou `expiration` e preencher `reason_code` estruturado.
8. Criar testes PostgreSQL para:
   - perda/quebra/vencimento;
   - saldo e custo;
   - lotes/FEFO;
   - idempotência;
   - roles e escopo Unit/Sector;
   - cross-Organization;
   - rollback integral em erro;
   - audit log.
9. Implementar gateway/caso de uso e UI persistente no estoque sem acoplar domínio ao SDK.
10. Atualizar `docs/modules/inventory.md`.
11. Rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL.
12. Só após CI verde aplicar/homologar no Supabase remoto com dados sintéticos e rollback.
13. Atualizar PR/Issue e continuidade ao final.

## Separação de escopo

Não misturar nesta fase:

- `REQ-STK-006` devolução/retorno relacionado;
- empréstimos enquanto Q-005 estiver aberta;
- notificações externas;
- descarte/logística física;
- dados reais/cutover.

## Política de Vercel

- `git.deploymentEnabled=false` permanece vigente;
- não reativar deployments automáticos;
- não exigir Preview para cada commit/head;
- CI é o gate principal;
- deployment manual apenas se surgir validação concreta que dependa de ambiente hospedado.

## Critério de conclusão da Fase 20

Usuário autorizado consegue registrar baixa por perda, quebra ou vencimento com motivo estruturado; saldo, lotes, custo e auditoria permanecem consistentes e idempotentes sob retry; RLS/escopo impedem operação indevida; CI fica verde e a homologação remota usa apenas dados sintéticos com zero resíduo.
