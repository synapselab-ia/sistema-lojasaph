# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está comprovada end-to-end e não deve ser refeita sem regressão concreta.

A frente Storage permanece na **Issue #121 — backup e recuperação off-site do Supabase Storage**. A primeira slice técnica foi integrada pelo PR #126; a próxima etapa é operacional e Production continua deliberadamente desarmada.

## GitHub / baseline viva

- `main`: `e071b6f2ede444b2fc97c29836be098fda8dc7f4` — `feat(storage): implement fail-closed off-site protection (#126)`;
- PR #126: **merged** por squash;
- Issue #75: aberta;
- Issue #121: aberta;
- Issue #110: fechada após o restore PostgreSQL verde;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

### CI pós-merge #126

Todos os checks do commit `e071b6f2...` ficaram verdes:

- CI `33082831368`:
  - `database`: success;
  - `validate`: success;
- Storage Protection CI `33082831347`:
  - `storage-contract`: success;
  - `isolated-storage-binary-restore`: success.

Não há motivo para rerun manual desses gates sem mudança de código/regressão.

## PostgreSQL — concluído

O run `Backup Restore Drill / 33069706382` restaurou o archive Production real criado em `2026-08-26T19:40:47Z` (`53185` bytes) em destino local isolado e terminou `success`.

A evidência autoritativa permanece:

- `protection_type=restore_drill`;
- `status=succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization mapeada.

As tentativas anteriores falhas permanecem preservadas como audit trail. Não backfillar o backup histórico `33006253661`.

## Supabase Production — estado atual revalidado

Projeto `fhbvwyttikrbeaanatlr`:

- status: `ACTIVE_HEALTHY`;
- região: `sa-east-1`;
- PostgreSQL: `17.6.1.141` / engine 17;
- Organizations: **1**;
- `storage.buckets`: **0**;
- objetos Storage ativos: **0**;
- `public.finance_attachments`: **0**;
- bytes declarados em anexos: **0**;
- policies customizadas em `storage.objects`/`storage.buckets`: **0**;
- runs `automatic_storage`: **0**.

O estado vazio é legítimo: o bucket `finance-attachments` nasce somente no primeiro upload autorizado. Não criar bucket/objeto sintético em Production para fabricar prova.

## Storage — primeira slice técnica integrada

O PR #126 adicionou:

- manifesto versionado `lojasaph-storage-backup-v1`;
- reconciliação 1:1 `public.finance_attachments` ↔ bucket/key físico;
- validação de key canônica Organization/document/attachment, tamanho e SHA-256 de negócio;
- fail-closed para bucket inesperado, missing, extra, divergência de tamanho, corrupção e limites excedidos;
- guardrails Storage próprios: máximo de objetos, total de bytes e bytes por objeto;
- snapshot Supabase S3 e upload R2 em `production/storage/runs/<backup-id>`;
- verificação off-site por existência + re-download/re-hash, sem depender de ETag;
- restore obrigatório em target isolado/loopback pela Storage API;
- reconciliação read-only de `storage.objects` pós-restore;
- workflow `Production Storage Backup` bloqueado por `STORAGE_BACKUP_AUTOMATION_ENABLED`;
- persistência `automatic_storage` / `coverage=storage` reutilizando o boundary existente;
- incidente GitHub-native existente;
- CI end-to-end com Supabase Storage local e fixtures sintéticas pequenas.

Durante o gate do PR foram corrigidas duas falhas reais: autenticação S3 local passou a usar o contrato documentado de session token do Supabase local; e downloads do AWS CLI container passaram a ser materializados como arquivos runner-owned `0600` antes da verificação.

## Cobertura e UI

Storage/anexos **continua não declarado como coberto**. Tooling/CI pronto não equivale a prova Production completa.

Para liberar cobertura Storage na UI ainda são necessários ambos:

1. `automatic_storage` Production real `succeeded` com integridade verificada;
2. `restore_drill coverage=storage` real sobre pelo menos um anexo Production legítimo.

Snapshot vazio não comprova recuperação binária.

## Próximo trabalho

Executar somente os gates operacionais da #121:

1. confirmar endpoint S3 Production e credencial dedicada da origem provisionada fora do chat;
2. confirmar lifecycle + Bucket Lock de 30 dias cobrindo `production/storage` no R2 existente;
3. configurar caps Storage Production explícitos e allowlist `finance-attachments`;
4. manter `STORAGE_BACKUP_AUTOMATION_ENABLED` falso até todos os gates passarem;
5. se Production continuar vazia, não executar prova artificial nem declarar cobertura completa;
6. quando surgir ao menos um anexo real pelo fluxo normal, executar uma única prova controlada de backup + restore isolado e persistir evidência autoritativa.

## Não fazer

- não restaurar Production para teste;
- não refazer a trilha PostgreSQL concluída;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets por inércia;
- não pedir/registrar secrets em chat/Issue/PR;
- não armazenar dump ou objeto Storage real em Git/GitHub Artifact;
- não manipular binários via INSERT/UPDATE/DELETE em `storage.*`;
- não declarar Storage coberto por snapshot vazio;
- não reutilizar automaticamente o hard cap PostgreSQL de 300 MB para Storage;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para validar esta trilha backend/operacional.
