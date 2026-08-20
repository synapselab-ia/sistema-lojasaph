# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 30 corrigiu a divergência operacional encontrada na auditoria de `REQ-PLAT-004 — Migrações de banco`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #73 — Fase 30 / alinhamento de versions de migrations
- PR #74 — integração da Fase 30
- head validado do PR: `ef911001be843f6a191db7918c5fafd347a06120`
- CI #307 — success
- Business Transactions Integration #154 — success
- Inventory Count Integration #170 — success
- nenhuma alteração do conteúdo SQL histórico das 27 migrations efetivas
- nenhum DDL/DML remoto, `migration repair`, `db push`, RLS/grant/Auth change ou deploy Vercel

## REQ-PLAT-004 — resolvido pela Fase 30

A auditoria encontrou 28 arquivos locais em `supabase/migrations`: 27 migrations efetivas e um placeholder vazio. O Supabase hospedado possuía 27 registros em `supabase_migrations.schema_migrations` com os mesmos nomes semânticos, mas versions/timestamps diferentes dos filenames locais.

Isso era risco real de upgrade porque o Supabase CLI identifica migrations pela version/timestamp ao comparar o diretório local com o histórico remoto.

Correção aplicada:

- as 27 migrations efetivas foram renomeadas para as 27 versions já registradas no Supabase hospedado;
- GitHub reconhece os 27 arquivos como `renamed` com `0 additions / 0 deletions`, preservando seus blobs SQL;
- o placeholder vazio `20260817231638_persistent_inventory_count.sql` foi removido;
- nenhuma linha de `supabase_migrations.schema_migrations` foi alterada;
- a matriz canônica está em `docs/qa/database-migrations.md`;
- `docs/architecture/persistence.md` agora trata a version do filename como identidade operacional imutável após aplicação remota.

A única inversão de ordem entre o histórico remoto e a antiga ordem local era `reconcile_inventory_adjustment_type` / `purchases_operational_flow`. O repair altera apenas o `CHECK` de `stock_movements.movement_type` e a migration de compras não depende de `inventory_adjustment`; a nova ordem canônica foi reconstruída do zero com sucesso pelos workflows.

## Evidência de reprodutibilidade

CI #307, em PostgreSQL 17 limpo:

- aplicou bootstrap de Auth;
- aplicou todas as migrations na ordem reconciliada;
- aplicou seed anonimizado;
- verificou backup lógico + restore isolado;
- executou smoke de schema/RLS, hardening, permissões e suites de estoque/importação;
- lint, typecheck, Vitest e production build passaram.

Business Transactions Integration #154 e Inventory Count Integration #170 também reconstruíram o banco do zero e concluíram suas suites com sucesso.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

A Fase 30 usou apenas introspecção read-only para:

- listar as 27 migrations hospedadas;
- comparar version/nome/ordem;
- confirmar que relations/functions/triggers atuais em `public`/`private` possuem referência nominal no histórico de migrations.

Nenhum schema, dado, função, policy, grant, Auth, configuração ou migration history foi modificado remotamente.

## Vercel Production

`git.deploymentEnabled=false` continua preservado. Nenhum deployment foi criado na Fase 30.

## Próxima ação

Auditar `REQ-PLAT-005 — Backup e restauração` sem refazer a Fase 16.

Já existem `docs/operations/backup-restore.md`, `scripts/export-supabase-backup.sh`, `scripts/verify-backup-restore.sh`, `supabase/tests/backup_restore.sql` e prova automatizada no CI. A próxima sessão deve verificar o estado atual do provedor e distinguir claramente:

- prova técnica de dump/restore;
- existência real de rotina automática/off-site;
- pendências de RPO/RTO/retention;
- limitações atuais do plano Supabase.

Só abrir nova Issue se existir lacuna concreta entre `REQ-PLAT-005` e a operação disponível hoje.

## Não repetir

- não reabrir REQ-PLAT-003 ou a auditoria de idempotência;
- não renumerar novamente migrations históricas;
- não editar `supabase_migrations.schema_migrations` diretamente;
- não executar `migration repair` apenas para eliminar diferença visual;
- não reativar bootstrap ou auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
