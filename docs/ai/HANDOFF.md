# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua integrada.** A frente ativa segue sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A trilha PostgreSQL foi concluída até restore real isolado. Não refazer:

- ADR-009;
- Cloudflare R2/lifecycle/lock/secrets;
- backup PostgreSQL Production + hard cap 300 MB;
- persistência autoritativa/RLS;
- UI read-only `Proteção dos dados`;
- restore do bundle PostgreSQL Production real;
- compatibilidade de roles gerenciadas no restore;
- pin/preflight do schema Storage necessário ao destino isolado;
- persistência de `restore_drill` e reconciliação da #110.

A próxima slice é **Supabase Storage/anexos**.

## Baseline viva

- `main`: `25f3cac1cff1dedee2baf0a4712f99a15d6653e7` (#119);
- CI pós-merge `33069706327`: verde (`database`, `validate`);
- Restore Compatibility CI `33069706452`: verde (`restore-sql-compat`, `isolated-storage-schema`);
- Backup Restore Drill `33069706382`: **success**;
- Issue #110: **closed automaticamente** pelo workflow;
- Issue #75: aberta;
- repositório temporariamente `public`; não alterar automaticamente.

## Prova real de restore concluída

O run `33069706382` restaurou o archive Production real criado em `2026-08-26T19:40:47Z` (`53185` bytes) em Supabase/PostgreSQL 17 local isolado.

A prova passou:

1. download R2;
2. checksums/manifesto;
3. preflight do target;
4. roles gerenciadas normalizadas de forma fail-closed;
5. `roles.sql`;
6. `schema.sql`;
7. replica-mode + `data.sql`;
8. smoke tests;
9. RLS/grants;
10. revalidação de todas as FKs públicas;
11. cleanup;
12. persistência autoritativa de sucesso;
13. resolução automática da #110.

Production nunca foi target.

## Histórico útil das duas falhas anteriores

Não repetir esses diagnósticos:

- `33014974208`: `roles.sql` tentou modificar `supabase_admin`, role reservada do Supabase local;
- PR #117 introduziu preparação segura do SQL de roles gerenciadas;
- `33018829402`: roles/schema passaram, mas `data.sql` exigia `storage.buckets.versioning_status` ausente no Storage local antigo;
- Production estava em `storage.migrations=64`;
- PR #119 pinou `storage-api:v1.70.7` e adicionou preflight de migration >=64 + `versioning_status`;
- o gate `isolated-storage-schema` provou esse target sem usar secrets de Production/R2 antes do merge.

## Supabase Production / evidência autoritativa

Projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17 / `sa-east-1`.

Latest `restore_drill` real:

- `status=succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- provider/destination lógicos sanitizados;
- `error_summary=null`;
- 1 Organization mapeada.

As duas tentativas anteriores permanecem como `failed`; preservar histórico.

O backup histórico `33006253661` antecede a persistência de `automatic_database`; não backfillar.

## Próxima ação

**Inventariar a cobertura real de Supabase Storage/anexos e desenhar a primeira slice de backup off-site + restore/reconciliação isolada dos binários.**

A investigação deve começar pelo estado real do código e do projeto Supabase:

1. identificar buckets usados e finalidade;
2. localizar todos os caminhos de upload/download e metadata relacionada no banco;
3. distinguir bucket privado/público e regras/RLS relevantes;
4. confirmar volume/quantidade atual sem expor conteúdo;
5. definir inventário versionado de objetos com bucket/key/tamanho/checksum ou fingerprint apropriado;
6. definir transporte off-site reaproveitando o contrato/provider existente quando seguro;
7. definir restore em destino isolado usando APIs de Storage, não DML em `storage.objects`;
8. definir reconciliação metadata↔objeto e teste de ausência/corrupção;
9. definir como `automatic_storage` alimentará `protection_runs` e a UI sem declarar sucesso antes da prova real;
10. só então implementar em Issue/branch/PR apropriados.

Não contratar serviço/add-on novo nem alterar R2/secrets por inércia.

## Cobertura que continua faltando

- binários Supabase Storage/anexos;
- recuperação/reconciliação desses binários;
- configurações externas ao dump que precisem de DR próprio;
- exportação manual complementar por Organization, se mantida;
- fechamento final da #75.

## Restrições

- nunca restaurar Production para teste;
- não manipular objetos binários via SQL em `storage.*`;
- não armazenar backup real em Git/GitHub Artifact;
- não pedir/registrar secrets no chat;
- não reprovisionar R2/secrets sem evidência concreta;
- não remover guards do restore PostgreSQL já comprovado;
- não voltar a Drive/rclone/Gmail;
- não remover hard cap 300 MB sem nova decisão;
- não tornar repo private automaticamente;
- não fazer deploy Vercel para slice operacional sem necessidade concreta.
