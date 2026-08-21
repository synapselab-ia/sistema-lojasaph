# Next Action — Sistema Lojasaph

## Contexto

Fase 38 / `REQ-PLAT-005` foi implementada e mergeada pelo PR #86. A Issue #75 continua aberta porque ainda falta o primeiro backup Production real.

A automação está desarmada por `BACKUP_AUTOMATION_ENABLED` e isso é intencional.

Provisionamento já concluído:

- `PRODUCTION_SUPABASE_DB_URL` criado no GitHub Actions usando Session pooler Supabase na porta 5432.

Provisionamento restante foi **adiado deliberadamente** até o operador estar em computador pessoal/confiável:

- OAuth Google Drive;
- remote rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real e fechamento da #75.

Não refazer nem substituir essa implementação. #75 permanece aberta e desarmada, mas não bloqueia frentes independentes.

## Objetivo ativo

**Auditar `REQ-SEC-005 — Cancelamento/estorno`: registros críticos não devem ser simplesmente excluídos sem trilha de auditoria.**

A tarefa começa como auditoria transversal. Não criar novos estados, soft-delete genérico ou taxonomia de reversão sem encontrar um gap concreto.

## Baseline existente a reutilizar

### Compras

- `purchase_orders` possui lifecycle com `cancelled`;
- `cancel_purchase_order` é comando transacional/idempotente;
- receipts preservam ledger/histórico.

### Financeiro

- `cancel_payable_document` preserva documento e muda lifecycle;
- `reverse_installment_payment` cria estorno relacionado ao pagamento original;
- saldo/status são derivados do histórico persistente.

### Caixa

- sessões críticas usam cancelamento auditado;
- `cancel_cash_session` preserva sessão/histórico.

### Estoque / Inventário

- ledger de estoque é imutável para cliente normal;
- devolução cria novo `stock_movement` relacionado por `reversal_of_movement_id`;
- `cancel_inventory_count` preserva sessão/lifecycle;
- ajustes, perdas e transferências permanecem históricos.

### Hardening transversal

- authenticated não possui DELETE direto nas tabelas públicas de aplicação;
- `security_hardening.sql` protege contra regressão de DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN;
- `audit_logs` é append-only para cliente normal;
- Fase 36 adicionou audit trail para configurações críticas.

## Fazer agora

1. Ler continuidade padrão, `WORKFLOW`, requirements e `docs/qa/audit-trail.md`.
2. Conferir estado real de `main`, #75, Issues/PRs/branches e CI.
3. Confirmar que #75 continua aberta/desarmada; não retomar OAuth em máquina de trabalho.
4. Mapear registros críticos atuais por domínio:
   - `stock_movements` e reversões/devoluções;
   - `inventory_counts`;
   - `purchase_orders`/receipts;
   - `payable_documents`/`payments`;
   - `cash_sessions`/movements/totals;
   - configurações críticas quando houver lifecycle relevante.
5. Inspecionar grants/RLS e provar que `authenticated` não possui DELETE direto nas relações críticas.
6. Inspecionar RPCs de cancelamento/estorno e confirmar:
   - autorização/escopo;
   - idempotência;
   - estado anterior/novo ou relação de reversão explícita;
   - audit event no mesmo boundary transacional;
   - retry não duplica efeito;
   - falha/rollback não elimina histórico.
7. Confirmar que UIs/gateways usam commands de cancelamento/estorno e não `.delete()` para registros críticos.
8. Diferenciar corretamente lifecycle cancelado, reversão por novo evento, ausência deliberada de delete e limpeza de fixtures/testes.
9. Usar Supabase somente read-only para introspecção; não executar cancelamento/estorno real em Production.
10. Reutilizar suites existentes de compras, financeiro, caixa, inventário, devoluções, RLS/hardening e auditoria.
11. Se faltar apenas prova transversal barata, adicionar teste/documentação mínima; não redesenhar domínio.
12. Se houver gap reproduzível, abrir uma única Issue + branch + correção mínima.
13. Se atendido, produzir apenas evidência/documentação sem Issue artificial.
14. Não criar deployment Vercel para essa auditoria salvo necessidade real e única.
15. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão de REQ-SEC-005

- authenticated sem DELETE direto sobre registros críticos;
- correções usam cancelamento/reversão e preservam o original;
- Organization, ator, recurso e motivo/contexto mínimo preservados quando aplicável;
- audit trail no mesmo boundary transacional;
- retries idempotentes ou conflitos explícitos;
- falhas não deixam estado parcial nem apagam histórico;
- nenhum `.delete()` crítico no runtime fora de caso explicitamente justificado/auditado.

## Retomar #75 depois

Somente quando o operador estiver em computador pessoal/confiável:

1. configurar OAuth Google Drive/rclone;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar `BACKUP_AUTOMATION_ENABLED=true`;
5. executar `Production Database Backup` manualmente;
6. comprovar archive + `.sha256` no Drive;
7. registrar evidência e fechar #75.

## Segurança / operação

- não pedir/receber secrets no chat;
- não versionar dump/config/token;
- não ativar backup antes dos secrets restantes;
- não restaurar Production para teste;
- não fechar #75 sem run real;
- não reabrir REQ-SEC-003/004 sem regressão concreta;
- não reaplicar migrations existentes;
- não criar deployment Vercel;
- não importar dados reais/cutover.
