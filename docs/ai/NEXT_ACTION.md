# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A Issue #121 cobre Supabase Storage. Tooling técnico, restore isolado, persistência, guardrails Production e baseline S3 já estão integrados. Os gates privados externos foram concluídos pelo operador em 2026-08-27.

Não refazer sem regressão:

- tooling de inventário/manifesto;
- reconciliação metadata↔objeto e hashes;
- transporte Supabase S3 → R2;
- restore isolado pela Storage API/S3;
- persistência `automatic_storage`;
- CI end-to-end de Storage;
- guardrails Production;
- configuração S3 dedicada e controles R2 já confirmados.

## Estado confirmado

`main` antes desta atualização operacional: `96ffbf6553dfd7cb3889531387995f35035a8d15` (#130).

CI pós-merge #130:

- CI `33089679869`: `database` + `validate` success;
- Storage Protection CI `33089679857`: `storage-contract` + `isolated-storage-binary-restore` success.

Production `fhbvwyttikrbeaanatlr` revalidada em 2026-08-27:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- 1 Organization;
- 0 buckets Storage;
- 0 objetos ativos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 runs `automatic_storage`.

O bucket `finance-attachments` é criado lazy pelo fluxo funcional. Não fabricar dados para provar backup.

## Configuração Production concluída

### Fonte Supabase Storage

Versionado no workflow:

- `STORAGE_SOURCE_PROJECT_REF=fhbvwyttikrbeaanatlr`;
- `STORAGE_SOURCE_S3_ENDPOINT=https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- `STORAGE_SOURCE_S3_REGION=sa-east-1`.

Confirmado pelo operador, sem expor valores:

- S3 protocol habilitado;
- credencial S3 dedicada server-only criada;
- `STORAGE_SOURCE_S3_ACCESS_KEY_ID` provisionado em GitHub Actions Secrets;
- `STORAGE_SOURCE_S3_SECRET_ACCESS_KEY` provisionado em GitHub Actions Secrets.

### Destino Cloudflare R2

Confirmado diretamente pelo operador no bucket `lojasaph-production-backups`:

- lifecycle 30 dias cobre `production/storage`;
- Bucket Lock/WORM 30 dias cobre `production/storage`;
- nenhum public access;
- nenhum CORS de navegador;
- `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true`.

### Armamento

O operador confirmou:

- `STORAGE_BACKUP_AUTOMATION_ENABLED=true`.

Com todos os gates externos concluídos, a automação deve permanecer armada. Não desarmar por inércia.

## NEXT_ACTION imediata

**Deixar a automação executar pela agenda normal e validar a primeira execução agendada após o armamento, sem `workflow_dispatch` desnecessário.**

### 1. Primeira execução agendada

Após o próximo run normal do workflow `Production Storage Backup`:

1. conferir status/conclusão do workflow;
2. conferir que o gate fail-closed não acusou configuração ausente;
3. conferir a persistência autoritativa `automatic_storage`;
4. registrar somente evidência sanitizada em #121;
5. não expor endpoint com credencial, access key, secret ou conteúdo de objeto.

### 2. Se Production continuar vazia

É aceitável que um run agendado processe inventário vazio, porque isso é execução normal da automação armada, não um dispatch artificial.

Nesse caso:

- aceitar o run apenas como prova operacional do pipeline sobre estado vazio;
- não criar bucket/anexo sintético;
- não declarar recuperação binária real comprovada;
- não atualizar a UI para dizer que anexos têm restore comprovado;
- manter a automação armada para runs diários seguintes.

### 3. Primeira prova binária quando existir anexo real

Quando surgir ao menos um anexo Production pelo fluxo normal:

1. revalidar metadata/inventário sem expor conteúdo;
2. validar o primeiro run automático que inclua esse objeto, ou executar uma única prova controlada somente se necessário operacionalmente;
3. exigir source SHA-256 = `finance_attachments.checksum_sha256` e tamanho compatível;
4. exigir R2 upload + existência remota + re-download/re-hash;
5. exigir `automatic_storage=succeeded` / `coverage=storage` com integridade positiva;
6. restaurar o mesmo snapshot em Supabase Storage isolado via API/S3;
7. reconciliar missing/extra/corrupt e hashes;
8. persistir `restore_drill coverage=storage=succeeded` somente após essa prova;
9. nunca usar Production como restore target;
10. somente então considerar UI de Storage como recuperação comprovada e fechamento da #121.

## Critério de conclusão da #121

Os gates de infraestrutura já estão concluídos. A Issue #121 só deve ser fechada depois da prova binária real sobre pelo menos um anexo Production legítimo:

- backup automático íntegro off-site;
- restore isolado do mesmo snapshot;
- reconciliação/hash verde;
- evidência autoritativa `automatic_storage` + `restore_drill coverage=storage`.

Enquanto Production estiver vazia, manter a Issue aberta é correto.

## Fora de escopo

- refazer PostgreSQL;
- backfillar run histórico;
- criar fixture em Production;
- manipular `storage.objects` por DML para restore;
- trocar provider;
- mudar RPO/retenção;
- implementar delete funcional de anexos;
- exportação manual por Organization;
- tornar repo private automaticamente;
- deploy Vercel para esta trilha operacional;
- novo PR apenas para atualizar SHA documental.
