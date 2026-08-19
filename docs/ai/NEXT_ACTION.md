# Next Action — Sistema Lojasaph

## Contexto

A Fase 20 está concluída e a auditoria/hardening preventivo de RLS/grants da Issue #54 também foi concluída antes da próxima frente funcional.

Estado de segurança vigente:

- PR #55 mergeado;
- Issue #54 closed/completed;
- migration `rls_grant_hardening` homologada no Supabase remoto;
- 45/45 tabelas `public` com RLS;
- `anon` sem grants em relações de aplicação;
- grants de `authenticated` reconciliados com policies explícitas;
- default privileges do owner `postgres` fechados;
- `security_hardening.sql` é gate permanente do CI.

O próximo requisito MUST verificavelmente incompleto continua sendo `REQ-STK-006 — Devolução/retorno relacionado` e está registrado na Issue #53.

## Fazer agora

1. Confirmar estado real da Issue #53, da `main` e da branch `agent/stock-returns`.
2. Usar `agent/stock-returns` a partir da `main` pós-hardening; não criar branch duplicada.
3. Ler antes de editar:
   - `docs/modules/inventory.md`;
   - `docs/modules/supabase-runtime.md` — regras novas de grants/RLS;
   - `docs/product/requirements.md` — `REQ-STK-006`;
   - `docs/product/open-questions.md` — Q-003, Q-004 e Q-005;
   - ADR-002 e ADR-003;
   - migrations de inventory, withdrawal, stock loss, scoped permissions e `rls_grant_hardening`;
   - `supabase/tests/stock_withdrawal.sql`, `stock_loss.sql` e `security_hardening.sql`;
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
10. Na migration da Fase 21, manter least privilege explicitamente:
    - RLS em toda tabela nova exposta;
    - policies explícitas;
    - grants mínimos para `authenticated` somente nos comandos necessários;
    - nenhum grant para `anon` sem requisito explícito;
    - RPC `SECURITY DEFINER`: `REVOKE` de `PUBLIC`/`anon` e `GRANT EXECUTE` explícito ao papel necessário.
11. Criar testes PostgreSQL para:
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
12. Implementar gateway/caso de uso e UI persistente para listar retiradas elegíveis, mostrar quantidade pendente e registrar retorno.
13. Atualizar `docs/modules/inventory.md`.
14. Rodar lint, typecheck, Vitest, build e todas as suites/workflows PostgreSQL, incluindo obrigatoriamente `security_hardening.sql`.
15. Só após CI verde aplicar/homologar migration no Supabase remoto com dados sintéticos e rollback.
16. Reauditar grants/RLS/RPC após o DDL remoto; não presumir defaults do provedor.
17. Atualizar PR/Issue e continuidade.

## Política de Supabase

- não reaplicar `stock_loss_flow`, `stock_loss_reason_read_scope_fix` ou `rls_grant_hardening`;
- não remover/afrouxar `security_hardening.sql` para fazer CI passar;
- novas APIs recebem grants explícitos na migration;
- mudanças de schema da aplicação devem ocorrer por migrations versionadas do repositório, não por criação manual no Dashboard;
- `supabase_admin` é role gerenciado pelo provedor e seus default ACLs não são autoridade para o desenho de segurança da aplicação;
- homologação remota usa dados sintéticos e deixa zero resíduo;
- advisor antigo não é autorização para ampliar escopo.

## Política de Vercel

- `git.deploymentEnabled=false` permanece vigente;
- não reativar deployments automáticos;
- CI é o gate principal;
- usar deployment manual apenas se surgir validação concreta dependente de browser/hosting real.

## Não fazer

- não reabrir Issue #54 nem refazer o hardening concluído;
- não criar empréstimo, prazo ou quantidade pendente de empréstimo enquanto Q-005 estiver aberta;
- não implementar componente financeiro entre unidades ou interpretar `Valor total em haver` sem Q-004;
- não inferir o checkbox de Q-003;
- não implementar devolução a fornecedor/`return_out` sem requisito comprovado;
- não alterar movimento histórico original para representar devolução;
- não importar dados reais;
- não reabrir Fase 20.

## Critério de conclusão da próxima fase

Uma retirada persistente aceita retorno parcial/total ao estoque por novo movimento `return_in` relacionado ao original, sem over-return e sem editar o histórico. Custo/lote/auditoria permanecem rastreáveis, RLS/escopo, grants mínimos e idempotência são garantidos no PostgreSQL, todos os gates — incluindo `security_hardening.sql` — ficam verdes e a homologação remota deixa zero resíduo sintético.
