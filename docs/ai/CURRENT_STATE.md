# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

O núcleo operacional está consolidado, mas o sistema **ainda não deve ser considerado 100% concluído**. `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Baseline real corrente:

- `main=01da4646d8e2ae6c533bc81d66afb2fb9d60ec5c` — merge do PR #172;
- PR #172 — `docs: reconciliar evidência hospedada da homologação UX` — merged;
- CI pós-merge #588 / run `33427974722`: **success**;
- Issue #142 aberta e ativa;
- nenhum PR aberto no início desta slice;
- #75/#121 abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Slices da Fase 51 já integradas/concluídas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
6. Estoque consolidado — PR #155;
7. Compras consolidado — PR #157;
8. Financeiro consolidado — PR #159;
9. Caixa consolidado — PR #161;
10. Dashboard / Visão geral — PR #163;
11. limpeza de linguagem/resíduos de engenharia — PR #165;
12. primeira rodada pública de homologação UX e correções — PR #167;
13. reconciliação documental da homologação — PR #168;
14. auditoria final de gaps e fila de fechamento — PR #169;
15. neutralização do runtime legado `/cadastros/*` — PR #170;
16. fechamento das telas auxiliares de autenticação/contexto — PR #171;
17. reconciliação da evidência hospedada pública — PR #172.

Não refazer essas slices sem bug/gap concreto.

## Runtime hospedado corrente

O último deployment automático de aplicação continua sendo:

- Vercel deployment `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- state `READY`;
- target `production`;
- source `git`;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- alias canônico `sistema-lojasaph.vercel.app`.

Não existe deployment posterior para `01da4646...`, o que é coerente com o PR #172 ter alterado somente documentação. O código de aplicação servido permanece o mesmo já revalidado no PR #172. **Nenhum deploy manual foi disparado.**

A evidência HTTP/HTML já registrada para `/`, `/workspace`, `/recuperar-senha`, `/sem-acesso`, `/auth/atualizar-senha`, `/auth/invite`, `/bootstrap` e `/workspace/selecionar-organizacao` continua válida para esse runtime e não deve ser repetida por inércia.

## Nova evidência gráfica limitada — superfícies públicas

Foi encontrada capacidade local adicional:

- Chromium `144.0.7559.96` instalado;
- Python Playwright `1.57.0` instalado e capaz de lançar Chromium;
- porém o runtime local continua **sem saída de rede/DNS** para GitHub/Vercel e não consegue navegar o site hospedado diretamente;
- não existe outro conector de browser live exposto nesta sessão.

Para não confundir ausência de rede com ausência total de evidência gráfica, foi executada uma inspeção estática controlada usando:

1. SSR HTML real obtido do deployment automático via integração Vercel;
2. CSS real servido pelo mesmo deployment;
3. renderização local em Chromium/Playwright, sem alterar o conteúdo funcional;
4. viewports `1440x900` (desktop), `768x1024` (tablet/touch) e `390x844` (mobile/touch).

Superfícies verificadas:

- `/login`;
- `/recuperar-senha?error=Teste`;
- `/sem-acesso?error=Teste`.

Resultados nas nove combinações página × viewport:

- nenhum overflow horizontal;
- cards/conteúdo permaneceram contidos e legíveis na inspeção visual;
- em tablet/mobile, todos os controles e CTAs medidos ficaram com altura mínima de **44 px**;
- os alerts esperados permaneceram presentes;
- a sequência de Tab percorreu os controles na ordem do DOM no harness.

**Limite de evidência:** essa renderização não é uma sessão live do Next.js. Ela não certifica hidratação/JavaScript, navegação, server actions, redirects client-side, sessão, autenticação, mutações, drawer autenticado nem comportamento após ações. A aparência de foco não será usada como gate aprovado apenas por esse harness estático.

A matriz detalhada está em `docs/qa/fase51-ux-homologation.md`.

## Bloqueios restantes da homologação

A homologação completa **não está encerrada**.

Ainda faltam:

- browser live operável contra o deployment para navegação/interação real;
- sessão/credencial legítima aprovada para jornadas autenticadas;
- token legítimo para convite/recuperação/nova senha quando necessário;
- ambiente seguro para operações mutáveis representativas.

Portanto Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro, Caixa e os fluxos autenticados de contexto continuam sem certificação real de desktop/tablet/mobile.

Não promover para reconciliação funcional final até existir evidência representativa suficiente ou aceitação explícita do operador para adiar os bloqueios externos.

## Depois da homologação UX

Executar reconciliação funcional final usando o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## PENDINGs e negócio

Continuam sem inferência:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta e deve ser resolvida antes da configuração definitiva de perfis reais no go-live.

## Ordem oficial de fechamento

1. ~~entrada técnica / IA / design system / áreas principais / linguagem~~ — #145 a #165;
2. ~~primeiros achados públicos de UX~~ — #167;
3. ~~runtime legado `/cadastros/*`~~ — #170;
4. ~~telas auxiliares de autenticação/contexto~~ — #171;
5. ~~reconciliação da evidência hospedada pública~~ — #172;
6. **concluir homologação UX live desktop/tablet/mobile**;
7. **reconciliação funcional final**;
8. **PENDINGs necessários + Q-022**;
9. **dados representativos e homologação operacional**;
10. **migração/cutover**;
11. **`REQ-PLAT-005` / #75/#121 e production-readiness final**.
