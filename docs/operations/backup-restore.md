# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-27  
Status: **PostgreSQL Production comprovado end-to-end; Supabase Storage automático armado e aguardando prova binária com anexo Production legítimo**  
Requisito: `REQ-PLAT-005`  
Issues: #75 / #121  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter recuperação de Production automática, independente de ação humana, verificável e armazenada fora do Supabase Production, com estado sanitizado e auditável dentro do Sistema Lojasaph.

Camadas atuais:

1. backup automático PostgreSQL;
2. backup automático Supabase Storage/anexos;
3. persistência autoritativa + UI `Proteção dos dados`;
4. restore drills isolados;
5. futura exportação manual complementar, se mantida no escopo.

## Política operacional

- RPO: 24 horas;
- backup automático: diário;
- PostgreSQL workflow: cron `17 6 * * *` + `workflow_dispatch`;
- Storage workflow: cron `47 6 * * *` + `workflow_dispatch`;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- Production nunca é restore target de teste;
- atraso de backup não bloqueia automaticamente mutations do negócio;
- provider/custo externo exige autorização do operador.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- região `sa-east-1`;
- PostgreSQL `17.6.1.141` / engine 17;
- Session pooler 5432 para operações PostgreSQL de backup;
- migrations versionadas continuam fonte de verdade do schema.

Revalidação read-only em 2026-08-27:

- 1 Organization;
- 0 buckets Storage;
- 0 objetos Storage;
- 0 `finance_attachments`;
- 0 bytes declarados de anexos;
- 0 runs `automatic_storage` naquele momento.

O bucket `finance-attachments` é criado lazy pelo fluxo normal do produto. Não criar fixture sintética em Production apenas para provar backup.

# PostgreSQL

## Estado

**Comprovado end-to-end.**

Cloudflare R2:

- bucket privado `lojasaph-production-backups`;
- namespace PostgreSQL `production/postgres`;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- sem public access/CORS de navegador;
- credenciais somente em GitHub Actions Secrets;
- `BACKUP_AUTOMATION_ENABLED=true`.

## Backup real comprovado

Run `33006253661`, archive criado em `2026-08-26T19:40:47Z`:

- tamanho `53185` bytes;
- hard cap `300000000` bytes;
- checksums internos OK;
- manifesto OK;
- upload R2 OK;
- existência remota OK;
- re-download + SHA-256 OK;
- cleanup OK.

Esse run antecede a persistência autoritativa de `automatic_database` e não deve ser backfillado manualmente.

## Bundle

`scripts/export-supabase-backup.sh` produz fora do Git:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`;
- metadata segura.

Cada execução válida gera archive + checksum + manifesto + checksum do manifesto.

Não usar ETag como prova de conteúdo e não enviar dump real para GitHub Artifact.

## Restore drill PostgreSQL

Workflow:

`.github/workflows/backup-restore-drill.yml`

Run real verde: `33069706382`.

Evidência autoritativa:

- `protection_type=restore_drill`;
- `coverage=postgres`;
- `status=succeeded`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization mapeada.

O restore target é sempre isolado/loopback. `scripts/restore-production-backup.sh` exige `BACKUP_RESTORE_ISOLATED=true`, valida hashes, usa `ON_ERROR_STOP`, restaura roles/schema/data e revalida FKs.

Compatibilidades já resolvidas e que não devem ser reabertas sem regressão:

- roles Supabase gerenciadas — PR #117;
- schema Storage do target isolado / `storage-api:v1.70.7` — PR #119;
- ciclos/FKs do bundle Production real — prova verde `33069706382`.

# Supabase Storage / anexos

## Contrato funcional

Bucket canônico:

`finance-attachments`

Política:

- privado;
- lazy-created no primeiro upload autorizado;
- máximo por objeto: 10 MiB (`10485760`);
- MIME: PDF/XML/JPEG/PNG/WebP;
- key: `<organization_uuid>/<payable_document_uuid>/<attachment_uuid>`;
- `upsert=false`;
- SHA-256 calculado antes do upload e persistido em `public.finance_attachments.checksum_sha256`.

Binários nunca devem ser copiados/restaurados por DML em `storage.*`; usar Storage API/S3.

## Tooling integrado

Implementado na trilha #121:

- manifesto `lojasaph-storage-backup-v1`;
- reconciliação 1:1 metadata ↔ objeto;
- key canônica, tamanho e checksum de negócio;
- fail-closed para bucket inesperado, missing, extra, corrupt e limites;
- Supabase S3 → R2;
- namespace `production/storage/runs/<backup-id>`;
- verificação R2 por existência + re-download/re-hash;
- persistência `automatic_storage` / `coverage=storage`;
- restore isolado via Storage API/S3;
- CI com fixtures binárias sintéticas somente em ambiente isolado.

## Guardrails Production

Versionados no workflow:

- `STORAGE_BACKUP_ALLOW_BUCKETS=finance-attachments`;
- `STORAGE_BACKUP_MAX_OBJECTS=1000`;
- `STORAGE_BACKUP_MAX_TOTAL_BYTES=1073741824`;
- `STORAGE_BACKUP_MAX_OBJECT_BYTES=10485760`;
- `STORAGE_BACKUP_DEST_PREFIX=production/storage`.

Origem Production versionada:

- project ref `fhbvwyttikrbeaanatlr`;
- endpoint `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- region `sa-east-1`.

## Credencial Supabase S3

Em 2026-08-27 o operador confirmou, sem expor valores:

- S3 protocol Production habilitado;
- access key S3 dedicada server-only criada;
- `STORAGE_SOURCE_S3_ACCESS_KEY_ID` em GitHub Actions Secrets;
- `STORAGE_SOURCE_S3_SECRET_ACCESS_KEY` em GitHub Actions Secrets.

Nunca registrar os valores em docs, Issues, PRs, logs ou chat. Não reutilizar `SUPABASE_SECRET_KEY` da aplicação.

## Cloudflare R2 Storage

Em 2026-08-27 o operador confirmou diretamente no bucket privado `lojasaph-production-backups`:

- lifecycle 30 dias cobre `production/storage`;
- Bucket Lock/WORM 30 dias cobre `production/storage`;
- nenhum public access;
- nenhum CORS de navegador;
- `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true`.

Não reprovisionar bucket/provider/token por inércia.

## Armamento Storage

Em 2026-08-27 o operador confirmou:

`STORAGE_BACKUP_AUTOMATION_ENABLED=true`

Com os gates externos concluídos, a automação deve permanecer armada. O workflow continua fail-closed se faltar credencial/configuração obrigatória ou se endpoint/região/guardrails/retenção divergirem.

Não usar `workflow_dispatch` apenas para antecipar a agenda ou fabricar um `succeeded`.

## Runs vazios

É aceitável que a execução automática agendada processe inventário vazio enquanto nenhum anexo existir.

Um run vazio pode comprovar:

- workflow armado/executável;
- credenciais/configuração válidas;
- inventário vazio reconciliado corretamente;
- transporte/manifesto conforme o comportamento definido para zero objetos, se aplicável ao run.

Mas **não comprova recuperação binária real**. A UI não deve declarar Storage/anexos como restore comprovado apenas por snapshot vazio.

## Primeira prova binária real

Quando existir ao menos um anexo Production criado pelo fluxo normal:

1. revalidar metadata/inventário sem expor conteúdo;
2. exigir correspondência 1:1 metadata ↔ objeto;
3. calcular source SHA-256 e comparar com `finance_attachments.checksum_sha256`;
4. comparar tamanho;
5. enviar snapshot ao R2;
6. confirmar existência remota;
7. re-download/re-hash do R2;
8. exigir `automatic_storage=succeeded`, `coverage=storage`, integridade positiva;
9. restaurar o mesmo snapshot em Supabase Storage isolado via API/S3;
10. re-hashear objetos restaurados;
11. reconciliar missing/extra/corrupt;
12. persistir `restore_drill coverage=storage=succeeded`;
13. destruir target/material local;
14. nunca usar Production como restore target.

Somente depois dessa prova considerar Storage/anexos como recuperação comprovada na UI e fechar #121.

# Persistência autoritativa e UI

Migration base:

`20260826201252 / protection_run_persistence`

Tabelas:

- `public.protection_runs`;
- `public.protection_run_organizations`.

Tipos relevantes:

- `automatic_database`;
- `automatic_storage`;
- `manual_export`;
- `restore_drill`.

Estados:

- `running`;
- `succeeded`;
- `failed`.

Mutation autoritativa ocorre somente pelos boundaries privados existentes; clientes autenticados não recebem INSERT/UPDATE/DELETE direto em `protection_runs`.

A UI `/workspace/backup` é read-only e sujeita à RLS por Organization.

PostgreSQL pode ser exibido como comprovado. Storage só deve ganhar declaração equivalente após backup + restore real de anexo legítimo.

# Incidentes

`scripts/sync-backup-incident.py` mantém incidente GitHub-native persistente/idempotente:

- primeira falha abre Issue;
- falhas seguintes atualizam a mesma Issue;
- recuperação registra o run e fecha o incidente;
- nenhum secret/conteúdo de backup deve ser incluído.

# Recuperação em incidente real

## PostgreSQL

1. selecionar backup válido mais recente;
2. validar sidecars/manifesto/checksums;
3. provisionar destino novo/isolado compatível;
4. validar schema gerenciado e roles compatíveis;
5. restaurar roles/schema/data com `ON_ERROR_STOP`;
6. revalidar FKs/RLS/grants/triggers/índices/migrations;
7. executar smoke tests não destrutivos;
8. reconfigurar componentes externos necessários;
9. restaurar/reconciliar Storage separadamente;
10. decidir cutover somente após aceite.

## Storage

1. selecionar snapshot R2 coerente com o backup PostgreSQL escolhido;
2. validar manifesto/checksum;
3. provisionar Storage target isolado;
4. criar/configurar bucket privado pela API;
5. restaurar objetos pela API/S3;
6. validar bucket/key/tamanho/SHA;
7. reconciliar com metadata PostgreSQL correspondente;
8. resolver extras posteriores ao snapshot DB de forma explícita;
9. executar aceite;
10. somente então considerar cutover.

O fluxo funcional grava objeto antes da metadata PostgreSQL; portanto, em DR conjunto, preferir snapshot Storage igual ou posterior ao snapshot DB ou reconciliar extras posteriores conscientemente.

# Sequência restante da #75

Concluído:

- arquitetura ADR-009;
- transporte PostgreSQL S3-compatible;
- R2/lifecycle/lock PostgreSQL;
- hard cap PostgreSQL;
- backup PostgreSQL Production real;
- persistência autoritativa;
- UI `Proteção dos dados`;
- restore PostgreSQL Production real em target isolado;
- tooling Storage;
- guardrails Storage;
- Supabase S3 dedicado;
- R2 lifecycle/lock `production/storage`;
- armamento automático Storage.

Pendente:

1. observar primeira execução Storage agendada após armamento;
2. quando existir anexo legítimo, comprovar backup + restore binário end-to-end;
3. refletir cobertura Storage comprovada na UI;
4. exportação manual complementar, se mantida;
5. fechar #121 e #75 somente com evidência suficiente.

# Segurança / não fazer

- não pedir/receber secrets no chat;
- não armazenar backup/objeto real em Git/GitHub Artifact;
- não restaurar Production para teste;
- não criar anexo sintético em Production;
- não copiar/restaurar objetos por DML em `storage.*`;
- não declarar Storage comprovado por snapshot vazio;
- não reprovisionar R2/secrets sem regressão concreta;
- não backfillar `33006253661`;
- não voltar a Drive/rclone/Gmail;
- não tornar repositório private automaticamente;
- não fazer deploy Vercel para validar esta frente operacional sem necessidade concreta.
