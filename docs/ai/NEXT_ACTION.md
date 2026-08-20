# Next Action — Sistema Lojasaph

## Contexto

A Fase 37 auditou `REQ-SEC-004 — Segredos`.

Resultado:

- nenhum segredo real identificado na árvore rastreada atual;
- `.env.example` contém apenas placeholders vazios;
- `.env*` locais e `/backups/` permanecem ignorados;
- `SUPABASE_SECRET_KEY` é server-only;
- browser recebe somente URL/publishable key/refs públicas;
- `client-boundary.test.ts` protege a fronteira;
- password não é enviada a logs/redirects;
- observabilidade redige campos/texto sensíveis e erros públicos são genéricos;
- `/health` hospedado não expõe URL/ref/key/secret;
- workflows/scripts não publicam credenciais ou dumps por desenho;
- nenhuma exposição concreta exigiu Issue ou rotação;
- evidência: `docs/qa/secrets-audit.md`.

Limitações registradas:

- o conector GitHub não expõe Secret Scanning/grep exaustivo de todos os blobs históricos;
- o conector Vercel não expõe listagem de env vars por target.

Não transformar essas limitações em finding por inferência e não reabrir SEC-004 sem evidência concreta.

## Fase 36 — não repetir

Issue #83 / PR #84 está integrada em `main` pelo squash commit `2ff5a421624c0f6dbf199ae16f77f9ab7f510626`.

Migration existente no GitHub/Supabase:

`20260820192526 / critical_config_audit`

Não reaplicar.

## Issue #75 — continuar bloqueada

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre:

- RPO;
- RTO;
- destino off-site;
- retenção;
- proteção/encriptação;
- owner + canal de alerta;
- cadence/destino de restore drill hospedado.

Se continuar sem decisões, não inventar cron/storage e prosseguir para a auditoria independente abaixo.

## Objetivo ativo

**Auditar `REQ-SEC-005 — Cancelamento/estorno`: registros críticos não devem ser simplesmente excluídos sem trilha de auditoria.**

A tarefa começa como auditoria transversal. Não criar novos estados, soft-delete genérico ou taxonomia de reversão sem encontrar um gap concreto.

## Baseline existente a reutilizar

### Compras — Issue #28 / Fase 10

- `purchase_orders` possui lifecycle com `cancelled`;
- `cancel_purchase_order` é comando transacional/idempotente;
- recebimentos preservam ledger/histórico em vez de apagar movimentações.

### Financeiro — Issue #31 / Fase 11

- registros financeiros críticos não são apagados para correção;
- `cancel_payable_document` preserva documento e muda lifecycle;
- `reverse_installment_payment` cria estorno relacionado ao pagamento original;
- saldo/status são derivados do histórico persistente.

### Caixa — Issue #33 / Fase 12

- sessões críticas usam cancelamento auditado, nunca delete físico;
- `cancel_cash_session` preserva a sessão e histórico.

### Estoque / Inventário

- ledger de estoque é imutável para cliente normal;
- devolução cria novo `stock_movement` relacionado por `reversal_of_movement_id`, sem apagar retirada original;
- `cancel_inventory_count` preserva a sessão e muda lifecycle;
- movimentos de ajuste/baixa/transferência permanecem históricos.

### Hardening transversal

A Fase 34 / `rls_grant_hardening` removeu `DELETE` direto de `authenticated` nas tabelas públicas de aplicação e a suíte `security_hardening.sql` falha se DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN reaparecerem.

A Fase 36 confirmou `audit_logs` append-only para cliente normal e auditou os command paths críticos.

## Fazer agora

1. Ler continuidade padrão, `WORKFLOW`, requirements e `docs/qa/audit-trail.md`.
2. Conferir `main`, #75, demais Issues/PRs/branches e CI reais.
3. Confirmar merge da Fase 37; não repetir SEC-004.
4. Confirmar `20260820192526 / critical_config_audit` read-only; não reaplicar.
5. Se #75 continuar sem decisões, mantê-la bloqueada.
6. Mapear as tabelas/registros críticos atuais por domínio:
   - `stock_movements` e relações de devolução/reversão;
   - `inventory_counts`;
   - `purchase_orders`/receipts;
   - `payable_documents`/`payments`;
   - `cash_sessions`/movements/totals;
   - configurações críticas quando houver lifecycle relevante.
7. Inspecionar grants/RLS atuais e provar que `authenticated` não possui DELETE direto nas relações críticas.
8. Inspecionar RPCs de cancelamento/estorno e confirmar:
   - autorização/escopo;
   - idempotência;
   - estado anterior/novo ou relação de reversão explícita;
   - audit event no mesmo commit transacional;
   - retry não duplica efeito;
   - falha/rollback não remove histórico.
9. Confirmar que UIs/gateways usam os commands de cancelamento/estorno quando a ação existe e não chamam `.delete()` para registros críticos.
10. Diferenciar corretamente:
    - cancelamento de lifecycle;
    - estorno/reversão por novo evento relacionado;
    - ausência deliberada de delete;
    - limpeza de fixtures/testes ou tabelas não críticas, que não constitui automaticamente finding.
11. Usar Supabase read-only para introspecção de policies/grants/functions quando necessário. Não executar cancelamento/estorno real em Production.
12. Reutilizar suites existentes de compras, financeiro, caixa, inventário, devoluções, RLS/hardening e auditoria.
13. Se faltar apenas prova transversal de baixo custo, adicionar teste/documentação mínima; não redesenhar domínio.
14. Se houver delete destrutivo autenticado ou fluxo crítico que substitua/apague histórico sem audit trail:
    - abrir uma única Issue;
    - criar branch dedicada;
    - corrigir apenas a superfície reproduzível;
    - preservar dados existentes e backward compatibility quando possível.
15. Se `REQ-SEC-005` estiver atendido, criar somente documentação/evidência, sem Issue artificial.
16. Não criar deployment Vercel para essa auditoria salvo necessidade real e única.
17. Se houver patch, exigir lint, typecheck, Vitest, build e gates PostgreSQL aplicáveis antes do merge.
18. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão

`REQ-SEC-005` pode ser considerado atendido quando houver evidência de que:

- clientes autenticados não possuem DELETE direto sobre registros críticos;
- correções operacionais usam lifecycle de cancelamento ou novo evento de reversão, não remoção do original;
- cancelamentos/estornos preservam Organization, ator, recurso original e motivo/contexto mínimo quando aplicável;
- audit trail permanece no mesmo boundary transacional;
- retries são idempotentes ou rejeitam conflito explicitamente;
- falhas não deixam estado parcial nem eliminam histórico;
- não existe `.delete()` no runtime para registros críticos fora de um caso explicitamente justificado e auditado.

## Segurança / operação

- não executar mutação destrutiva em Production para testar;
- não criar soft-delete genérico sem necessidade de domínio;
- não reabrir REQ-SEC-003/004 sem regressão concreta;
- não reaplicar migrations existentes;
- não fechar #75 sem backup automático real;
- não importar dados reais/cutover;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
