# Handoff — Sistema Lojasaph

## Estado

Fase 38 / `REQ-PLAT-005` está **implementada em código, mas a Issue #75 continua aberta até o primeiro backup Production real**.

- `main`: `c51e701f56e670f6afc8ca1df375fa94ca41b5b4`;
- PR #86: squash-mergeado;
- Issue #75: aberta;
- Supabase Production: `fhbvwyttikrbeaanatlr`;
- nenhum DDL/DML/migration Supabase na Fase 38;
- nenhum deployment Vercel.

## Política aprovada — não perguntar novamente

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

## O que já está em main

`.github/workflows/production-backup.yml`:

- diário `17 6 * * *` + manual;
- export lógico existente;
- archive + SHA-256;
- Google Drive via rclone;
- verificação pós-upload;
- retenção 30 dias;
- cleanup;
- e-mail em falha.

`.github/workflows/backup-restore-drill.yml`:

- mensal `43 6 1 * *`;
- baixa/valida o último backup Production real;
- executa o restore drill PostgreSQL 17 isolado;
- Production nunca é restaurado para teste.

`scripts/send-backup-alert.py`:

- Gmail SMTP SSL;
- App Password somente por secret/env.

Runbook: `docs/operations/backup-restore.md`.

## Proteção de ativação

Os dois workflows têm:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

A variável ainda não foi provisionada, portanto os schedules permanecem skipped.

## Conexão Supabase correta

`PRODUCTION_SUPABASE_DB_URL` deve ser **Session pooler, porta 5432**, obtida em Supabase Dashboard → Connect → Session pooler.

Não usar Direct connection: Supabase Free direct é IPv6 e GitHub Actions é IPv4-only. O workflow valida isso sem imprimir o secret.

## Provisionamento manual restante

O conector GitHub não cria Actions Secrets/Variables; OAuth Google exige autorização interativa.

Nunca pedir valores pelo chat. O operador deve criar na UI:

1. `PRODUCTION_SUPABASE_DB_URL` — Session pooler 5432;
2. `BACKUP_RCLONE_CONFIG_B64` — base64 do rclone config com remote `[lojasaph-drive]`;
3. `BACKUP_ALERT_GMAIL_APP_PASSWORD` — App Password dedicada;
4. depois, repository variable `BACKUP_AUTOMATION_ENABLED=true`.

Google/rclone:

- autenticar `synapselab.ia@gmail.com`;
- OAuth client próprio;
- preferir `drive.file`;
- não usar shared rclone client ID em retirada durante 2026;
- não manter app em Testing para token duradouro;
- `rclone.conf` nunca vai ao Git.

## Primeiro run obrigatório

Depois dos secrets + variável:

1. Actions → `Production Database Backup` → Run workflow;
2. exigir run verde;
3. confirmar no Drive `Lojasaph Backups`:
   - archive `lojasaph-production-<UTC>.tar.gz`;
   - `.sha256` correspondente;
4. não abrir/publicar conteúdo;
5. registrar evidência não sensível na #75;
6. fechar #75 como completed somente então.

## Validação do código

PR #86 head final `1c44f83dbb20c9203e58538c2e1343b43a3b4656`:

- CI #344 database — success;
- CI #344 validate — success;
- notifier, lint, typecheck, Vitest, build — success;
- migrations, backup/restore, RLS/hardening — success.

## RLS

Último recheck remoto: RLS íntegro, anon sem acesso operacional, authenticated sem DELETE direto, nenhum finding novo. Não reabrir sem regressão concreta.

## Próximo chat

Prioridade é concluir a ativação manual da #75 com o operador presente. Depois do primeiro backup real e fechamento da #75, retomar `REQ-SEC-005 — Cancelamento/estorno`.

## Não fazer

- não receber/publicar DB URL/OAuth/App Password;
- não fechar #75 sem run real;
- não ativar antes dos secrets;
- não restaurar Production para teste;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel;
- não reaplicar migrations;
- não importar dados reais/cutover.
