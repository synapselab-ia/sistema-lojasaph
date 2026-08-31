# Handoff — Sistema Lojasaph

## Como ler este handoff

**Sempre consultar o GitHub para obter o HEAD real de `main` e o CI mais recente.** SHAs/runs abaixo são âncoras de evidência concluída, não estado eterno do repositório.

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX e o incidente de drift de migrations Production estão tratados. A frente atual volta a ser a homologação UX **live** em desktop/tablet/mobile.

Não refazer por inércia: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174 e #175.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## Runtime de aplicação observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

PRs documentais/operacionais posteriores não exigem deploy Vercel manual. Nenhum deploy manual foi feito.

## Evidência UX já concluída

HTTP/HTML público e snapshot gráfico estático já estão registrados em `docs/qa/fase51-ux-homologation.md`.

Resumo:

- UX-51-001/002/003 tratados;
- Login, Recuperação com erro e Acesso indisponível renderizados em `1440x900`, `768x1024` touch e `390x844` touch/mobile;
- sem overflow horizontal nas combinações verificadas;
- controles/CTAs touch medidos com pelo menos 44 px.

Não repetir se o runtime de aplicação não mudou.

Limite: snapshot estático não certifica JS/hidratação, sessão, navegação Next, server actions, mutações, drawer autenticado ou foco completo live.

## Incidente Production — drift de migrations — FECHADO

Durante a busca por evidência real da Fase 51, a telemetria Production mostrou `/workspace/administracao/acessos` falhando com `ADMINISTRATION_QUERY_ERROR` porque o PostgREST não encontrava `public.admin_list_organization_access(...)`.

Causa provada:

- Production estava em `20260827195802`;
- Git tinha exatamente duas migrations posteriores:
  - `20260828130500_administration_access_management.sql`;
  - `20260828132500_administration_employee_identity.sql`.

Correção:

- PR #175 mergeado em `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI PR #593 / run `33436348276`: **success**;
- workflow one-shot `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- migrations aplicadas via `supabase db push`, preservando versions Git;
- allowlist fechada para exatamente as duas migrations;
- sem seed/reset/repair/DDL ad hoc;
- workflow temporário removido após a execução.

Production agora registra as duas versions e possui os quatro RPCs administrativos esperados. Grants/trigger foram verificados read-only e o acesso direto de `authenticated` a INSERT/UPDATE de `organization_memberships` continua negado.

**Não declarar a rota Administração homologada live:** o backend foi corrigido, mas não houve browser live/sessão legítima nesta sessão para percorrer a UI.

## Regra de prevenção de recorrência

Quando Production disser que uma função/tabela mergeada não existe:

1. comparar migrations Git com histórico remoto antes de alterar código;
2. identificar exatamente as versions pendentes;
3. usar migrations versionadas e mecanismo que preserve as versions (`supabase db push` quando aplicável);
4. falhar fechado em drift inesperado;
5. não usar `migration repair`, edição manual de history, seed ou reset como atalho.

Ver `docs/qa/database-migrations.md`.

## Bloqueio restante da NEXT_ACTION

Ainda faltam:

- browser live conectado ao deployment;
- sessão/credencial legítima aprovada;
- token legítimo quando necessário;
- ambiente/estado seguro para mutações.

Sem isso, não declarar homologados:

- login/logout real;
- seleção/troca de organização;
- convite → sessão → nova senha;
- sidebar/drawer;
- Visão geral;
- Administração, incluindo `/workspace/administracao/acessos`;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- foco/teclado e feedback pós-ação no runtime hidratado.

Não fabricar usuário, convite, fixture ou dado em Production.

## NEXT_ACTION imediata

### Concluir homologação UX live desktop/tablet/mobile quando as pré-condições existirem

Na próxima execução:

1. reler governança/handoff;
2. consultar `main`, Issue #142, PRs, branches e CI reais;
3. fazer checagem **read-only** de paridade de migrations Production ↔ Git; não reaplicar #175 sem drift novo;
4. observar somente deployment automático;
5. se o runtime não mudou, não repetir HTTP/HTML ou snapshot público;
6. verificar se surgiu browser live operável;
7. usar somente credencial/sessão/token legítimos;
8. percorrer Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
9. em Administração, revalidar explicitamente `/workspace/administracao/acessos` após a correção backend;
10. validar foco/teclado, drawer, touch targets, overflow, loading/empty/error/success, tabelas/formulários densos e `lista → detalhe → ação → retorno`;
11. mutar somente em estado seguro;
12. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
13. promover reconciliação funcional apenas após evidência live representativa ou aceitação explícita do bloqueio externo.

## Guardrails

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret em Git/docs/browser; nenhum deploy Vercel manual/rotineiro; PENDINGs e Q-022 sem inferência; #75/#121 continuam **TOTALMENTE ON HOLD**.
