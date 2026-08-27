# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A Issue #121 cobre Supabase Storage. O tooling técnico foi integrado no PR #126 e os guardrails Production foram integrados no PR #128. Não existe nova slice técnica a iniciar por atividade artificial.

Não refazer sem regressão:

- tooling de inventário/manifesto;
- reconciliação metadata↔objeto e hashes;
- transporte Supabase S3 → R2;
- restore isolado pela Storage API;
- persistência `automatic_storage` pelo boundary existente;
- CI end-to-end de Storage;
- guardrails Production versionados.

## Estado confirmado

Referência funcional integrada: PR #128 / `27b0b3914a246fb370c9dd5f8ea06f64baa86044`.

Sempre consultar `main` real antes de trabalhar. SHA posterior exclusivamente documental não exige novo PR de sincronização.

Pós-merge #128:

- CI `33087254390`: `database` + `validate` success;
- Storage Protection CI `33087254427`: `storage-contract` + `isolated-storage-binary-restore` success.

Production `fhbvwyttikrbeaanatlr` em 2026-08-27:

- `ACTIVE_HEALTHY`;
- 1 Organization;
- 0 buckets Storage;
- 0 objetos ativos;
- 0 rows em `public.finance_attachments`;
- 0 bytes declarados;
- 0 runs `automatic_storage`.

O bucket `finance-attachments` é criado lazy pelo fluxo funcional. Não fabricar dados para provar backup.

## Guardrails já concluídos

A política inicial de Storage Production está versionada no workflow:

- `STORAGE_BACKUP_ALLOW_BUCKETS=finance-attachments`;
- `STORAGE_BACKUP_MAX_OBJECTS=1000`;
- `STORAGE_BACKUP_MAX_TOTAL_BYTES=1073741824` (1 GiB);
- `STORAGE_BACKUP_MAX_OBJECT_BYTES=10485760` (10 MiB).

O CI impede retorno a `vars.STORAGE_BACKUP_MAX_*` e impede reutilização do cap PostgreSQL `300000000`.

## NEXT_ACTION imediata

**Concluir somente os gates externos restantes da Issue #121; não armar Production por inferência.**

### 1. Fonte Supabase Storage

Confirmar sem expor secrets:

- endpoint direto: `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- S3 protocol habilitado para o projeto;
- credencial S3 dedicada ao workflow provisionada server-only em GitHub Secrets;
- não reutilizar `SUPABASE_SECRET_KEY` da aplicação.

Registrar apenas a existência/configuração sanitizada; nunca copiar access key/secret para Issue, PR, docs ou chat.

### 2. Destino R2

No R2 privado já existente, confirmar diretamente:

- lifecycle de 30 dias cobrindo o prefixo `production/storage`;
- Bucket Lock/WORM de 30 dias cobrindo o mesmo prefixo;
- nenhum public access/CORS de navegador introduzido;
- nenhuma necessidade de reprovisionar provider/token existente.

Somente após essa inspeção usar `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true`.

### 3. Armamento

`STORAGE_BACKUP_AUTOMATION_ENABLED` deve permanecer falso/ausente enquanto qualquer gate acima não estiver confirmado.

Não usar `workflow_dispatch` apenas para descobrir configuração faltante que pode ser inspecionada diretamente. Evitar runs inúteis.

### 4. Production vazia

Se Production continuar com zero objetos após os gates:

- não criar bucket/anexo sintético;
- não executar workflow apenas para fabricar `automatic_storage=succeeded`;
- não alterar a UI para declarar Storage coberto;
- manter a prova binária real pendente até surgir uso legítimo do produto.

### 5. Primeira prova completa quando existir anexo real

Quando surgir ao menos um anexo Production criado pelo fluxo normal:

1. revalidar metadata/inventário sem expor conteúdo;
2. executar uma única prova controlada do workflow Production Storage;
3. exigir source SHA-256 = `finance_attachments.checksum_sha256` e tamanho compatível;
4. exigir upload R2 + existência remota + re-download/re-hash;
5. exigir `automatic_storage=succeeded` / `coverage=storage` com integridade positiva;
6. restaurar o mesmo snapshot em Supabase Storage isolado via API/S3;
7. reconciliar missing/extra/corrupt e re-hashear objetos restaurados;
8. persistir `restore_drill coverage=storage=succeeded` somente após essa prova;
9. nunca usar Production como restore target;
10. só então considerar atualização da UI para cobertura Storage comprovada.

## Critério de conclusão

A slice operacional termina quando a credencial S3 dedicada e os controles R2 específicos de `production/storage` estiverem confirmados e documentados sem exposição de segredo. Se não houver objeto Production legítimo, a automação pode continuar desarmada e a prova binária real permanece corretamente pendente.

Se nenhum gate externo estiver desbloqueado e não houver regressão/nova prioridade, **preservar a baseline; não criar nova feature/Issue/PR apenas para produzir atividade**.

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
- novo PR só para atualizar SHA documental.
