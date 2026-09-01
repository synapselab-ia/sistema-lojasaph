# Current State — Sistema Lojasaph

Última atualização: 2026-09-01

## Regra de baseline

**Não usar este arquivo como fonte do SHA corrente de `main`.** Toda execução deve consultar GitHub para HEAD real, PRs, Issues, branches e CI. SHAs e runs abaixo são âncoras de evidência concluída, não uma alegação de HEAD permanente.

## Estado do produto

**Fase 51 / Issue #142 permanece ativa.**

O núcleo operacional está consolidado, mas o produto ainda não deve ser declarado 100% concluído. `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Slices/fechamentos já integrados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176, #177 e #178.

Não refazer essas etapas sem bug/gap concreto.

#75/#121 continuam **TOTALMENTE ON HOLD**. PENDINGs de negócio e Q-022 continuam sem inferência.

## Runtime hospedado de aplicação

O último deployment automático de aplicação observado continua sendo:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- alias `sistema-lojasaph.vercel.app`.

PRs posteriores que alteraram apenas documentação/operação não exigem deploy Vercel manual. **Nenhum deploy manual foi disparado.**

## Homologação UX — evidência já obtida

### HTTP/HTML público

O runtime acima já teve revalidação HTTP/HTML de:

- `/` sem sessão;
- `/workspace` sem sessão;
- `/recuperar-senha`;
- `/sem-acesso`;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

UX-51-001, UX-51-002 e UX-51-003 permanecem tratados nesse nível de evidência.

### Snapshot gráfico estático

SSR HTML + CSS reais do deployment foram renderizados localmente em Chromium/Playwright para Login, Recuperação com erro e Acesso indisponível em:

- `1440x900` desktop;
- `768x1024` tablet/touch;
- `390x844` mobile/touch.

Resultado: sem overflow horizontal nas nove combinações; layout contido; controles/CTAs em contexto touch com pelo menos 44 px; alerts esperados presentes.

**Limite:** isso não é browser live e não certifica hidratação/JS, navegação Next, server actions, sessão/auth, mutações, drawer autenticado nem foco completo no runtime live.

### Smoke live autenticado desktop — 2026-09-01

O operador abriu o deployment real em browser com sessão legítima e forneceu evidência direta de `/workspace/administracao/acessos` carregada após a correção de migrations. A tela de **Usuários e permissões** exibiu o formulário de acesso e a listagem cadastrada sem `ADMINISTRATION_QUERY_ERROR`.

Na mesma rodada, o operador confirmou que as superfícies autenticadas principais abriram normalmente em navegação real no desktop:

- Visão geral;
- Administração;
- Produtos/Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Essa evidência valida **carregamento e navegação smoke live autenticados no desktop**. Ela não certifica, sozinha, todas as ações mutáveis, fluxos `lista → detalhe → ação → retorno`, foco/ordem de teclado, convite/recuperação com token legítimo ou todos os estados loading/empty/error/success.

### Smoke live autenticado mobile — 2026-09-01

O operador abriu o sistema em celular real com sessão legítima e confirmou que, até o ponto percorrido, as superfícies testadas também estavam abrindo normalmente no mobile.

Essa evidência valida **carregamento e navegação smoke live autenticados no mobile**. O qualificativo “por enquanto” limita a afirmação ao que foi efetivamente percorrido: não certifica isoladamente todos os estados do drawer, todos os touch targets, ausência de overflow em todas as tabelas/formulários densos, ações mutáveis, feedback pós-ação ou jornadas completas.

### Limitação de tablet explicitamente aceita pelo operador — 2026-09-01

O operador informou que nem ele nem Asaph dispõem de tablet e decidiu explicitamente que **não é necessário executar homologação live em tablet por enquanto**.

Isso satisfaz o mecanismo de aceite previsto em `NEXT_ACTION.md` para **limitação externa residual explicitamente aceita pelo operador**. A decisão não cria evidência inexistente: tablet continua sem homologação live autenticada e deve ser registrado como **deferido por decisão operacional**, não como “testado”.

A ausência de tablet deixa de bloquear a Fase 51 nesta etapa. A decisão pode ser revista antes de go-live/production-readiness se houver necessidade operacional real de uso em tablet.

Detalhes de evidência: `docs/qa/fase51-ux-homologation.md`.

## Incidente Production detectado durante a homologação — corrigido

A telemetria Production mostrou `/workspace/administracao/acessos` falhando com `ADMINISTRATION_QUERY_ERROR` porque o PostgREST não encontrava `public.admin_list_organization_access(...)`.

A comparação read-only entre Git e Supabase Production provou drift exato de duas migrations:

- Production terminava em `20260827195802_stock_minimum_policy_fk_indexes`;
- Git continha:
  - `20260828130500_administration_access_management.sql`;
  - `20260828132500_administration_employee_identity.sql`.

### Correção operacional

PR #175 — `ops: reconciliar drift de migrations em Production` — integrado em `e7ff15366fec29728308dde8506397f4d68d2c39`.

Evidência:

- CI do PR #593 / run `33436348276`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- workflow one-shot `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- mecanismo: `supabase db push` com dry-run e allowlist fechada para exatamente as duas migrations esperadas;
- sem seed, reset, `migration repair`, DDL ad hoc ou fixture em Production;
- timestamps/versions Git preservados no histórico remoto;
- workflow one-shot removido após a execução.

Production agora registra `20260828130500` e `20260828132500`, possui os quatro RPCs administrativos esperados e preserva os grants/trigger de segurança versionados. `/workspace/administracao/acessos` foi posteriormente revalidada no browser real autenticado. UX-51-004 está tratado e revalidado no nível de smoke live desktop.

## Paridade de migrations — execução de 2026-09-01

Nova checagem read-only após o PR #178 confirmou:

- Git continua encerrando a linhagem em `20260828132500_administration_employee_identity.sql`;
- Supabase Production continua encerrando em `20260828132500 administration_employee_identity`;
- **não há drift novo**.

Não repetir a reconciliação #175 sem novo desvio comprovado.

## Bloqueio restante da Fase 51

Tablet não é mais um gate desta etapa por aceitação explícita do operador. Os itens ainda não comprovados por evidência live suficiente são principalmente:

- jornadas autenticadas profundas em desktop/mobile;
- drawer/menu mobile, touch targets e overflow em estados representativos;
- foco visível e ordem por teclado no runtime hidratado;
- tabelas/formulários densos em viewports menores;
- fluxos `lista → detalhe → ação → retorno` representativos;
- loading/empty/error/success e feedback pós-ação;
- ações mutáveis somente em estado seguro;
- convite/recuperação/nova senha com token legítimo quando esses fluxos forem necessários ao aceite.

Não fabricar usuário, convite, fixture ou dado em Production para preencher a matriz.

## NEXT_ACTION

**Concluir a profundidade residual da homologação UX em desktop/mobile, sem exigir tablet nesta etapa e sem repetir os smokes já comprovados.**

Se a profundidade residual depender de condição externa que o operador também decidir explicitamente adiar/aceitar, registrar a decisão com precisão; não transformar ausência de prova em prova positiva.

Depois de evidência live suficiente ou aceite explícito dos limites residuais restantes, promover a **reconciliação funcional final requisito por requisito** usando:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## PENDINGs e Q-022

Não resolver por inferência:

- `REQ-ITEM-004`;
- `REQ-ITEM-005`;
- `REQ-STK-007`;
- `REQ-STK-010`;
- `REQ-EXP-004`;
- `REQ-FIN-004`;
- `REQ-CASH-007`;
- `REQ-CASH-008`;
- Q-022.
