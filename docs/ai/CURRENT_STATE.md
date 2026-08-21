# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 38 — `REQ-PLAT-005 / Issue #75 — Backup automático de Production` — **automação mergeada e parcialmente provisionada; ativação real deliberadamente adiada até o operador usar um computador pessoal/confiável**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main` de entrada: `40d8d86adaa27801f2568548763af4b4cf1de3af`
- PR #86: squash-mergeado — implementação da automação
- PR #87: squash-mergeado — handoff pós-merge
- Issue #75: aberta
- Supabase Production: `fhbvwyttikrbeaanatlr`
- nenhum deployment Vercel criado para esta frente
- nenhum secret publicado em Git/docs/chat

## Política aprovada da #75

- RPO: 24h;
- backup diário;
- RTO objetivo: até 4h;
- destino off-site: Google Drive privado;
- retenção: 30 dias;
- owner/alerta: `synapselab.ia@gmail.com`;
- restore drill: mensal isolado;
- sem Supabase Pro/PITR por enquanto.

## Implementação já em `main`

`.github/workflows/production-backup.yml`:

- cron diário + `workflow_dispatch`;
- export lógico existente;
- archive + SHA-256;
- Google Drive via rclone;
- verificação pós-upload;
- retenção 30 dias;
- cleanup do runner;
- alerta Gmail em falha.

`.github/workflows/backup-restore-drill.yml`:

- cron mensal;
- baixa/valida o último backup Production real;
- executa restore drill PostgreSQL 17 isolado;
- nunca restaura sobre Production.

Os dois workflows permanecem desarmados por:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

Sem essa variável, os schedules ficam skipped.

## Provisionamento

Concluído:

- `PRODUCTION_SUPABASE_DB_URL` criado como GitHub Actions Secret usando Session pooler na porta 5432.

Adiado deliberadamente para um computador pessoal/confiável:

- criação/autorização do OAuth Google Drive;
- geração do remote rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real de `Production Database Backup`;
- confirmação do archive + `.sha256` no Drive;
- fechamento da #75.

Motivo: essas etapas envolvem OAuth, token/config e App Password e não devem ser realizadas em computador corporativo não confiável para este segredo operacional.

A #75 continua aberta, mas **não bloqueia o desenvolvimento independente do sistema** enquanto aguarda o operador em ambiente apropriado.

## Validação da implementação

PR #86 head final `1c44f83dbb20c9203e58538c2e1343b43a3b4656`:

- CI #344 database — success;
- CI #344 validate — success;
- notifier, lint, typecheck, Vitest e production build — success;
- migrations, backup/restore, RLS/hardening — success.

PR #87:

- CI #346 — success.

## Próxima ação

Retomar a frente independente já planejada:

**auditar `REQ-SEC-005 — Cancelamento/estorno`**, provando que registros críticos não são fisicamente excluídos sem trilha de auditoria.

A #75 só volta a ser a ação ativa quando o operador estiver em computador pessoal/confiável para concluir OAuth/secrets e o primeiro run real.

## Não fazer

- não pedir/receber DB URL, OAuth token/config ou App Password no chat;
- não ativar `BACKUP_AUTOMATION_ENABLED` antes dos secrets restantes;
- não fechar #75 sem primeiro run real;
- não restaurar backup real sobre Production para teste;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel para esta frente;
- não reaplicar migrations existentes;
- não importar dados reais/cutover.
