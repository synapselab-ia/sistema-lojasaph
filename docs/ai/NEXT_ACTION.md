# Next Action — Sistema Lojasaph

## Contexto

A Fase 34 executou um preflight completo de RLS antes da auditoria de importação.

Resultado:

- 45/45 tabelas públicas de aplicação com RLS habilitado;
- 78 policies e 0 policies para `anon`/`PUBLIC`;
- `anon` sem grants de relação e sem EXECUTE nas RPCs públicas `SECURITY DEFINER`;
- `authenticated` sem `DELETE` direto;
- view financeira com `security_invoker=true`;
- probes com usuário autenticado sem membership retornando zero linhas nas superfícies representativas;
- nenhuma evidência de bypass cross-Organization;
- único finding acionável de RLS (`auth_rls_initplan` em memberships) corrigido semanticamente sem mudar autorização;
- migration remota/local alinhada em `20260820184106 / membership_rls_initplan`;
- regressão adicionada em `supabase/tests/security_hardening.sql`;
- warning `auth_rls_initplan` removido do Performance Advisor;
- warnings genéricos de `SECURITY DEFINER`, índices/FKs e leaked-password protection permanecem fora do escopo, conforme `docs/qa/rls-preflight.md`.

Não reabrir essa frente sem evidência concreta de regressão.

## Issue #75 — continuar bloqueada até decisão operacional

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta.

Se continuar sem essas decisões, não inventar cron/storage e não interromper a auditoria independente de importação.

## Objetivo ativo

**Auditar conjuntamente `REQ-IMP-001` a `REQ-IMP-004` — importação rastreável, idempotência, preview/dry run e relatório de inconsistências — e revalidar o suporte de aliases de `REQ-ITEM-002` associado à migração.**

A tarefa começa como auditoria, não como reimplementação da Fase 15 e **não autoriza importar dados reais**.

## Baseline existente

Localizar e reaproveitar a Fase 15 / Issue #39 / PR #40.

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

Também já aplicada e não deve ser reaplicada:

- `20260820184106 / membership_rls_initplan`.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW` e os requisitos `REQ-IMP-001..004`/`REQ-ITEM-002`.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Confirmar que a Fase 34 / Issue #80 / PR #81 está integrada; não refazer o preflight de RLS.
4. Se #75 continuar bloqueada, não editar backup.
5. Ler Issue #39, PR #40 e especialmente:
   - `docs/modules/imports.md`;
   - `docs/source-data/migration-plan.md`;
   - documentação de source data relevante;
   - migrations `import_staging*`;
   - `supabase/tests/import_staging.sql`;
   - código atual de parsing, normalização, aliases, staging e dry run.
6. Revalidar o estado real, não apenas o PR histórico:
   - cada batch preserva origem, hash e identificador estável;
   - cada linha preserva arquivo/aba/linha/payload e resultado;
   - reprocessamento determinístico não duplica staging/resultados;
   - dry run não escreve em tabelas finais operacionais;
   - relatório distingue aceitas, duplicadas, warnings, rejeitadas e mapeamentos pendentes;
   - aliases são explícitos e não fazem merge por similaridade textual;
   - transformações dependentes de Q-001..Q-025 permanecem pendentes, sem inferência;
   - RLS/escopo impede acesso cross-Organization/anon indevido;
   - não há dados reais, dumps ou arquivos fonte sensíveis versionados.
7. Verificar migrations/tabelas/RPCs remotas somente por leitura, confirmando que a fundação permanece aplicada e coerente; não reaplicar migrations.
8. Usar o preflight de `docs/qa/rls-preflight.md` como baseline de segurança. Só abrir nova frente de RLS se os testes de importação mostrarem bypass reproduzível.
9. Distinguir staging da **migração real**. A existência do módulo não autoriza carregar as seis planilhas, definir cutover ou resolver questões abertas.
10. Se os requisitos estiverem satisfeitos, documentar evidência sem abrir Issue artificial.
11. Se houver gap concreto e reproduzível, abrir uma única Issue, criar branch dedicada e implementar o menor fix reversível/versionado.
12. Não criar deployment Vercel para esta auditoria salvo necessidade real de runtime hospedado.
13. Se houver patch, validar lint, typecheck, Vitest, build e gates PostgreSQL aplicáveis antes do merge.
14. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

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
- não reabrir RLS apenas por warnings genéricos `SECURITY DEFINER`;
- não corrigir índices/FKs oportunisticamente sem evidência concreta;
- não fechar #75 sem backup automático real;
- não reutilizar `easy-v2` como ambiente do Lojasaph por inferência;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
