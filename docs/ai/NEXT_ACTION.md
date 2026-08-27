# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A Issue #121 cobre Supabase Storage. A primeira slice técnica foi **integrada no PR #126** e os checks pós-merge ficaram verdes.

Não refazer sem regressão:

- tooling de inventário/manifesto;
- guardrails fail-closed;
- transporte Supabase S3 → R2;
- workflow Production desarmado;
- persistência `automatic_storage` pelo boundary existente;
- restore isolado pela Storage API;
- CI end-to-end de Storage.

## Estado confirmado

`main`: `e071b6f2ede444b2fc97c29836be098fda8dc7f4`.

Checks pós-merge:

- CI `33082831368`: `database` + `validate` success;
- Storage Protection CI `33082831347`: `storage-contract` + `isolated-storage-binary-restore` success.

Production `fhbvwyttikrbeaanatlr` em 2026-08-27:

- `ACTIVE_HEALTHY`;
- 1 Organization;
- 0 buckets Storage;
- 0 objetos ativos;
- 0 rows em `public.finance_attachments`;
- 0 bytes declarados;
- 0 policies customizadas em `storage.objects`/`storage.buckets`;
- 0 runs `automatic_storage`.

O bucket `finance-attachments` é criado lazy pelo fluxo funcional. Não fabricar dados para provar backup.

## NEXT_ACTION imediata

**Executar os gates operacionais da Issue #121 sem armar Production até que todos estejam comprovados.**

### 1. Fonte Supabase Storage

Confirmar sem expor secrets:

- endpoint direto esperado: `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- S3 protocol habilitado para o projeto;
- credencial S3 dedicada ao workflow provisionada server-only em GitHub Secrets;
- não reutilizar `SUPABASE_SECRET_KEY` da aplicação como solução por conveniência.

### 2. Destino R2

No R2 privado já existente, confirmar operacionalmente:

- namespace `production/storage` protegido no mesmo bucket aprovado;
- lifecycle de 30 dias cobre esse namespace;
- Bucket Lock/WORM de 30 dias cobre esse namespace;
- nenhum public access/CORS de navegador foi introduzido;
- não reprovisionar provider/token se a configuração existente já satisfizer o contrato.

Somente depois registrar/usar `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true`.

### 3. Guardrails Production

Configurar explicitamente, com decisão Storage própria:

- `STORAGE_BACKUP_ALLOW_BUCKETS=finance-attachments`;
- `STORAGE_BACKUP_MAX_OBJECTS`;
- `STORAGE_BACKUP_MAX_TOTAL_BYTES`;
- `STORAGE_BACKUP_MAX_OBJECT_BYTES` compatível com o limite funcional de 10 MiB.

Não reutilizar automaticamente o hard cap PostgreSQL de 300 MB.

### 4. Armamento

`STORAGE_BACKUP_AUTOMATION_ENABLED` deve permanecer falso/ausente enquanto qualquer gate acima não estiver confirmado.

Não usar `workflow_dispatch` apenas para descobrir configuração faltante quando ela puder ser inspecionada diretamente; evitar runs inúteis.

### 5. Production vazia

Se Production continuar com zero objetos após os gates:

- não criar bucket/anexo sintético;
- não executar workflow apenas para fabricar `automatic_storage=succeeded`;
- não alterar a UI para declarar Storage coberto;
- manter a prova binária real pendente até surgir uso legítimo do produto.

### 6. Primeira prova completa quando existir anexo real

Quando surgir ao menos um anexo Production criado pelo fluxo normal:

1. revalidar metadata/inventário sem expor conteúdo em logs;
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

A próxima slice termina quando os gates de Production estiverem confirmados e documentados sem exposição de segredo. Se não houver objeto Production legítimo, a automação pode continuar desarmada e a prova binária real permanece corretamente pendente.

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
- deploy Vercel para esta trilha operacional.
