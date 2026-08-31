# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

O núcleo operacional está consolidado, mas o sistema **ainda não deve ser considerado 100% concluído**. A auditoria de gaps em `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Baseline corrente:

- `main=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- CI pós-merge #586 / run `33426777989`: **success**;
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
16. fechamento das telas auxiliares de autenticação/contexto — PR #171.

Não refazer essas slices sem bug/gap concreto.

## Homologação UX — evidência hospedada corrente

O deployment automático atual corresponde exatamente à `main`:

- Vercel deployment `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- state `READY`;
- target `production`;
- source `git`;
- `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b`;
- alias canônico `sistema-lojasaph.vercel.app` sem erro.

Nenhum deploy manual foi disparado.

A versão hospedada corrente foi revalidada no limite HTTP/HTML real:

- `/` sem sessão → Login, sem landing técnica;
- `/workspace` sem sessão → Login com `next=/workspace` e alerta de sessão expirada;
- `/recuperar-senha` → UX-51-001/002 confirmados corrigidos no deployment corrente (`min-h-11` no retorno e erro com `role="alert"`);
- `/sem-acesso` → UX-51-003 confirmado corrigido (`min-h-11` nas ações e erro com `role="alert"`);
- `/auth/atualizar-senha` sem sessão válida → Login com alerta de link expirado;
- `/auth/invite` → estado inicial hospedado usa `aria-busy`, `role="status"` e `aria-live`;
- `/bootstrap` → estado real atual informa configuração inicial desabilitada e mantém CTA coerente;
- `/workspace/selecionar-organizacao` sem sessão → Login preservando o `next` canônico.

A matriz detalhada está em `docs/qa/fase51-ux-homologation.md`.

## Bloqueios restantes da homologação

A homologação completa **não está encerrada**.

Nesta sessão:

- não há browser gráfico operável exposto para certificar viewport, foco, teclado, drawer, overflow ou screenshots;
- não há sessão/credencial legítima aprovada nem token legítimo para jornadas autenticadas/convite/recuperação;
- nenhum usuário, convite, fixture ou dado artificial foi criado em Production para fabricar evidência.

Portanto desktop/tablet/mobile e as áreas autenticadas continuam sem certificação real. CI, CSS e HTML hospedado são evidências auxiliares e não substituem browser.

A revalidação pública HTTP/HTML da `main` corrente está concluída e não deve ser repetida por inércia sem mudança de deployment ou novo achado.

## Próxima slice obrigatória — concluir homologação UX real

Usar `docs/qa/fase51-ux-homologation.md` como matriz executável quando houver as pré-condições de evidência.

Jornadas mínimas:

- Entrada/contexto: login, recuperação, nova senha, convite, bootstrap quando aplicável, seleção/troca de organização, logout e acesso negado;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Para cada jornada, validar em desktop/tablet/mobile: navegação, foco/teclado, drawer, touch targets, overflow, tabelas/formulários densos, loading/empty/error/success, linguagem operacional e `lista → detalhe → ação → retorno` quando aplicável.

Não promover para reconciliação funcional final até existir evidência representativa suficiente ou aceitação explícita do operador para adiar bloqueios externos.

## Depois da homologação UX

Executar reconciliação funcional final usando o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar MUST e SHOULD relevantes à implantação real.

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

## #75/#121 — production-readiness final

Permanecem **TOTALMENTE ON HOLD** até o fechamento funcional/negócio/cutover, salvo decisão explícita do operador.

Somente no fim retomar backup PostgreSQL real, Storage/binários, destino off-site, integridade/retenção, restore/drill, observabilidade/gates e `REQ-PLAT-005`.

## Ordem oficial de fechamento

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
14. ~~telas auxiliares de autenticação/contexto~~ — PR #171;
15. **concluir homologação UX desktop/tablet/mobile**;
16. **reconciliação funcional final**;
17. **PENDINGs necessários + Q-022**;
18. **dados representativos e homologação operacional**;
19. **migração/cutover**;
20. **`REQ-PLAT-005` / #75/#121 e production-readiness final**.
