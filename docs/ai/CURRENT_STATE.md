# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está comprovada end-to-end e não deve ser refeita sem regressão concreta.

A frente Storage permanece na **Issue #121 — backup e recuperação off-site do Supabase Storage**. Tooling, restore isolado, persistência e guardrails Production já estão integrados. Os gates privados externos foram confirmados pelo operador em 2026-08-27 e a automação Storage está armada para a execução normal agendada.

## GitHub / baseline viva

- `main` antes desta atualização operacional: `96ffbf6553dfd7cb3889531387995f35035a8d15` (#130);
- Issue #75: aberta;
- Issue #121: aberta;
- não havia PR aberto no início desta atualização;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

`main` é sempre a fonte viva. Não abrir PR apenas para atualizar SHA produzido pelo próprio handoff.

### CI da baseline antes desta atualização

Pós-merge #130:

- CI `33089679869`: `database` + `validate` success;
- Storage Protection CI `33089679857`: `storage-contract` + `isolated-storage-binary-restore` success.

Não há motivo para rerun manual desses gates sem mudança de código/regressão.

## PostgreSQL — concluído

O run `Backup Restore Drill / 33069706382` restaurou o archive Production real criado em `2026-08-26T19:40:47Z` (`53185` bytes) em destino local isolado e terminou `success`.

Evidência autoritativa:

- `protection_type=restore_drill`;
- `status=succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization mapeada.

Não refazer essa trilha sem regressão concreta.

## Supabase Production — revalidação read-only atual

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

## Storage — tooling e guardrails concluídos

Já integrado:

- manifesto `lojasaph-storage-backup-v1`;
- reconciliação 1:1 `finance_attachments` ↔ bucket/key físico;
- validação de key canônica, tamanho e SHA-256 de negócio;
- fail-closed para bucket inesperado, missing, extra, corrupção e limites;
- Supabase S3 → Cloudflare R2 em `production/storage/runs/<backup-id>`;
- verificação remota por existência + re-download/re-hash;
- restore obrigatório em target isolado pela Storage API/S3;
- persistência `automatic_storage` / `coverage=storage`;
- CI end-to-end com Storage local;
- allowlist `finance-attachments`;
- `max_objects=1000`;
- `max_total_bytes=1073741824` (1 GiB);
- `max_object_bytes=10485760` (10 MiB).

## Fonte S3 Production — concluída

Baseline versionada:

- project ref: `fhbvwyttikrbeaanatlr`;
- endpoint: `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- region: `sa-east-1`.

Em 2026-08-27 o operador confirmou, sem expor valores:

- protocolo S3 do Supabase Storage Production habilitado;
- credencial S3 dedicada server-only criada;
- GitHub Actions Secrets `STORAGE_SOURCE_S3_ACCESS_KEY_ID` e `STORAGE_SOURCE_S3_SECRET_ACCESS_KEY` provisionados.

Nenhum valor secreto foi registrado no GitHub, docs, Issue ou chat.

## R2 Production — gates externos concluídos

Em 2026-08-27 o operador confirmou diretamente no bucket privado `lojasaph-production-backups`:

- lifecycle de **30 dias** cobrindo `production/storage`;
- Bucket Lock/WORM de **30 dias** cobrindo `production/storage`;
- ausência de public access;
- ausência de CORS de navegador;
- `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true` configurado no GitHub Actions.

Não reprovisionar provider/token sem necessidade concreta.

## Armamento Production Storage

O operador confirmou que `STORAGE_BACKUP_AUTOMATION_ENABLED=true` está configurado no GitHub Actions.

Com os gates externos acima concluídos, esse estado é agora coerente e deve ser preservado. O workflow permanece fail-closed para credenciais, endpoint/região, guardrails e retenção.

Não usar `workflow_dispatch` apenas para antecipar a execução normal ou fabricar evidência. A execução agendada diária continua sendo o caminho esperado.

## Cobertura e UI

Storage/anexos **ainda não deve ser declarado como recuperação binária comprovada**.

Um run agendado vazio pode provar que a automação operou corretamente sobre inventário vazio, mas não comprova restauração de binário real.

Para liberar cobertura Storage completa na UI ainda são necessários ambos sobre uso real:

1. `automatic_storage` Production `succeeded` com pelo menos um anexo legítimo e integridade verificada;
2. `restore_drill coverage=storage` real sobre o mesmo conjunto/snapshot em target isolado.

## Próximo trabalho

1. não disparar manualmente o workflow apenas porque a automação foi armada;
2. após a próxima execução agendada, conferir resultado e evidência sanitizada;
3. se Production ainda estiver vazia, manter a automação ativa, aceitar o run vazio apenas como prova operacional e continuar sem declarar recuperação binária comprovada;
4. quando surgir ao menos um anexo real pelo fluxo normal, executar a prova completa de backup + restore isolado e persistir `restore_drill coverage=storage=succeeded`;
5. somente então considerar atualizar a UI para declarar Storage coberto.

## Não fazer

- não restaurar Production para teste;
- não refazer PostgreSQL concluído;
- não criar fixture Storage sintética em Production;
- não pedir/registrar secrets;
- não armazenar dump/objeto real em Git ou GitHub Artifact;
- não manipular binários via DML em `storage.*`;
- não declarar recuperação binária comprovada por snapshot vazio;
- não reprovisionar R2/secrets por inércia;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para esta trilha backend/operacional.
