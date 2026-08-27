# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua integrada.** A frente ativa é a Issue #75 / `REQ-PLAT-005`, com Storage separado na **Issue #121 — Backup e recuperação off-site do Supabase Storage**.

Não refazer sem regressão concreta:

- ADR-009;
- R2/lifecycle/lock do PostgreSQL;
- backup PostgreSQL Production + hard cap 300 MB;
- persistência autoritativa/RLS;
- UI read-only `Proteção dos dados`;
- restore do bundle PostgreSQL Production real;
- `restore_drill coverage=postgres`;
- tooling/manifesto/restore Storage integrado no PR #126;
- guardrails Production Storage integrados no PR #128.

## Baseline viva

- referência funcional integrada: PR #128, squash `27b0b3914a246fb370c9dd5f8ea06f64baa86044`;
- #128 merged;
- #75 aberta;
- #121 aberta;
- repo temporariamente `public`; não alterar automaticamente.

Sempre consultar a `main` real. SHA posterior exclusivamente documental não significa nova frente e não justifica outro PR só para sincronizar o SHA registrado pelo próprio handoff.

### Evidência de CI

PR #128, head final:

- CI `33086942613`: `database` + `validate` success;
- Storage Protection CI `33086943585`: `storage-contract` + `isolated-storage-binary-restore` success.

Pós-merge em `27b0b391...`:

- CI `33087254390`: `database` + `validate` success;
- Storage Protection CI `33087254427`: `storage-contract` + `isolated-storage-binary-restore` success.

## Production read-only revalidada — 2026-08-27

Projeto `fhbvwyttikrbeaanatlr`:

- status `ACTIVE_HEALTHY`;
- 1 Organization;
- 0 buckets;
- 0 objetos Storage ativos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 runs `automatic_storage`.

Nenhum bucket/objeto foi criado durante a investigação.

## Guardrails Storage Production — concluído

A política inicial não secreta está versionada no workflow:

- allowlist: `finance-attachments`;
- `max_objects=1000`;
- `max_total_bytes=1073741824` (1 GiB);
- `max_object_bytes=10485760` (10 MiB).

O limite individual é exatamente o limite funcional de anexos. O cap total é próprio de Storage e não herda os 300 MB do PostgreSQL. O CI falha se esses valores voltarem para repository variables ocultas ou se o cap PostgreSQL aparecer no workflow Storage.

Esses valores só devem mudar por alteração versionada + CI/review.

## Gate operacional restante

Ainda não existe evidência acessível/versionada para concluir:

1. Supabase Storage S3 Production habilitado com credencial dedicada server-only em GitHub Secrets;
2. lifecycle 30 dias cobrindo o prefixo `production/storage` no R2 existente;
3. Bucket Lock/WORM 30 dias cobrindo o mesmo prefixo;
4. ausência de public access/CORS de navegador no bucket.

Não inferir esses gates a partir da configuração PostgreSQL. `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true` só pode ser usado após confirmação direta do R2.

`STORAGE_BACKUP_AUTOMATION_ENABLED` deve continuar falso/ausente até todos os gates externos estarem comprovados.

## Gate de UI / prova real

A UI deve continuar dizendo que Storage/anexos não estão cobertos até existirem ambos:

- `automatic_storage` Production real íntegro; e
- `restore_drill coverage=storage` real sobre pelo menos um anexo Production criado pelo fluxo normal do produto.

Snapshot vazio não comprova recuperação binária. Não criar fixture sintética em Production.

## Próxima ação

1. confirmar/provisionar a credencial S3 dedicada do Supabase Storage fora do chat; registrar somente que existe;
2. confirmar diretamente no R2 lifecycle + Bucket Lock 30d para `production/storage` e nenhum public access/CORS;
3. apenas depois marcar o gate sanitizado de retenção e considerar armamento;
4. se Production continuar vazia, não disparar workflow apenas para gerar `succeeded`;
5. quando existir anexo legítimo, executar uma única prova controlada: source hash = checksum de negócio → R2 + re-hash → `automatic_storage=succeeded` → restore isolado → `restore_drill coverage=storage=succeeded`.

## Restrições

- nunca restaurar Production;
- não manipular binários via SQL em `storage.*`;
- não armazenar objeto real em Git/GitHub Artifact;
- não pedir/registrar secrets;
- não reprovisionar R2 sem necessidade concreta;
- não reabrir a trilha PostgreSQL;
- não voltar a Drive/rclone/Gmail;
- não tornar repo private automaticamente;
- não fazer deploy Vercel para esta slice operacional;
- não abrir novo PR apenas para atualizar o SHA produzido por este handoff docs-only.
