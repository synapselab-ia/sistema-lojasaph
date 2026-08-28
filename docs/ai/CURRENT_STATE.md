# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece como frente ativa.**

A primeira slice da Fase 51, remoção da entrada técnica do produto, foi concluída e integrada.

Estado integrado confirmado:

- `main=62c2f82546cc93dd2499c3c5f5a156be702879b3`;
- PR #145 `feat: remove technical entry from root`: merged por squash;
- CI do PR #509 / run `33183155459`: `success`;
- Business Transactions Integration #226 / run `33183155489`: `success`;
- CI pós-merge #510 / run `33183295797`: `success`;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhum deploy Vercel manual/rotineiro foi feito;
- nenhuma migration, RLS, regra de negócio ou dado Supabase foi alterado nesta slice.

Não refazer Fase 50/#138/#139, não refazer a auditoria que originou a Fase 51 e não refazer a slice de entrada já integrada.

## O que mudou na primeira slice da Fase 51

### Entrada `/`

A landing técnica foi removida. A raiz agora resolve o ponto de entrada no servidor:

- ambiente sem backend operacional permitido → `/login`;
- usuário não autenticado → `/login`;
- usuário autenticado → `/workspace`.

`/workspace` continua sendo o fluxo autoritativo já existente para decidir membership, `sem-acesso`, seleção de organização e workspace operacional. A raiz não duplicou essas regras.

O código de bootstrap/invite permanece intacto e continua sendo usado pelos fluxos existentes que já apontam para `/bootstrap`.

### Demonstração

O CTA `Abrir demonstração` foi removido do `RuntimeShell` normal.

As rotas/código de demonstração, incluindo `/cadastros`, **não foram apagados** nesta slice e continuam disponíveis para engenharia/testes sem serem promovidos ao usuário operacional.

### Testes

`src/lib/auth/redirect.test.ts` passou a cobrir o contrato de destino da raiz para:

- sessão não autenticada;
- sessão autenticada;
- ambiente isolado/sem backend operacional.

A validação completa do PR e da `main` pós-merge passou por lint, typecheck, unit tests, production build e suítes PostgreSQL/RLS.

## Diagnóstico de produto que permanece válido

O núcleo técnico está mais maduro do que a arquitetura de informação, as jornadas e a administrabilidade da UI. A partir da Fase 51, "backend/regra/tela existem" não basta para declarar uma necessidade pronta como produto.

Documento de autoridade:

- `docs/product/product-completion-ux-roadmap.md`.

A régua de fechamento considera se uma pessoa autorizada consegue executar a tarefa pela aplicação sem conhecimento técnico externo.

## Próxima slice da Fase 51

A próxima etapa aprovada é:

> **Arquitetura da informação + desenho da navegação desktop/mobile.**

Baseline de áreas já aprovada no roadmap:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

A próxima implementação deve primeiro mapear as rotas reais e os requisitos/permissões já existentes para essa hierarquia e só então alterar o shell de navegação. Não redesenhar páginas de módulo antes de fechar esse mapa.

Em especial, Estoque deve deixar de parecer cinco módulos independentes no menu principal e passar a agrupar posição, entradas, baixas, devoluções, transferências, inventários, lotes/validades e estoque mínimo como subáreas coerentes.

## Ordem oficial de fechamento do produto

1. ~~remover a entrada técnica atual~~ — concluído no PR #145;
2. fechar arquitetura da informação;
3. fechar navegação desktop/mobile;
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
