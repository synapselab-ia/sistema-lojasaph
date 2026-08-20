# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 33 auditou `REQ-PLAT-007 — Ambientes separados` sem refazer a Fase 18 e concluiu que o requisito permanece atendido no escopo atual.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline de `main`: `2f54ac1fe823386fe90d97d752318f39ec369d8c`
- branch: `agent/environment-isolation-audit`
- PR #79 — `docs(qa): revalidate environment isolation`
- head auditado/validado antes deste commit final de continuidade: `206fcc93fb4dbca217f65fa6c85fe2bdde15b516`
- CI #316 — success
- nova evidência: `docs/qa/environment-isolation.md`
- runbook atualizado: `docs/operations/environments.md`
- nenhuma nova Issue funcional de ambientes
- Issue #75 permanece aberta e bloqueada por decisões operacionais de backup
- Issue #78 foi um placeholder acidental e foi encerrada imediatamente como `not_planned`, sem trabalho associado
- nenhum código de aplicação, migration, DDL/DML, RLS/grant/Auth ou dado remoto alterado
- nenhum deployment Vercel criado
- nenhum projeto/branch Supabase criado

## REQ-PLAT-007 — auditoria da Fase 33

A Fase 18 / Issue #45 / PR #46 continua válida. O código atual mantém:

- política fail-closed em `src/lib/runtime/environment.ts`;
- mismatch `LOJASAPH_APP_ENV` / `VERCEL_ENV` bloqueado;
- Preview sem backend próprio comprovado bloqueado;
- Development remoto exigindo ref distinta de Production;
- admin secret server-only;
- admin não-prod bloqueado salvo opt-in explícito sobre backend já isolado;
- URLs/callbacks coerentes com o ambiente;
- `/health` sem dados sensíveis;
- testes da política e fronteira client/server.

A matriz detalhada está em `docs/qa/environment-isolation.md`.

## Ausência de drift funcional

O arquivo central `src/lib/runtime/environment.ts` possui o mesmo blob SHA:

`fc39f1a2b393815a6d1a853a23a4fbcff86614b0`

em três pontos:

1. Preview homologado da Fase 18 — commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`;
2. commit atualmente hospedado em Production — `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
3. `main` da Fase 33.

`src/app/health/route.ts` também mantém o mesmo blob do Preview homologado e da `main` (`76220c627485d9b70b3281a23b426c7ed9ab246d`).

Portanto a homologação Preview fail-closed da Fase 18 continua representativa do núcleo atual, sem justificar novo deploy para repetir a mesma prova.

## Vercel atual

Projeto:

- `sistema-lojasaph`;
- id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`;
- latest deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- `READY`;
- target `production`;
- commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

A listagem de deployments mostra que os deployments posteriores aos Previews da Fase 18 são de Production. Os últimos Previews identificados continuam sendo os próprios do PR #46.

`GET https://sistema-lojasaph.vercel.app/health` retornou em 2026-08-20:

- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

O payload não expõe URL/ref/key/secret.

`vercel.json` continua com `git.deploymentEnabled=false`; auto-deploy não foi reativado.

### Environment variables

A documentação vigente da Vercel confirma escopos Production/Preview/Development e auditoria por ambiente via CLI/API. Entretanto a conexão disponível nesta sessão não expõe a ação de listar project environment variables.

Assim, nomes/targets atuais são **não observáveis por esta conexão**. Isso não é tratado como prova de compartilhamento nem de isolamento material dos targets.

O controle efetivo versionado continua fail-closed: Preview não cria cliente Supabase operacional sem refs distintas/coerentes.

## Supabase atual

Organização `wopgwaqlnksvqavegljp`:

- plano `free`;
- atualmente contém dois projetos.

Projeto Sistema Lojasaph:

- `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- `sa-east-1`;
- PostgreSQL `17.6.1.141`;
- zero development branches.

Segundo projeto da organização:

- `easy-v2` / `hrmkkhqfyfoqucwbcszq`;
- criado em 2026-08-20;
- migrations observadas: `p10_s3_i1_foundation` e `harden_transaction_rpc_boundary`.

Essas migrations não correspondem ao histórico do Lojasaph. Não há evidência de que `easy-v2` seja ambiente Preview/Development deste sistema; ele não deve ser reutilizado por inferência.

A documentação atual do Supabase mantém desenvolvimento local como fluxo padrão e Branching como ambiente isolado opcional associado ao plano Pro/uso próprio. Nenhum branch/projeto foi criado nesta auditoria.

## REQ-PLAT-005 / Issue #75

A Issue #75 continua sem comentários/decisões novas de RPO, RTO, destino off-site, retenção, proteção ou alertas. A frente continua bloqueada e não foi modificada.

## Validação da Fase 33

Head `206fcc93fb4dbca217f65fa6c85fe2bdde15b516` do PR #79:

- CI #316 — success;
- job `database` — success: PostgreSQL 17, migrations, seed, backup/checksum/restore, suites SQL e `import staging and dry-run tests`;
- job `validate` — success: lint, typecheck, Vitest e production build.

Workflows especializados de Inventory/Business não são acionados pelo diff exclusivamente documental desta fase.

Este commit e a atualização correspondente do `HANDOFF` são somente continuidade documental. Confirmar CI verde no head final antes do merge.

## Próxima ação

Após integrar esta auditoria, avançar para a auditoria conjunta de `REQ-IMP-001` a `REQ-IMP-004` — importação rastreável, idempotência, dry run e relatório de inconsistências — usando a Fase 15 / Issue #39 / PR #40 como baseline e sem importar dados reais.

## Não repetir

- não reimplementar a Fase 18;
- não criar Preview só para repetir smoke sem drift;
- não reutilizar `easy-v2` como ambiente do Lojasaph por inferência;
- não criar branch/projeto Supabase pago sem autorização;
- não copiar env var values/secrets para GitHub;
- não reativar auto-deploy Vercel;
- não fechar #75 sem backup automático real;
- não importar dados reais antes da frente específica de migração/cutover;
- não inferir Q-001..Q-025.
