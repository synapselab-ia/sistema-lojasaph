# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

Slices integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo e padrões reutilizáveis.

Estado real confirmado após o PR #149:

- `main=14f1e98f7e78b229b57457c44ac5a1fd512e2254`;
- CI do PR #518 / run `33186337616`: success;
- Inventory Count Integration #242 / run `33186337684`: success;
- Business Transactions Integration #229 / run `33186337724`: success;
- CI pós-merge #519 / run `33186464104`: success;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhuma migration/RLS/regra de negócio/query operacional/dado Supabase foi alterado no design system;
- nenhum deploy Vercel manual/rotineiro foi realizado.

Não refazer #138/#139, a auditoria, a entrada, o desenho de navegação ou o design system mínimo já integrados.

## Design system que agora é baseline

Documento:

- `docs/product/design-system.md`.

Import público:

- `src/components/ui/index.ts`.

Disponível hoje:

- `PageHeader`;
- `Button` (`primary`, `secondary`, `danger`, `ghost`; disabled/loading);
- `FormField` + `Input` / `Select` / `Textarea`;
- `Panel`;
- `StatusBadge`;
- `FeedbackMessage`;
- `EmptyState`;
- `Drawer`;
- `Dialog` / `ConfirmDialog`;
- modal layer compartilhado com Escape, trap básico de foco, scroll lock e restauração de foco.

Pontos já migrados/provados:

- `RuntimeShell` — Drawer/Button;
- Login — painel, feedback, campos e botão;
- Proteção dos dados — cabeçalho, painéis, badge e empty state.

Não interpretar a existência desses componentes como autorização para migrar todas as páginas de uma vez. A migração ampla acompanha as slices funcionais de cada área.

Ainda fora da fundação inicial:

- DataTable/lista responsiva genérica;
- Tabs;
- Toast;
- SearchField/filtros;
- paginação;
- componentes de domínio específicos.

Criá-los somente quando uma jornada real fornecer contrato suficiente.

## Validação que não deve ser superestimada

Código, testes e banco estão verdes no PR e novamente na `main`.

**Não houve homologação visual em browser real nesta sessão.** Não registrar drawer/dialog/foco/responsividade como homologados apenas por build/CI. A validação real desktop/tablet/mobile continua na etapa explícita posterior da Fase 51.

## Próxima slice obrigatória

A próxima slice é:

> **Administração — Estrutura + Usuários/Permissões.**

Antes de editar UI, o próximo chat deve:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler `docs/product/product-completion-ux-roadmap.md`, `workspace-information-architecture.md`, `design-system.md`, `docs/qa/definition-of-done.md` e `docs/product/open-questions.md`;
3. inventariar o modelo e persistência já existentes para Organization, Business, Unit, Sector e StockLocation;
4. inventariar membership, roles, escopos, associação/invite de identidade e RLS existentes;
5. localizar APIs/repositories/adapters/actions já disponíveis e gaps reais de administrabilidade;
6. só então desenhar as jornadas e páginas administrativas, reutilizando o design system integrado.

`NEXT_ACTION.md` contém a delimitação executável e os critérios de aceite.

## Q-022 é um guardrail, não uma resposta

`docs/product/open-questions.md` ainda contém:

- **Q-022 — Quem pode fazer cada ação?**

Ela está aberta. Portanto:

- não inventar perfis reais;
- não inventar nova matriz de permissões para fazer a UI parecer completa;
- não assumir que nomes técnicos de roles equivalem aos perfis finais do cliente;
- preservar guards/RPCs/RLS existentes como fronteira técnica;
- quando a UI puder expor apenas capacidades já sustentadas pela política atual, fazê-lo;
- quando a experiência depender de uma decisão real não documentada, registrar a lacuna em vez de decidir silenciosamente.

## Objetivo de Administração

Conforme o roadmap, a área precisa evoluir para permitir, dentro do que a autorização existente suporta:

### Estrutura

- visualizar a estrutura organizacional;
- cadastrar/editar unidades, setores e locais de estoque quando o backend já suportar a operação corretamente;
- manter relações entre entidades;
- usar inativação em vez de exclusão destrutiva quando essa for a regra existente/segura;
- não inventar cascade ou regra de exclusão.

### Usuários/Permissões

- apresentar pessoas e acessos sem exigir UUID técnico na experiência normal;
- mostrar acesso, papel e escopo de forma compreensível quando os dados existentes permitirem;
- oferecer associação/convite/alteração/revogação somente nos limites comprovados da política existente;
- separar conceitualmente Employee de identidade/autorização de acesso.

A slice pode descobrir que alguma mutação administrativa ainda não possui boundary seguro/adequado. Nesse caso, implementar o menor backend necessário com migration/RLS/testes somente se a necessidade estiver comprovada; não criar SQL por antecipação.

## Fora da próxima slice

Não usar Administração para:

- refatorar Cadastros, Estoque, Compras, Financeiro ou Caixa;
- resolver UUID técnico de Funcionários por uma refatoração ampla fora do contexto administrativo;
- resolver requisitos PENDING;
- redefinir toda a política de acesso sem decisão de negócio;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro;
- criar componentes genéricos de design system sem uso real na jornada administrativa.

## Ordem oficial

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação~~ — PR #147;
3. ~~navegação desktop/mobile~~ — PR #147;
4. ~~design system mínimo~~ — PR #149;
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

Consultar GitHub real e `NEXT_ACTION.md`, criar branch a partir da `main` vigente e executar somente a slice de **Administração — Estrutura + Usuários/Permissões**. Começar pelo inventário de modelo, autorização e boundaries existentes; não começar pela tela nem pela invenção de perfis.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
