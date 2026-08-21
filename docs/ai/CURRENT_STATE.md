# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 38 — `REQ-PLAT-005 / Issue #75 — Backup automático de Production` — **automação mergeada; ativação real pendente de credenciais/OAuth e primeiro run comprovado**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main`: `c51e701f56e670f6afc8ca1df375fa94ca41b5b4`
- PR #86: squash-mergeado
- Issue #75: aberta
- Supabase Production: `fhbvwyttikrbeaanatlr`
- nenhuma migration/DDL/DML Supabase nesta fase
- nenhum deployment Vercel
- nenhum secret publicado no Git/docs/chat

## Política aprovada

- RPO: 24h;
- backup diário;
- RTO objetivo: até 4h;
- destino: Google Drive privado;
- retenção: 30 dias;
- owner/alerta: `synapselab.ia@gmail.com`;
- restore drill: mensal isolado;
- sem Supabase Pro/PITR por enquanto.

## Implementação mergeada

`production-backup.yml`:

- cron diário `17 6 * * *` + `workflow_dispatch`;
- reutiliza `scripts/export-supabase-backup.sh`;
- Supabase CLI `2.111.0` e rclone `1.75.0` pinados;
- archive Production + checksum externo e hashes internos;
- upload para `lojasaph-drive:Lojasaph Backups`;
- `rclone check` pós-upload;
- retenção automática de 30 dias;
- cleanup do runner;
- alerta Gmail em falha.

`backup-restore-drill.yml`:

- cron mensal `43 6 1 * *`;
- baixa e valida o backup Production real mais recente;
- executa também o restore drill PostgreSQL 17 isolado já existente;
- nunca escreve/restaura no Production.

Os dois jobs continuam desarmados por:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

Sem essa variável, schedules ficam skipped.

## Conexão do backup

`PRODUCTION_SUPABASE_DB_URL` deve usar **Session pooler, porta 5432**, não a Direct connection. GitHub Actions é IPv4-only e a conexão direta do Supabase Free é IPv6. O workflow rejeita a URL errada sem imprimir o secret.

## Provisionamento manual restante

O conector GitHub disponível não cria Actions Secrets/Variables e o OAuth Google exige autorização interativa. Faltam:

1. `PRODUCTION_SUPABASE_DB_URL` — Session pooler 5432;
2. `BACKUP_RCLONE_CONFIG_B64` — config OAuth do remote `[lojasaph-drive]`;
3. `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. repository variable `BACKUP_AUTOMATION_ENABLED=true` somente depois dos três secrets;
5. primeiro run manual de `Production Database Backup`;
6. confirmação do archive + `.sha256` no Drive.

Não pedir valores de secret pelo chat.

## Google Drive / OAuth

- conta: `synapselab.ia@gmail.com`;
- usar OAuth da própria conta;
- usar OAuth client próprio; shared client ID do rclone está sendo retirado durante 2026;
- preferir scope `drive.file`;
- não manter OAuth app em Testing para automação duradoura, pois refresh token pode expirar em 7 dias;
- nunca versionar `rclone.conf`/base64.

## Validação final do PR #86

Head final: `1c44f83dbb20c9203e58538c2e1343b43a3b4656`.

CI #344:

- database — success;
- validate — success;
- notifier Python — success;
- lint, typecheck, Vitest e production build — success;
- migrations, backup/restore, RLS/hardening e suítes PostgreSQL — success.

## RLS

Recheck remoto anterior à Fase 38:

- RLS habilitado nas tabelas públicas de aplicação;
- anon sem acesso operacional direto;
- authenticated sem DELETE direto;
- membership mantém `(select auth.uid())`;
- nenhum gap novo de RLS.

## Próxima ação

Ativar a rotina real pela UI do Google/GitHub, executar o primeiro backup e fechar #75 apenas depois da evidência verde. Depois retomar `REQ-SEC-005 — Cancelamento/estorno`.

## Não fazer

- não publicar DB URL/OAuth/App Password;
- não ativar schedule antes dos secrets;
- não fechar #75 sem primeiro run real;
- não restaurar backup real sobre Production para teste;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel;
- não reaplicar migrations existentes;
- não importar dados reais/cutover.
