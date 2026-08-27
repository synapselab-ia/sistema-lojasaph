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
- compatibilidade de roles/schema do restore;
- `restore_drill coverage=postgres` e reconciliação da #110.

## Baseline viva

- `main`: `0452d1330d6a849c4e3c8737faf89912bab9d89d` (#125);
- PR #126 aberto na branch `agent/storage-protection-backup`;
- #75 aberta;
- #121 aberta;
- Production Storage continua vazia;
- repo temporariamente `public`; não alterar automaticamente.

## Primeira slice técnica Storage — implementada

PR #126 entrega:

1. manifesto `lojasaph-storage-backup-v1`;
2. inventário/reconciliação `finance_attachments` ↔ objeto físico;
3. fail-closed para bucket inesperado, missing, extra, tamanho/hash divergente e guardrails;
4. snapshot Supabase Storage via S3;
5. upload R2 em `production/storage/runs/<backup-id>` com re-download/re-hash;
6. workflow Production desarmado por gate explícito;
7. persistência `automatic_storage` / `coverage=storage` reutilizando `record-protection-run.sh`;
8. incidente GitHub-native existente;
9. restore isolado pela Storage API, nunca por DML em `storage.*`;
10. CI local end-to-end com objeto sintético e re-hash pós-restore.

Durante o gate do PR duas falhas concretas foram corrigidas:

- autenticação S3 local passou a usar o contrato documentado do Supabase local com session token, sem alterar o modelo Production de access key dedicada;
- downloads do container AWS passaram a ser materializados como arquivos runner-owned `0600` antes da verificação.

Head técnico comprovado: `01681b6b47bbf7a5304fa4bb8ef0787043b7ea9b`.

Runs verdes:

- CI `33081199162`;
- Storage Protection CI `33081198933`;
- `storage-contract`: success;
- `isolated-storage-binary-restore`: success.

Depois disso foi removido um arquivo temporário acidental `NEXT_ACTION.next.tmp`; não preservar/recriar esse artefato.

## Production read-only revalidada — 2026-08-27

Projeto `fhbvwyttikrbeaanatlr`:

- 1 Organization;
- 0 buckets;
- 0 objetos Storage ativos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 policies customizadas em `storage.objects`/`storage.buckets`;
- 0 runs `automatic_storage`.

Nenhum bucket/objeto foi criado durante a implementação ou investigação.

## Gate de UI / prova real

A UI deve continuar dizendo que Storage/anexos não estão cobertos até existirem ambos:

- `automatic_storage` Production real íntegro; e
- `restore_drill coverage=storage` real sobre pelo menos um anexo Production criado pelo fluxo normal do produto.

Snapshot vazio não comprova recuperação binária. Não criar fixture sintética em Production.

## Próxima ação

Depois do merge do PR #126, a próxima slice é operacional, não uma reescrita do tooling:

1. confirmar o endpoint S3 Production correto e que a credencial dedicada da origem está provisionada em GitHub Secrets fora do chat;
2. confirmar lifecycle + Bucket Lock de 30 dias abrangendo `production/storage` no R2 existente;
3. configurar caps Storage Production explícitos e allowlist `finance-attachments`;
4. manter `STORAGE_BACKUP_AUTOMATION_ENABLED` falso até todos os gates estarem confirmados;
5. se Production ainda estiver vazia, não executar prova artificial apenas para gerar `succeeded`;
6. quando existir um anexo legítimo, executar uma única prova controlada: source hash = checksum de negócio → R2 + re-hash → `automatic_storage=succeeded` → restore isolado → `restore_drill coverage=storage=succeeded`.

## Restrições

- nunca restaurar Production;
- não manipular binários via SQL em `storage.*`;
- não armazenar objeto real em Git/GitHub Artifact;
- não pedir/registrar secrets;
- não reprovisionar R2 sem necessidade concreta;
- não reabrir a trilha PostgreSQL;
- não voltar a Drive/rclone/Gmail;
- não tornar repo private automaticamente;
- não fazer deploy Vercel para esta slice operacional.
