# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Estado real após esta execução:

- `main=97a5975ace5f8e011b27a4e8175d13dcee464253` — merge do PR #153;
- PR #153 — `feat: consolidar jornadas de Cadastros` — **merged**;
- CI pós-merge da `main` #539 / run `33197347690`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- no head final do PR #153, Inventory Count Integration #256 e Business Transactions Integration #243: **success**;
- Issue #142 continua aberta e ativa;
- não há PR funcional aberto ao final desta slice;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. reconciliação/handoff de Cadastros — PR #152;
6. Cadastros: Produtos, Fornecedores e Funcionários — PR #153.

## Cadastros consolidado

### Produtos

Rotas consolidadas:

- `/workspace/produtos` — lista pesquisável/filtrável;
- `/workspace/produtos/novo` — criação dedicada;
- `/workspace/produtos/[id]` — detalhe estável e edição contextual.

Entregue:

- busca por nome, categoria, EAN, NCM, CEST e unidade;
- filtros por status, categoria e tipo;
- tabela desktop + cards mobile;
- detalhe com identificação, dados fiscais e flags operacionais já suportadas;
- criação/edição sobre `RuntimeWorkspaceProvider`, domínio e persistência existentes;
- teste unitário do contrato puro de busca/filtros;
- nenhuma regra fiscal nova inventada.

### Fornecedores

Rotas consolidadas:

- `/workspace/fornecedores` — lista com busca e status;
- `/workspace/fornecedores/novo` — criação dedicada;
- `/workspace/fornecedores/[id]` — detalhe estável e edição contextual.

Entregue:

- identificação e contatos em contexto próprio;
- `SupplierCommercialTermsPanel` reutilizado no detalhe;
- `SupplierItemsPanel` reutilizado no detalhe;
- nenhuma semântica nova inventada para agenda, embalagem, pedido mínimo ou condição comercial.

### Funcionários

Rotas consolidadas:

- `/workspace/funcionarios` — lista com busca, status e unidade;
- `/workspace/funcionarios/novo` — criação dedicada;
- `/workspace/funcionarios/[id]` — detalhe estável e edição contextual.

Entregue:

- dados operacionais e escopo padrão;
- estado legível do vínculo de acesso, sem UUID na UX;
- edição operacional preserva `linkedUserId` internamente;
- Employee continua separado de login/membership;
- login, papéis e permissões continuam em Administração;
- a autorização existente não foi ampliada.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para criar essa evidência.

## Guardrails preservados

- Q-022 continua aberta; não homologar papéis técnicos como cargos reais;
- RLS/grants/RPCs continuam sendo a fronteira real de autorização;
- nenhum requisito PENDING foi resolvido por conveniência visual;
- nenhum schema, migration ou policy/RLS foi alterado na slice de Cadastros;
- nenhuma fixture de Production foi criada;
- #75/#121 continuam **TOTALMENTE ON HOLD**.

## Próxima slice oficial: Estoque

**A próxima área da Fase 51 é Estoque. Não refazer Cadastros sem bug ou gap concreto.**

Escopo macro a consolidar, conforme roadmap e o que já existe no produto:

- posição/saldos;
- entradas;
- retiradas/baixas e perdas;
- devoluções já suportadas;
- transferências;
- inventários/contagens;
- lotes e validades;
- estoque mínimo.

Antes de editar, reconciliar `main`, Issue #142, PRs/branches/CI e inventariar as rotas, domínio, repositories, gateways, services, RPCs e queries existentes de Estoque. Reutilizar primeiro os boundaries existentes e não mudar regra de negócio/RLS sem gap comprovado.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. **Estoque** — próxima;
7. Compras;
8. Financeiro;
9. Caixa;
10. Dashboard;
11. limpeza de linguagem/resíduos de engenharia;
12. homologação UX em jornadas desktop/tablet/mobile;
13. reconciliação funcional final;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

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

## #75/#121 — TOTALMENTE ON HOLD

Não investigar scheduling, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar Storage/R2/S3/retention/secrets/variables e não retomar restore nesta fase.

`REQ-PLAT-005` será retomado no production-readiness final, salvo decisão explícita do operador.