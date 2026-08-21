# Next Action — Sistema Lojasaph

## Contexto

A Fase 38 retomou `REQ-PLAT-005 / Issue #75 — Backup automático real de Production` depois que as decisões operacionais foram aprovadas.

Decisões já registradas na Issue; **não perguntar novamente**:

- RPO: 24h;
- backup diário;
- RTO objetivo: até 4h;
- off-site: Google Drive privado;
- retenção: 30 dias;
- owner/alerta: `synapselab.ia@gmail.com`;
- restore drill: mensal isolado;
- sem Supabase Pro/PITR por enquanto.

## Implementação existente

Branch/PR da Fase 38:

- branch `agent/production-backup-automation`;
- PR #86 — `feat(backup): automate Production backup and restore drill`.

Arquivos principais:

- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- `scripts/send-backup-alert.py`;
- `docs/operations/backup-restore.md`.

O backup diário:

- reutiliza `scripts/export-supabase-backup.sh`;
- produz roles/schema/data + metadata e hashes;
- empacota archive + `.sha256`;
- envia via rclone para `lojasaph-drive:Lojasaph Backups`;
- verifica upload;
- aplica retenção de 30 dias;
- remove temporários;
- alerta por Gmail em falha.

O drill mensal:

- baixa o último archive Production real;
- verifica archive e hashes internos;
- roda a mecânica de restore no PostgreSQL 17 isolado já existente;
- não altera Production.

Os dois jobs são desarmados por default:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

## Objetivo ativo

**Concluir a ativação real da Issue #75.**

Não iniciar `REQ-SEC-005` enquanto a ativação abaixo puder ser concluída com o operador presente.

## Fazer agora

1. Conferir estado real de `main`, PR #86, #75 e CI.
2. Se PR #86 ainda estiver aberto:
   - não refazer workflows;
   - conferir diff final;
   - exigir CI verde no head definitivo;
   - squash merge.
3. Confirmar que #75 continua aberta após o merge.
4. Orientar o operador pela UI, sem receber valores no chat, a provisionar GitHub Actions Secrets:
   - `PRODUCTION_SUPABASE_DB_URL`;
   - `BACKUP_RCLONE_CONFIG_B64`;
   - `BACKUP_ALERT_GMAIL_APP_PASSWORD`.
5. Para `BACKUP_RCLONE_CONFIG_B64`:
   - criar OAuth Client ID próprio no Google Cloud;
   - habilitar Drive API;
   - autenticar rclone como `synapselab.ia@gmail.com`;
   - remote exato `[lojasaph-drive]`;
   - preferir `drive.file`;
   - não usar shared client ID do rclone, retirado durante 2026;
   - não deixar OAuth em Testing para automação duradoura, pois refresh token pode expirar em 7 dias;
   - base64 da config vai somente ao Actions Secret.
6. Para o alerta Gmail:
   - usar 2-Step Verification;
   - criar App Password exclusiva para o backup;
   - salvar somente em `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
   - nunca usar/colar a senha normal da conta.
7. Somente depois dos três secrets, criar repository variable:
   - `BACKUP_AUTOMATION_ENABLED=true`.
8. Executar manualmente **Actions → Production Database Backup → Run workflow**.
9. Verificar o run:
   - export passou;
   - SHA-256 passou;
   - upload passou;
   - `rclone check` passou;
   - retenção passou;
   - cleanup passou.
10. Confirmar no Google Drive, sem abrir/expor dados, que `Lojasaph Backups` contém:
    - `lojasaph-production-<UTC>.tar.gz`;
    - `lojasaph-production-<UTC>.tar.gz.sha256`.
11. Registrar evidência não sensível na #75.
12. Fechar #75 como completed somente após o primeiro run real verde.
13. Atualizar `CURRENT_STATE`, `HANDOFF` e este arquivo.
14. Depois retomar `REQ-SEC-005 — Cancelamento/estorno`.

## CI conhecido

Head funcional anterior aos docs:

`3e9f373014eb5213daabfa666f3cfe44b65ffce2`

CI #338:

- database — success;
- validate — success;
- notifier Python compile — success;
- lint/typecheck/Vitest/build — success;
- migrations, backup/restore, RLS/hardening e suítes PostgreSQL — success.

Exigir CI final no head definitivo após os updates documentais.

## Critério de conclusão da #75

Não basta o workflow existir. Exigir evidência de:

- secrets provisionados sem vazamento;
- automação armada;
- primeiro backup real Production verde;
- archive e checksum presentes no Drive privado;
- integridade pós-upload verificada;
- retenção 30 dias ativa;
- canal de alerta provisionado;
- restore drill mensal versionado/habilitado.

## Depois da #75

Retomar a auditoria já planejada de `REQ-SEC-005 — Cancelamento/estorno`, reutilizando:

- DELETE direto já removido de authenticated;
- cancelamentos de Compras/Financeiro/Caixa/Inventário;
- estorno de pagamentos;
- devoluções/reversões do ledger;
- audit trail da Fase 36.

Não abrir nova Issue nessa auditoria sem gap reproduzível.

## Segurança / operação

- nunca pedir ao usuário para colar DB URL, OAuth token/config ou App Password no chat;
- nunca gravar dump Production em GitHub Artifact ou repositório;
- não ativar schedule antes dos secrets;
- não restaurar Production para teste;
- não fechar #75 apenas pelo merge;
- não alterar RLS sem regressão concreta;
- não reabrir REQ-SEC-003/004;
- não reaplicar migrations existentes;
- não criar deployment Vercel;
- não importar dados reais/cutover;
- não inferir Q-001..Q-025.
