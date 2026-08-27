# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A NEXT_ACTION anterior — inventariar/desenhar Supabase Storage — foi concluída em 2026-08-27 e gerou a **Issue #121 — `REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage`**.

Não refazer as slices concluídas:

1. ADR-009;
2. Cloudflare R2/lifecycle/lock;
3. backup PostgreSQL Production + hard cap 300 MB;
4. primeira prova PostgreSQL off-site `33006253661`;
5. persistência autoritativa/RLS;
6. UI read-only `Proteção dos dados`;
7. restore do bundle PostgreSQL Production real;
8. `restore_drill coverage=postgres` real `33069706382`;
9. auto-reconciliação da #110;
10. inventário/desenho Storage registrado na #121.

## Inventário Storage já confirmado

Production `fhbvwyttikrbeaanatlr` em 2026-08-27:

- 1 Organization;
- 0 buckets Storage;
- 0 objetos ativos;
- 0 rows em `public.finance_attachments`;
- 0 bytes declarados;
- 0 policies customizadas em `storage.objects`/`storage.buckets`.

Código:

- bucket previsto `finance-attachments`, privado e criado lazy pela Storage API;
- arquivo máximo 10 MiB;
- key `<organization_uuid>/<payable_document_uuid>/<attachment_uuid>`;
- SHA-256 do conteúdo persistido em `finance_attachments.checksum_sha256`;
- upload/download físico é server-only/admin após autorização/RLS de negócio;
- não existe delete funcional de anexos;
- browser não recebe secret, signed URL ou public URL permanente.

Não repetir esse inventário salvo regressão ou novo uso de Storage no código.

## NEXT_ACTION imediata

**Implementar a primeira slice técnica da Issue #121, sem armar Production antes dos gates operacionais.**

### 1. Branch / escopo

Criar branch própria a partir de `main`, por exemplo:

`agent/storage-protection-backup`

Escopo da primeira PR:

- tooling de inventário/manifesto Storage;
- testes unitários;
- CI com Storage local e arquivos sintéticos pequenos;
- workflow automático Storage estruturado, mas fail-closed/desarmado para Production até os gates abaixo;
- persistência `automatic_storage` reutilizando `record-protection-run.sh`;
- incidente GitHub-native reutilizando o padrão já existente;
- documentação afetada.

Não atualizar a UI para declarar Storage coberto nesta primeira PR.

### 2. Contrato a implementar

Seguir a #121:

- destino R2 existente em namespace separado `production/storage/...`;
- allowlist inicial: `finance-attachments`;
- bucket Files inesperado deve falhar fechado até ser classificado;
- snapshot completo diário inicialmente;
- prefixo imutável por run;
- formato `lojasaph-storage-backup-v1`;
- manifesto com bucket/key/tamanho/SHA-256, timestamps mínimos e UUIDs necessários à reconciliação;
- não incluir `original_filename` desnecessariamente no manifesto;
- hash do objeto de origem por stream;
- para `finance-attachments`, exigir igualdade com `checksum_sha256` e `size_bytes` do banco;
- upload R2 + verificação remota + re-download/re-hash antes de integridade positiva;
- nunca usar ETag sozinho como prova de conteúdo;
- cleanup mesmo em falha.

### 3. Guardrails

Criar configuração Storage própria e fail-closed para:

- máximo de objetos por run;
- máximo de bytes totais por run;
- limite individual incompatível;
- bucket não classificado;
- objeto sem metadata de negócio quando o bucket exigir vínculo.

**Não reutilizar automaticamente `300000000` bytes do archive PostgreSQL.**

Os caps de Production precisam ser explicitamente configurados/aprovados antes de armar a automação; CI usa valores sintéticos pequenos.

### 4. Fonte Supabase Storage

Preferência de desenho registrada na #121:

- endpoint S3 do Supabase Storage;
- credencial S3 dedicada ao workflow;
- server-only;
- separada de `SUPABASE_SECRET_KEY` da aplicação;
- nunca exposta em logs/Issues/PRs.

A credencial S3 bypassa RLS e possui acesso amplo ao Storage; limitar seu uso ao workflow e à allowlist de buckets. Não gerar/pedir secret no chat.

### 5. CI obrigatório

Sem Production/R2 secrets reais, provar no CI:

1. bucket privado sintético;
2. objeto pequeno com SHA conhecido;
3. inventário determinístico;
4. manifesto válido e versionado;
5. missing metadata detectado;
6. objeto extra detectado;
7. hash/tamanho divergente detectados;
8. bucket inesperado detectado;
9. upload off-site simulado/local quando possível sem reduzir a semântica do contrato;
10. restore em Storage isolado via API/S3;
11. re-hash pós-restore;
12. cleanup;
13. `automatic_storage` start/success/failure/idempotência usando o boundary autoritativo existente.

Não usar INSERT/UPDATE/DELETE em `storage.objects` para simular restore binário.

### 6. Gates antes de Production

Não definir `STORAGE_BACKUP_AUTOMATION_ENABLED=true` até confirmar:

- endpoint S3 da fonte habilitado;
- source credentials provisionadas em GitHub Secrets fora do chat;
- lifecycle + Bucket Lock 30d cobrindo `production/storage`;
- namespace correto;
- caps Storage próprios configurados;
- allowlist correta;
- PR/CI verdes.

### 7. Estado vazio de Production

Production possui zero objetos. Isso não bloqueia a implementação/CI.

Um run Production vazio pode provar inventário/automação, mas **não deve ser tratado como prova suficiente de recuperação de binários reais nem liberar a UI como Storage coberto**.

A primeira prova completa exige ao menos um anexo Production real criado pelo fluxo normal do produto. Não criar fixture sintética em Production para satisfazer esse gate.

Quando existir objeto real, uma prova controlada deve exigir:

- source hash = checksum de negócio;
- cópia R2 + re-download/re-hash;
- `automatic_storage=succeeded`;
- restore isolado do snapshot;
- `restore_drill coverage=storage=succeeded`;
- nenhuma mutação/restore em Production.

## Fora do escopo desta primeira PR

- declarar UI Storage saudável/coberto;
- criar arquivo sintético em Production;
- alterar fluxo funcional de anexos;
- implementar delete/lifecycle de anexos;
- exportação manual por Organization;
- trocar provider;
- alterar RPO/retenção;
- deploy Vercel;
- tornar repo private automaticamente.

## Critério de conclusão da próxima slice

A primeira PR da #121 termina quando o tooling/workflow/CI Storage estiverem tecnicamente prontos e fail-closed, com gates operacionais de Production explícitos e documentação consistente.

Se Production continuar vazia, deixar a prova binária real pendente sem falso sucesso de cobertura.
