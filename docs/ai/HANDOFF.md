# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

As slices de consolidação até o PR #172 estão integradas. A frente atual continua sendo a homologação UX real em desktop/tablet/mobile.

Baseline real:

- `main=01da4646d8e2ae6c533bc81d66afb2fb9d60ec5c` — merge do PR #172;
- CI pós-merge #588 / run `33427974722`: **success**;
- Issue #142 aberta;
- nenhum PR aberto no início desta execução;
- #75/#121 **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Não refazer

Já consolidados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171 e #172.

Não reabrir por preferência estética; corrigir somente bug/gap comprovado.

## Deployment/runtime atual

O último deployment automático de aplicação é `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`, `READY`, production, source Git, runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171), alias `sistema-lojasaph.vercel.app`.

O `main` está em `01da4646...` porque o PR #172 foi documental. Não existe deployment automático posterior para esse commit, e **não deve ser disparado deployment manual**: o código de aplicação hospedado é o mesmo runtime já revalidado.

A inspeção HTTP/HTML pública registrada no PR #172 continua válida e não deve ser repetida mecanicamente.

## Capacidade de browser descoberta nesta execução

O runtime local possui:

- Chromium `144.0.7559.96`;
- Python Playwright `1.57.0`;
- lançamento headless do Chromium funcionando.

Limitação objetiva: o container não possui saída de rede/DNS para `github.com` ou Vercel. Portanto Playwright **não consegue abrir o deployment live**. Também não há outro conector de browser interativo exposto.

Foi possível, contudo, produzir uma evidência gráfica limitada e nova usando SSR HTML + CSS reais obtidos do deployment pela integração Vercel e renderizados localmente em Chromium.

## Snapshot gráfico público executado

Viewports:

- desktop `1440x900`;
- tablet/touch `768x1024`;
- mobile/touch `390x844`.

Superfícies:

- Login;
- Recuperar senha com estado de erro;
- Acesso indisponível com estado de erro.

Nas nove combinações:

- nenhum overflow horizontal;
- cards/conteúdo permaneceram visualmente contidos;
- em tablet/mobile todos os controles/CTAs medidos ficaram com altura mínima de 44 px;
- alertas esperados estavam presentes;
- Tab percorreu os controles em ordem DOM no harness.

Esse método **não é browser live**. Não certifica hidratação, JavaScript, Next navigation, server actions, sessão, redirects client-side, mutações, drawer ou jornadas autenticadas. Não usar o harness estático para declarar foco completo aprovado; foco deve ser revalidado no browser live.

A matriz oficial está em `docs/qa/fase51-ux-homologation.md`.

## Evidência que continua ausente

Permanecem bloqueados por falta de browser live + sessão/credencial/token legítimos:

- login real e logout;
- seleção/troca de organização;
- convite válido → sessão → nova senha;
- estados legítimos adicionais de bootstrap;
- sidebar desktop e drawer mobile;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- fluxos mutáveis e seus feedbacks reais;
- foco/teclado no runtime hidratado.

Não criar usuário, convite, fixture ou dado artificial em Production para produzir prova.

## NEXT_ACTION imediata

### Concluir homologação UX live desktop/tablet/mobile quando houver pré-condições reais

No próximo chat:

1. reler governança e confirmar `main`, Issue #142, PRs/branches/CI;
2. observar somente deployment automático; não fazer deploy manual;
3. se runtime/deployment não mudou, não repetir HTTP/HTML nem o snapshot estático público já documentados;
4. verificar se existe browser live operável contra o deployment;
5. verificar se existe sessão/credencial legítima aprovada e token legítimo quando necessário;
6. com essas pré-condições, registrar dimensões e percorrer Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
7. validar foco/teclado, drawer, touch targets, overflow, loading/empty/error/success, tabelas/formulários densos e `lista → detalhe → ação → retorno`;
8. executar mutações somente em ambiente/estado seguro e legítimo;
9. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
10. promover reconciliação funcional final somente quando a matriz tiver evidência representativa suficiente ou quando bloqueios externos forem explicitamente aceitos pelo operador.

## Depois da homologação UX

Executar reconciliação funcional final com o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## Guardrails permanentes

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret no Git/docs/browser; Production não recebe fixture para prova; nenhum deploy Vercel manual/rotineiro; PENDINGs e Q-022 não são resolvidos por inferência; #75/#121 continuam **TOTALMENTE ON HOLD** até o final ou nova decisão explícita.
