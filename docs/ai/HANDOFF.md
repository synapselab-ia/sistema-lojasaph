# Handoff — Sistema Lojasaph

## Estado

A Fase 30 — auditoria/correção de `REQ-PLAT-004 — Migrações de banco` — identificou e corrigiu um drift real de versions entre GitHub e o histórico do Supabase hospedado.

Integração da fase:

- Issue #73 — alinhamento de versions locais ao histórico Supabase;
- PR #74 — `fix(db): reconcile migration lineage with Supabase`;
- head funcional/documental validado: `ef911001be843f6a191db7918c5fafd347a06120` antes deste commit final de handoff;
- CI #307 — success;
- Business Transactions Integration #154 — success;
- Inventory Count Integration #170 — success;
- nenhum DDL/DML remoto;
- nenhum `migration repair` ou `db push`;
- nenhuma alteração de RLS/grants/Auth;
- nenhum deployment Vercel.

## Fase 30 — causa e correção

No início existiam 28 arquivos locais em `supabase/migrations`, sendo 27 efetivos + 1 placeholder vazio. O projeto hospedado tinha 27 linhas em `supabase_migrations.schema_migrations`.

Os 27 nomes semânticos correspondiam 1:1, mas os timestamps/versions locais divergiam do histórico remoto. A documentação atual do Supabase confirma que `migration list` compara as versions/timestamps e que `db push` usa esse histórico para decidir o que já foi aplicado. Portanto o estado anterior ameaçava o fluxo futuro de upgrade mesmo com schema funcional.

A correção:

- renomeou as 27 migrations efetivas para as versions remotas canônicas;
- preservou exatamente os blobs SQL — o compare do GitHub mostra os 27 como rename com zero alteração de conteúdo;
- removeu o placeholder vazio `20260817231638_persistent_inventory_count.sql`;
- não alterou `supabase_migrations.schema_migrations` nem reaplicou SQL no remoto;
- documentou a matriz em `docs/qa/database-migrations.md`;
- atualizou `docs/architecture/persistence.md` com a política de identidade de migrations.

A única inversão de ordem relevante era `reconcile_inventory_adjustment_type` antes/depois de `purchases_operational_flow`. Foi verificado que a migration de compras não depende do tipo `inventory_adjustment`; os gates reconstruíram a nova ordem com sucesso.

## Evidência de CI

`CI #307`:

- job `database` — success;
- aplicação completa das migrations reconciliadas — success;
- seed anonimizado — success;
- backup lógico e restore isolado — success;
- smoke/schema/RLS/hardening/estoque/importação — success;
- job `validate` — lint, typecheck, Vitest e production build — success.

`Business Transactions Integration #154` — success.

`Inventory Count Integration #170` — success.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Apenas queries read-only foram usadas. Elas confirmaram:

- 27 migrations no histórico hospedado;
- correspondência nominal com as 27 migrations efetivas locais;
- nenhum relation/function/trigger atual em `public`/`private` sem referência nominal no texto das migrations registradas.

Não houve mutação remota.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW`, `requirements.md`, `docs/qa/database-migrations.md` e `docs/operations/backup-restore.md`.
2. Conferir `main`, Issues, PRs, branches e CI reais antes de editar.
3. Não repetir REQ-PLAT-004 nem renumerar migrations históricas.
4. Auditar `REQ-PLAT-005 — Backup e restauração` usando como baseline a Fase 16 já implementada.
5. Confirmar a documentação oficial atual do Supabase para backups/plano vigente antes de concluir.
6. Verificar se existe hoje rotina automática real de backup/off-site ou somente helper/runbook pronto para agendamento.
7. Reaproveitar `scripts/export-supabase-backup.sh`, `scripts/verify-backup-restore.sh`, `supabase/tests/backup_restore.sql` e o gate de restore do CI.
8. Separar claramente RPO, RTO, retenção, destino off-site e monitoramento; não inventar valores ainda não definidos.
9. Se a prova técnica estiver correta mas faltar automação exigida por `REQ-PLAT-005`, registrar a lacuna concreta em uma única Issue antes de implementar.
10. Não fazer restore destrutivo no projeto hospedado ativo.
11. Não fazer deploy Vercel para auditoria.
12. Atualizar continuidade ao final.

## Não fazer

- não editar `supabase_migrations.schema_migrations` diretamente;
- não usar `migration repair` sem drift comprovado e plano explícito;
- não reabrir #69/#71 nem REQ-PLAT-003;
- não repetir a correção de filenames da Fase 30;
- não restaurar Production para testar;
- não versionar dump, database URL ou secrets;
- não reativar bootstrap/auto-deploy;
- não inferir Q-001..Q-025.
