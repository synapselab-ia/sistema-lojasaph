# Handoff — Sistema Lojasaph

## Estado

Fase 39 / `REQ-SEC-005 — Cancelamento/estorno` foi auditada e está **atendida no escopo atual**, sem finding funcional.

- `main` de entrada da auditoria: `2518dab61825c103d763b23187da04ae075b5778`;
- PR #89: auditoria/evidência de `REQ-SEC-005`;
- Issue corretiva nova: nenhuma;
- Supabase Production: `fhbvwyttikrbeaanatlr`;
- Issue #75: continua aberta/desarmada;
- nenhum deployment Vercel nesta auditoria;
- Production foi usada somente para introspecção read-only.

## Evidência de REQ-SEC-005

Ler `docs/qa/cancellation-reversal.md` antes de reabrir essa frente.

Resumo:

- `authenticated` não possui `DELETE` direto nas relações críticas revisadas;
- `security_hardening.sql` protege transversalmente contra retorno de DELETE e privilégios administrativos diretos;
- pedidos, documentos financeiros, sessões de caixa e inventários usam lifecycle de cancelamento, preservando a linha original;
- estorno financeiro cria novo evento `reversal` ligado ao pagamento original;
- devolução cria novo `stock_movement` `return_in` ligado à retirada por `reversal_of_movement_id`;
- retirada/pagamento original não é apagado para corrigir o fato histórico;
- commands críticos fazem auth + role + resource scope, usam idempotência/locks e registram audit no mesmo boundary transacional;
- gateways/telas persistentes revisados chamam esses RPCs e não Data API `DELETE` para cancelamento/estorno/devolução;
- o único `delete` relevante observado na tela de Compras é limpeza de estado React local, não persistência.

Suítes reutilizadas: `security_hardening.sql`, `purchase_orders.sql`, `finance_payables.sql`, `cash_sessions.sql`, `inventory_count.sql`, `inventory_count_cancel.sql`, `stock_return.sql` e `audit_trail.sql`.

Não adicionar soft-delete genérico, novas flags de cancelamento ou novos testes apenas para “marcar requisito como feito” sem regressão concreta.

## Backup Production / #75

A Fase 38 permanece como estava; não refazer automação.

Política já aprovada — não perguntar novamente:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- `PRODUCTION_SUPABASE_DB_URL` como GitHub Actions Secret via Session pooler 5432.

Ainda pendente, deliberadamente para computador pessoal/confiável:

- OAuth Google Drive/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real de `Production Database Backup`;
- confirmação de archive + `.sha256` no Drive;
- fechamento da #75.

Se o operador não estiver em máquina pessoal/confiável, mantenha #75 aberta e desarmada e prossiga com a frente independente.

## Próximo chat

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION` e `WORKFLOW`.
2. Conferir estado real de `main`, Issues/PRs/branches/CI antes de agir.
3. Não refazer Fase 38 nem Fase 39.
4. Se #75 ainda estiver aguardando máquina confiável, executar a `NEXT_ACTION`: **Fase 40 — auditar `REQ-PLAT-003 — Validação de dados`**.
5. Mapear regras essenciais em Estoque, Inventário, Compras, Financeiro, Caixa e cadastros críticos e provar que não dependem apenas da interface.
6. Abrir Issue somente para gap reproduzível; se o requisito estiver atendido, produzir apenas evidência/documentação.
7. Manter Supabase Production read-only para auditoria; não usar dados reais como fixture.
8. Ao final, atualizar continuidade novamente.

## Não fazer

- não receber/publicar DB URL, OAuth token/config ou App Password;
- não ativar backup antes dos secrets restantes;
- não fechar #75 sem run real;
- não restaurar Production para teste;
- não reabrir `REQ-SEC-005` sem evidência de regressão;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel só para auditoria;
- não reaplicar migrations;
- não importar dados reais/cutover.
