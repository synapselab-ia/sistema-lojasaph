# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A Issue #121 cobre Supabase Storage. A primeira slice técnica foi implementada no PR #126:

- tooling de inventário/manifesto;
- guardrails fail-closed;
- transporte Supabase S3 → R2;
- workflow Production inicialmente desarmado;
- persistência `automatic_storage` reutilizando o boundary existente;
- restore isolado pela Storage API;
- CI end-to-end com fixtures sintéticas pequenas.

Não refazer essa implementação salvo regressão concreta.

## Estado confirmado

Production `fhbvwyttikrbeaanatlr` em 2026-08-27 continua com:

- 1 Organization;
- 0 buckets Storage;
- 0 objetos ativos;
- 0 rows em `public.finance_attachments`;
- 0 bytes declarados;
- 0 policies customizadas em `storage.objects`/`storage.buckets`;
- 0 runs `automatic_storage`.

A ausência de objetos é legítima. O bucket `finance-attachments` é criado lazy pelo fluxo funcional.

No PR #126, o head técnico `01681b6b47bbf7a5304fa4bb8ef0787043b7ea9b` passou:

- CI `33081199162` — success;
- Storage Protection CI `33081198933` — success;
- `storage-contract` — success;
- `isolated-storage-binary-restore` — success.

## NEXT_ACTION imediata

**Concluir/mergear o PR #126 com CI final verde e, em seguida, executar somente os gates operacionais necessários para armar Production.**

### 1. Merge da slice técnica

Antes do merge:

- conferir o head final do PR #126;
- confirmar que não há arquivo temporário/lixo no diff;
- exigir CI geral verde;
- a prova Storage específica do código deve permanecer verde no último head que altera tooling/workflows;
- fazer squash merge com `expected_head_sha` para evitar corrida;
- validar CI pós-merge em `main`.

Não disparar workflow Production Storage por inércia.

### 2. Gates operacionais antes de `STORAGE_BACKUP_AUTOMATION_ENABLED=true`

Confirmar explicitamente, sem expor secrets:

1. endpoint S3 da fonte Production é o endpoint direto do projeto;
2. credencial S3 dedicada ao Supabase Storage está provisionada server-only em GitHub Secrets fora do chat;
3. lifecycle + Bucket Lock de 30 dias do R2 existente abrangem `production/storage`;
4. namespace permanece `production/storage/runs/<backup-id>`;
5. allowlist Production é exatamente `finance-attachments` nesta primeira fase;
6. caps Storage Production de objetos/bytes total/bytes por objeto estão configurados explicitamente;
7. `STORAGE_BACKUP_AUTOMATION_ENABLED` permanece falso até todos os itens acima passarem.

Não reprovisionar provider ou secrets por inércia.

### 3. Estado vazio não é prova binária

Se Production continuar em zero objetos após os gates:

- não criar bucket ou anexo sintético;
- não executar workflow só para fabricar `automatic_storage=succeeded`;
- não alterar a UI para declarar Storage coberto;
- registrar apenas que o tooling está pronto e o gate de prova real aguarda uso legítimo do produto.

### 4. Primeira prova completa quando existir anexo real

Quando surgir ao menos um anexo Production criado pelo fluxo normal:

1. revalidar metadata e inventário sem expor conteúdo em logs;
2. executar uma única prova controlada do workflow Production Storage;
3. exigir source SHA-256 = `finance_attachments.checksum_sha256` e tamanho compatível;
4. exigir upload R2 + existência remota + re-download/re-hash;
5. exigir `automatic_storage=succeeded` / `coverage=storage` com integridade positiva;
6. restaurar o mesmo snapshot em Supabase Storage isolado via API/S3;
7. reconciliar missing/extra/corrupt e re-hashear objetos restaurados;
8. persistir `restore_drill coverage=storage=succeeded` somente após essa prova;
9. nunca usar Production como restore target;
10. só então considerar atualização da UI para cobertura Storage comprovada.

## Critério de conclusão desta próxima slice

A slice operacional termina quando os gates de Production estiverem documentados e confirmados sem exposição de segredo. Se não houver objeto Production legítimo, a automação pode continuar desarmada e a prova binária real permanece corretamente pendente.

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
