# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices concluídas e que não devem ser refeitas:

1. ADR-009 / arquitetura;
2. transporte S3-compatible + Cloudflare R2/lifecycle/lock;
3. hard cap `300000000` bytes;
4. primeiro backup PostgreSQL Production real — run `33006253661`;
5. persistência autoritativa/RLS — PR #113;
6. UI read-only `Proteção dos dados` — PR #115.

A slice em andamento é o PR **#116** / branch `agent/production-bundle-restore-drill`.

## Estado da implementação do PR #116

Primeiro head funcional totalmente verde:

`229113e3b55a1faab8dd2561346ef0cb952d583e`

Esse head passou:

- `database`;
- `validate`;
- `inventory-database`;
- `business-database`;
- restore sintético pelo mesmo caminho separado `roles/schema/data`;
- validação das FKs após replica-mode;
- persistência `restore_drill` positiva/negativa/idempotente;
- RLS/grants existentes;
- lint/typecheck/unit tests/production build.

Commits documentais posteriores precisam manter o head final verde antes do merge.

## Gap que o PR resolve

O workflow mensal antigo verificava o bundle Production real, mas restaurava um dump sintético novo. Isso não provava restaurabilidade do archive off-site.

O PR #116 passa a:

1. baixar e verificar o bundle Production real;
2. iniciar Supabase local temporário no runner com Postgres compatível com Production (`17.6.1.141`);
3. restaurar `roles.sql` → `schema.sql` → replica-mode → `data.sql`;
4. validar objetos críticos, RLS/grants e dados contra todas as FKs públicas;
5. persistir `restore_drill` pela boundary privada existente;
6. destruir o destino local;
7. resolver #110 somente depois de sucesso completo.

O helper de restore recusa qualquer target que não seja loopback. Production nunca é target da prova.

## NEXT_ACTION imediata

**Concluir o gate do PR #116 e observar a primeira prova real pós-merge.**

### Antes do merge

1. confirmar que o head final do PR #116 não mudou inesperadamente;
2. exigir `database`, `validate`, `inventory-database` e `business-database` verdes nesse mesmo head;
3. confirmar PR mergeável e sem review/blocker pendente;
4. integrar por squash com proteção de `expected_head_sha`.

### Depois do merge

O `push` em `main` deve disparar o workflow `Backup Restore Drill` porque o trigger é restrito aos arquivos desta trilha.

A sessão **não termina** apenas porque o PR foi merged. É necessário acompanhar essa prova real.

#### Se o restore real ficar verde

Confirmar todas as evidências abaixo:

1. o workflow baixou e revalidou o archive Production real;
2. roles/schema/data do bundle foram restaurados em Supabase/PostgreSQL local isolado;
3. smoke tests e revalidação de FKs passaram;
4. Production não foi restaurado nem mutado;
5. `public.protection_runs` possui `restore_drill` real `succeeded` com:
   - cobertura `postgres`;
   - `integrity_verified=true`;
   - timestamp da cópia válida do archive;
   - tamanho coerente;
   - provider/destino lógico sanitizados;
6. relação com Organizations existe;
7. Issue #110 foi auto-resolvida pelo workflow;
8. CI pós-merge de `main` está verde.

Depois registrar essa evidência em `CURRENT_STATE`, `HANDOFF`, ADR-009, runbook e Issue #75.

A nova `NEXT_ACTION` então deve ser **inventariar e implementar a trilha de backup/restore off-site dos binários Supabase Storage/anexos**, sem declarar cobertura completa antes dessa prova.

#### Se o restore real falhar

1. ler o step/log exato;
2. não reexecutar cegamente;
3. confirmar se um `restore_drill=failed` autoritativo foi persistido;
4. manter #110 aberta;
5. corrigir a causa concreta em branch/PR apropriado;
6. nunca contornar a falha silenciando `ON_ERROR_STOP`, smoke tests ou FK validation.

## Estado real de entrada

### Supabase Production

- projeto `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- PostgreSQL 17 / `sa-east-1`;
- migration `20260826201252 / protection_run_persistence`;
- `protection_runs = 0` antes da prova real desta slice.

### Backup disponível

- run histórico `33006253661`;
- criado `2026-08-26T19:40:47Z`;
- archive `53185` bytes;
- checksums/manifesto/upload/re-download/rehash verificados.

Não backfillar esse run como `automatic_database` autoritativo.

### Issue #110

A falha antiga `33000481649` ocorreu antes de existir archive off-site. #110 só deve ser fechada por recuperação verde suficiente do novo fluxo real.

## Warnings conhecidos tratados pelo novo drill

O dump data-only reporta ciclos em:

- `stock_movements`;
- `payments`.

O restore usa `session_replication_role=replica` para atravessar ordem de COPY, mas depois **revalida as linhas restauradas contra todas as FKs públicas**. Não remover essa segunda prova.

## Fora do escopo

- restaurar/cutover Production;
- Supabase Storage/anexos nesta slice;
- exportação manual por Organization;
- alterar RPO/retention;
- reprovisionar R2;
- mexer em secrets por inércia;
- backfill histórico;
- deploy Vercel;
- retornar repo para private automaticamente.

## Critério de conclusão desta slice

A resposta precisa ser inequívoca para:

**o bundle PostgreSQL Production real consegue ser restaurado e validado em destino Supabase/PostgreSQL 17 isolado?**

- **sim:** prova verde real + `restore_drill` autoritativo + #110 resolvida + docs reconciliados;
- **não:** falha real concreta registrada + `restore_drill=failed` quando possível + #110 aberta + próximo patch definido sem falso sucesso.
