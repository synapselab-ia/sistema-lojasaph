# Auditoria de segredos — REQ-SEC-004

Data: 2026-08-20
Status: **atendido no escopo auditável; nenhum segredo real versionado ou vazamento browser/log reproduzível encontrado**.

## Objetivo

Revalidar `REQ-SEC-004 — Segredos`: tokens, chaves e senhas não podem ser versionados no GitHub nem expostos indevidamente ao browser, respostas públicas ou logs.

A auditoria não lê nem registra valores de credenciais hospedadas. Publishable keys e project refs públicos são tratados separadamente de secret/service-role/database credentials.

## Estado GitHub e arquivos rastreados

A árvore Git recursiva da `main` em `2ff5a421624c0f6dbf199ae16f77f9ab7f510626` foi enumerada por completo (`truncated=false`).

Resultado:

- o único arquivo `.env*` rastreado é `.env.example`;
- não há `.env`, `.env.local`, `.env.production` ou equivalentes rastreados;
- não há arquivos PEM, certificados/chaves privadas ou contêineres de chave rastreados;
- não há diretório de backup real nem dumps de banco versionados;
- não há planilhas reais `.xlsx`, `.xls` ou `.csv` versionadas;
- os arquivos SQL rastreados pertencem às migrations, seed anonimizado e testes do Supabase.

`.gitignore` mantém `.env*` com exceção deliberada de `.env.example`, `/backups/`, `*.pem` e artefatos locais de build/coverage/logs.

A ausência atual de extensões adicionais de certificado/dump na ignore list não é tratada como defeito por si só: nenhum desses artefatos está rastreado e esta auditoria não altera configuração preventivamente sem exposição concreta.

## `.env.example`

`.env.example` contém somente nomes/documentação e placeholders vazios para configuração externa.

Separação explícita:

- `NEXT_PUBLIC_SUPABASE_URL` — configuração pública do cliente;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — chave publicável usada somente com RLS;
- refs de projeto — identidade pública de backend, não segredo;
- `SUPABASE_SECRET_KEY` — server-only e nunca prefixada com `NEXT_PUBLIC_`;
- variáveis de bootstrap — configuração operacional, sem valor real versionado.

O snapshot histórico da Fase 7 (`0d722431e3049c7715857f2df263cbef0ff35320`) já documentava a mesma regra e mantinha URL/publishable/secret vazios. A evolução da Fase 18 continuou usando placeholders vazios.

## Histórico disponível

O conector atual não expõe GitHub Secret Scanning nem um `git grep` arbitrário sobre todos os blobs históricos, portanto uma prova exaustiva de ausência de qualquer valor em todo o DAG não é observável por esta conexão.

Foi auditado o histórico disponível por busca de commits relacionada a `.env`, `secret`, `credential`, `password` e à introdução da integração Supabase.

Evidências relevantes:

- commit inicial continha apenas `README.md`;
- a Fase 7 introduziu `.env.example` com placeholders vazios e instrução explícita para nunca versionar valores reais;
- a introdução de `getSupabaseServerEnv()` referenciava `process.env.SUPABASE_SECRET_KEY`, não um valor literal;
- commits posteriores adicionaram `server-only` às fachadas administrativas e testes de fronteira client/server;
- não foi encontrada evidência de commit destinado a remover/rotacionar segredo exposto nem de arquivo de credencial removido.

Conclusão histórica: **nenhuma exposição concreta foi encontrada no histórico observável**. A limitação de ferramenta acima permanece registrada em vez de inferir uma varredura que não foi executada.

## Fronteira browser/server

### Browser

`src/lib/supabase/browser.ts` lê apenas `NODE_ENV` e variáveis `NEXT_PUBLIC_*` de URL, publishable key e refs públicas.

O client browser é criado com `url + publishableKey`; não existe acesso a `SUPABASE_SECRET_KEY` nem import da fachada administrativa.

`src/lib/runtime/client-boundary.test.ts` protege regressões:

- `browser.ts` não pode conter `SUPABASE_SECRET_KEY`;
- `browser.ts` não pode importar `@/lib/runtime/server`;
- toda leitura de `process.env` no browser deve ser `NODE_ENV` ou `NEXT_PUBLIC_*`;
- o provider client não pode ler env nem secret;
- fachadas que leem segredo devem conter `import "server-only"`.

O módulo puro `runtime/environment.ts` conhece o **nome** `SUPABASE_SECRET_KEY` apenas para avaliar uma fonte injetada; ele não lê `process.env` e o browser não recebe esse campo.

### Server/admin

- `src/lib/runtime/server.ts` começa com `import "server-only"` e é o ponto que lê `process.env.SUPABASE_SECRET_KEY`;
- `src/lib/supabase/env.ts` e `src/lib/supabase/server.ts` também são `server-only`;
- `createServerAdminSupabaseClient()` recebe a secret somente da configuração administrativa server-only;
- bootstrap administrativo é Server Action e só cria admin client após a policy de ambiente autorizar;
- fora de Production, admin permanece bloqueado por padrão mesmo se o secret estiver presente, salvo opt-in explícito em backend já isolado.

O workspace envia ao Client Component somente `SupabasePublicConfig` (`url` + `publishableKey`).

## Senhas de usuário

As Server Actions de autenticação recebem senha via `FormData` e passam o valor diretamente ao Supabase Auth. Elas não adicionam senha ao contexto de log, URL de redirect ou resposta pública.

Falhas do provedor são enviadas ao logger estruturado, onde mensagens e campos passam pela camada de redaction descrita abaixo.

## Logs e erros públicos

A infraestrutura de observabilidade mantém duas camadas:

1. `redactLogContext()` mascara recursivamente chaves que indiquem authorization, cookie, password, token, secret, API key, service role, connection string/database URL e PII comum;
2. `sanitizeLogText()` trata texto livre, incluindo Bearer tokens, JWTs, chaves Supabase `sb_secret_*`/`sb_publishable_*`, credentials embutidas em URLs e parâmetros comuns de token/secret/password.

`src/instrumentation.ts` registra somente o path sem query string e não copia headers para o contexto de erro.

A suíte `src/lib/observability/core.test.ts` cobre redaction de credenciais/PII, Bearer/JWT, URL com credencial e erros de persistência. `toPublicError()` converte falhas internas/persistência em mensagem genérica.

As páginas `error.tsx` e `global-error.tsx` exibem apenas mensagem genérica e `digest`/referência, nunca `error.message`.

## `/health` hospedado

O código de `/health` retorna apenas status/service, ambiente classificado, estado/motivo de acesso Supabase e estado de admin access. Não retorna URL, project ref, publishable key, secret ou connection string.

O deployment Production atualmente hospedado ainda aponta para o commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`, mas `src/app/health/route.ts` possui o mesmo blob Git (`76220c627485d9b70b3281a23b426c7ed9ab246d`) nesse commit e na `main` auditada.

Fetch read-only em 2026-08-20 retornou HTTP 200 com somente o envelope seguro esperado. Nenhum deployment foi criado para esta auditoria.

## Workflows e scripts

Todos os workflows rastreados foram inspecionados.

- não há referência a `secrets.*` em comandos de shell nem `echo` de credenciais;
- não há upload de `.env`, backup ou credential artifact;
- os jobs PostgreSQL usam `postgres/postgres` apenas no serviço efêmero de CI; isso é fixture local descartável, não credencial Production;
- migrations/seeds/tests rodam contra o Postgres efêmero do job.

`scripts/export-supabase-backup.sh` exige `SUPABASE_DB_URL` via ambiente, não imprime a URL, recusa gravar backup dentro do repositório, usa `umask 077` e orienta proteger o resultado fora do Git.

`scripts/verify-backup-restore.sh` usa diretório temporário, `chmod 600`, remove o dump ao sair e opera sobre bancos de CI/teste.

## Vercel

A conexão Vercel desta sessão permite consultar projeto, deployments, logs e documentação, mas **não expõe uma ação para enumerar environment variables por target**.

Portanto:

- valores de env não foram solicitados nem revelados;
- não se afirma que target scoping está correto ou incorreto por inferência;
- a limitação de observabilidade fica explícita;
- a proteção versionada permanece a fronteira server-only + política fail-closed de ambiente.

O projeto continua com Git auto-deploy desabilitado por política do repositório; nenhum deployment foi criado nesta fase.

## Supabase

Nenhuma key, service-role credential ou connection string foi solicitada.

A revalidação read-only confirmou que a migration da Fase 36 continua registrada como `20260820192526 / critical_config_audit`; nenhuma migration foi reaplicada e nenhuma mutação foi feita nesta auditoria.

## Resultado

`REQ-SEC-004 — Segredos` é considerado **atendido no escopo auditável atual** porque:

- não há segredo real identificado nos arquivos rastreados atuais;
- arquivos locais de env e backups permanecem fora do Git por regra;
- placeholders históricos inspecionados permanecem vazios;
- o secret administrativo é server-only;
- nenhuma variável pública identificada carrega privilégio administrativo;
- o browser recebe somente URL/publishable key/refs públicas;
- senhas não entram em logs/redirects por desenho;
- logs e erros públicos possuem redaction/normalização explícitas e testadas;
- `/health` hospedado não expõe configuração sensível;
- workflows/scripts não publicam credenciais ou dumps por desenho;
- não foi encontrada exposição concreta que exija Issue ou rotação.

Não reabrir esta frente apenas por suspeita genérica; exigir evidência concreta de segredo versionado, bundle client privilegiado ou vazamento em log/resposta pública.
