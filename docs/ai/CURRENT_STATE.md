# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A arquitetura revisada foi formalizada pelo PR #107 / ADR-009. A slice seguinte está no PR #108, branch `agent/s3-backup-transport`, e reconcilia a automação de backup/restore para transporte S3-compatible provider-neutral.

O núcleo funcional das Fases 41–45 não foi reaberto.

## Baseline de entrada da slice #108

### GitHub

- `main` na entrada: `1c0ddeb9153d5f7a1d9d64a685ae8d432788833c`;
- CI #407 em `main`: success;
- PRs abertos na entrada: nenhum;
- única Issue aberta: #75;
- branches `agent/*` antigas sem PR aberto continuam históricas.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr` revalidado read-only durante a slice:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history termina em `20260822195823 / finance_attachments`.

Nenhuma migration, DDL ou DML foi executada.

## PR #108 — transporte S3-compatible

A implementação preserva o exportador `scripts/export-supabase-backup.sh` e substitui somente a camada de transporte/alerta da automação histórica.

### Backup Production

`.github/workflows/production-backup.yml` agora:

- mantém cron diário + `workflow_dispatch`;
- mantém fail-closed por `BACKUP_AUTOMATION_ENABLED == 'true'`;
- mantém `PRODUCTION_SUPABASE_DB_URL` server-side e valida Session pooler 5432;
- usa Supabase CLI pinada `2.111.0`;
- gera roles/schema/data + checksums internos;
- cria archive `.tar.gz`, `.sha256`, manifesto v1 e checksum do manifesto;
- transfere pelo contrato S3-compatible usando AWS CLI oficial pinada `amazon/aws-cli:2.36.30`;
- verifica cada objeto remoto por `HeadObject` + download em streaming + SHA-256;
- não usa rclone/Google Drive;
- não usa Gmail App Password;
- não deleta backups antigos no runner.

### Manifesto

`scripts/backup-bundle.py` cria/verifica o formato `lojasaph-postgres-logical-backup` versão 1 com metadata não sensível:

- backup id;
- ambiente/timestamp;
- cobertura `postgres`;
- archive name/size/SHA-256;
- Supabase project ref;
- versão do exportador/CLI e Git SHA;
- workflow/run id/run URL;
- contrato `s3-compatible`;
- retenção 30 dias.

### Transporte

`scripts/s3-backup-storage.sh` encapsula:

- endpoint HTTPS;
- bucket;
- region;
- prefix;
- upload do bundle;
- existência remota;
- rehash pós-upload;
- descoberta/download do backup mais recente para drill.

O helper não hardcoda Cloudflare R2. R2 continua somente a primeira opção preferida do ADR-009.

### Retenção

Retenção de 30 dias passa a ser responsabilidade do bucket/provider aprovado por lifecycle + lock/WORM quando suportado. A credencial de backup não recebe responsabilidade de apagar backups por idade.

### Alertas

`scripts/send-backup-alert.py` foi removido.

`scripts/sync-backup-incident.py` usa o `GITHUB_TOKEN` efêmero para incidente persistente e idempotente:

- primeira falha abre uma Issue operacional do workflow;
- falhas seguintes atualizam a mesma Issue;
- o mesmo run/attempt não duplica evento;
- recuperação fecha a Issue após registrar run verde;
- sem secrets, connection string ou conteúdo do backup.

### Restore drill

`.github/workflows/backup-restore-drill.yml` continua mensal, fail-closed e isolado. Ele usa o mesmo contrato S3-compatible para baixar o bundle mais recente, valida sidecars + manifesto + checksums internos e mantém a regressão PostgreSQL 17 sem restaurar Production.

### CI

A CI ganhou validações para:

- sintaxe Python/shell dos novos helpers;
- contrato sintético do manifesto;
- imagem AWS CLI pinada;
- ausência de dependências executáveis de rclone/Drive/Gmail;
- toda a suíte existente de lint, typecheck, testes, build e database.

A primeira execução da branch, CI #408, falhou somente porque o teste anti-legado encontrou a própria regex no `ci.yml`; database ficou verde. O teste foi corrigido na mesma branch para excluir o próprio `ci.yml`. Não interpretar #408 como falha do transporte ou do banco.

## Requisito reconciliado

`docs/product/requirements.md` agora usa o nome aprovado:

- `REQ-PLAT-005 — Proteção, backup e recuperação de dados`

O requisito explicita backup automático real, off-site, integridade/retenção, restore isolado, status autoritativo, cobertura declarada de PostgreSQL/Storage e exportação manual apenas complementar.

## O que deliberadamente NÃO foi feito

- nenhum provider/bucket real provisionado;
- nenhum billing/purchase iniciado;
- nenhum secret S3 criado/manipulado;
- `BACKUP_AUTOMATION_ENABLED` não foi ativado;
- nenhum backup Production real executado;
- nenhum restore sobre Production;
- nenhuma migration/DDL/DML;
- nenhuma persistência de status/UI criada;
- nenhuma cópia de Supabase Storage implementada;
- nenhum usuário/dado real alterado;
- nenhum deploy Vercel criado.

## Próxima ação após integração verde do PR #108

**Gate externo: aprovar e provisionar o provider S3-compatible real antes de qualquer novo código da #75 por inércia.**

Cloudflare R2 permanece a primeira opção preferida, mas não está autorizado/provisionado. Se o operador aprovar outro provider S3-compatible que cumpra os controles, o workflow não precisa ser redesenhado.

Ver `docs/ai/NEXT_ACTION.md` para o checklist exato.

## Não fazer

- não ativar `BACKUP_AUTOMATION_ENABLED` antes de provider + lifecycle/lock + secrets estarem completos;
- não pedir/receber secrets no chat;
- não provisionar serviço com billing/custo sem autorização explícita;
- não criar migration/UI de status antes do primeiro backup real comprovado, salvo nova prioridade explícita;
- não declarar Storage/anexos cobertos pelo backup PostgreSQL;
- não restaurar Production para teste;
- não criar deploy Vercel para esta frente de workflow/docs;
- não abrir outro PR apenas para atualizar o SHA criado pelo próprio merge do #108; sempre conferir `main` ao iniciar o próximo chat.
