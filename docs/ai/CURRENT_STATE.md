# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery permanece comprovada end-to-end e não deve ser refeita sem regressão concreta.

A frente Storage está na **Issue #121 — backup e recuperação off-site do Supabase Storage**. A primeira slice técnica foi implementada no PR #126 e está pronta para merge após reconciliação documental/final do CI. A automação Production continua deliberadamente desarmada.

## GitHub / baseline viva

- `main`: `0452d1330d6a849c4e3c8737faf89912bab9d89d` — `chore(security): reconcile Production migration version (#125)`;
- PR aberto: **#126 `feat(storage): implement fail-closed off-site protection`**;
- branch: `agent/storage-protection-backup`;
- #75 aberta;
- #121 aberta;
- #110 permanece fechada após restore PostgreSQL verde;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

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

## Supabase Storage — inventário Production atual

Projeto `fhbvwyttikrbeaanatlr`, introspecção read-only revalidada em 2026-08-27:

- Organizations: **1**;
- `storage.buckets`: **0**;
- objetos Storage ativos: **0**;
- `public.finance_attachments`: **0**;
- bytes declarados em anexos: **0**;
- policies customizadas em `storage.objects`/`storage.buckets`: **0**;
- runs `automatic_storage`: **0**.

O estado vazio é legítimo: o bucket `finance-attachments` nasce somente no primeiro upload autorizado. Não criar bucket/objeto sintético em Production para fabricar prova.

## PR #126 — primeira slice técnica Storage

Implementado:

- `scripts/storage-backup-bundle.py` com manifesto versionado `lojasaph-storage-backup-v1`;
- reconciliação 1:1 `public.finance_attachments` ↔ bucket/key físico;
- validação de key canônica Organization/document/attachment, tamanho e SHA-256 de negócio;
- fail-closed para bucket inesperado, missing, extra, divergência de tamanho, corrupção e limites excedidos;
- guardrails Storage próprios: máximo de objetos, total de bytes e bytes por objeto;
- `scripts/storage-protection-s3.sh` para inventário/download Supabase S3 e upload R2 em `production/storage/runs/<backup-id>`;
- verificação off-site por existência + re-download/re-hash, sem depender de ETag;
- `scripts/restore-storage-backup.sh` com target obrigatório isolado/loopback e restore binário pela Storage API;
- reconciliação read-only de `storage.objects` após restore;
- workflow `Production Storage Backup` estruturado, mas bloqueado por `STORAGE_BACKUP_AUTOMATION_ENABLED`;
- persistência reutilizando `automatic_storage` / `coverage=storage` e o boundary existente;
- incidente GitHub-native reutilizado;
- `Storage Protection CI` com Supabase Storage local real e fixtures sintéticas pequenas.

Durante a validação do PR foram corrigidas duas falhas reais antes do merge:

1. o CI assumia credenciais S3 internas do container local; foi alinhado ao contrato oficial local Supabase com session token, sem alterar a credencial dedicada exigida em Production;
2. o AWS CLI container materializava downloads como `root`; o helper passou a criar a cópia final runner-owned `0600`, mantendo CI e Production com o mesmo comportamento.

Gates comprovados no head técnico `01681b6b47bbf7a5304fa4bb8ef0787043b7ea9b`:

- CI `33081199162`: **success**;
- Storage Protection CI `33081198933`: **success**;
- job `storage-contract`: success;
- job `isolated-storage-binary-restore`: success.

A prova isolada cria objetos via Storage API, captura snapshot pela interface S3, derruba a origem, sobe outro Supabase, restaura via Storage API, rebaixa/re-hasheia e rejeita objeto extra. Nenhum objeto Production foi usado.

## Cobertura e UI

Storage/anexos **continua não declarado como coberto**. O PR #126 entrega tooling/workflow/CI, não a prova Production completa.

Um snapshot vazio pode validar inventário e automação, mas não comprova recuperação de binários reais. Para liberar cobertura Storage na UI ainda são necessários ambos:

1. `automatic_storage` Production real `succeeded` com integridade verificada;
2. `restore_drill coverage=storage` real sobre pelo menos um anexo Production legítimo.

## Próximo trabalho

Após merge do PR #126, executar os gates operacionais da #121 sem fabricar dados:

1. confirmar endpoint S3 Production e configuração segura da credencial dedicada fora do chat;
2. confirmar lifecycle + Bucket Lock de 30 dias cobrindo `production/storage` no R2 existente;
3. definir/configurar caps Storage Production explícitos e allowlist `finance-attachments`;
4. somente então armar `STORAGE_BACKUP_AUTOMATION_ENABLED=true`;
5. se Production continuar vazia, não rodar prova artificial nem declarar cobertura completa;
6. quando surgir ao menos um anexo real pelo fluxo normal do produto, executar uma única prova controlada de backup + restore isolado e persistir evidência autoritativa.

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
