# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece como frente ativa.**

As três primeiras slices estruturais da Fase 51 estão concluídas e integradas:

1. remoção da entrada técnica do produto — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149.

Estado integrado confirmado:

- `main=14f1e98f7e78b229b57457c44ac5a1fd512e2254` após o merge do PR #149;
- PR #149 `feat(ui): establish minimal design system`: merged por squash;
- CI do PR #518 / run `33186337616`: `success`;
- Inventory Count Integration #242 / run `33186337684`: `success`;
- Business Transactions Integration #229 / run `33186337724`: `success`;
- CI pós-merge #519 / run `33186464104`: `success`;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhum deploy Vercel manual/rotineiro foi feito;
- nenhuma migration, RLS, regra de negócio, query operacional ou dado Supabase foi alterado nesta slice.

Não refazer Fase 50/#138/#139, a auditoria que originou a Fase 51, a entrada técnica, a arquitetura/navegação ou o design system mínimo já integrados sem nova evidência.

## O que já foi fechado na Fase 51

### 1. Entrada normal do produto — PR #145

`/` encaminha server-side para o fluxo existente de login/workspace. O CTA de demonstração saiu da experiência normal; as rotas demo permanecem apenas para engenharia/teste.

### 2. Arquitetura da informação e navegação — PR #147

Contrato:

- `docs/product/workspace-information-architecture.md`.

Primeiro nível do workspace:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

Desktop usa sidebar agrupada; mobile usa menu + drawer vertical. URLs existentes foram preservadas e autorização continua em guards/RPCs/RLS, não no menu.

### 3. Design system mínimo — PR #149

Contrato:

- `docs/product/design-system.md`.

Camada pública:

- `src/components/ui/index.ts`.

Fundação integrada:

- `PageHeader`;
- `Button` com variantes `primary`, `secondary`, `danger`, `ghost`, além de disabled/loading;
- `FormField` + `Input` / `Select` / `Textarea`;
- `Panel`;
- `StatusBadge`;
- `FeedbackMessage`;
- `EmptyState`;
- `Drawer`;
- `Dialog` / `ConfirmDialog`;
- modal layer compartilhado com `Escape`, trap básico de `Tab`, bloqueio de scroll e restauração de foco;
- contratos puros de estilos/tons/tamanhos e foco visível global.

Pontos de prova deliberadamente pequenos:

- `RuntimeShell` reutiliza `Drawer` e `Button` sem mudar a arquitetura de navegação;
- Login reutiliza `Panel`, feedback, campos e `Button` sem mudar autenticação;
- Proteção dos dados reutiliza `PageHeader`, `Panel`, `StatusBadge` e `EmptyState` sem mudar query, semântica de proteção ou RLS.

Não houve migração cosmética em massa das páginas de domínio.

Componentes deliberadamente adiados até existir contrato de jornada suficiente:

- DataTable/lista responsiva genérica;
- Tabs;
- Toast global;
- SearchField/filtros;
- paginação;
- componentes específicos de Estoque, Compras, Financeiro, Caixa e Dashboard.

## Validação e limitação de homologação visual

PR #149 passou:

- lint;
- typecheck;
- unit tests, incluindo contratos do design system;
- production build;
- suítes PostgreSQL/RLS;
- Inventory Count Integration;
- Business Transactions Integration.

A `main` pós-merge passou novamente a CI #519 completa.

**Não houve homologação visual em browser real nesta sessão.** A infraestrutura disponível para esta execução não forneceu um runtime browser da aplicação, e o projeto continua proibindo deploy Vercel manual/rotineiro como atalho para prova. Não declarar foco, drawer/dialog ou responsividade homologados visualmente apenas com base em código/CI; a homologação real de jornadas permanece etapa posterior da Fase 51.

## Próxima slice da Fase 51

A próxima etapa aprovada é:

> **Administração — Estrutura + Usuários/Permissões.**

A próxima implementação deve primeiro reconciliar o backend/modelo já existente para Organization/Business/Unit/Sector/StockLocation, memberships, papéis/escopos, convites/identidade e RLS antes de desenhar telas.

Ponto obrigatório: `docs/product/open-questions.md` mantém **Q-022 — Quem pode fazer cada ação?** aberta. A próxima slice não pode inventar perfis reais ou uma nova matriz de acesso para preencher a UI. Deve preservar a política técnica existente e delimitar qualquer lacuna de negócio ainda não decidida.

O design system integrado deve ser reutilizado onde couber; não criar uma segunda convenção visual na Administração.

## Ordem oficial de fechamento do produto

1. ~~remover a entrada técnica atual~~ — PR #145;
2. ~~fechar arquitetura da informação~~ — PR #147;
3. ~~fechar navegação desktop/mobile~~ — PR #147;
4. ~~criar design system mínimo~~ — PR #149;
5. fechar Administração: Estrutura + Usuários/Permissões;
6. refatorar Cadastros no padrão lista/detalhe/ação;
7. consolidar Estoque;
8. consolidar Compras;
9. consolidar Financeiro;
10. consolidar Caixa;
11. revisar Dashboard após os destinos principais;
12. limpar linguagem/resíduos de engenharia;
13. homologar UX em jornadas desktop/tablet/mobile;
14. executar nova reconciliação funcional com régua de produto;
15. resolver apenas PENDINGs necessários;
16. homologar com dados representativos;
17. preparar/executar migração e cutover real;
18. retomar `REQ-PLAT-005` como production-readiness final.

## PENDING permanece sem inferência

Continuam PENDING até decisão real de negócio:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

A consolidação de UI não autoriza resolver essas regras por conveniência visual.

## #75/#121 — TOTALMENTE ON HOLD

Não investigar scheduling, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar Storage/R2/S3/retention/secrets/variables e não retomar restore nesta fase.

`REQ-PLAT-005` será retomado como etapa final de production-readiness depois do fechamento funcional/homologação, salvo revogação explícita do operador.
