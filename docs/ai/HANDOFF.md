# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

As duas primeiras slices estruturais da fase estão integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile.

Estado real confirmado:

- `main=3bc28e28a3a6e0d4b4b4543724942d308317d0f4` após o PR #147;
- CI final do PR #514 / run `33184629115`: success;
- Business Transactions Integration #228 / run `33184629114`: success;
- CI pós-merge #515 / run `33184891544`: success;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhuma migration, RLS, regra de negócio ou dado Supabase foi alterado;
- nenhum deploy Vercel manual/rotineiro foi realizado.

Não refazer #138/#139, a auditoria, a remoção da landing ou o desenho de navegação já integrado. Não reabrir a ordem aprovada sem nova evidência ou prioridade explícita.

## O que já foi concluído na Fase 51

### Entrada normal do produto

`/` encaminha server-side:

- backend operacional indisponível/bloqueado → `/login`;
- não autenticado → `/login`;
- autenticado → `/workspace`.

`/workspace` continua responsável por membership, `sem-acesso`, seleção de organização e operação. `Abrir demonstração` saiu da navegação normal; `/cadastros` continua apenas como rota interna de engenharia/teste.

### Arquitetura da informação

Contrato autoritativo da navegação atual:

- `docs/product/workspace-information-architecture.md`.

Primeiro nível integrado:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

Agrupamentos atuais:

- Estoque: `/workspace/estoque` + Baixas + Devoluções + Transferências + Inventários;
- Cadastros: Produtos + Fornecedores + Funcionários;
- Administração: somente Proteção dos dados, porque é a única experiência administrativa real já existente;
- Compras, Financeiro e Caixa continuam apontando às páginas atuais até suas slices próprias.

As URLs existentes foram preservadas. Não foram inventadas páginas de Entradas, Lotes/Validades, Recebimentos, Histórico, Estrutura ou Usuários/Permissões só para completar o menu.

### Navegação desktop/mobile

Desktop usa sidebar vertical persistente e agrupada.

Mobile usa barra superior + `Menu` + drawer vertical com a mesma hierarquia; a navegação principal deixou de depender de overflow horizontal.

O estado ativo entende subrotas sem ativar indevidamente a Visão geral.

### Autorização

O menu não decide acesso. Guards, RPCs e RLS continuam sendo a boundary autoritativa. Não esconder/liberar funcionalidade por inferência visual.

## Validação que não deve ser superestimada

PR #147 e `main` passaram lint, typecheck, unit tests, build, banco/RLS e Business Transactions.

**Não houve homologação visual em browser real nesta sessão.** O ambiente não conseguiu executar a aplicação localmente por limitação de rede, e não foi feito deploy Vercel para contornar isso porque deploy manual/rotineiro está proibido. A homologação real desktop/tablet/mobile permanece etapa posterior explícita da Fase 51.

## Próxima slice obrigatória

A próxima slice é:

> **Design system mínimo e padrões reutilizáveis de página.**

O próximo chat deve estabelecer uma fundação pequena antes de tocar em Administração/Cadastros/Estoque/Compras/Financeiro/Caixa em escala.

Direção esperada:

1. confirmar o estado real de `main`, Issue #142, PRs e CI;
2. ler `docs/product/product-completion-ux-roadmap.md`, `docs/product/workspace-information-architecture.md` e `docs/qa/definition-of-done.md`;
3. inventariar padrões repetidos em `RuntimeShell`, `globals.css` e páginas representativas;
4. definir contratos mínimos de componentes e estados reutilizáveis;
5. implementar apenas a fundação necessária para as próximas slices, sem refatoração massiva;
6. provar os componentes em pontos de baixo risco, preservando jornada e regras existentes;
7. documentar os padrões para que as próximas áreas não recriem estilos/feedback ad hoc.

`NEXT_ACTION.md` contém o escopo executável e os critérios de aceite.

## Baseline do design system aprovado pelo roadmap

O roadmap prevê, conforme necessidade real:

- AppShell/navegação;
- PageHeader;
- Button / IconButton;
- Input / Select / Textarea / FormField;
- StatusBadge;
- Card/superfície;
- DataTable responsiva;
- Tabs;
- Dialog/ConfirmDialog;
- Drawer;
- Toast/feedback;
- EmptyState;
- SearchField.

A próxima slice **não precisa refatorar todas as páginas para todos esses componentes de uma vez**. Deve criar o núcleo mínimo, coerente e reutilizável que desbloqueia Administração e as consolidações seguintes.

## Fora da próxima slice

Não usar a criação do design system para:

- redesenhar todas as páginas;
- alterar URLs/arquitetura de informação já fechadas;
- criar Estrutura ou Usuários/Permissões ainda;
- reorganizar jornadas internas de Estoque/Compras/Financeiro/Caixa;
- resolver `window.prompt()` em massa antes das slices dos módulos;
- mudar regras de negócio/autorização;
- tocar em migrations/RLS/Supabase sem necessidade comprovada;
- resolver requisitos PENDING;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Ordem oficial

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação~~ — PR #147;
3. ~~navegação desktop/mobile~~ — PR #147;
4. design system mínimo;
5. Administração;
6. Cadastros;
7. Estoque;
8. Compras;
9. Financeiro;
10. Caixa;
11. Dashboard;
12. limpeza de linguagem técnica;
13. homologação UX real;
14. reconciliação funcional final;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

## PENDING continua PENDING

Não promover por conveniência de UI:

- `REQ-ITEM-004` / produto de venda;
- `REQ-ITEM-005` / ficha técnica;
- `REQ-STK-007` / empréstimo;
- `REQ-STK-010` / custeio;
- `REQ-EXP-004` / FEFO;
- `REQ-FIN-004` / pagamento parcial/múltiplo final;
- `REQ-CASH-007` / consumo de funcionários;
- `REQ-CASH-008` / integração com vendas.

## #75/#121 permanecem ON HOLD

Não retomar scheduling, Storage, R2/S3, restore drills ou evidência automática de proteção durante a Fase 51. O hold só termina no fechamento funcional/homologação ou por nova instrução explícita do operador.

## Próximo chat

Consultar GitHub real e `NEXT_ACTION.md`, criar branch a partir da `main` vigente e executar somente a slice de **design system mínimo e padrões reutilizáveis**. Não refazer entrada/navegação e não saltar para Administração ou refatoração de módulos antes de concluir essa fundação.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
