# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

O núcleo operacional está consolidado, mas o sistema **ainda não deve ser considerado 100% concluído**. A auditoria final de produto identificou trabalho obrigatório antes de concluir homologação, negócio, migração/cutover e production-readiness.

Fonte de verdade da fila final:

- `docs/product/final-product-gap-audit.md`.

Baseline real antes deste PR documental:

- `main=75b36db62895bfdb67923afb348c45084e537365` — merge do PR #168;
- CI pós-merge #578 / run `33403368142`: **success**;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- Issue #142 aberta e ativa;
- #75/#121 abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Slices da Fase 51 já integradas

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
13. reconciliação documental da homologação — PR #168.

Não refazer essas slices sem bug/gap concreto.

## Novo gap P0 comprovado — runtime legado `/cadastros/*`

A auditoria encontrou uma árvore antiga de demonstração ainda presente no runtime, paralela ao workspace oficial:

- `src/app/cadastros/layout.tsx` usa `DemoWorkspaceProvider`;
- `/cadastros` ainda exibe `Fase 4`, `fixtures` e informa que alterações duram apenas durante a sessão;
- existem subrotas legadas para estrutura, produtos, fornecedores, estoque, inventários e validades.

Essas rotas **não pertencem à arquitetura de informação aprovada** e não podem permanecer como superfície concorrente de um produto final.

### Próxima slice obrigatória

Antes de ampliar a homologação UX:

1. inventariar toda a árvore `src/app/cadastros`;
2. mapear equivalentes oficiais em `/workspace`;
3. remover páginas legadas ou substituí-las por redirects seguros para as rotas oficiais;
4. preservar fixtures somente se ainda úteis para testes/engenharia, fora da experiência normal;
5. adicionar/ajustar testes que impeçam reintrodução de `Fase`, `fixtures`, `demonstração` e rotas demo concorrentes;
6. não alterar domínio, schema, RLS ou regras de negócio nessa limpeza;
7. manter CI verde.

## Telas auxiliares ainda a fechar

Depois da remoção do runtime legado, revisar e homologar os fluxos periféricos que ainda não estão totalmente no padrão compartilhado:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

Objetivo: primitives compartilhados quando aplicáveis, feedback acessível, foco/teclado, touch targets e estados loading/error/success consistentes. Não reescrever auth/RLS apenas por estética.

## Homologação UX continua obrigatória

A homologação completa desktop/tablet/mobile **não está encerrada**.

Ainda é necessário percorrer com browser real e sessão/ambiente seguro:

- Entrada/contexto;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

A evidência deve continuar em `docs/qa/fase51-ux-homologation.md`.

CI, build, CSS e inspeção estática não substituem a evidência de jornada exigida pelo Definition of Done.

## Depois da homologação UX

Executar **reconciliação funcional final usando critério de usabilidade**, requisito por requisito.

Pergunta de fechamento:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar também requisitos `SHOULD` relevantes para a implantação real, não apenas MUST/PENDING.

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

Q-022 permanece aberta e deve ser resolvida antes de configurar definitivamente quem pode fazer cada ação no go-live.

Revisar `open-questions.md` durante a reconciliação final e migrar/arquivar perguntas que já tenham sido resolvidas por decisões posteriores.

## Dados, migração e cutover

Antes de Production real:

1. homologar com dados representativos em ambiente seguro;
2. preparar estrutura, usuários/perfis e configurações reais;
3. congelar fontes finais;
4. executar preview/dry-run e tratar inconsistências;
5. executar importação final idempotente/rastreável;
6. reconciliar saldos/totais/amostras;
7. aprovar cutover e encerrar/transicionar as planilhas.

Production não recebe fixtures artificiais apenas para prova.

## #75/#121 — production-readiness final

Permanecem **TOTALMENTE ON HOLD** até o fechamento funcional/negócio/cutover, salvo decisão explícita do operador.

Somente no fim:

- comprovar backup PostgreSQL automático real;
- proteger Storage/binários quando aplicável;
- comprovar destino off-site, integridade e retenção;
- executar restore/drill isolado;
- reconciliar observabilidade/gates finais;
- fechar `REQ-PLAT-005`.

## Ordem oficial de fechamento atualizada

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros oficiais~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. ~~Caixa~~ — PR #161;
10. ~~Dashboard~~ — PR #163;
11. ~~limpeza de linguagem/resíduos de engenharia~~ — PR #165;
12. ~~primeiros achados públicos de UX~~ — PR #167;
13. **remover/redirectar runtime legado `/cadastros/*`**;
14. **fechar telas auxiliares de autenticação/contexto**;
15. **concluir homologação UX desktop/tablet/mobile**;
16. **reconciliação funcional final**;
17. **PENDINGs necessários + Q-022**;
18. **dados representativos e homologação operacional**;
19. **migração/cutover**;
20. **`REQ-PLAT-005` / #75/#121 e production-readiness final**.
