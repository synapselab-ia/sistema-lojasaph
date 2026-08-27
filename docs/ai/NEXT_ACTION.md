# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A Issue #121 cobre Supabase Storage. O tooling técnico foi integrado no PR #126 e os guardrails Production foram integrados no PR #128. Não existe nova feature técnica a iniciar por atividade artificial.

Não refazer sem regressão:

- tooling de inventário/manifesto;
- reconciliação metadata↔objeto e hashes;
- transporte Supabase S3 → R2;
- restore isolado pela Storage API;
- persistência `automatic_storage` pelo boundary existente;
- CI end-to-end de Storage;
- guardrails Production versionados.

## Estado confirmado

`main` no início desta execução: `c64253571e896c26c787fe5c42c4a88b9597d760` (#129).

Sempre consultar `main` real antes de trabalhar. SHA posterior exclusivamente documental não exige novo PR de sincronização.

CI da baseline:

- pós-merge #128: CI `33087254390` success + Storage Protection CI `33087254427` success;
- pós-merge #129: CI `33087974482` com `database` + `validate` success.

Production `fhbvwyttikrbeaanatlr` revalidada em 2026-08-27:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
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

## Fonte S3 não secreta — concluída nesta mudança

Não tratar endpoint/região como configuração privada. O workflow versiona e valida:

- `STORAGE_SOURCE_PROJECT_REF=fhbvwyttikrbeaanatlr`;
- `STORAGE_SOURCE_S3_ENDPOINT=https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- `STORAGE_SOURCE_S3_REGION=sa-east-1`.

A região foi confirmada diretamente no projeto Supabase. A documentação atual recomenda o hostname direto `*.storage.supabase.co` para S3.

## NEXT_ACTION imediata

**Concluir somente os gates privados externos restantes da Issue #121; não armar Production por inferência.**

### 1. Fonte Supabase Storage — gate privado

Confirmar sem expor secrets:

- S3 protocol efetivamente habilitado no projeto;
- uma credencial S3 dedicada ao workflow gerada server-only;
- GitHub Actions Secrets `STORAGE_SOURCE_S3_ACCESS_KEY_ID` e `STORAGE_SOURCE_S3_SECRET_ACCESS_KEY` provisionados;
- não reutilizar `SUPABASE_SECRET_KEY` da aplicação.

As access keys S3 do Supabase têm acesso amplo aos buckets e bypassam RLS; nunca copiar access key/secret para Issue, PR, docs ou chat.

O conector Supabase atual não expõe o toggle S3 nem a lista de access keys geradas, e o conector GitHub não expõe Actions Secrets. A confirmação precisa ocorrer no dashboard/configuração privada ou por integração futura que exponha apenas existência/configuração sanitizada.

### 2. Destino R2 — gate privado

No R2 privado já existente, confirmar diretamente:

- lifecycle de 30 dias cobrindo o prefixo `production/storage`;
- Bucket Lock/WORM de 30 dias cobrindo o mesmo prefixo;
- nenhum public access/CORS de navegador introduzido;
- nenhuma necessidade de reprovisionar provider/token existente.

A evidência histórica da trilha PostgreSQL comprova lifecycle/lock no bucket existente, mas não registra o escopo da regra com precisão suficiente para concluir cobertura de `production/storage` por inferência.

Não há conector Cloudflare/R2 disponível nesta sessão. Somente após inspeção direta usar `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true`.

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

A slice operacional termina quando o S3 protocol + credencial dedicada e os controles R2 específicos de `production/storage` estiverem confirmados e documentados sem exposição de segredo. Se não houver objeto Production legítimo, a automação pode continuar desarmada e a prova binária real permanece corretamente pendente.

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
