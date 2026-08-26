# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua concluída e integrada.**  
A frente ativa continua sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Não reimplementar as slices já concluídas de R2, backup PostgreSQL, hard cap, persistência autoritativa ou UI read-only.

A slice atual é o PR #115 / branch `agent/data-protection-ui`: `Proteção dos dados` no `RuntimeShell` + `/workspace/backup`.

## GitHub

- `main` de entrada da slice: `e7aba67845a92a4dbafa9c202aeda01c066d55d2`;
- esse SHA já passou o CI pós-merge #429 / run `33010676236`;
- PR #115: `feat(protection): add read-only data protection UI`;
- CI funcional inicial #430 / run `33011319175`: verde em `database` e `validate`;
- `inventory-database` e `business-database` do mesmo head também verdes;
- lint, typecheck, unit tests e production build passaram;
- o head final após esta reconciliação documental deve permanecer verde antes do merge;
- Issues abertas relevantes: #75 e #110;
- repositório continua temporariamente `public`; não alterar automaticamente.

Se o próximo chat encontrar o PR #115 ainda aberto, não reescrever a UI: conferir apenas o head/CI final e integrar se estiver seguro. Se já estiver merged, seguir diretamente `NEXT_ACTION`.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- PostgreSQL 17 / `sa-east-1`;
- migration final `20260826201252 / protection_run_persistence`;
- zero development branches na revalidação desta sessão;
- `public.protection_runs = 0` rows reais.

Zero rows é legítimo. Não fazer backfill do run histórico `33006253661`.

## Persistência autoritativa — não refazer

`public.protection_runs` + `public.protection_run_organizations` já existem com RLS e boundary privado server-side.

- leitura depende de membership ativa;
- cross-Organization é bloqueado;
- `authenticated` não muta as tabelas;
- `service_role` não recebe mutation direta;
- `private.begin_protection_run(...)` e `private.complete_protection_run(...)` são os comandos autorizados;
- idempotência ocorre por `execution_reference`.

## UI `Proteção dos dados` implementada

### Arquivos principais

- `src/components/runtime-shell.tsx` — link `Proteção dos dados`;
- `src/app/workspace/(operacao)/backup/page.tsx` — Server Component read-only;
- `src/modules/protection/adapters/supabase-protection-query.ts` — leitura escopada por Organization/RLS;
- `src/modules/protection/application/protection-summary.ts` — política de RPO/saúde;
- `src/modules/protection/application/protection-summary.test.ts` — testes de estados e ordenação.

### Segurança

A página usa `createServerSupabaseClient()` com a sessão autenticada existente.

Ela **não** usa `createServerAdminSupabaseClient()`, não leva `service_role` ao browser e não cria endpoint de mutation.

A query primeiro filtra `protection_run_organizations` pela Organization selecionada e depois lê os runs correspondentes. Não seleciona nem exibe:

- `execution_reference`;
- GitHub run IDs/URLs;
- bucket/endpoint físico;
- secrets;
- connection strings;
- conteúdo do dump;
- erro bruto.

### Estados

A regra visual é testada de forma pura:

- verde: PostgreSQL `succeeded` + integridade positiva + `valid_copy_at` dentro do RPO 24h;
- âmbar: histórico inicial vazio ou execução transitória dentro da política;
- vermelho: falha persistida ou ausência/cópia válida fora do RPO.

A tela declara expressamente que Supabase Storage/anexos ainda não estão cobertos.

## Validação da UI

CI #430 comprovou:

- migrations/schema/RLS/hardening verdes;
- `supabase/tests/protection_runs.sql` verde;
- lint verde;
- typecheck verde;
- testes unitários verdes;
- production build verde;
- integrações de inventário e transações verdes.

Não houve migration nem DML para a UI.

## Backup real já existente

O primeiro backup PostgreSQL Production real continua sendo o run histórico `33006253661`, criado em `2026-08-26T19:40:47Z`, com `53185` bytes, checksums/manifesto verificados e re-download/rehash off-site bem-sucedidos.

Ele aconteceu antes da persistência autoritativa e não deve ser backfillado.

## Issue #110 / restore drill

Issue #110 permanece aberta: `[backup-alert] Monthly restore drill failing`.

O run `33000481649` falhou em `2026-08-26T18:35:37Z` porque a etapa de download não encontrou nenhum archive Production no namespace off-site. Isso ocorreu **antes** do primeiro backup real, criado às `2026-08-26T19:40:47Z`.

O workflow atual `.github/workflows/backup-restore-drill.yml` também não é uma prova end-to-end do bundle real:

1. baixa e valida o bundle Production real;
2. cria separadamente um banco sintético com migrations + seed;
3. `scripts/verify-backup-restore.sh` gera um novo dump desse banco sintético;
4. restaura esse dump sintético em outro banco local.

Portanto, mesmo um run verde do workflow atual prova download/integridade do bundle real + regressão sintética de pg_dump/pg_restore, mas **não prova que roles/schema/data do bundle Production baixado restauram end-to-end**.

Warnings conhecidos do dump Production:

- constraints circulares em `stock_movements`;
- constraints circulares em `payments`.

## Próxima ação exata

**Evoluir e comprovar o restore drill real em ambiente isolado, reconciliando a Issue #110.**

O próximo chat deve:

1. ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, ADR-009 e runbook;
2. conferir `main`, PRs, Issues e CI reais;
3. conferir se PR #115 já foi integrado; se não, apenas completar o merge seguro sem reimplementar a UI;
4. revalidar Issue #110 e o workflow `Backup Restore Drill`;
5. como a falha anterior ocorreu antes da existência do archive, executar no máximo uma nova prova controlada do workflow atual para confirmar que download/checksums agora avançam;
6. não tratar esse verde isolado como restore Production end-to-end;
7. implementar a restauração do **bundle Production baixado** em PostgreSQL 17/destino isolado compatível, sem tocar Production;
8. tratar explicitamente ordem de roles/schema/data, triggers/FKs e os warnings de `stock_movements`/`payments`;
9. registrar `restore_drill` na fonte autoritativa por boundary server-side, sem mutation cliente;
10. fechar/auto-resolver #110 somente após recuperação comprovada;
11. atualizar documentação e integrar apenas com CI verde.

## Ainda falta na Issue #75

- primeiro backup pós-integração gravado automaticamente na fonte autoritativa;
- restore end-to-end do bundle Production real em destino isolado;
- evidência autoritativa de restore drill;
- backup dos binários de Supabase Storage/anexos;
- exportação manual complementar, se mantida;
- fechamento final com cobertura declarada corretamente;
- retorno do repositório a `private` quando o operador decidir.

## Restrições

- não refazer a UI do PR #115;
- não refazer a migration/persistência;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets sem regressão concreta;
- não pedir secrets no chat;
- não restaurar Production para teste;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular `storage.*` diretamente por SQL para copiar binários;
- não expor infraestrutura/secrets na UI;
- não voltar a Drive/rclone/Gmail;
- não remover o hard cap de 300 MB;
- não tornar o repositório private automaticamente;
- não gastar deploy Vercel para validar esta slice se o fluxo do projeto continuar bloqueado/limitado.
