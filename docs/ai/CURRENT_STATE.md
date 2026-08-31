# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

O núcleo operacional está consolidado, mas o sistema **ainda não deve ser considerado 100% concluído**. A fila final continua em `docs/product/final-product-gap-audit.md`.

Baseline anterior a esta slice:

- `main=6f0c0cfcd0e969335cd4d23ddefd1a2ef17dad11` — merge do PR #169;
- CI #580 / run `33424103707`: **success**;
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
13. reconciliação documental da homologação — PR #168;
14. auditoria final de gaps e fila de fechamento — PR #169;
15. neutralização do runtime legado `/cadastros/*` — PR #170.

Não refazer essas slices sem bug/gap concreto.

## P0 `/cadastros/*` — resolvido

A árvore antiga de demonstração foi inventariada e neutralizada sem alterar domínio, persistência ou autorização.

Mapeamento de compatibilidade:

- `/cadastros` → `/workspace`;
- `/cadastros/estrutura` → `/workspace/administracao/estrutura`;
- `/cadastros/produtos` → `/workspace/produtos`;
- `/cadastros/fornecedores` → `/workspace/fornecedores`;
- `/cadastros/estoque` → `/workspace/estoque`;
- `/cadastros/inventarios` → `/workspace/inventarios`;
- `/cadastros/validades` → `/workspace/estoque/lotes`.

As páginas antigas não montam mais `DemoWorkspaceProvider`/`AdminShell` nem expõem UI de fixtures. `src/app/cadastros/legacy-routes.test.ts` protege os redirects e impede `/cadastros` na navegação canônica.

## Próxima slice obrigatória — telas auxiliares de autenticação/contexto

Revisar e fechar os fluxos periféricos:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

Objetivo:

- reutilizar primitives compartilhados quando aplicável;
- padronizar feedback acessível, loading/error/success e ações;
- validar foco, teclado e touch targets;
- homologar o fluxo real quando houver token/sessão legítimos;
- **não** reimplementar auth, RLS ou regras de autorização por estética.

## Homologação UX continua obrigatória

A homologação completa desktop/tablet/mobile **não está encerrada**. Depois das telas auxiliares, percorrer com browser real e sessão/ambiente seguro:

- Entrada/contexto;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

A evidência continua em `docs/qa/fase51-ux-homologation.md`. CI, build, CSS e inspeção estática não substituem a evidência de jornada exigida pelo Definition of Done.

## Depois da homologação UX

Executar reconciliação funcional final usando critério de usabilidade, requisito por requisito.

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
13. ~~runtime legado `/cadastros/*`~~ — PR #170;
14. **fechar telas auxiliares de autenticação/contexto**;
15. **concluir homologação UX desktop/tablet/mobile**;
16. **reconciliação funcional final**;
17. **PENDINGs necessários + Q-022**;
18. **dados representativos e homologação operacional**;
19. **migração/cutover**;
20. **`REQ-PLAT-005` / #75/#121 e production-readiness final**.
