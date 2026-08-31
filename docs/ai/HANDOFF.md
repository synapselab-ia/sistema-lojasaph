# Handoff — Sistema Lojasaph

## Como ler este handoff

**Sempre consultar o GitHub para obter o HEAD real de `main` e o CI mais recente.** Este arquivo não fixa `main=<sha>` como estado eterno, porque merges puramente documentais tornariam essa linha obsoleta imediatamente.

SHAs e runs registrados aqui são âncoras de evidência concluída.

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

A consolidação de produto/UX até o PR #173 está integrada. A frente atual continua sendo a homologação UX live em desktop/tablet/mobile.

Última evidência documental integrada nesta rodada:

- PR #173 merged em `a3ae77a4e43da8e5c13ede27b65a4bc3653f383c`;
- CI PR #589 / run `33430536367`: **success**;
- CI pós-merge #590 / run `33430695863`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual realizado.

## Não refazer

Slices integradas: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172 e #173.

Não reabrir por preferência estética; somente por bug/gap comprovado.

## Runtime de aplicação observado

Último deployment automático de aplicação:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

#172 e #173 foram documentais. Não fazer deploy manual para transformar um SHA documental em runtime se o código de aplicação não mudou.

## Evidência pública concluída

HTTP/HTML do runtime automático já cobre entrada/redirects públicos e UX-51-001/002/003.

Além disso, foi produzido snapshot gráfico estático usando SSR HTML + CSS reais do deployment e Chromium/Playwright local em:

- `1440x900` desktop;
- `768x1024` tablet/touch;
- `390x844` mobile/touch.

Superfícies: Login, Recuperação com erro e Acesso indisponível com erro.

Resultado: sem overflow horizontal; layouts contidos; controles/CTAs touch com pelo menos 44 px; alerts presentes.

Limite: container sem rede/DNS externa. O snapshot **não é navegação live** e não certifica JS/hidratação, server actions, auth/sessão, mutações, drawer ou foco completo.

Detalhes: `docs/qa/fase51-ux-homologation.md`.

## Bloqueio real restante

Ainda faltam as pré-condições para a parte decisiva da NEXT_ACTION:

- browser live conectado ao deployment;
- sessão/credencial legítima aprovada;
- token legítimo quando necessário;
- estado/ambiente seguro para mutações.

Sem isso, não declarar homologados:

- login/logout real;
- seleção/troca de organização;
- convite → sessão → nova senha;
- bootstrap em estados legítimos adicionais;
- sidebar/drawer;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- foco/teclado e feedback pós-ação no runtime hidratado.

Não fabricar usuário, convite, fixture ou dado em Production.

## NEXT_ACTION imediata

### Concluir homologação UX live desktop/tablet/mobile quando as pré-condições existirem

Próxima execução:

1. reler governança/handoff;
2. consultar `main`, Issue #142, PRs, branches e CI reais;
3. observar somente deployment automático;
4. se o runtime não mudou, não repetir HTTP/HTML ou snapshot público já documentados;
5. verificar se surgiu browser live operável;
6. usar somente credencial/sessão/token legítimos;
7. percorrer Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
8. validar foco/teclado, drawer, touch targets, overflow, estados loading/empty/error/success, tabelas/formulários densos e `lista → detalhe → ação → retorno`;
9. mutar somente em estado seguro;
10. corrigir apenas achados concretos e revalidar;
11. promover reconciliação funcional apenas após evidência live representativa ou aceitação explícita de bloqueio externo.

## Guardrails

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret no Git/docs/browser; nenhum deploy manual/rotineiro; PENDINGs e Q-022 sem inferência; #75/#121 permanecem **TOTALMENTE ON HOLD**.
