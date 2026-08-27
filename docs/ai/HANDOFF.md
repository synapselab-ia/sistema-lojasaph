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
- `restore_drill coverage=postgres` e reconciliação da #110;
- primeira slice técnica Storage integrada no PR #126.

## Baseline viva

- `main`: `e071b6f2ede444b2fc97c29836be098fda8dc7f4` (#126);
- #126 merged por squash;
- #75 aberta;
- #121 aberta;
- repo temporariamente `public`; não alterar automaticamente.

Pós-merge #126:

- CI `33082831368`: `database` + `validate` success;
- Storage Protection CI `33082831347`: `storage-contract` + `isolated-storage-binary-restore` success.

## Storage técnico — concluído nesta slice

O código agora possui:

1. manifesto `lojasaph-storage-backup-v1`;
2. inventário/reconciliação `finance_attachments` ↔ objeto físico;
3. fail-closed para bucket inesperado, missing, extra, tamanho/hash divergente e guardrails;
4. snapshot Supabase Storage via S3;
5. upload R2 em `production/storage/runs/<backup-id>` com re-download/re-hash;
6. workflow Production desarmado por gate explícito;
7. persistência `automatic_storage` / `coverage=storage` reutilizando `record-protection-run.sh`;
8. incidente GitHub-native existente;
9. restore isolado pela Storage API, nunca por DML em `storage.*`;
10. CI end-to-end com objeto sintético e re-hash pós-restore.

Duas regressões foram encontradas e corrigidas antes do merge:

- autenticação S3 local alinhada ao session-token contract documentado do Supabase local;
- materialização runner-owned `0600` para downloads feitos pelo container AWS CLI.

Não reabrir esses pontos sem erro concreto.

## Production read-only revalidada — 2026-08-27

Projeto `fhbvwyttikrbeaanatlr`:

- status `ACTIVE_HEALTHY`;
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

A próxima slice é operacional, não uma reescrita do tooling:

1. confirmar o endpoint S3 Production correto e a credencial dedicada da origem em GitHub Secrets fora do chat;
2. confirmar lifecycle + Bucket Lock de 30 dias abrangendo `production/storage` no R2 existente;
3. configurar caps Storage Production explícitos e allowlist `finance-attachments`;
4. manter `STORAGE_BACKUP_AUTOMATION_ENABLED=false` até todos os gates estarem confirmados;
5. se Production continuar vazia, não executar prova artificial apenas para gerar `succeeded`;
6. quando existir um anexo legítimo, executar uma única prova controlada: source hash = checksum de negócio → R2 + re-hash → `automatic_storage=succeeded` → restore isolado → `restore_drill coverage=storage=succeeded`.

Não há evidência versionada ainda de que os gates Storage-specific de credencial/R2/caps estejam todos confirmados; portanto não armar a automação por inferência.

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
