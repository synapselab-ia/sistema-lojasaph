# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece como frente ativa.**

As duas primeiras slices estruturais da Fase 51 estão concluídas e integradas:

1. remoção da entrada técnica do produto — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147.

Estado integrado confirmado:

- `main=3bc28e28a3a6e0d4b4b4543724942d308317d0f4` após o merge do PR #147;
- PR #147 `feat: group workspace navigation by product area`: merged por squash;
- CI final do PR #514 / run `33184629115`: `success`;
- Business Transactions Integration #228 / run `33184629114`: `success`;
- CI pós-merge #515 / run `33184891544`: `success`;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhum deploy Vercel manual/rotineiro foi feito;
- nenhuma migration, RLS, regra de negócio ou dado Supabase foi alterado nesta slice.

Não refazer Fase 50/#138/#139, não refazer a auditoria que originou a Fase 51, não refazer a slice de entrada e não reconstruir a arquitetura de navegação já integrada sem nova evidência.

## O que já foi fechado na Fase 51

### 1. Entrada normal do produto — PR #145

A raiz `/` não renderiza mais landing técnica. O contrato atual é server-side:

- ambiente sem backend operacional permitido → `/login`;
- usuário não autenticado → `/login`;
- usuário autenticado → `/workspace`.

`/workspace` continua sendo a autoridade para membership, `sem-acesso`, seleção de organização e operação. O CTA `Abrir demonstração` saiu do `RuntimeShell`; as rotas demo permanecem apenas para engenharia/testes.

### 2. Arquitetura da informação e navegação — PR #147

Documento de contrato:

- `docs/product/workspace-information-architecture.md`.

O primeiro nível do workspace agora segue as sete áreas aprovadas:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

A navegação deixou de tratar 13 destinos como módulos equivalentes.

Mapeamento integrado, preservando URLs existentes:

- `/workspace` → Visão geral;
- `/workspace/estoque` → entrada da área Estoque;
- `/workspace/baixas`, `/workspace/devolucoes`, `/workspace/transferencias`, `/workspace/inventarios` → subáreas de Estoque;
- `/workspace/compras` → Compras;
- `/workspace/financeiro` → Financeiro;
- `/workspace/caixa` → Caixa;
- `/workspace/produtos`, `/workspace/fornecedores`, `/workspace/funcionarios` → Cadastros;
- `/workspace/backup` → Administração / Proteção dos dados;
- `/workspace/selecionar-organizacao` continua sendo fluxo contextual, não módulo de negócio.

Não foram inventadas páginas de Entradas, Lotes/Validades, Recebimentos, Histórico, Estrutura ou Usuários/Permissões apenas para completar a taxonomia. As capacidades que ainda vivem em megapáginas continuam nas rotas atuais até as respectivas slices de consolidação.

### Desktop

O workspace usa sidebar vertical persistente, com áreas e subáreas agrupadas e estado ativo coerente. Subrotas futuras de detalhe podem manter o destino pai ativo sem fazer `/workspace` ficar ativo em toda a aplicação.

### Mobile

A faixa horizontal com `overflow-x` deixou de ser o mecanismo principal. O shell agora usa barra superior com ação `Menu` e drawer vertical com a mesma hierarquia do desktop, overlay, fechamento explícito e fechamento após seleção de destino.

### Autorização

A navegação não virou fronteira de segurança e não infere autorização a partir de `roles` para liberar operações. Guards existentes, RPCs e RLS continuam autoritativos.

## Validação e limitação de homologação visual

A slice foi validada por contrato de código e CI:

- testes do mapa/ordem de áreas, alcance das rotas, agrupamento de Estoque, estado ativo em subrotas e ausência de rota demo na navegação normal;
- lint;
- typecheck;
- unit tests;
- production build;
- suítes PostgreSQL/RLS;
- Business Transactions Integration.

**Não houve homologação visual em browser real nesta sessão.** O ambiente disponível não conseguiu clonar/executar a aplicação por rede e o projeto proíbe deploy Vercel manual/rotineiro para esse tipo de prova. Não declarar a experiência mobile/desktop homologada apenas com base em CSS/CI; a homologação real por jornadas permanece na etapa própria da Fase 51.

## Diagnóstico de produto que permanece válido

O núcleo técnico está mais maduro do que as jornadas e a administrabilidade da UI. A partir da Fase 51, "backend/regra/tela existem" não basta para declarar uma necessidade pronta como produto.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/qa/definition-of-done.md`.

## Próxima slice da Fase 51

A próxima etapa aprovada é:

> **Design system mínimo e padrões reutilizáveis de página.**

A próxima implementação deve criar uma fundação pequena e operacional antes de refatorar Administração, Cadastros, Estoque, Compras, Financeiro ou Caixa em escala.

O objetivo não é redesenhar todas as páginas. É reduzir classes/contratos ad hoc e estabelecer componentes reutilizáveis para cabeçalho de página, ações, campos, superfícies, estados, feedback e overlays, provando-os em uma área de baixo risco.

## Ordem oficial de fechamento do produto

1. ~~remover a entrada técnica atual~~ — concluído no PR #145;
2. ~~fechar arquitetura da informação~~ — concluído no PR #147;
3. ~~fechar navegação desktop/mobile~~ — concluído no PR #147;
4. criar design system mínimo;
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

Nenhuma nova feature grande independente deve furar esta sequência sem bug crítico, segurança, obrigação operacional urgente ou nova prioridade explícita do operador.

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

A decisão de 2026-08-28 permanece válida. Não investigar schedules, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar R2/S3/retention/secrets/variables e não retomar Storage/restore nesta fase.

`REQ-PLAT-005` será retomado como etapa final de production-readiness depois do fechamento funcional/homologação, salvo revogação explícita do operador.
