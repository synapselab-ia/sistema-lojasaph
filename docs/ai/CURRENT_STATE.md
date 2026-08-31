# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Regra de baseline

**Não usar este arquivo como fonte do SHA corrente de `main`.** O primeiro passo de toda execução continua sendo consultar GitHub para `main`, PRs, Issues, branches e CI reais. Isso evita que um merge puramente documental torne o próprio handoff obsoleto.

Os SHAs abaixo são **âncoras de evidência/runtime**, não uma alegação de HEAD atual do repositório.

## Estado do produto

**Fase 51 / Issue #142 permanece ativa.**

O núcleo operacional está consolidado, mas o produto ainda não deve ser declarado 100% concluído. `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Estado verificado nesta rodada:

- PR #173 — `docs: reconciliar baseline e evidência gráfica pública da Fase 51` — merged;
- merge #173: `a3ae77a4e43da8e5c13ede27b65a4bc3653f383c`;
- CI do PR #173 #589 / run `33430536367`: **success**;
- CI pós-merge #590 / run `33430695863`: **success**;
- Issue #142 continua aberta;
- #75/#121 continuam **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual foi disparado.

## Slices da Fase 51 integradas

#145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172 e #173.

Não refazer essas slices sem bug/gap concreto.

## Runtime hospedado de aplicação

O último deployment automático de aplicação observado continua sendo:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, target `production`, source `git`;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- alias canônico `sistema-lojasaph.vercel.app`.

PRs #172 e #173 foram documentais; não introduziram novo runtime de aplicação. Portanto não existe motivo para deploy manual apenas para alinhar SHA documental e deployment.

A evidência HTTP/HTML já registrada para as superfícies públicas continua válida enquanto esse runtime não mudar.

## Evidência pública já obtida

### HTTP/HTML hospedado

Cobertos no runtime automático:

- `/` sem sessão;
- `/workspace` sem sessão;
- `/recuperar-senha`;
- `/sem-acesso`;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real corrente de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

UX-51-001, UX-51-002 e UX-51-003 permanecem tratados/revalidados nesse nível de evidência.

### Snapshot gráfico estático

Capacidade descoberta:

- Chromium `144.0.7559.96`;
- Python Playwright `1.57.0`;
- Chromium headless lança corretamente;
- container sem saída de rede/DNS para GitHub/Vercel;
- nenhum browser live conectado disponível.

Foi renderizado localmente o SSR HTML + CSS reais obtidos pela integração Vercel para:

- Login;
- Recuperação com erro;
- Acesso indisponível com erro.

Viewports:

- desktop `1440x900`;
- tablet/touch `768x1024`;
- mobile/touch `390x844`.

Resultados:

- sem overflow horizontal nas 9 combinações;
- layout visualmente contido;
- em tablet/mobile, controles/CTAs medidos com altura mínima de 44 px;
- alerts esperados presentes;
- Tab percorreu a ordem DOM no harness.

**Esse snapshot não é browser live.** Não certifica hidratação/JS, navegação Next, server actions, sessão, mutações, drawer autenticado nem foco completo no runtime live.

A matriz detalhada está em `docs/qa/fase51-ux-homologation.md`.

## Bloqueios restantes

A homologação UX completa ainda exige:

- browser live capaz de abrir e interagir com o deployment;
- sessão/credencial legítima aprovada;
- token legítimo quando convite/recuperação/nova senha forem necessários;
- ambiente/estado seguro para operações mutáveis.

Enquanto isso permanecer indisponível, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro, Caixa e fluxos autenticados/contextuais não podem ser declarados homologados em desktop/tablet/mobile.

Não promover para reconciliação funcional final até existir evidência live representativa suficiente ou aceitação explícita do operador para adiar limitação externa.

## Depois da homologação UX

Executar reconciliação funcional requisito por requisito usando o gate:

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

## Ordem oficial de fechamento

1. consolidação estrutural/UX já integrada;
2. **homologação UX live desktop/tablet/mobile**;
3. reconciliação funcional final;
4. PENDINGs necessários + Q-022;
5. dados representativos/homologação operacional;
6. migração/cutover;
7. #75/#121 / `REQ-PLAT-005` como production-readiness final.
