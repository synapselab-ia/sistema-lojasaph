# Handoff — Sistema Lojasaph

## Como ler este handoff

**Sempre consultar o GitHub para obter o HEAD real de `main` e o CI mais recente.** SHAs/runs abaixo são âncoras de evidência concluída, não estado eterno do repositório.

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX está integrada; o incidente de drift de migrations Production foi corrigido e revalidado; já existem smokes live autenticados reais em desktop e celular. Em 2026-09-01 o operador também aceitou explicitamente que a ausência de tablet **não bloqueie esta etapa**, pois nem ele nem Asaph dispõem do dispositivo.

Não refazer por inércia: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176, #177 e #178.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## Runtime de aplicação observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

PRs documentais/operacionais posteriores não exigem deploy Vercel manual. Nenhum deploy manual foi feito.

## Evidência UX já concluída

HTTP/HTML público e snapshot gráfico estático permanecem registrados em `docs/qa/fase51-ux-homologation.md`.

Resumo:

- UX-51-001/002/003 tratados;
- Login, Recuperação com erro e Acesso indisponível renderizados em `1440x900`, `768x1024` touch e `390x844` touch/mobile;
- sem overflow horizontal nas combinações verificadas;
- controles/CTAs touch medidos com pelo menos 44 px;
- isso continua sendo snapshot estático, não browser live autenticado.

Não repetir se o runtime de aplicação não mudou.

## Evidência live autenticada — desktop — 2026-09-01

O operador abriu o deployment real com sessão legítima e mostrou `/workspace/administracao/acessos` carregada em browser live. A tela **Usuários e permissões** exibiu o formulário e os acessos cadastrados sem `ADMINISTRATION_QUERY_ERROR`.

O operador também confirmou, na mesma navegação real, que abriram normalmente:

- Visão geral;
- Administração;
- Produtos/Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Registrar isso como **smoke live autenticado desktop**, não como homologação funcional integral das jornadas. O screenshot recebido no chat não foi anexado ao GitHub porque continha dado identificável de conta; a evidência documental permanece sanitizada.

## Evidência live autenticada — mobile — 2026-09-01

Depois do smoke desktop, o operador abriu o sistema em celular real com sessão legítima e confirmou que, até o ponto percorrido, as superfícies testadas estavam abrindo normalmente também no mobile.

Registrar isso como **smoke live autenticado mobile de carregamento/navegação**. O qualificativo “por enquanto” deve ser preservado semanticamente: a confirmação cobre o que foi percorrido naquele momento e não equivale a homologação integral de todos os componentes, estados ou fluxos mobile.

## Decisão operacional — tablet — 2026-09-01

O operador declarou que nem ele nem Asaph possuem tablet e que **não é necessário testar tablet por enquanto**.

Tratar essa declaração como **aceitação explícita da limitação externa residual de tablet**, conforme mecanismo já previsto no aceite da Fase 51. Não marcar tablet como “homologado”; marcar como **deferido/aceito nesta etapa**.

A decisão não se estende automaticamente a outros limites residuais. Ainda não estão comprovados integralmente:

- drawer/menu mobile em todos os estados relevantes;
- touch targets e overflow em todos os componentes autenticados densos;
- foco e ordem completa por teclado;
- todas as ações mutáveis e feedback pós-ação;
- fluxos completos `lista → detalhe → ação → retorno`;
- convite/recuperação/nova senha com token legítimo;
- todos os estados loading/empty/error/success.

## Incidente Production — drift de migrations — FECHADO E REVALIDADO

Durante a homologação, a telemetria Production mostrou `/workspace/administracao/acessos` falhando com `ADMINISTRATION_QUERY_ERROR` porque o PostgREST não encontrava `public.admin_list_organization_access(...)`.

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

Em 2026-09-01 `/workspace/administracao/acessos` foi reaberta com sessão legítima no browser real e carregou normalmente. **UX-51-004 está revalidado no nível de smoke live desktop.** Não mexer novamente em schema/RPC dessa rota sem nova regressão concreta.

## Paridade de migrations revalidada

Na execução posterior ao PR #178, a comparação read-only confirmou novamente:

- Git termina em `20260828132500_administration_employee_identity.sql`;
- Production termina em `20260828132500 administration_employee_identity`;
- sem drift novo.

Não reaplicar #175 sem nova divergência comprovada.

## NEXT_ACTION imediata

### Concluir a profundidade residual da homologação UX em desktop/mobile, sem exigir tablet nesta etapa

Na próxima execução:

1. reler governança/handoff;
2. consultar `main`, Issue #142, PRs, branches e CI reais;
3. fazer checagem **read-only** de paridade de migrations Production ↔ Git; não reaplicar #175 sem drift novo;
4. observar somente deployment automático;
5. não repetir HTTP/HTML, snapshot público ou smokes desktop/mobile por inércia;
6. **não pedir tablet novamente enquanto a decisão operacional acima permanecer válida**;
7. validar, em desktop/mobile e quando houver condição legítima, drawer/touch/overflow/foco e componentes densos;
8. percorrer fluxos representativos `lista → detalhe → ação → retorno` quando seguro;
9. validar loading/empty/error/success e feedback pós-ação;
10. mutar somente em estado seguro;
11. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
12. promover reconciliação funcional quando houver evidência live suficiente ou aceite explícito dos limites residuais ainda não cobertos.

## Guardrails

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret em Git/docs/browser; nenhum deploy Vercel manual/rotineiro; PENDINGs e Q-022 sem inferência; #75/#121 continuam **TOTALMENTE ON HOLD**.
