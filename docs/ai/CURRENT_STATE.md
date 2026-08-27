# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está agora comprovada end-to-end. Não refazer sem regressão concreta:

1. ADR-009 / arquitetura de proteção;
2. Cloudflare R2 privado + lifecycle/lock de 30 dias;
3. backup lógico PostgreSQL Production off-site;
4. hard cap de `300000000` bytes por archive;
5. primeira prova real off-site (`33006253661`);
6. persistência autoritativa `protection_runs` + Organizations + RLS;
7. UI read-only `Proteção dos dados`;
8. restore do **bundle PostgreSQL Production real** em Supabase/PostgreSQL 17 isolado;
9. persistência autoritativa de `restore_drill` e recuperação automática do incidente #110.

A próxima lacuna obrigatória é **Supabase Storage/anexos**. O dump PostgreSQL não contém os binários dos objetos Storage.

## GitHub / baseline viva

- `main`: `25f3cac1cff1dedee2baf0a4712f99a15d6653e7` — `fix(backup): align isolated Storage schema for restore (#119)`;
- PR #116 integrou o restore do bundle Production real;
- PR #117 integrou compatibilidade segura com roles gerenciadas Supabase;
- PR #119 integrou compatibilidade do schema Storage do destino isolado;
- PR #118 foi fechado como superseded, sem perda de código, apenas para obter CI novo sobre o head final;
- CI pós-merge `33069706327`: `database` + `validate` verdes;
- Restore Compatibility CI pós-merge `33069706452`: `restore-sql-compat` + `isolated-storage-schema` verdes;
- Backup Restore Drill real `33069706382`: **success**;
- Issue #110 foi fechada automaticamente pelo workflow em `2026-08-27T12:00:11Z`;
- Issue #75 permanece aberta porque Storage/anexos e demais itens finais ainda não possuem cobertura completa;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 / platform Postgres `17.6.1.141`;
- migration de proteção `20260826201252 / protection_run_persistence`;
- fonte autoritativa: `public.protection_runs` + `public.protection_run_organizations`.

O restore drill verde de `33069706382` está persistido como:

- `protection_type=restore_drill`;
- `status=succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- `provider=cloudflare_r2`;
- `destination=isolated_supabase_postgres_restore`;
- `error_summary=null`;
- 1 Organization relacionada ao run.

As duas tentativas reais anteriores permanecem preservadas como `failed`, sem sobrescrever histórico:

- `33014974208`: falhou ao tentar modificar a role gerenciada `supabase_admin`;
- `33018829402`: após corrigir roles, avançou até `data.sql` e revelou incompatibilidade do schema Storage local (`versioning_status`).

## Prova PostgreSQL end-to-end concluída

Run `33069706382` comprovou:

1. configuração/tooling válidos;
2. abertura do `restore_drill` autoritativo;
3. download do latest archive Production real do R2;
4. sidecars, manifesto e checksums internos válidos;
5. destino Supabase local temporário/loopback, nunca Production;
6. Postgres local compatível com Production;
7. Storage API isolada pinada em `v1.70.7`, com migration >= 64 e `storage.buckets.versioning_status` antes do import;
8. normalização fail-closed de operações sobre roles gerenciadas, sem desligar `ON_ERROR_STOP`;
9. restore `roles.sql` → `schema.sql` → replica-mode → `data.sql` em transação;
10. smoke tests de schema/dados/RLS/grants;
11. revalidação dos dados restaurados contra todas as FKs públicas, incluindo os ciclos conhecidos de `stock_movements` e `payments`;
12. cleanup do destino/material temporário;
13. finalização autoritativa `succeeded`;
14. auto-resolução da #110.

Production nunca foi alvo do restore.

## Backup PostgreSQL real de origem

Archive histórico usado pela prova:

- workflow `33006253661`;
- criado em `2026-08-26T19:40:47Z`;
- tamanho `53185` bytes;
- checksums/manifesto válidos;
- upload R2 + existência remota + re-download/rehash comprovados.

Esse backup antecede a persistência autoritativa de `automatic_database` e **não deve ser backfillado manualmente**.

## Cobertura atual

### Comprovado

- backup lógico PostgreSQL Production;
- transporte/integridade off-site;
- retenção/lock do provider;
- persistência autoritativa + RLS/Organizations;
- UI read-only;
- restore real isolado do bundle Production;
- restore drill mensal autoritativo e incidente auto-reconciliável.

### Ainda não comprovado/concluído

- backup dos objetos binários Supabase Storage/anexos;
- inventário/chaves/checksums desses objetos;
- restauração/reconciliação isolada dos binários;
- cobertura integral de configurações externas ao dump;
- exportação manual complementar por Organization, se mantida;
- fechamento final da Issue #75.

## Não fazer

- não restaurar Production para teste;
- não refazer R2, PostgreSQL backup, persistência, UI ou restore drill já comprovados;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets sem regressão concreta;
- não pedir/registrar secrets no chat/Issue/PR;
- não armazenar dump/archive real em Git/GitHub Artifact;
- não declarar Supabase Storage protegido pelo dump PostgreSQL;
- não manipular binários via SQL em `storage.*`;
- não remover `ON_ERROR_STOP`, smoke tests, FK revalidation ou loopback guard;
- não remover o hard cap de 300 MB;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para validar slices backend/operacionais sem necessidade concreta.
