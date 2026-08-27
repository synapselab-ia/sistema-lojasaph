# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está comprovada end-to-end e não deve ser refeita sem regressão concreta.

A frente Storage permanece na **Issue #121 — backup e recuperação off-site do Supabase Storage**. O tooling técnico foi integrado no PR #126 e os guardrails Production foram integrados no PR #128. A etapa atual é exclusivamente operacional/external-gate; Production continua deliberadamente desarmada.

## GitHub / baseline viva

- referência funcional integrada antes desta mudança: PR #128, squash `27b0b3914a246fb370c9dd5f8ea06f64baa86044`;
- handoff integrado: PR #129, `main=c64253571e896c26c787fe5c42c4a88b9597d760` no início desta execução;
- Issue #75: aberta;
- Issue #121: aberta;
- Issue #110: fechada após o restore PostgreSQL verde;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

`main` é sempre a fonte viva. Um SHA posterior exclusivamente documental não representa nova frente funcional e **não deve gerar outro PR apenas para atualizar o SHA registrado por este próprio handoff**.

### Validação da baseline

PR #128, head final:

- CI `33086942613`: `database` + `validate` success;
- Storage Protection CI `33086943585`: `storage-contract` + `isolated-storage-binary-restore` success.

Pós-merge #128:

- CI `33087254390`: `database` + `validate` success;
- Storage Protection CI `33087254427`: `storage-contract` + `isolated-storage-binary-restore` success.

Pós-merge #129:

- CI `33087974482`: `database` + `validate` success, incluindo lint, typecheck, unit tests e production build.

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

## Storage — tooling integrado no PR #126

O código possui:

- manifesto versionado `lojasaph-storage-backup-v1`;
- reconciliação 1:1 `public.finance_attachments` ↔ bucket/key físico;
- validação de key canônica Organization/document/attachment, tamanho e SHA-256 de negócio;
- fail-closed para bucket inesperado, missing, extra, divergência de tamanho, corrupção e limites excedidos;
- snapshot Supabase S3 e upload R2 em `production/storage/runs/<backup-id>`;
- verificação off-site por existência + re-download/re-hash;
- restore obrigatório em target isolado/loopback pela Storage API;
- persistência `automatic_storage` / `coverage=storage` reutilizando o boundary existente;
- CI end-to-end com Supabase Storage local e fixtures sintéticas pequenas.

## Guardrails Production — integrados no PR #128

A política inicial não secreta está versionada no próprio workflow:

- bucket allowlist: `finance-attachments`;
- máximo de objetos por snapshot: **1000**;
- máximo total por snapshot: **1073741824 bytes (1 GiB)**;
- máximo por objeto: **10485760 bytes (10 MiB)**, igual ao limite funcional de anexos.

Esses valores são independentes do hard cap PostgreSQL de 300 MB. O Storage Protection CI exige os valores versionados, rejeita retorno a `vars.STORAGE_BACKUP_MAX_*` e rejeita reutilização de `300000000` no workflow Storage.

Com snapshot completo diário e retenção de 30 dias, o cap total limita a ordem de grandeza do namespace Storage a cerca de 30 GiB simultâneos antes da expiração, sem contar outros namespaces/buckets. Alterar esse limite exige mudança versionada + CI/review, não ajuste invisível de variável.

## Fonte S3 Production — baseline não secreta versionada nesta mudança

O projeto e a região foram revalidados diretamente no Supabase e a documentação atual confirma o hostname direto recomendado. Como esses dados não são secretos nem escolhas operacionais variáveis, o workflow passa a versionar:

- project ref: `fhbvwyttikrbeaanatlr`;
- endpoint: `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- region: `sa-east-1`.

O runtime continua fail-closed e rejeita endpoint/região divergentes. `STORAGE_SOURCE_S3_ENDPOINT` e `STORAGE_SOURCE_S3_REGION` deixam de depender de repository variables ocultas.

Isso **não prova** que o protocolo S3 esteja habilitado no Dashboard nem que a access key dedicada exista no GitHub Secrets.

## Gates operacionais ainda não comprovados

Não existe evidência acessível/versionada que permita marcar como concluídos:

1. S3 protocol Production efetivamente habilitado + credencial S3 dedicada da origem provisionada em GitHub Secrets;
2. lifecycle de 30 dias cobrindo `production/storage` no R2 existente;
3. Bucket Lock/WORM de 30 dias cobrindo `production/storage`;
4. ausência de mudança indesejada de public access/CORS do bucket.

A evidência histórica do PostgreSQL registra bucket R2 privado, lifecycle 30d e Bucket Lock 30d para a trilha existente, mas não registra escopo suficiente para concluir por inferência que `production/storage` está coberto.

`STORAGE_BACKUP_AUTOMATION_ENABLED` deve permanecer falso/ausente e `STORAGE_BACKUP_R2_RETENTION_VERIFIED` não deve ser marcado `true` por inferência.

## Cobertura e UI

Storage/anexos **continua não declarado como coberto**. Tooling/CI e guardrails prontos não equivalem a prova Production completa.

Para liberar cobertura Storage na UI ainda são necessários ambos:

1. `automatic_storage` Production real `succeeded` com integridade verificada;
2. `restore_drill coverage=storage` real sobre pelo menos um anexo Production legítimo.

Snapshot vazio não comprova recuperação binária.

## Próximo trabalho

1. confirmar/provisionar fora do chat o **S3 protocol + credencial S3 dedicada** do Supabase Storage e registrar somente a existência, nunca o valor;
2. confirmar diretamente no R2 lifecycle + Bucket Lock 30d para prefixo `production/storage` e ausência de public access/CORS;
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
- não fazer deploy Vercel para validar esta trilha backend/operacional;
- não abrir PR apenas para atualizar o SHA gerado pelo próprio handoff documental.
