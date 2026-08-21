# Next Action — Sistema Lojasaph

## Contexto

Fase 38 / `REQ-PLAT-005` foi mergeada pelo PR #86 em:

`c51e701f56e670f6afc8ca1df375fa94ca41b5b4`

A Issue #75 continua aberta porque ainda falta comprovar o primeiro backup Production real.

Decisões aprovadas — não perguntar novamente:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

## Objetivo ativo

**Provisionar as credenciais pela UI, armar a automação, executar o primeiro backup real e fechar #75 somente após evidência verde.**

Não começar `REQ-SEC-005` enquanto essa ativação puder ser concluída com o operador presente.

## Implementação já existente — não refazer

- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- `scripts/send-backup-alert.py`;
- `scripts/export-supabase-backup.sh`;
- `scripts/verify-backup-restore.sh`;
- `docs/operations/backup-restore.md`.

Os schedules ficam skipped até:

`BACKUP_AUTOMATION_ENABLED=true`

## Fazer agora

### 1. Supabase DB URL

Na UI do Supabase:

- abrir projeto `fhbvwyttikrbeaanatlr`;
- **Connect → Session pooler**;
- usar a connection string da **porta 5432**;
- preencher o password localmente quando a UI pedir/mostrar placeholder;
- salvar o valor diretamente no GitHub Secret `PRODUCTION_SUPABASE_DB_URL`.

Não usar Direct connection: GitHub Actions é IPv4-only e o endpoint direct do plano Free é IPv6. O workflow rejeita direct URL sem expor o valor.

Nunca colar a URL no chat.

### 2. Google Drive / rclone

Em máquina confiável:

- criar OAuth client próprio no Google Cloud;
- habilitar Google Drive API;
- autenticar como `synapselab.ia@gmail.com`;
- usar remote exato `[lojasaph-drive]`;
- preferir scope `drive.file`;
- não usar o shared rclone client ID em retirada durante 2026;
- não deixar o OAuth app em Testing para automação duradoura;
- gerar `rclone.conf` via `rclone config`;
- codificar a config em base64;
- salvar somente no GitHub Secret `BACKUP_RCLONE_CONFIG_B64`.

Nunca colar OAuth/client secret/token/base64 no chat.

### 3. Gmail App Password

- garantir 2-Step Verification na conta;
- criar App Password exclusiva para “Sistema Lojasaph Backup”;
- salvar direto no GitHub Secret `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- não usar a senha normal da conta.

### 4. Armar

Somente depois dos três secrets:

- criar repository variable `BACKUP_AUTOMATION_ENABLED=true`.

### 5. Executar prova real

GitHub:

- Actions → `Production Database Backup` → Run workflow;
- aguardar conclusão.

Exigir sucesso em:

- validação dos secrets/session pooler;
- export lógico;
- hashes internos;
- archive + `.sha256`;
- upload Google Drive;
- `rclone check`;
- retenção;
- cleanup.

### 6. Verificar Drive

Sem abrir/publicar o dump, confirmar em `Lojasaph Backups`:

- `lojasaph-production-<UTC>.tar.gz`;
- `.sha256` correspondente.

### 7. Fechar #75

Se o run real estiver verde:

- registrar na #75 somente run/horário e confirmação de integridade/off-site, nunca valores/arquivo;
- fechar #75 como completed;
- atualizar continuidade.

## CI já concluído

PR #86 head final `1c44f83dbb20c9203e58538c2e1343b43a3b4656`:

- CI #344 database — success;
- CI #344 validate — success;
- notifier/lint/typecheck/Vitest/build — success;
- backup/restore/RLS/hardening — success.

## Depois da #75

Retomar `REQ-SEC-005 — Cancelamento/estorno`, reutilizando o hardening de DELETE, lifecycles de cancelamento, reversões e audit trail existentes. Só abrir Issue se aparecer gap reproduzível.

## Segurança / operação

- não pedir/receber secrets no chat;
- não versionar dump/config/token;
- não usar GitHub Artifact para Production backup;
- não ativar antes dos três secrets;
- não restaurar Production para teste;
- não fechar #75 sem run real;
- não criar deploy Vercel;
- não contratar plano/add-on sem autorização;
- não reaplicar migrations;
- não importar dados reais/cutover.
