# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 38 — `REQ-PLAT-005 / Issue #75 — Backup automático de Production` — **decisões aprovadas e automação implementada; ativação real ainda depende de secrets/OAuth + primeiro run comprovado**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline: `main` em `ba060ec704d9e4bcca2aa7d3fc2dd4bdd3a7cd59`
- Issue: #75 — aberta
- branch: `agent/production-backup-automation`
- PR: #86 — draft durante validação
- Supabase Production: `fhbvwyttikrbeaanatlr`
- nenhuma migration/DDL/DML Supabase nesta fase
- nenhum deployment Vercel
- nenhum secret foi publicado no Git/docs/chat

## Decisões aprovadas para #75

Registradas como comentário na própria Issue em 2026-08-21:

- RPO: 24h;
- backup: diário;
- RTO objetivo: até 4h;
- destino off-site: Google Drive privado da conta operacional;
- retenção: 30 dias;
- proteção: OAuth de menor privilégio, secrets somente no GitHub Actions, SHA-256 e cleanup de temporários;
- owner/alerta: `synapselab.ia@gmail.com`;
- restore drill: mensal e isolado.

O destino não será uma cópia manual: #75 exige rotina automática comprovada.

## Implementação da Fase 38

### Backup diário

`.github/workflows/production-backup.yml`

- schedule diário `17 6 * * *`;
- também suporta `workflow_dispatch`;
- reutiliza `scripts/export-supabase-backup.sh`;
- Supabase CLI pinada em `2.111.0`;
- rclone pinado em `1.75.0`;
- produz archive `lojasaph-production-<UTC>.tar.gz` + `.sha256`;
- mantém checksums internos de roles/schema/data/metadata;
- envia ao remote `lojasaph-drive:Lojasaph Backups`;
- verifica o conteúdo enviado via `rclone check`;
- remove somente archives do padrão Lojasaph com mais de 30 dias;
- remove temporários do runner;
- envia e-mail em falha.

### Restore drill mensal

`.github/workflows/backup-restore-drill.yml`

- schedule mensal `43 6 1 * *`;
- baixa o backup Production real mais recente do Drive;
- verifica checksum do archive e hashes internos;
- em paralelo à prova de integridade do backup real, executa o drill já existente em PostgreSQL 17 isolado com migrations + seed anonimizado;
- não restaura nem escreve no Supabase Production.

Limite atual: ainda não existe um projeto Supabase hospedado isolado aprovado para restaurar periodicamente a cópia real. Não descrever o drill atual como restore hospedado de Production.

### Alerta

`scripts/send-backup-alert.py` usa SMTP Gmail com TLS e App Password via ambiente. O projeto Supabase não possui Edge Function de alerta; o e-mail padrão de Auth não foi reutilizado como mecanismo operacional genérico.

### Arming switch

Os dois jobs possuem:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

Sem essa repository variable, os schedules ficam skipped. Isso permite merge seguro sem gerar falhas diárias enquanto os secrets não estão provisionados.

## Secrets ainda necessários

O conector GitHub disponível ao agente não possui ação para criar/alterar Actions Secrets ou repository variables. Portanto o operador precisa provisionar manualmente:

- `PRODUCTION_SUPABASE_DB_URL`;
- `BACKUP_RCLONE_CONFIG_B64` — config OAuth do remote `[lojasaph-drive]`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`.

Depois:

- criar `BACKUP_AUTOMATION_ENABLED=true`;
- executar manualmente `Production Database Backup` uma vez;
- comprovar sucesso e presença de archive + checksum no Drive privado.

**Não fechar #75 antes dessa prova real.**

## Google Drive / OAuth

Para conta pessoal `synapselab.ia@gmail.com`:

- usar OAuth da própria conta, não service account como default;
- usar OAuth client próprio porque o shared client ID do rclone está sendo retirado durante 2026;
- preferir scope `drive.file` de menor privilégio;
- não deixar o OAuth consent indefinidamente em Testing para uma automação de longa duração, pois refresh tokens emitidos nesse estado podem expirar em 7 dias;
- nunca versionar `rclone.conf` ou seu base64.

## CI

Head funcional `3e9f373014eb5213daabfa666f3cfe44b65ffce2`:

- CI #338 database — success;
- CI #338 validate — success;
- compilação do notifier Python — success;
- lint, typecheck, Vitest e production build — success;
- cadeia PostgreSQL 17, migrations, backup/restore, RLS/hardening e suítes transacionais — success.

Após atualização documental, exigir um CI final no head definitivo do PR #86 antes do merge.

## RLS / segurança

Recheck remoto imediatamente antes desta fase confirmou:

- tabelas públicas de aplicação com RLS habilitado;
- `anon` sem privilégios operacionais diretos;
- `authenticated` sem DELETE direto nas tabelas públicas;
- policy de membership continua com `(select auth.uid())`;
- warnings do Security Advisor sobre RPCs públicas SECURITY DEFINER permanecem a superfície intencional já auditada;
- leaked-password protection continua hardening de Auth separado, não finding de RLS.

Nenhuma alteração de RLS foi necessária nesta fase.

## Fases anteriores — não repetir

- Fase 34: RLS/initPlan concluída;
- Fase 35: staging/import preview concluído;
- Fase 36: audit trail de configurações críticas concluído, migration `20260820192526 / critical_config_audit` já aplicada;
- Fase 37: `REQ-SEC-004 — Segredos` atendido e mergeado no commit `ba060ec704d9e4bcca2aa7d3fc2dd4bdd3a7cd59`.

## Próxima ação

1. concluir validação final e merge do PR #86;
2. provisionar manualmente os três GitHub Actions Secrets e o OAuth rclone;
3. criar `BACKUP_AUTOMATION_ENABLED=true`;
4. executar e comprovar o primeiro backup Production real;
5. fechar #75 somente depois dessa evidência;
6. então retomar a auditoria independente `REQ-SEC-005 — Cancelamento/estorno`.

## Não fazer

- não inserir connection string, OAuth token, rclone config ou App Password em Issue/PR/docs/chat;
- não ativar schedule antes dos secrets;
- não fechar #75 apenas porque o workflow foi mergeado;
- não restaurar backup real sobre Production para teste;
- não contratar Supabase Pro/PITR sem autorização;
- não criar deployment Vercel para backup;
- não reaplicar migrations existentes;
- não importar dados reais/cutover;
- não inferir Q-001..Q-025.
