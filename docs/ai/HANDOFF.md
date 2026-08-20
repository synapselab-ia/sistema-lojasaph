# Handoff — Sistema Lojasaph

## Estado

A Fase 33 auditou `REQ-PLAT-007 — Ambientes separados` sem refazer a Fase 18 e não encontrou gap funcional novo contra o requisito vigente.

Frente desta fase:

- branch `agent/environment-isolation-audit`;
- PR #79 — `docs(qa): revalidate environment isolation`;
- baseline inicial de `main`: `2f54ac1fe823386fe90d97d752318f39ec369d8c`;
- head auditado/validado antes destes commits finais de continuidade: `206fcc93fb4dbca217f65fa6c85fe2bdde15b516`;
- CI #316 — success;
- matriz/evidência nova: `docs/qa/environment-isolation.md`;
- runbook atualizado: `docs/operations/environments.md`;
- nenhuma nova Issue funcional de ambientes;
- Issue #75 de backup permanece aberta/bloqueada;
- nenhum DDL/DML, migration, Auth/RLS/grant ou dado remoto alterado;
- nenhum deployment Vercel criado;
- nenhum branch/projeto Supabase criado.

Observação de higiene: a Issue #78 foi criada acidentalmente como placeholder durante a auditoria e encerrada imediatamente como `not_planned`, com texto explícito de que não há trabalho associado. Ignorar #78 nas próximas frentes.

## Fase 18 — o que continua válido

A Issue #45 / PR #46 já entregaram e não devem ser reimplementadas:

- política fail-closed em `src/lib/runtime/environment.ts`;
- ambientes `development`, `preview`, `production` e `unknown`;
- mismatch `LOJASAPH_APP_ENV` / `VERCEL_ENV` bloqueado;
- Preview bloqueado até existir backend próprio comprovado;
- Development local como default e remoto exigindo identidade distinta de Production;
- `SUPABASE_SECRET_KEY` server-only;
- admin não-prod bloqueado por padrão;
- callbacks/URLs coerentes com o ambiente;
- Proxy/Auth/workspace respeitando o bloqueio antes de operações remotas;
- `/health` seguro;
- testes de isolamento e fronteira client/server;
- ADR-008 e runbook de ambientes.

## Prova de ausência de drift funcional

O arquivo central `src/lib/runtime/environment.ts` possui exatamente o mesmo blob SHA:

`fc39f1a2b393815a6d1a853a23a4fbcff86614b0`

em:

1. Preview homologado da Fase 18 — commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`;
2. commit atualmente hospedado em Production — `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
3. `main` auditada nesta fase.

`src/app/health/route.ts` também permanece idêntico entre o Preview homologado e a `main`.

A prova hospedada da Fase 18 permanece representativa do núcleo atual; não criar Preview novo apenas para repetir o mesmo smoke.

## Evidência Vercel atual

Projeto:

- `sistema-lojasaph`;
- id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`;
- latest deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- `READY`;
- target Production;
- commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

A listagem atual mostra que deployments posteriores aos Previews da Fase 18 são de Production. Os últimos Previews identificados continuam sendo os da branch `agent/environment-isolation`/PR #46.

`GET https://sistema-lojasaph.vercel.app/health` retornou em 2026-08-20:

- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

O payload não expôs URL/ref/key/secret ou dados.

`vercel.json` continua com `git.deploymentEnabled=false`.

### Limite de auditoria de environment variables

A documentação/API atual da Vercel suporta auditoria de environment variables por Production/Preview/Development. Porém a conexão disponível nesta sessão não expôs ação para listar project env vars.

Assim:

- nomes/targets atuais são **não observáveis por esta conexão**;
- isso não prova compartilhamento;
- também não deve ser descrito como isolamento material dos targets comprovado;
- o controle compensatório versionado continua sendo fail-closed: Preview sem refs distintas/coerentes não cria cliente Supabase operacional.

Se uma ferramenta futura expuser essa listagem, auditar nomes + targets sem copiar valores.

## Evidência Supabase atual

Organização `wopgwaqlnksvqavegljp`:

- plano Free;
- agora possui dois projetos.

Projeto Sistema Lojasaph:

- `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- `sa-east-1`;
- PostgreSQL `17.6.1.141`;
- zero development branches.

Segundo projeto observado:

- `easy-v2` / `hrmkkhqfyfoqucwbcszq`;
- criado em 2026-08-20;
- migrations próprias: `p10_s3_i1_foundation` e `harden_transaction_rpc_boundary`.

Essas migrations não correspondem ao histórico do Lojasaph. Não existe evidência de que `easy-v2` seja Preview ou Development deste sistema. **Não reutilizar nem conectar esse projeto ao Lojasaph por inferência.**

Nenhuma mutação Supabase foi realizada na Fase 33.

## Issue #75 — backup

A Issue #75 continua aberta e sem comentários/decisões novas de RPO, RTO, destino off-site, retenção, proteção ou alertas. A frente permanece bloqueada por decisão operacional; não criar cron/storage arbitrários.

## Validação da Fase 33

Head `206fcc93fb4dbca217f65fa6c85fe2bdde15b516` do PR #79:

- CI #316 — success;
- job `database` — success, incluindo migrations, seed, backup/checksum/restore, suites PostgreSQL e `import staging and dry-run tests`;
- job `validate` — success, incluindo lint, typecheck, Vitest e production build.

Workflows especializados de Inventory/Business não disparam para o diff exclusivamente documental desta fase.

Os commits posteriores são somente continuidade (`CURRENT_STATE`/`HANDOFF`). Confirmar CI verde no head final antes do squash merge.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Conferir `main`, Issue #75, PRs, branches e CI reais.
3. Se #75 continuar sem decisões operacionais novas, mantê-la bloqueada e não editar backup.
4. Auditar conjuntamente `REQ-IMP-001` a `REQ-IMP-004` usando a Fase 15 / Issue #39 / PR #40 como baseline, sem refazê-la.
5. Revalidar também o suporte de aliases de `REQ-ITEM-002` na medida em que faz parte da fundação de migração entregue pela Fase 15.
6. Ler `docs/modules/imports.md`, `docs/source-data/migration-plan.md`, migrations `import_staging*`, testes `supabase/tests/import_staging.sql` e código de parsing/staging/dry-run atuais.
7. Verificar no código e banco atual:
   - batch/origem/hash rastreável;
   - idempotência no reprocessamento;
   - dry run sem escrita nas tabelas operacionais;
   - relatório de válidas/duplicadas/warnings/rejeitadas/pending mapping;
   - aliases explícitos sem fuzzy auto-merge;
   - isolamento por Organization/RLS;
   - ausência de resíduos ou dados reais versionados.
8. Consultar Supabase somente read-only salvo gap concreto que exija correção versionada.
9. Não importar as planilhas reais nem executar cutover.
10. Se a fundação atual satisfizer os requisitos, documentar sem Issue artificial. Se houver gap concreto, uma única Issue + branch/fix mínimo.
11. Não reaplicar as migrations da Fase 15.
12. Não criar deploy Vercel para uma auditoria que não dependa de runtime hospedado.
13. Atualizar continuidade ao final.

## Não fazer

- não reimplementar Fase 18;
- não criar Preview apenas para repetir prova sem drift;
- não reutilizar `easy-v2` por inferência;
- não criar Supabase branch/projeto pago sem autorização;
- não copiar env var values/secrets;
- não fechar #75 sem backup automático real;
- não importar dados reais/cutover;
- não reaplicar migrations de importação;
- não inferir Q-001..Q-025.
