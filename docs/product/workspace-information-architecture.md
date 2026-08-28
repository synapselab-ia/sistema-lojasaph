# Workspace — Arquitetura da informação e navegação

Status: **implementado na segunda slice da Fase 51 / Issue #142**  
Data: **2026-08-28**

## Objetivo

Organizar o workspace pelo modelo mental da operação sem criar páginas ausentes, alterar regras de autorização ou refatorar os módulos internos antes das slices próprias.

O primeiro nível aprovado é:

1. Visão geral;
2. Estoque;
3. Compras;
4. Financeiro;
5. Caixa;
6. Cadastros;
7. Administração.

## Mapa rota → área/subárea

| Rota atual | Área | Subárea/cobertura atual | Decisão nesta slice |
| --- | --- | --- | --- |
| `/workspace` | Visão geral | Painel operacional atual | Mantida como destino direto de Visão geral. |
| `/workspace/estoque` | Estoque | Posição/saldos, entradas, retiradas, lotes/validades e estoque mínimo hoje concentrados na mesma página | Mantida como entrada principal da área Estoque. Não foram criadas rotas artificiais para capacidades que ainda vivem nesta página. |
| `/workspace/baixas` | Estoque | Baixas/perdas | Passa a aparecer como subárea de Estoque. |
| `/workspace/devolucoes` | Estoque | Devoluções | Passa a aparecer como subárea de Estoque. |
| `/workspace/transferencias` | Estoque | Transferências | Passa a aparecer como subárea de Estoque. |
| `/workspace/inventarios` | Estoque | Inventários | Passa a aparecer como subárea de Estoque. |
| `/workspace/compras` | Compras | Pedidos, recebimentos e histórico ainda compartilhando a página atual | Mantida como destino direto de Compras até a consolidação própria do módulo. |
| `/workspace/financeiro` | Financeiro | Contas/documentos, vencimentos e pagamentos ainda compartilhando a página atual | Mantida como destino direto de Financeiro até a consolidação própria do módulo. |
| `/workspace/caixa` | Caixa | Situação, sessões, movimentações, fechamento e histórico ainda compartilhando a página atual | Mantida como destino direto de Caixa até a consolidação própria do módulo. |
| `/workspace/produtos` | Cadastros | Produtos | Passa a aparecer sob Cadastros. |
| `/workspace/fornecedores` | Cadastros | Fornecedores | Passa a aparecer sob Cadastros. |
| `/workspace/funcionarios` | Cadastros | Funcionários | Passa a aparecer sob Cadastros. |
| `/workspace/backup` | Administração | Proteção dos dados | Única subárea administrativa operacional já existente promovida nesta slice. |
| `/workspace/selecionar-organizacao` | Contexto do workspace | Seleção/troca de organização | Continua como fluxo contextual e utilitário `Trocar organização`, não como módulo de negócio. |

## Lacunas conhecidas que não viram links

A taxonomia de produto prevê Administração mais ampla, mas estas experiências ainda não existem de forma suficiente no workspace e **não foram inventadas para completar o menu**:

- Estrutura organizacional (unidades, setores e locais);
- Usuários e permissões;
- configurações administrativas adicionais.

Essas lacunas permanecem para a etapa própria da Fase 51.

Também não foram criadas rotas separadas de Entradas, Lotes/Validades, Estoque mínimo, Pedidos, Recebimentos, Pagamentos ou Histórico quando a implementação atual ainda as concentra em páginas existentes. A separação de jornadas e URLs pertence às slices de consolidação de cada área.

## Contrato de navegação desktop

- sidebar persistente à esquerda;
- sete áreas reconhecíveis no primeiro nível;
- Estoque mantém `/workspace/estoque` como entrada da área e apresenta Baixas, Devoluções, Transferências e Inventários como destinos subordinados;
- Cadastros apresenta Produtos, Fornecedores e Funcionários como destinos subordinados;
- Administração apresenta apenas Proteção dos dados enquanto for a única tela real da área;
- área ativa permanece evidente quando uma subárea está selecionada;
- links reconhecem subrotas futuras de detalhe sem fazer `/workspace` ficar ativo em todas as páginas;
- URLs existentes são preservadas integralmente nesta slice.

## Contrato de navegação mobile

- a barra horizontal com overflow deixa de ser o mecanismo principal;
- uma barra superior fixa oferece acesso explícito ao `Menu`;
- o menu abre um drawer vertical com a mesma hierarquia do desktop;
- o drawer possui overlay e ação explícita de fechamento;
- selecionar um destino fecha o menu;
- a lista pode rolar verticalmente sem transformar áreas em uma faixa horizontal difícil de orientar.

## Autorização e segurança

Esta arquitetura **não define autorização**.

- nenhum item é escondido ou liberado por inferência a partir de `roles` no shell;
- guards, RPCs, policies e RLS existentes continuam sendo a boundary autoritativa;
- a mudança não altera queries, regras de estoque/financeiro/caixa ou escopos;
- `/workspace/backup` mantém o contrato de leitura já existente;
- seleção de organização e membership continuam sendo resolvidos pelo runtime atual.

## Fora do escopo desta slice

- design system completo;
- refatoração interna das páginas de Estoque, Compras, Financeiro ou Caixa;
- novas páginas de Administração;
- alteração de migrations/RLS/Supabase;
- resolução de requisitos PENDING;
- retomada de #75/#121;
- deploy Vercel manual/rotineiro.

## Próxima etapa

Depois da integração desta arquitetura e da navegação desktop/mobile, a sequência aprovada da Fase 51 promove:

> **Design system mínimo e padrões reutilizáveis de página.**
