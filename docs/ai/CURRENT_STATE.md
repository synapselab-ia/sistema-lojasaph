# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX é a frente ativa por prioridade explícita do operador.**

Estado integrado confirmado:

- `main=c015024fb2a05e9cdc8162029a13b4018cb8de91` após o merge documental;
- PR #143 `docs: establish product completion and UX consolidation roadmap`: merged;
- CI pós-merge #506 / run `33181212548`: `success`;
- Issue #142 permanece aberta como frente ativa;
- #75 e #121 continuam abertas e TOTALMENTE ON HOLD em `REQ-PLAT-005`;
- nenhuma implementação da primeira slice da Fase 51 foi iniciada ainda;
- a próxima branch de implementação deve nascer da `main` real no início da próxima sessão.

Não refazer Fase 50/#138/#139 e não refazer a auditoria que originou a Fase 51.

## Mudança de diagnóstico pós-Fase 50

A reconciliação anterior concluiu que não havia novo MUST/SHOULD funcional independente. Essa conclusão era correta sob a régua técnica usada até então, mas a auditoria de fechamento encontrou um gap real de produto: **o núcleo técnico está mais maduro do que a arquitetura de informação, as jornadas e a administrabilidade da UI**.

A partir da Fase 51, "backend/regra/tela existem" não é evidência suficiente para declarar uma necessidade pronta como produto. A régua de fechamento passa a considerar se uma pessoa autorizada consegue executar a tarefa pela aplicação sem conhecimento técnico externo.

Documento de autoridade desta frente:

- `docs/product/product-completion-ux-roadmap.md`.

A `Definition of Done` também foi ampliada para incluir gates explícitos de produto/UI/UX.

## Achados centrais da auditoria

### Entrada do sistema

A raiz `/` atual é uma landing técnica e obsoleta, expondo "workspace persistente", demonstração, Supabase/PostgreSQL, RLS, CI e "próxima fase". Não possui função operacional e deve desaparecer da experiência normal.

Contrato alvo:

- não autenticado → login;
- autenticado → fluxo operacional adequado já suportado pelo runtime (workspace/seleção/bootstrap conforme contexto);
- nenhuma escolha normal entre "workspace persistente" e "demonstração".

### Arquitetura da informação

A navegação atual é plana e mistura áreas de negócio, operações internas, cadastros e administração. Estoque, por exemplo, está fragmentado em `Estoque`, `Baixas`, `Devoluções`, `Transferências` e `Inventários` no mesmo nível.

Baseline alvo:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

Subáreas e rotas devem seguir o modelo mental da operação, não a decomposição interna do código.

### Jornadas/telas

Compras e Financeiro concentram muitas responsabilidades em páginas grandes e carecem de padrão consistente `lista → detalhe → ação`/URLs de detalhe. Interações como `window.prompt()` ainda aparecem em operações relevantes.

### Administração

Foram identificadas lacunas reais de produto:

- Estrutura (unidades/setores/locais) existe no modelo, mas não possui manutenção adequada no workspace persistente;
- papéis/escopos/RLS existem, porém não há uma experiência de Usuários/Permissões suficiente para operação real;
- Funcionários expõe `UUID do auth.users`, o que é detalhe técnico inadequado para usuário final.

### Design system e mobile

A UI ainda não possui design system mínimo consolidado. A responsividade atual tem contratos técnicos de CSS, mas ainda precisa ser homologada por jornadas reais em desktop/tablet/mobile.

## Ordem oficial de fechamento do produto

1. remover a entrada técnica atual;
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

## Primeira slice executável da Fase 51

Próxima implementação:

1. inspecionar o fluxo real de `/`, `/login`, `/bootstrap`, `/workspace`, `/workspace/selecionar-organizacao` e helpers de auth/redirect;
2. remover a landing técnica de `/`;
3. fazer `/` encaminhar para o fluxo existente conforme sessão/contexto, sem criar mecanismo paralelo;
4. remover `Abrir demonstração` da navegação normal do workspace;
5. preservar as rotas/código de demo internamente nesta slice se ainda forem úteis para engenharia;
6. testar o contrato de entrada;
7. manter lint/typecheck/test/build verdes;
8. não fazer deploy Vercel rotineiro/manual.

Fora desta primeira slice: redesign completo da sidebar, design system inteiro, refatoração dos módulos e qualquer trabalho em #75/#121.

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

## #75/#121 — TOTALMENTE ON HOLD durante a consolidação funcional

A decisão de 2026-08-28 permanece válida. Não investigar schedules, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar R2/S3/retention/secrets/variables e não retomar Storage/restore nesta fase.

`REQ-PLAT-005` será retomado como etapa final de production-readiness depois do fechamento funcional/homologação, salvo revogação explícita do operador.

## Estado de desenvolvimento

A nova frente ativa é a **Fase 51 / Issue #142**.

O roadmap e os critérios já estão integrados. Nenhuma mudança de código, banco, Supabase ou Vercel foi feita durante a auditoria/documentação. A próxima sessão deve criar uma branch de implementação a partir da `main` real e executar a primeira slice definida em `NEXT_ACTION.md`.
