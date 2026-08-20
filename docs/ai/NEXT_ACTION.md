# Next Action — Sistema Lojasaph

## Contexto

A Fase 33 auditou `REQ-PLAT-007 — Ambientes separados` sem refazer a Fase 18.

Resultado:

- a política fail-closed de Development/Preview/Production continua presente e testada;
- o núcleo `src/lib/runtime/environment.ts` é byte-for-byte igual no Preview homologado da Fase 18, no commit atualmente hospedado em Production e na `main` auditada;
- Production `/health` confirmou `environment=production`, `supabaseAccess=allowed` e `adminAccess=blocked`, sem expor URL/ref/key/secret;
- os últimos Previews identificados continuam sendo os da Fase 18; não foi criado novo deployment;
- `vercel.json` continua com `git.deploymentEnabled=false`;
- env vars Vercel por target continuam não observáveis pela conexão atual, portanto não foram inferidos valores/targets;
- o projeto Supabase do Lojasaph continua saudável e sem branches;
- a organização possui agora um segundo projeto (`easy-v2`) com migrations próprias, sem evidência de relação com o Lojasaph;
- nenhuma nova Issue funcional de ambientes foi aberta;
- nenhum DDL/DML, migration, dado, branch/projeto Supabase ou configuração remota foi criado/alterado.

A evidência detalhada está em `docs/qa/environment-isolation.md` e `docs/operations/environments.md`.

## O que já foi concluído — não repetir

Não reimplementar a Fase 18 / Issue #45 / PR #46.

Reutilizar:

- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- `docs/qa/environment-isolation.md`;
- `src/lib/runtime/environment.ts`;
- `src/lib/runtime/environment.test.ts`;
- `src/lib/runtime/client-boundary.test.ts`;
- `src/lib/runtime/server.ts`;
- `src/lib/supabase/proxy.ts`;
- `src/lib/supabase/browser.ts`;
- `/health`;
- `vercel.json`.

Não criar Preview novo apenas para repetir o smoke fail-closed enquanto não houver drift funcional.

Não reutilizar `easy-v2` como backend Preview/Development do Lojasaph sem decisão explícita e prova de finalidade.

## Issue #75 — continuar bloqueada até decisão operacional

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta.

Se continuar sem essas decisões, não inventar cron/storage e não interromper a próxima auditoria independente.

## Objetivo ativo

**Auditar conjuntamente `REQ-IMP-001` a `REQ-IMP-004` — importação rastreável, idempotência, preview/dry run e relatório de inconsistências — e revalidar o suporte de aliases de `REQ-ITEM-002` associado à migração.**

A tarefa começa como auditoria, não como reimplementação da Fase 15 e **não autoriza importar dados reais**.

## Baseline existente

Antes de criar trabalho novo, localizar e reaproveitar a Fase 15 / Issue #39 / PR #40.

A entrega histórica incluiu:

- `import_batches`/staging persistente com origem/hash;
- arquivo/aba/linha/payload bruto rastreáveis;
- idempotência determinística de batch/linha;
- estados/resultados para accepted/duplicate/warning/rejected/pending mapping;
- dry run sem escrita nas tabelas operacionais;
- relatório estruturado de preview;
- aliases explícitos e matching canônico exato, sem fuzzy auto-merge;
- RLS/Organization e superfície RPC auditada;
- fixtures sintéticas e testes PostgreSQL/Vitest;
- documentação de importação/migração.

Migrations remotas da Fase 15 já aplicadas e que **não devem ser reaplicadas**:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW` e os requisitos `REQ-IMP-001..004`/`REQ-ITEM-002`.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Se #75 continuar bloqueada, não editar backup.
4. Ler Issue #39, PR #40 e a documentação atual, especialmente:
   - `docs/modules/imports.md`;
   - `docs/source-data/migration-plan.md`;
   - documentação de source data relevante;
   - migrations `import_staging*`;
   - `supabase/tests/import_staging.sql`;
   - código atual de parsing, normalização, aliases, staging e dry run.
5. Revalidar o estado real, não apenas o PR histórico:
   - cada batch preserva origem, hash e identificador estável;
   - cada linha preserva arquivo/aba/linha/payload e resultado;
   - reprocessamento determinístico não duplica staging/resultados;
   - dry run não escreve em tabelas finais operacionais;
   - relatório distingue aceitas, duplicadas, warnings, rejeitadas e mapeamentos pendentes;
   - aliases são explícitos e não fazem merge por similaridade textual;
   - transformações dependentes de Q-001..Q-025 permanecem pendentes, sem inferência;
   - RLS/escopo impede acesso cross-Organization/anon indevido;
   - não há dados reais, dumps ou arquivos fonte sensíveis versionados.
6. Verificar as migrations remotas e tabelas/RPCs atuais somente por leitura, confirmando que a fundação permanece aplicada e coerente; não reaplicar migrations.
7. Quando útil, rodar advisors/read-only e comparar schema atual com migrations/testes; não corrigir warnings genéricos sem defeito concreto.
8. Distinguir a fundação de staging da **migração real**. A existência do módulo não autoriza carregar as seis planilhas, definir cutover ou resolver questões abertas.
9. Se os requisitos atuais estiverem satisfeitos, documentar evidência sem abrir Issue artificial.
10. Se houver gap concreto e reproduzível, abrir uma única Issue, criar branch dedicada e implementar o menor fix reversível/versionado.
11. Não criar deployment Vercel para esta auditoria salvo necessidade real de runtime hospedado; a fundação é principalmente domínio/PostgreSQL.
12. Se houver patch, validar lint, typecheck, Vitest, build e gates PostgreSQL aplicáveis antes do merge.
13. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão

A auditoria pode considerar `REQ-IMP-001..004` e o suporte migratório de aliases atendidos quando houver evidência de que:

- staging preserva rastreabilidade de batch e linha;
- retry/reprocessamento é idempotente;
- dry run não produz efeitos em tabelas finais;
- inconsistências e mapeamentos pendentes são reportados explicitamente;
- matching de aliases não inventa fusões;
- isolamento por Organization continua protegido;
- nenhuma questão de negócio pendente é resolvida por inferência;
- nenhuma carga real/cutover é executada nesta auditoria.

## Segurança / operação

- nunca versionar planilhas/dados reais, dumps, secrets ou connection strings;
- não reaplicar migrations já presentes no remoto;
- não executar importação definitiva/cutover;
- não transformar `pending_mapping` em aceite automático sem decisão registrada;
- não fechar #75 sem backup automático real;
- não reutilizar `easy-v2` como ambiente do Lojasaph por inferência;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
