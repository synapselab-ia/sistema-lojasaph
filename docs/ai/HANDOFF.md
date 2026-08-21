# Handoff — Sistema Lojasaph

## Estado

Fase 38 / `REQ-PLAT-005` está **implementada em código**, mas a Issue #75 continua aberta até o primeiro backup Production real.

- `main` de entrada: `40d8d86adaa27801f2568548763af4b4cf1de3af`;
- PR #86: squash-mergeado — automação;
- PR #87: squash-mergeado — handoff pós-merge;
- Issue #75: aberta;
- Supabase Production: `fhbvwyttikrbeaanatlr`;
- nenhum deployment Vercel nessa frente.

## Política aprovada — não perguntar novamente

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

## O que já está em `main`

`.github/workflows/production-backup.yml` e `.github/workflows/backup-restore-drill.yml` implementam backup diário, SHA-256, upload Google Drive via rclone, retenção, cleanup, alerta por e-mail e drill mensal isolado.

Os dois workflows estão protegidos por:

`vars.BACKUP_AUTOMATION_ENABLED == 'true'`

A variável não foi criada, portanto schedules permanecem skipped.

## Provisionamento manual

Já concluído pelo operador:

- GitHub Actions Secret `PRODUCTION_SUPABASE_DB_URL` usando Session pooler Supabase na porta 5432.

Ainda pendente:

- OAuth Google Drive em `synapselab.ia@gmail.com`;
- remote rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- repository variable `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real de `Production Database Backup`;
- confirmação de archive + `.sha256` no Drive;
- fechamento da #75.

## Decisão operacional desta sessão

O operador está em computador de trabalho e decidiu **adiar as etapas que manipulam OAuth/token/App Password para um computador pessoal/confiável**, como já foi feito em outro projeto.

Essa pausa é deliberada e segura. Não tentar contornar usando credenciais no chat, arquivos temporários, service account improvisada ou outro mecanismo só para fechar a Issue.

A Issue #75 permanece aberta, porém não deve bloquear outras frentes independentes do produto.

## Validação existente

- PR #86: CI #344 database + validate — success;
- PR #87: CI #346 — success;
- lint, typecheck, Vitest, build, migrations, backup/restore e hardening verdes.

## Próximo chat

1. Ler continuidade padrão e conferir estado real de `main`, #75, Issues/PRs/branches/CI.
2. Não refazer a automação de backup.
3. Se o operador estiver em computador pessoal/confiável e quiser concluir #75, retomar apenas do OAuth/rclone + Gmail App Password, depois armar e executar o primeiro backup real.
4. Caso contrário, manter #75 aberta/desarmada e executar a `NEXT_ACTION` independente: `REQ-SEC-005 — Cancelamento/estorno`.
5. Só fechar #75 depois de run Production real verde e confirmação de archive + checksum off-site.

## Não fazer

- não receber/publicar DB URL, OAuth token/config ou App Password;
- não ativar schedule antes dos secrets restantes;
- não fechar #75 sem run real;
- não restaurar Production para teste;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel para backup;
- não reaplicar migrations;
- não importar dados reais/cutover.
