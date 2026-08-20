# Auditoria de isolamento de ambientes — REQ-PLAT-007

Data: 2026-08-20  
Requisito: `REQ-PLAT-007 — Ambientes separados`  
Resultado: **atendido no escopo atual, com configuração de env vars Vercel parcialmente não observável**

## Objetivo

Revalidar a Fase 18 / Issue #45 / PR #46 contra o código e os provedores atuais sem recriar Preview, ativar auto-deploy ou contratar infraestrutura.

`REQ-PLAT-007` exige que Development/Preview e Production não compartilhem inadvertidamente dados/segredos.

## Baseline reaproveitado

A Fase 18 já entregou:

- política central fail-closed em `src/lib/runtime/environment.ts`;
- identidade explícita de `development`, `preview`, `production` e `unknown`;
- bloqueio quando `LOJASAPH_APP_ENV` e `VERCEL_ENV` divergem;
- Preview sem backend isolado comprovado bloqueado antes de Auth/Data API;
- Development remoto exigindo ref distinta da Production;
- `SUPABASE_SECRET_KEY` server-only e admin não-prod bloqueado por padrão;
- callbacks coerentes com o ambiente;
- `/health` sem URL/ref/key/secret;
- testes de política e fronteira client/server;
- ADR-008 e runbook `docs/operations/environments.md`.

A auditoria atual não alterou essas regras.

## Matriz de atendimento

| Controle | Estado | Evidência atual |
| --- | --- | --- |
| Identidade do ambiente | Atendido | `evaluateRuntimeEnvironment()` resolve explicit/Vercel/local e falha fechado em mismatch ou valor inválido. |
| Preview usando Production por acidente | Atendido por guardrail | Preview exige refs Production/Preview distintas e a URL deve corresponder exatamente à ref Preview. |
| Development remoto usando Production | Atendido por guardrail | backend remoto exige refs Development/Production distintas; local é o default permitido. |
| Secret administrativa no browser | Atendido | browser lê apenas `NODE_ENV`/`NEXT_PUBLIC_*`; facades que leem secret importam `server-only`. |
| Admin fora de Production | Atendido por guardrail | exige backend já permitido + `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN=true`. |
| `/health` seguro | Atendido | retorna somente ambiente, estados e reason codes. |
| Production atual | Atendido | `/health` real retorna `environment=production`, `supabaseAccess=allowed`, `supabaseReason=production_backend`, `adminAccess=blocked`. |
| Preview hospedado sem backend isolado | Atendido/homologado | Fase 18 registrou `environment=preview`, `supabaseAccess=blocked`, `preview_backend_unverified`, `adminAccess=blocked`. |
| Drift do núcleo desde o Preview homologado | Ausente | `environment.ts` e `/health` possuem os mesmos blobs no Preview homologado e na `main`; `environment.ts` também é idêntico no Production hospedado atual. |
| Auto-deploy Git | Bloqueado deliberadamente | `vercel.json` mantém `git.deploymentEnabled=false`. |
| Env vars Vercel por target | Não observável pelo conector atual | a API/CLI da Vercel suporta auditoria por ambiente, mas a ação de listagem não está exposta na conexão desta sessão; não inferir valores/targets. |
| Backend Supabase Preview do Lojasaph | Ausente | projeto Production possui zero branches; nenhum projeto adicional foi comprovado como Preview do Lojasaph. |

## Código revalidado

### Política central

`src/lib/runtime/environment.ts` continua byte-for-byte igual ao commit do Preview homologado da Fase 18 (`91738dc6f780c8269cdf9600fc57c64d63e6134d`), blob:

`fc39f1a2b393815a6d1a853a23a4fbcff86614b0`

O mesmo blob está no commit atualmente hospedado em Production (`046c4a3392f85e2361c6ddeac0ae3ee1817145c5`) e na `main` auditada.

Consequência: a prova hospedada da Fase 18 continua representativa da política central atual; não há justificativa para consumir quota criando novo Preview apenas para repetir o mesmo smoke.

### Preview

Para `environment=preview`, o runtime só libera Supabase quando:

1. existe ref Production configurada;
2. existe ref Preview configurada;
3. a URL Supabase fornece uma project ref válida;
4. Preview e Production são distintas;
5. a URL real corresponde à ref Preview e não à Production.

Qualquer ausência/mismatch retorna `blocked` antes da criação de cliente operacional no Proxy/Auth.

### Development

Development aceita backend local por padrão. Backend hospedado exige refs Development/Production explícitas, distintas e coerentes com a URL real.

### Fronteira de secrets

`src/lib/runtime/client-boundary.test.ts` confirma que:

- `src/lib/supabase/browser.ts` não referencia `SUPABASE_SECRET_KEY`;
- integração browser não importa `@/lib/runtime/server`;
- envs usadas no browser são somente `NODE_ENV` ou `NEXT_PUBLIC_*`;
- facades que leem a secret são marcadas `server-only`.

## Vercel real

Projeto conectado:

- `sistema-lojasaph`;
- project id `prj_Sutt2hmT3S54QjWR4jR6mBi3DlcY`;
- latest deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`;
- target `production`;
- estado `READY`;
- commit hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

A listagem recente mostra deployments posteriores à Fase 18 somente em Production. Os últimos Previews identificados são os próprios da branch `agent/environment-isolation`/PR #46.

`GET https://sistema-lojasaph.vercel.app/health` em 2026-08-20 retornou somente:

- `status=ok`;
- `service=sistema-lojasaph`;
- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

Não há URL Supabase, project ref, publishable key, secret ou dados no payload.

### Env vars por target

A documentação atual da Vercel confirma ambientes Production/Preview/Development, `VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_ENV` para frameworks e auditoria de variáveis por target via CLI/API.

A conexão Vercel disponível nesta sessão expõe projeto/deployments/logs, mas não expõe a listagem de environment variables. Portanto:

- não é possível afirmar daqui quais nomes estão materialmente configurados em cada target hoje;
- isso não prova compartilhamento;
- também não deve ser descrito como isolamento de configuração comprovado;
- o controle compensatório versionado é fail-closed: configuração de Preview não comprovada não cria cliente Supabase operacional.

Se uma ferramenta futura expuser `env ls`/filterProjectEnvs de forma segura, auditar **nomes + targets** sem copiar valores.

## Supabase real

Organização `wopgwaqlnksvqavegljp` continua no plano Free.

O projeto do Sistema Lojasaph:

- ref `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL `17.6.1.141`;
- zero development branches.

A organização agora possui um segundo projeto, `easy-v2` (`hrmkkhqfyfoqucwbcszq`), criado em 2026-08-20. Ele possui migrations próprias (`p10_s3_i1_foundation`, `harden_transaction_rpc_boundary`) que não correspondem ao histórico do Sistema Lojasaph.

Não existe evidência de que esse projeto seja Preview/Development do Lojasaph. Por isso ele **não deve ser conectado ao projeto Vercel nem tratado como ambiente isolado do Lojasaph por inferência**.

A documentação atual do Supabase mantém como padrão recomendado desenvolvimento local; Branching cria ambientes isolados e sem dados de Production, porém é recurso associado ao plano Pro e gera consumo próprio. Nenhum branch/projeto deve ser criado para esta auditoria sem autorização explícita.

## Conclusão

`REQ-PLAT-007` permanece atendido no escopo vigente:

- o runtime falha fechado quando a identidade/backend não é comprovado;
- o Preview homologado não acessou Production;
- não houve drift funcional do núcleo desde aquela homologação;
- Production atual identifica corretamente seu ambiente e não expõe admin access no `/health`;
- secrets administrativas permanecem fora do bundle/browser por construção e teste;
- auto-deploy segue desligado;
- não existe backend Preview do Lojasaph comprovado no Supabase atual.

Não foi aberta Issue funcional porque não foi encontrado defeito reproduzível contra o requisito.

## Limitações conscientes

- env vars Vercel por target permanecem não observáveis nesta conexão;
- Preview operacional com login/dados continuará indisponível até existir backend próprio aprovado;
- o segundo projeto Supabase da organização não deve ser reutilizado sem decisão explícita sobre sua finalidade;
- não há necessidade atual de Supabase Branching para considerar o requisito atendido, pois Preview sem isolamento fica bloqueado.

## Não fazer sem novo requisito/decisão

- não ligar Preview à Production só para homologar UI;
- não reutilizar `easy-v2` como backend do Lojasaph por inferência;
- não criar Supabase branch/projeto pago sem autorização;
- não reativar Git auto-deploy;
- não copiar env var values/secrets para GitHub ou documentação;
- não executar login, invite, reset ou mutação em Preview com backend não comprovado.