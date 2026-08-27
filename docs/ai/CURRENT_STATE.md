# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está comprovada end-to-end e não deve ser refeita sem regressão concreta.

A frente Storage permanece na **Issue #121 — backup e recuperação off-site do Supabase Storage**. A primeira slice técnica foi integrada pelo PR #126; a etapa atual é operacional e Production continua deliberadamente desarmada.

## GitHub / baseline viva

- `main`: `c534a99b7b88b054f57b6556d303cdf5a1e7e92a` — `docs(storage): reconcile post-merge handoff (#127)`;
- baseline funcional Storage: `e071b6f2ede444b2fc97c29836be098fda8dc7f4` (#126);
- branch ativa: `agent/storage-production-guardrails`;
- Issue #75: aberta;
- Issue #121: aberta;
- Issue #110: fechada após o restore PostgreSQL verde;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

### CI da baseline

- CI `33083475690` em `main=c534a99b...`: `database` + `validate` success;
- Storage Protection CI pós-merge #126 `33082831347`: `storage-contract` + `isolated-storage-binary-restore` success.

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
- runs `automatic_storage`: **0**.

O estado vazio é legítimo: o bucket `finance-attachments` nasce somente no primeiro upload autorizado. Não criar bucket/objeto sintético em Production para fabricar prova.

## Storage — tooling integrado

O PR #126 adicionou:

- manifesto versionado `lojasaph-storage-backup-v1`;
- reconciliação 1:1 `public.finance_attachments` ↔ bucket/key físico;
- validação de key canônica Organization/document/attachment, tamanho e SHA-256 de negócio;
- fail-closed para bucket inesperado, missing, extra, divergência de tamanho, corrupção e limites excedidos;
- snapshot Supabase S3 e upload R2 em `production/storage/runs/<backup-id>`;
- verificação off-site por existência + re-download/re-hash;
- restore obrigatório em target isolado/loopback pela Storage API;
- persistência `automatic_storage` / `coverage=storage` reutilizando o boundary existente;
- CI end-to-end com Supabase Storage local e fixtures sintéticas pequenas.

## Guardrails Production — decisão versionada nesta branch

Os limites Storage iniciais passam a ser configuração não secreta versionada no próprio workflow, em vez de repository variables ocultas:

- bucket allowlist: `finance-attachments`;
- máximo de objetos por snapshot: **1000**;
- máximo total por snapshot: **1073741824 bytes (1 GiB)**;
- máximo por objeto: **10485760 bytes (10 MiB)**, igual ao limite funcional de anexos.

Esses valores são independentes do hard cap PostgreSQL de 300 MB. O Storage Protection CI exige os valores versionados e falha se o workflow voltar a `vars.STORAGE_BACKUP_MAX_*` ou reutilizar `300000000`.

Com snapshot completo diário e retenção de 30 dias, o cap total limita a ordem de grandeza do namespace Storage a cerca de 30 GiB simultâneos antes da expiração, sem contar outros namespaces/buckets. Alterar esse limite futuramente exige mudança versionada e revisão, não ajuste invisível de variável.

## Gates operacionais ainda não comprovados

Não existe evidência acessível/versionada que permita marcar como concluídos:

1. S3 protocol Production habilitado + credencial S3 dedicada da origem provisionada em GitHub Secrets;
2. lifecycle de 30 dias cobrindo `production/storage` no R2 existente;
3. Bucket Lock/WORM de 30 dias cobrindo `production/storage`;
4. ausência de mudança indesejada de public access/CORS do bucket.

`STORAGE_BACKUP_AUTOMATION_ENABLED` deve permanecer falso/ausente e `STORAGE_BACKUP_R2_RETENTION_VERIFIED` não deve ser marcado `true` por inferência.

## Cobertura e UI

Storage/anexos **continua não declarado como coberto**. Tooling/CI e guardrails prontos não equivalem a prova Production completa.

Para liberar cobertura Storage na UI ainda são necessários ambos:

1. `automatic_storage` Production real `succeeded` com integridade verificada;
2. `restore_drill coverage=storage` real sobre pelo menos um anexo Production legítimo.

Snapshot vazio não comprova recuperação binária.

## Próximo trabalho

1. confirmar/provisionar fora do chat a credencial S3 dedicada do Supabase Storage e registrar somente a existência, nunca o valor;
2. confirmar no R2 lifecycle + Bucket Lock 30d para prefixo `production/storage` e ausência de public access/CORS;
3. somente após ambos, marcar o gate sanitizado de retenção e avaliar armamento;
4. se Production continuar vazia, não executar prova artificial;
5. quando surgir ao menos um anexo real pelo fluxo normal, executar uma única prova controlada de backup + restore isolado e persistir evidência autoritativa.

## Não fazer

- não restaurar Production para teste;
- não refazer a trilha PostgreSQL concluída;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets por inércia;
- não pedir/registrar secrets em chat/Issue/PR;
- não armazenar dump ou objeto Storage real em Git/GitHub Artifact;
- não manipular binários via INSERT/UPDATE/DELETE em `storage.*`;
- não declarar Storage coberto por snapshot vazio;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para validar esta trilha backend/operacional.
