# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua concluída e integrada.**  
A frente ativa é a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

O PR #107 formalizou ADR-009. O PR #108, branch `agent/s3-backup-transport`, implementa a segunda slice: transporte S3-compatible provider-neutral para backup/restore, ainda sem infraestrutura externa real.

## Estado vivo na entrada do PR #108

### GitHub

- `main`: `1c0ddeb9153d5f7a1d9d64a685ae8d432788833c`;
- CI #407: success;
- PRs abertos antes da slice: nenhum;
- única Issue aberta: #75;
- branches antigas sem PR aberto são históricas.

Ao iniciar o próximo chat, conferir `main`, PR #108, Issues e CI reais. Não criar outro PR apenas para registrar o SHA produzido pelo próprio merge do #108.

### Supabase

Production `fhbvwyttikrbeaanatlr` foi revalidado read-only durante a slice:

- `ACTIVE_HEALTHY`;
- `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration final `20260822195823 / finance_attachments`.

Nenhuma migration/DDL/DML foi feita.

## PR #108 — o que foi implementado

### Transporte S3-compatible

Google Drive/rclone foi removido da automação executável.

O contrato usa:

- `BACKUP_S3_ENDPOINT`;
- `BACKUP_S3_BUCKET`;
- `BACKUP_S3_REGION` com default `auto`;
- `BACKUP_S3_PREFIX` com default `production/postgres`;
- `BACKUP_S3_ACCESS_KEY_ID`;
- `BACKUP_S3_SECRET_ACCESS_KEY`;
- `BACKUP_S3_SESSION_TOKEN` opcional.

A camada `scripts/s3-backup-storage.sh` usa `amazon/aws-cli:2.36.30` como cliente S3 pinado e não hardcoda provider. Cloudflare R2 continua primeira opção preferida, não obrigação.

### Bundle e integridade

Cada backup produz quatro objetos:

1. archive `.tar.gz`;
2. archive `.sha256`;
3. manifesto `.manifest.json`;
4. manifesto `.sha256`.

`scripts/backup-bundle.py` cria/verifica manifesto v1 com metadata de recuperação não sensível e cobertura `postgres`.

Após upload, cada objeto é confirmado por `HeadObject` e baixado novamente em streaming para comparação SHA-256 com o arquivo local. Não confiar em ETag como prova de conteúdo.

### Retenção

O runner não apaga mais backups por idade.

A retenção aprovada de 30 dias deve ser configurada no bucket com lifecycle e lock/WORM compatível quando o provider suportar. Isso permanece parte do gate externo.

### Alerta

Gmail App Password e `scripts/send-backup-alert.py` foram removidos.

`scripts/sync-backup-incident.py` mantém uma Issue GitHub-native idempotente por workflow usando somente `GITHUB_TOKEN` efêmero:

- abre na primeira falha;
- atualiza a mesma Issue nas falhas seguintes;
- evita duplicar o mesmo run/attempt;
- fecha após uma execução verde;
- não registra secrets ou conteúdo de backup.

### Restore drill

O drill mensal usa o mesmo contrato S3-compatible para descobrir/baixar o bundle mais recente, valida sidecars, manifesto e checksums internos e mantém a regressão PostgreSQL 17 isolada. Nunca restaura Production.

### CI

A CI agora valida:

- sintaxe Python/shell;
- manifesto sintético;
- imagem AWS CLI pinada;
- ausência de rclone/Drive/Gmail na automação executável;
- lint;
- typecheck;
- unit tests;
- production build;
- database/restore/testes SQL existentes.

CI #408 falhou apenas no novo guard anti-legado porque `ci.yml` encontrou a própria regex; database passou. O guard foi corrigido na mesma branch para excluir `ci.yml` de sua busca. Verificar a execução final do head do PR antes do merge.

## Requisito/documentação

- `docs/product/requirements.md` foi reconciliado com o nome e alcance atuais de `REQ-PLAT-005`;
- `docs/operations/backup-restore.md` descreve exatamente o novo bundle, transporte, alerta, fail-closed e gate de provider;
- ADR-009 permanece a decisão arquitetural.

## Estado operacional intencional

Mesmo depois de o PR #108 ficar verde/integrado:

- `BACKUP_AUTOMATION_ENABLED` continua desarmado;
- nenhum provider/bucket foi criado;
- nenhum billing/purchase foi autorizado;
- nenhum secret S3 foi provisionado;
- nenhum backup Production real foi executado;
- nenhum status de proteção foi persistido no PostgreSQL;
- nenhuma UI de backup foi criada;
- Supabase Storage/anexos não estão cobertos;
- nenhum deploy Vercel é necessário.

## Próximo gate exato após integração do #108

**Não puxar a próxima slice de código automaticamente.** O próximo evento necessário é aprovação/provisionamento do provider off-site real.

Cloudflare R2 é a preferência atual por ADR-009, mas permanece reversível para B2/S3/equivalente S3-compatible.

Quando o operador explicitamente desbloquear o gate:

1. conferir documentação/preço atual do provider;
2. obter autorização explícita antes de qualquer subscription/billing/custo;
3. criar bucket privado dedicado a Production;
4. desabilitar acesso público/CORS de navegador;
5. configurar lifecycle 30 dias;
6. configurar lock/WORM coerente com a retenção quando suportado;
7. gerar credencial de menor privilégio para o bucket;
8. provisionar Variables/Secrets diretamente no GitHub, fora do chat;
9. somente então armar `BACKUP_AUTOMATION_ENABLED=true`;
10. executar uma única prova real via `workflow_dispatch`;
11. exigir run verde + quatro objetos off-site + verificação remota;
12. registrar apenas evidência não sensível.

Depois do primeiro backup PostgreSQL real comprovado, a próxima slice de engenharia é persistência autoritativa de runs/Organizations + RLS para a futura UI.

## Não fazer

- não pedir nem receber secrets no chat;
- não criar provider/billing sem autorização explícita;
- não armar a automação antes do bucket/credentials/lifecycle/lock;
- não restaurar Production para teste;
- não declarar Storage/anexos protegidos pelo dump PostgreSQL;
- não criar migration/UI/exportação manual por inércia antes do gate real;
- não criar deploy Vercel para workflow/docs;
- não voltar ao fluxo Drive/rclone/Gmail.
