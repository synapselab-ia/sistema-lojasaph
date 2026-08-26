# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

Não reabrir sem regressão concreta as slices já concluídas:

1. ADR-009 / arquitetura de proteção;
2. backup lógico PostgreSQL Production off-site em Cloudflare R2;
3. hard cap de `300000000` bytes por archive;
4. primeira prova real de backup off-site;
5. persistência autoritativa `protection_runs` + Organizations + RLS;
6. UI read-only `Proteção dos dados`, integrada pelo PR #115.

A frente atual é **restore end-to-end do bundle PostgreSQL Production real em destino isolado**.

## GitHub / baseline

- `main` de entrada: `ac050793b827a5cdec2a2261f03af25ea0091fbf` — `feat(protection): add read-only data protection UI (#115)`;
- CI pós-merge #436 / run `33011958809`: verde;
- branch ativa: `agent/production-bundle-restore-drill`;
- PR ativo: #116 — `feat(backup): restore real Production bundle in drill`;
- primeiro head funcional totalmente verde do PR #116: `229113e3b55a1faab8dd2561346ef0cb952d583e`;
- esse head passou `database`, `validate`, `inventory-database` e `business-database`;
- `database` passou o caminho separado `roles.sql`/`schema.sql`/`data.sql`, smoke tests e a nova suíte de persistência `restore_drill`;
- Issues relevantes abertas antes da prova real: #75 e #110;
- o repositório continua temporariamente `public` por decisão operacional; não voltar para `private` automaticamente.

Commits documentais posteriores ao head funcional precisam manter CI verde antes do merge.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17, platform Postgres `17.6.1.141`;
- migration final de proteção: `20260826201252 / protection_run_persistence`;
- `public.protection_runs = 0` na revalidação de entrada desta slice.

Zero rows continua legítimo até um workflow integrado registrar evidência real. Não backfillar manualmente o backup histórico `33006253661`.

## Backup PostgreSQL real já comprovado

- workflow run `33006253661`;
- archive criado em `2026-08-26T19:40:47Z`;
- tamanho `53185` bytes;
- checksums/manifesto válidos;
- upload R2, existência remota e re-download/rehash concluídos;
- cleanup do runner concluído.

Esse run antecede a persistência autoritativa e permanece apenas evidência histórica.

## Issue #110 e causa histórica

Issue #110: `[backup-alert] Monthly restore drill failing`.

O run `33000481649` falhou em `2026-08-26T18:35:37Z` porque ainda não havia archive Production no namespace off-site. O primeiro backup real só foi criado depois.

Além disso foi identificado um gap no workflow antigo: ele baixava/verificava o bundle Production real, mas restaurava um **novo dump sintético** produzido de migrations + seed. Logo, um verde antigo não provaria restaurabilidade do bundle Production.

# PR #116 — restore real isolado

A implementação em validação faz a prova suficiente:

1. baixa o bundle Production real e valida sidecars/manifesto/checksums internos;
2. inicia uma instância **Supabase local temporária** no runner, nunca um projeto/branch hospedado;
3. fixa o Postgres local na mesma linha de Production (`17.6.1.141`);
4. restaura `roles.sql` → `schema.sql` → `SET session_replication_role = replica` → `data.sql` em transação e com `ON_ERROR_STOP`;
5. o helper recusa qualquer `BACKUP_RESTORE_DB_URL` que não seja loopback;
6. revalida objetos críticos, RLS/grants e os dados contra todas as foreign keys públicas;
7. preserva explicitamente os ciclos conhecidos de `stock_movements` e `payments` sem confiar cegamente em `convalidated`;
8. destrói somente o destino local temporário;
9. registra `restore_drill` pela boundary privada existente em `protection_runs`;
10. sucesso só é persistido depois de restore + smoke tests;
11. falha mantém/atualiza o incidente #110 com erro sanitizado.

Production não é destino do restore e a connection string Production não é passada ao helper de restauração.

## Validação já concluída no PR

O CI reproduziu inclusive os warnings reais de dump sobre FK circular em:

- `stock_movements`;
- `payments`.

Depois disso, o caminho separado de restore ficou verde e a suíte `supabase/tests/restore_drill_protection.sql` comprovou:

- start/sucesso/falha de `restore_drill`;
- idempotência;
- relação com Organizations;
- leitura por RLS;
- mutation privilegiada negada ao usuário autenticado.

Lint, typecheck, unit tests e production build também passaram no head funcional.

## Gate ainda não concluído

**O PR #116 ainda não deve ser descrito como prova Production real concluída enquanto não houver merge + workflow `Backup Restore Drill` verde em `main`.**

O workflow possui trigger `push` restrito aos arquivos da trilha de restore. O merge deve gerar uma única prova real com o archive off-site existente. Somente esse run pode:

- declarar restore PostgreSQL Production end-to-end comprovado;
- persistir o primeiro `restore_drill` autoritativo real;
- permitir auto-resolver #110.

Se o run real falhar, #110 deve permanecer aberta e a falha concreta deve orientar a próxima correção.

## Cobertura após o PR, se a prova real ficar verde

Comprovado então:

- backup lógico PostgreSQL Production;
- transporte e integridade off-site;
- retenção/lock;
- persistência autoritativa/RLS;
- UI read-only;
- restore do bundle PostgreSQL Production real em Supabase/PostgreSQL 17 isolado;
- restore drill autoritativo.

Ainda **não** comprovado/concluído:

- backup dos binários Supabase Storage/anexos;
- restauração/reconciliação desses binários;
- exportação manual complementar por Organization, se mantida;
- cobertura integral de configurações externas ao dump;
- fechamento final da Issue #75.

## Não fazer

- não restaurar Production;
- não refazer R2, backup, persistência ou UI já concluídos;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets sem regressão concreta;
- não pedir/registrar secrets no chat/Issue/PR;
- não armazenar dump em Git/GitHub Artifact;
- não declarar Supabase Storage protegido pelo dump PostgreSQL;
- não manipular binários via `storage.*` SQL;
- não remover o hard cap de 300 MB;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para validar esta slice backend/operacional.
