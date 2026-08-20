# Auditoria da fundação de importação — 2026-08-20

## Objetivo

Revalidar o estado atual de `REQ-IMP-001` a `REQ-IMP-004` e o suporte migratório de aliases de `REQ-ITEM-002`, usando a Fase 15 / Issue #39 / PR #40 como baseline, sem reimplementar o módulo e sem importar dados reais.

Baseline da auditoria: `main` em `60ab2012f68d9b8bd9d1371a455fd42235a59f7e`.

A auditoria também reutiliza o preflight de RLS da Fase 34 em `docs/qa/rls-preflight.md`; RLS não foi reaberta porque nenhum bypass reproduzível apareceu nos testes/evidências da importação.

## Conclusão

A fundação atual continua atendendo os requisitos auditados no escopo de **staging/preview da migração**:

- `REQ-IMP-001 — Importação rastreável`: atendido;
- `REQ-IMP-002 — Idempotência`: atendido para batch e staging/reprocessamento de preview;
- `REQ-IMP-003 — Preview/dry run`: atendido;
- `REQ-IMP-004 — Relatório de inconsistências`: atendido;
- `REQ-ITEM-002 — Aliases`: suporte migratório atendido por alias explícito, sem fuzzy auto-merge.

Nenhum gap funcional novo foi encontrado. Não foi aberta Issue artificial.

Isso **não libera a migração real**. Aplicação idempotente em tabelas operacionais, importadores específicos das fontes reais, decisões de negócio pendentes, backup, reconciliação e cutover continuam etapas futuras separadas.

## Matriz de evidências

### REQ-IMP-001 — rastreabilidade

`public.import_batches` preserva:

- `id` estável;
- `organization_id`;
- `source_type`;
- `source_file`;
- `source_sha256`;
- `batch_key` SHA-256 determinístico;
- `transformation_version`;
- `mode` fixo em `dry_run`;
- status, usuário solicitante, metadata e timestamps.

`public.import_rows` preserva:

- Organization e batch;
- aba e linha de origem;
- identificador bruto opcional;
- payload bruto e respectivo SHA-256;
- chave determinística de idempotência;
- payload normalizado;
- entidade/alvo quando resolvido;
- `resolution`;
- estado do preview;
- arrays de warnings/erros.

O relatório e as linhas continuam relacionáveis ao batch sem perder arquivo/aba/linha/payload de origem.

### REQ-IMP-002 — idempotência

A command surface atual mantém:

- unicidade de `(organization_id, batch_key)` para o batch;
- reutilização do batch quando Organization/fonte/hash/versão são reapresentados;
- unicidade de `(organization_id, import_batch_id, source_sheet, source_row)` para posição da linha;
- `idempotency_key` derivada de Organization, hash da fonte, aba, linha e hash do payload bruto;
- replay da mesma posição/conteúdo no mesmo batch sem nova linha;
- conflito explícito `IMPORT_SOURCE_POSITION_CHANGED` se a mesma posição for reapresentada com payload diferente;
- detecção de origem já vista em outro batch/versão, classificando como `duplicate` quando aplicável.

`supabase/tests/import_staging.sql` cobre replay de batch, replay de linha, mudança de posição/payload, duplicata entre versões e finalização idempotente.

A aplicação TypeScript usa `canonicalizeJson()` antes do hash local, tornando a identidade estável para payloads JSON semanticamente equivalentes com ordem de chaves diferente.

A idempotência da **futura escrita definitiva nas tabelas operacionais** não é inferida a partir desse staging e continua explicitamente fora do escopo desta fundação.

### REQ-IMP-003 — preview/dry run

O banco impõe `import_batches.mode = 'dry_run'` por constraint.

As quatro RPCs públicas relacionadas a importação observadas no remoto são:

- `stage_import_batch`;
- `stage_import_row`;
- `get_import_preview_report`;
- `finalize_import_preview`.

A introspecção das definições atuais confirmou que elas fazem DML somente em `import_batches`, `import_rows` e `audit_logs` quando aplicável. Nenhuma contém DML nas tabelas operacionais de Estoque, Compras, Financeiro, Caixa, funcionários ou cadastros finais.

Não existe command pública de `apply/cutover/import-to-operational` no módulo atual.

O teste PostgreSQL também falha se o dry run criar StockItem operacional sintético.

### REQ-IMP-004 — inconsistências

Cada `import_row` preserva o resultado detalhado e sua linhagem com estados:

- `accepted`;
- `duplicate`;
- `warning`;
- `rejected`;
- `pending_mapping`.

Warnings e erros permanecem arrays JSON por linha. `resolution` registra a decisão/motivo de mapeamento quando disponível.

`get_import_preview_report` e `finalize_import_preview` consolidam:

- total;
- aceitas;
- duplicadas;
- warnings;
- rejeitadas;
- mapeamentos pendentes.

Se existir rejeição ou `pending_mapping`, o batch finalizado fica `review_required`; caso contrário pode ficar `ready`. `ready` significa apenas preview validado, nunca autorização de cutover.

### REQ-ITEM-002 — aliases para migração

`public.item_aliases` permanece no schema remoto, com RLS habilitado e FK composto garantindo que alias e StockItem pertencem à mesma Organization.

`resolveStockItemReference()` aceita somente:

1. nome canônico exato após normalização de Unicode/espaço/caixa;
2. alias explicitamente cadastrado.

Referência inexistente ou que corresponda a mais de um item retorna `pending_mapping`; similaridade textual aproximada não é aceita automaticamente.

Os testes unitários cobrem alias explícito, não-fuzzy e ambiguidade.

## Segurança / RLS atual

No remoto, `import_batches`, `import_rows` e `item_aliases` continuam com RLS habilitado.

Para staging:

- `authenticated` possui somente `SELECT` direto nas duas tabelas;
- INSERT/UPDATE/DELETE direto não é concedido ao cliente;
- a policy de leitura exige role Organization-wide permitida;
- as quatro RPCs de importação são `SECURITY DEFINER`, `search_path=""`, verificam `auth.uid()` e escopo Organization-wide;
- nenhuma das quatro é executável por `anon`.

O preflight da Fase 34 também provou que um usuário autenticado sem membership vê zero linhas de `import_batches` e recebe `IMPORT_SCOPE_NOT_ALLOWED` na RPC de relatório.

Nenhum novo finding de RLS foi produzido nesta auditoria.

## Estado remoto e ausência de carga real

Consulta read-only de 2026-08-20 confirmou:

- `import_batches`: `0` linhas;
- `import_rows`: `0` linhas.

Logo, o projeto hospedado não possui batch de migração real nem resíduo atual de homologação no staging.

O histórico remoto mantém as migrations:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`;
- `20260820184106 / membership_rls_initplan`.

Nenhuma migration foi reaplicada nesta auditoria e nenhuma escrita remota foi executada.

## Arquivos de origem e segredos

A raiz `docs/source-data/` contém apenas documentação Markdown derivada da engenharia reversa.

Busca no repositório não encontrou arquivos `.xlsx`, `.xls` ou `.csv` versionados. `.gitignore` também exclui `.env*` (exceto `.env.example`) e `/backups/`.

Nenhum dump, planilha real ou segredo foi adicionado nesta auditoria.

## Validação existente reutilizada

O head final da Fase 34, imediatamente anterior ao squash em `main`, passou:

- CI #328 — success;
- Business Transactions Integration #162 — success;
- Inventory Count Integration #178 — success.

O job `database` desse CI aplicou toda a cadeia de migrations em PostgreSQL 17 e executou `supabase/tests/import_staging.sql` junto de schema/RLS/hardening e das demais suites transacionais.

Como esta auditoria não altera código, SQL, RLS ou schema, a única correção encontrada é documental.

## Drift documental corrigido

`docs/modules/imports.md` ainda citava os timestamps locais antigos usados antes da reconciliação de migrations da Fase 30.

A documentação passa a usar os filenames canônicos atuais, iguais às versions do Supabase hospedado:

- `20260818180723_import_staging.sql`;
- `20260818180738_import_staging_finalize_fix.sql`;
- `20260818181051_import_staging_indexes.sql`.

## Não fazer a partir desta auditoria

- não importar as seis planilhas reais;
- não criar command de aplicação definitiva sem uma fase própria;
- não tratar `ready` como autorização de cutover;
- não converter `pending_mapping` em aceite automático;
- não inventar respostas para Q-001..Q-025;
- não reaplicar migrations de importação;
- não reabrir RLS sem bypass reproduzível;
- não fechar Issue #75 sem backup automático real e decisões operacionais registradas.
