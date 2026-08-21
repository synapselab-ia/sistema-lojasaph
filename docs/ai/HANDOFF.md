# Handoff — Sistema Lojasaph

## Estado

A Fase 38 retomou `REQ-PLAT-005 / Issue #75` depois que o operador aprovou as decisões antes pendentes.

Frente atual:

- baseline: `main` em `ba060ec704d9e4bcca2aa7d3fc2dd4bdd3a7cd59`;
- Issue #75: aberta;
- branch: `agent/production-backup-automation`;
- PR #86: `feat(backup): automate Production backup and restore drill`;
- Supabase Production: `fhbvwyttikrbeaanatlr`;
- nenhum DDL/DML/migration Supabase nesta fase;
- nenhum deployment Vercel.

## Política aprovada

Comentário de decisão já registrado na #75:

- RPO: 24h;
- backup diário;
- RTO objetivo: até 4h;
- off-site: Google Drive privado;
- retenção: 30 dias;
- owner/alerta: `synapselab.ia@gmail.com`;
- restore drill: mensal isolado;
- foco em custo/benefício; sem Pro/PITR por enquanto.

Não voltar a pedir essas decisões.

## O que foi implementado

### `.github/workflows/production-backup.yml`

- cron diário `17 6 * * *`;
- manual `workflow_dispatch`;
- guard `vars.BACKUP_AUTOMATION_ENABLED == 'true'`;
- lê `PRODUCTION_SUPABASE_DB_URL` de Actions Secret;
- reutiliza `scripts/export-supabase-backup.sh`;
- Supabase CLI `2.111.0`;
- rclone container `1.75.0`;
- metadata + checksums internos;
- archive `lojasaph-production-<UTC>.tar.gz` + checksum externo;
- upload para `lojasaph-drive:Lojasaph Backups`;
- `rclone check` pós-upload;
- retenção automática de 30 dias;
- cleanup do runner;
- alerta por Gmail SMTP em falha.

### `.github/workflows/backup-restore-drill.yml`

- cron mensal `43 6 1 * *`;
- mesmo arming switch;
- baixa o archive Production real mais recente do Drive;
- verifica SHA-256 externo e interno;
- executa o drill PostgreSQL 17 isolado já existente com migrations + seed anonimizado;
- nunca restaura sobre Production;
- alerta por e-mail em falha.

Limitação explícita: o archive Production real é verificado integralmente, mas não é restaurado em um projeto Supabase hospedado isolado porque esse destino ainda não existe/foi aprovado. A mecânica de restore continua provada separadamente no PostgreSQL efêmero.

### `scripts/send-backup-alert.py`

Notifier stdlib Python via Gmail SMTP SSL. App Password entra somente pelo ambiente/secret e não por argv.

### CI

`.github/workflows/ci.yml` também executa `python -m py_compile scripts/send-backup-alert.py`.

Head funcional antes dos docs:

`3e9f373014eb5213daabfa666f3cfe44b65ffce2`

CI #338:

- database — success;
- validate — success;
- notifier compile, lint, typecheck, Vitest, build — success;
- migrations, backup/restore, RLS/hardening e suítes PostgreSQL — success.

Depois dos docs, exigir CI final no head definitivo antes do merge.

## Google Drive / OAuth escolhido

Para a conta pessoal `synapselab.ia@gmail.com`:

- OAuth da própria conta;
- OAuth client próprio, pois o shared client ID do rclone está sendo retirado durante 2026;
- preferir scope `drive.file`;
- remote deve se chamar exatamente `[lojasaph-drive]`;
- não deixar o OAuth app indefinidamente em Testing para automação longa, pois refresh token pode expirar em 7 dias;
- `rclone.conf` é secret e nunca deve ir ao Git.

## O que o agente NÃO consegue provisionar

O GitHub connector disponível não possui operações para criar Actions Secrets ou repository variables. OAuth Google também exige autorização interativa do dono da conta.

Portanto permanecem três secrets manuais:

1. `PRODUCTION_SUPABASE_DB_URL`;
2. `BACKUP_RCLONE_CONFIG_B64`;
3. `BACKUP_ALERT_GMAIL_APP_PASSWORD`.

Depois deles:

4. criar repository variable `BACKUP_AUTOMATION_ENABLED=true`;
5. executar manualmente `Production Database Backup`;
6. comprovar sucesso e archive + `.sha256` no Drive.

Não pedir ao usuário para colar nenhum desses valores no chat.

## Issue #75

**Não fechar no merge do PR #86.**

Fechar somente após o primeiro run Production real comprovar:

- exportação;
- checksums;
- upload Drive;
- verificação pós-upload;
- retenção configurada;
- alerta operacional provisionado.

O runbook atualizado está em `docs/operations/backup-restore.md`.

## RLS

Recheck remoto imediatamente anterior à Fase 38:

- RLS habilitado nas tabelas públicas de aplicação;
- anon sem acesso direto operacional;
- authenticated sem DELETE direto;
- membership com initPlan `(select auth.uid())`;
- nenhum gap novo de RLS.

Não reabrir RLS sem regressão concreta.

## Próximo chat

1. Ler continuidade padrão e conferir `main`, #75, PR #86 e CI reais.
2. Se #86 ainda estiver aberto, concluir apenas validação/merge; não refazer implementação.
3. Se #86 estiver mergeado, ajudar o operador a provisionar **manualmente pela UI** os três Actions Secrets e o OAuth rclone, sem receber valores no chat.
4. Criar `BACKUP_AUTOMATION_ENABLED=true` somente depois dos secrets.
5. Disparar `Production Database Backup` via UI e verificar o run real.
6. Confirmar no Drive a existência do archive + checksum sem abrir/copiar conteúdo sensível.
7. Se o run real estiver verde, registrar evidência na #75 e fechar como completed.
8. Depois retomar `REQ-SEC-005 — Cancelamento/estorno` da Fase 37.

## Não fazer

- não publicar DB URL, OAuth token, rclone config ou App Password;
- não fechar #75 antes do run real;
- não ativar schedule sem secrets;
- não restaurar Production para teste;
- não contratar plano/add-on sem autorização;
- não reabrir SEC-003/004 ou RLS sem evidência;
- não criar deploy Vercel para backup;
- não reaplicar `20260820192526 / critical_config_audit`;
- não importar dados reais/cutover;
- não inferir Q-001..Q-025.
