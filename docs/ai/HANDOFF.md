# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua integrada.** A frente ativa segue sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Não refazer:

- ADR-009;
- Cloudflare R2/lifecycle/lock/secrets;
- backup PostgreSQL Production e hard cap 300 MB;
- persistência autoritativa/RLS;
- UI read-only `Proteção dos dados` do PR #115.

A slice ativa é **PR #116 / `agent/production-bundle-restore-drill`**, que substitui a prova sintética do restore mensal por restore do bundle Production real em Supabase local isolado.

## Baseline viva

- `main` de entrada: `ac050793b827a5cdec2a2261f03af25ea0091fbf` (#115);
- CI pós-merge #436 / run `33011958809`: verde;
- PR #116 aberto: `feat(backup): restore real Production bundle in drill`;
- primeiro head funcional totalmente verde: `229113e3b55a1faab8dd2561346ef0cb952d583e`;
- checks desse head: `database`, `validate`, `inventory-database`, `business-database` verdes;
- Issues #75 e #110 permanecem abertas até existir evidência real suficiente;
- repositório temporariamente `public`; não alterar automaticamente.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- PostgreSQL 17 / `sa-east-1`;
- platform Postgres `17.6.1.141`;
- migration `20260826201252 / protection_run_persistence`;
- `protection_runs = 0` na entrada desta slice.

Não backfillar `33006253661`.

## Por que #110 não era prova de bug de restore

O run antigo `33000481649` falhou antes de existir qualquer archive Production no R2. O primeiro backup real só apareceu depois, no run `33006253661` (`2026-08-26T19:40:47Z`, `53185` bytes).

Também foi identificado que o workflow anterior tinha um falso limite de evidência:

1. baixava/verificava o bundle real;
2. construía migrations + seed localmente;
3. gerava um novo dump sintético;
4. restaurava esse dump sintético.

Portanto um verde desse fluxo não provava `roles.sql`/`schema.sql`/`data.sql` do bundle Production.

## O que o PR #116 implementa

### Restore helper

`scripts/restore-production-backup.sh`:

- exige `BACKUP_RESTORE_ISOLATED=true`;
- recusa destino que não seja loopback (`127.0.0.1`, `localhost`, `::1`);
- valida `SHA256SUMS` e metadata do bundle;
- exige source `project_ref` esperado, `coverage=postgres` e formato suportado;
- aplica sequência Supabase: roles → schema → `session_replication_role=replica` → data;
- usa transação única + `ON_ERROR_STOP`;
- chama smoke test pós-restore.

### Smoke test real

`supabase/tests/production_bundle_restore.sql`:

- exige PostgreSQL 17+;
- exige relações críticas do Lojasaph;
- detecta restore vazio de dados operacionais centrais;
- confirma RLS/grants/função crítica;
- confirma as FKs autorreferentes conhecidas de `stock_movements` e `payments`;
- revalida **todos os dados de child tables públicas contra suas FKs**, porque o import usa replica-mode para atravessar os ciclos.

O teste é point-in-time/data-agnostic: não exige quantidade positiva em tabelas cujo zero pode ser um estado de negócio legítimo.

### Workflow real

`.github/workflows/backup-restore-drill.yml` agora:

1. abre `restore_drill` autoritativo;
2. baixa e verifica o latest bundle R2 real;
3. inicializa Supabase local temporário no runner com Postgres `17.6.1.141`;
4. restaura o bundle real nesse destino local;
5. executa smoke/FK validation;
6. remove a instância e material local;
7. persiste `succeeded` somente depois da prova; ou `failed` sanitizado;
8. mantém #110 idempotente e só a resolve após sucesso completo.

A connection string Production só entra nos steps de persistência autoritativa. Ela não é passada ao helper de restore.

### Persistência `restore_drill`

`scripts/record-protection-run.sh` foi generalizado por env mantendo `automatic_database` como default.

`supabase/tests/restore_drill_protection.sql` provou em CI:

- start/success/failure;
- idempotência;
- Organization coverage;
- leitura sob RLS;
- boundary privada negada ao `authenticated`.

## O que o CI já provou

Depois de dois ajustes exclusivamente no fixture/smoke sintético, o head funcional `229113e3...` ficou verde.

O job `database`:

- reproduziu os warnings reais de FK circular em `stock_movements` e `payments`;
- restaurou um bundle separado `roles/schema/data` pelo novo helper;
- revalidou FKs e smoke test;
- passou todas as suítes existentes;
- passou a nova suíte `restore_drill`.

`validate` passou lint, typecheck, unit tests e production build.

Nenhuma dessas tentativas tocou Production ou o archive real.

## Gate imediato

**Não declarar restore Production comprovado antes do workflow real pós-merge.**

O workflow recebeu `push` em `main` restrito aos arquivos dessa trilha. Portanto, quando o PR #116 for integrado, o merge deverá disparar uma única prova com o bundle R2 real.

Após o merge:

1. observar o `Backup Restore Drill` disparado pelo push;
2. se verde:
   - confirmar #110 fechada automaticamente;
   - consultar `protection_runs` em Production e confirmar um `restore_drill` real `succeeded`, `integrity_verified=true`, cobertura `postgres` e Organization mapping;
   - registrar o run/documentação;
   - avançar `NEXT_ACTION` para Supabase Storage/anexos;
3. se falhar:
   - ler o step/log concreto;
   - confirmar `restore_drill=failed` se a persistência tiver iniciado;
   - manter #110 aberta;
   - corrigir a causa sem repetir runs por tentativa cega.

## Depois do restore PostgreSQL verde

A próxima grande lacuna da #75 é **Supabase Storage/anexos**. O dump PostgreSQL não contém os binários usados pelos anexos financeiros.

Só depois de inventário + cópia off-site + checksums + recuperação isolada dos objetos será correto ampliar a cobertura declarada.

## Restrições

- nunca restaurar Production;
- não criar branch/projeto Supabase hospedado só para o drill;
- não pedir/registrar secrets no chat;
- não armazenar dump em Git/GitHub Artifact;
- não reprovisionar R2/secrets sem regressão;
- não refazer persistência/UI;
- não declarar Storage coberto;
- não manipular binários via `storage.*` SQL;
- não voltar a Drive/rclone/Gmail;
- não remover hard cap 300 MB;
- não retornar repo para private automaticamente;
- não fazer deploy Vercel para esta slice operacional.
