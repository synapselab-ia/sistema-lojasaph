# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 35 auditou a fundação de importação da Fase 15 contra `REQ-IMP-001` a `REQ-IMP-004` e o suporte migratório de aliases de `REQ-ITEM-002`.

Resultado: **requisitos atendidos no escopo de staging/preview; nenhum gap funcional novo encontrado**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline de `main`: `60ab2012f68d9b8bd9d1371a455fd42235a59f7e`
- branch: `agent/import-foundation-audit`
- nova evidência: `docs/qa/import-foundation-audit.md`
- Issue funcional nova: nenhuma
- Issue #75 de backup permanece aberta/bloqueada
- nenhum código de aplicação alterado
- nenhuma migration/DDL/DML remota executada
- nenhum dado real importado
- nenhum deploy Vercel criado

A Fase 34 / Issue #80 / PR #81 está integrada em `main` pelo squash commit `60ab2012f68d9b8bd9d1371a455fd42235a59f7e`. A migration `20260820184106_membership_rls_initplan.sql` está em `main` e no histórico remoto. Não reaplicar.

## Fase 35 — resultado por requisito

### REQ-IMP-001 — importação rastreável

Atendido.

`import_batches` preserva Organization, origem/tipo, arquivo, SHA-256, chave determinística, versão de transformação, usuário solicitante, metadata, status e timestamps.

`import_rows` preserva batch, aba, linha, identificador bruto opcional, payload bruto, SHA-256, chave de idempotência, payload normalizado, alvo/resolução, estado, warnings e erros.

### REQ-IMP-002 — idempotência

Atendido para batch/staging/preview.

- mesma Organization + fonte/hash/versão reutiliza o batch;
- mesma posição/conteúdo no mesmo batch não duplica staging;
- mesma posição com payload diferente produz conflito explícito;
- mesma origem reapresentada em outra versão de transformação é detectada como duplicata quando aplicável;
- finalização do preview é idempotente.

A futura aplicação definitiva nas tabelas operacionais continua fora do escopo e deverá possuir sua própria prova de idempotência antes do cutover.

### REQ-IMP-003 — preview/dry run

Atendido.

- `import_batches.mode` é limitado por constraint a `dry_run`;
- as RPCs atuais de importação são somente `stage_import_batch`, `stage_import_row`, `get_import_preview_report` e `finalize_import_preview`;
- introspecção read-only confirmou que essas RPCs não fazem DML nas tabelas operacionais finais;
- não existe command atual de apply/cutover para dados importados;
- a suíte PostgreSQL falha se o dry run gerar StockItem operacional sintético.

### REQ-IMP-004 — relatório de inconsistências

Atendido.

As linhas preservam estados `accepted`, `duplicate`, `warning`, `rejected` e `pending_mapping`, junto de warnings/erros e resolução.

O relatório consolida total, aceitas, duplicadas, warnings, rejeitadas e mapeamentos pendentes. Rejeição ou pending mapping leva o batch a `review_required`; `ready` continua significando apenas preview validado.

### REQ-ITEM-002 — aliases

Suporte migratório atendido.

- `item_aliases` existe no remoto com RLS;
- FK composto preserva a mesma Organization entre alias e StockItem;
- matching aceita somente nome canônico exato normalizado ou alias explícito;
- não existe fuzzy auto-merge;
- inexistência/ambiguidade permanece `pending_mapping`.

## Supabase remoto — revalidação read-only

Projeto `fhbvwyttikrbeaanatlr`:

- migrations de importação presentes:
  - `20260818180723 / import_staging`;
  - `20260818180738 / import_staging_finalize_fix`;
  - `20260818181051 / import_staging_indexes`;
- `20260820184106 / membership_rls_initplan` também presente;
- `import_batches` com RLS habilitado;
- `import_rows` com RLS habilitado;
- `item_aliases` com RLS habilitado;
- `authenticated` possui somente SELECT direto em `import_batches`/`import_rows`;
- as quatro RPCs de importação usam `SECURITY DEFINER`, `search_path=""`, verificam `auth.uid()`/escopo Organization-wide e não são executáveis por `anon`;
- `import_batches = 0`;
- `import_rows = 0`.

Nenhuma escrita remota foi executada nesta auditoria.

## Arquivos reais / segredos

- `docs/source-data/` contém apenas documentação Markdown;
- busca no repositório não encontrou `.xlsx`, `.xls` ou `.csv` versionados;
- `.gitignore` continua excluindo `.env*` salvo `.env.example` e `/backups/`;
- nenhum dump, planilha real, secret ou connection string foi adicionado.

## Drift documental corrigido

`docs/modules/imports.md` ainda citava os filenames anteriores à reconciliação de migration history da Fase 30.

Agora a documentação usa os filenames canônicos que existem no GitHub e correspondem ao remoto:

- `20260818180723_import_staging.sql`;
- `20260818180738_import_staging_finalize_fix.sql`;
- `20260818181051_import_staging_indexes.sql`.

## Validação reutilizada

O head funcional final anterior ao squash da Fase 34 passou:

- CI #328 — success;
- Business Transactions Integration #162 — success;
- Inventory Count Integration #178 — success.

O job `database` aplicou todas as migrations em PostgreSQL 17 e executou `supabase/tests/import_staging.sql` junto das suites de schema/RLS/hardening e transacionais.

A Fase 35 é documental/read-only. Confirmar CI do head documental final antes do merge.

## REQ-PLAT-005 / Issue #75

Continua bloqueada por decisões operacionais ausentes de RPO, RTO, destino off-site, retenção, proteção e alertas. Não inventar configuração e não fechar #75 sem backup automático real.

## Próxima ação

Após integrar a Fase 35, auditar `REQ-SEC-003 — Auditoria`: verificar de ponta a ponta que alterações críticas de Estoque, Caixa, Financeiro e configurações geram trilha persistente suficiente, protegida por RLS/grants e sem exposição de dados sensíveis.

A auditoria deve reutilizar `audit_logs` e as suites existentes, sem redesenhar eventos ou abrir Issue se o requisito já estiver atendido.

## Não repetir

- não reimplementar a Fase 15;
- não importar as seis planilhas reais;
- não criar apply/cutover durante auditoria de staging;
- não reabrir a Fase 34/RLS sem bypass reproduzível;
- não reaplicar migrations existentes;
- não fechar #75 sem backup automático real;
- não reativar auto-deploy Vercel;
- não inferir Q-001..Q-025.
