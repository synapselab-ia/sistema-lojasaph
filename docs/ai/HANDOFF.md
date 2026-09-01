# Handoff — Sistema Lojasaph

## Como ler este handoff

**Sempre consultar o GitHub para obter o HEAD real de `main` e o CI mais recente.** SHAs/runs abaixo são âncoras de evidência concluída, não estado eterno do repositório.

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX e o incidente de drift de migrations Production estão tratados. Em 2026-09-01 surgiu a primeira evidência live autenticada fornecida diretamente pelo operador no browser real.

Não refazer por inércia: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175 e #176.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## Runtime de aplicação observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

PRs documentais/operacionais posteriores não exigem deploy Vercel manual. Nenhum deploy manual foi feito.

## Evidência UX já concluída

HTTP/HTML público e snapshot gráfico estático continuam registrados em `docs/qa/fase51-ux-homologation.md`.

Resumo anterior:

- UX-51-001/002/003 tratados;
- Login, Recuperação com erro e Acesso indisponível renderizados em `1440x900`, `768x1024` touch e `390x844` touch/mobile;
- sem overflow horizontal nas combinações verificadas;
- controles/CTAs touch medidos com pelo menos 44 px.

Não repetir se o runtime de aplicação não mudou.

## Nova evidência live autenticada — desktop — 2026-09-01

O operador abriu o deployment real com sessão legítima e mostrou `/workspace/administracao/acessos` carregada em browser live. A tela **Usuários e permissões** exibiu o formulário e os acessos cadastrados sem `ADMINISTRATION_QUERY_ERROR`.

O operador também confirmou, na mesma navegação real, que abriram normalmente:

- Visão geral;
- Administração;
- Produtos/Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Registrar isso como **smoke live autenticado desktop**, não como homologação funcional integral das jornadas. Não anexar ao GitHub o screenshot recebido no chat porque ele contém dado identificável de conta; a evidência documental deve permanecer sanitizada.

Ainda não está comprovado por essa rodada:

- tablet/mobile autenticados;
- drawer/menu mobile;
- foco e ordem completa por teclado;
- todas as ações mutáveis e feedback pós-ação;
- fluxos completos `lista → detalhe → ação → retorno`;
- convite/recuperação/nova senha com token legítimo;
- todos os estados loading/empty/error/success.

## Incidente Production — drift de migrations — FECHADO E REVALIDADO

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

Em 2026-09-01 `/workspace/administracao/acessos` foi finalmente reaberta com sessão legítima no browser real e carregou normalmente. **UX-51-004 está revalidado no nível de smoke live desktop.** Não mexer novamente em schema/RPC dessa rota sem nova regressão concreta.

## Regra de prevenção de recorrência

Quando Production disser que uma função/tabela mergeada não existe:

1. comparar migrations Git com histórico remoto antes de alterar código;
2. identificar exatamente as versions pendentes;
3. usar migrations versionadas e mecanismo que preserve as versions (`supabase db push` quando aplicável);
4. falhar fechado em drift inesperado;
5. não usar `migration repair`, edição manual de history, seed ou reset como atalho.

Ver `docs/qa/database-migrations.md`.

## Bloqueio restante da NEXT_ACTION

A dependência externa reduziu: já existe sessão legítima e evidência live desktop provida pelo operador. Ainda faltam principalmente:

- tablet/mobile live autenticados;
- drawer/menu mobile, touch e overflow nas áreas autenticadas;
- foco/teclado no runtime hidratado;
- jornadas profundas e estados pós-ação;
- mutações apenas em estado seguro;
- tokens legítimos para fluxos auxiliares quando necessários ao aceite.

Não fabricar usuário, convite, fixture ou dado em Production.

## NEXT_ACTION imediata

### Concluir a homologação UX live restante sem repetir o smoke desktop já comprovado

Na próxima execução:

1. reler governança/handoff;
2. consultar `main`, Issue #142, PRs, branches e CI reais;
3. fazer checagem **read-only** de paridade de migrations Production ↔ Git; não reaplicar #175 sem drift novo;
4. observar somente deployment automático;
5. não repetir HTTP/HTML, snapshot público ou smoke desktop por inércia;
6. colher evidência representativa tablet/mobile com sessão legítima;
7. validar drawer, touch, overflow, foco/teclado e tabelas/formulários densos;
8. percorrer fluxos representativos `lista → detalhe → ação → retorno` quando seguro;
9. validar loading/empty/error/success e feedback pós-ação;
10. mutar somente em estado seguro;
11. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
12. promover reconciliação funcional apenas após evidência live suficiente ou aceitação explícita do limite residual pelo operador.

## Guardrails

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret em Git/docs/browser; nenhum deploy Vercel manual/rotineiro; PENDINGs e Q-022 sem inferência; #75/#121 continuam **TOTALMENTE ON HOLD**.
