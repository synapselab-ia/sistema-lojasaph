# Current State — Sistema Lojasaph

Última atualização: 2026-09-01

## Regra de baseline

**Não usar este arquivo como fonte do SHA corrente de `main`.** Toda execução deve consultar GitHub para HEAD real, PRs, Issues, branches e CI. SHAs e runs abaixo são âncoras de evidência concluída, não uma alegação de HEAD permanente.

## Estado do produto

**Fase 51 / Issue #142 permanece ativa.**

O núcleo operacional está consolidado, mas o produto ainda não deve ser declarado 100% concluído. `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Slices/fechamentos já integrados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176 e #177.

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

Essa evidência valida **carregamento e navegação smoke live autenticados no desktop**. Ela não certifica, sozinha, todas as ações mutáveis, fluxos `lista → detalhe → ação → retorno`, foco/ordem de teclado, drawer mobile, tablet/mobile, convite/recuperação com token legítimo ou todos os estados loading/empty/error/success.

### Smoke live autenticado mobile — 2026-09-01

O operador abriu o sistema em celular real com sessão legítima e confirmou que, até o ponto percorrido, as superfícies testadas também estavam abrindo normalmente no mobile.

Essa evidência valida **carregamento e navegação smoke live autenticados no mobile**. O qualificativo “por enquanto” limita a afirmação ao que foi efetivamente percorrido: não certifica isoladamente todos os estados do drawer, todos os touch targets, ausência de overflow em todas as tabelas/formulários densos, ações mutáveis, feedback pós-ação ou jornadas completas.

Detalhes: `docs/qa/fase51-ux-homologation.md`.

## Incidente Production detectado durante a homologação — corrigido

Ao procurar evidência incremental real enquanto o browser live continuava indisponível, a telemetria do runtime Production mostrou falhas repetidas em:

- `/workspace/administracao/acessos`;
- erro de aplicação: `ADMINISTRATION_QUERY_ERROR`;
- causa reportada pelo PostgREST: ausência de `public.admin_list_organization_access(...)` no schema cache.

### Causa raiz

A comparação read-only entre Git e Supabase Production mostrou drift exato de migrations:

- Production terminava em `20260827195802_stock_minimum_policy_fk_indexes`;
- a `main` continha duas migrations posteriores já validadas em CI:
  - `20260828130500_administration_access_management.sql`;
  - `20260828132500_administration_employee_identity.sql`.

O CI estava verde porque o banco efêmero aplicava toda a linhagem; Production não havia recebido as duas migrations administrativas.

### Correção operacional

PR #175 — `ops: reconciliar drift de migrations em Production` — integrado em `e7ff15366fec29728308dde8506397f4d68d2c39`.

Evidência:

- CI do PR #593 / run `33436348276`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- workflow one-shot `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- mecanismo: `supabase db push` com dry-run e allowlist fechada para exatamente as duas migrations esperadas;
- sem seed, reset, `migration repair`, DDL ad hoc ou fixture em Production;
- timestamps/versions Git preservados no histórico remoto;
- workflow one-shot removido após a execução bem-sucedida para não instituir deploy automático permanente de schema.

### Estado Production após correção

Histórico remoto agora inclui exatamente:

- `20260828130500 administration_access_management`;
- `20260828132500 administration_employee_identity`.

Validação read-only confirmou:

- `public.admin_list_organization_access(uuid)` existe;
- `public.admin_create_organization_membership(...)` existe;
- `public.admin_update_organization_membership(...)` existe;
- `public.admin_link_employee_identity(uuid,uuid)` existe;
- os RPCs são `SECURITY DEFINER`, `search_path=''`, executáveis por `authenticated` e não por `anon/public`, conforme contrato versionado;
- `private.validate_stock_location_scope_hierarchy()` não é executável por `authenticated/anon/public`;
- trigger `stock_locations_scope_hierarchy` existe em `public.stock_locations`;
- `authenticated` continua sem INSERT/UPDATE direto em `public.organization_memberships`.

Os warnings genéricos do Database Advisor para RPCs `SECURITY DEFINER` são compatíveis com a arquitetura intencional já usada pelo sistema e protegida por checks internos de papel/escopo; não foram tratados como defeito isoladamente. Os avisos de performance observados são informativos e estão fora desta correção.

**Revalidação live:** em 2026-09-01 o operador abriu `/workspace/administracao/acessos` autenticado no browser real e a tela carregou normalmente, sem o erro anterior. UX-51-004 passa a estar revalidado no nível de smoke live desktop. Não repetir schema/RPC para essa rota sem nova regressão concreta.

## Regra operacional adicionada — paridade de migrations

Antes de diagnosticar erro Production de função/tabela ausente quando o recurso já existe em migration mergeada:

1. comparar `supabase/migrations/*` com o histórico remoto;
2. confirmar o conjunto exato de versões pendentes;
3. aplicar somente migrations versionadas/revisadas com mecanismo que preserve suas versions, preferencialmente `supabase db push`;
4. falhar fechado se houver drift inesperado;
5. não usar `migration repair` ou edição direta de `supabase_migrations.schema_migrations` como atalho;
6. não aplicar seed/reset em Production.

Detalhes em `docs/qa/database-migrations.md`.

## Bloqueio restante da Fase 51

Smokes autenticados desktop e mobile agora existem, mas a homologação UX completa ainda precisa de evidência representativa de:

- tablet em browser live;
- drawer/menu mobile e touch targets nas jornadas autenticadas;
- foco visível e ordem por teclado no runtime hidratado;
- tabelas/formulários densos e overflow em viewports menores;
- fluxos `lista → detalhe → ação → retorno` representativos;
- loading/empty/error/success e feedback pós-ação;
- ações mutáveis somente em estado seguro;
- convite/recuperação/nova senha com token legítimo quando esses fluxos forem necessários ao aceite.

Não fabricar usuário, convite, fixture ou dado em Production para preencher a matriz.

## NEXT_ACTION

**Concluir a homologação UX live restante, priorizando tablet e jornadas autenticadas profundas, sem repetir os smokes desktop/mobile já comprovados.**

`/workspace/administracao/acessos` já foi revalidada live no desktop após o incidente de migrations; voltar a essa rota apenas como parte da matriz residual ou se surgir nova regressão.

Não repetir a reconciliação de migrations sem novo drift comprovado; fazer apenas a checagem read-only de paridade no início.

Depois da homologação UX, promover reconciliação funcional requisito por requisito usando:

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
