# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece como frente ativa.**

Slices já integradas antes desta execução:

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. handoff/reconciliação de Cadastros — PR #152.

Baseline real de entrada desta execução:

- `main=5eda252ba209602434dcc7cdf5463355a38df6c6` — merge do PR #152;
- CI pós-merge da `main` #526: `success`;
- Restore compatibility CI #527: `success`;
- Storage protection CI #528: `success`;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Cadastros — implementação da slice

PR ativo desta execução:

- PR #153 — `feat: consolidar jornadas de Cadastros`;
- branch `feat/51-cadastros-produtos`;
- base `main=5eda252ba209602434dcc7cdf5463355a38df6c6`.

A branch cobre **Produtos, Fornecedores e Funcionários** no padrão `lista → detalhe → ação`, sem migration, RPC ou mudança de RLS.

### Produtos

Rotas:

- `/workspace/produtos` — lista focada;
- `/workspace/produtos/novo` — criação dedicada;
- `/workspace/produtos/[id]` — detalhe estável e edição contextual.

Entregue:

- busca por nome, categoria, EAN, NCM, CEST e unidade;
- filtros por status, categoria e tipo;
- tabela desktop + cards mobile, sem depender apenas de overflow horizontal;
- detalhe com identificação, dados fiscais e flags operacionais já suportadas;
- criação/edição reutilizando `RuntimeWorkspaceProvider` e o domínio existente;
- teste unitário do contrato puro de busca/filtros em `product-catalog-view.test.ts`;
- nenhum campo fiscal ou regra de produto novo foi inventado.

### Fornecedores

Rotas:

- `/workspace/fornecedores` — lista focada;
- `/workspace/fornecedores/novo` — criação dedicada;
- `/workspace/fornecedores/[id]` — detalhe estável e edição contextual.

Entregue:

- busca por nome, documento e contato principal;
- filtro de status;
- detalhe com identificação e contatos;
- `SupplierCommercialTermsPanel` reaproveitado no detalhe;
- `SupplierItemsPanel` reaproveitado no detalhe;
- manutenção de contatos em contexto próprio;
- nenhum significado novo foi atribuído a agenda, embalagem, condição comercial ou compra mínima.

### Funcionários

Rotas:

- `/workspace/funcionarios` — lista focada;
- `/workspace/funcionarios/novo` — criação dedicada;
- `/workspace/funcionarios/[id]` — detalhe estável e edição contextual.

Entregue:

- busca por nome, código, unidade e setor;
- filtros por status e unidade padrão;
- detalhe com dados operacionais, escopo padrão e estado legível do vínculo de acesso;
- edição operacional preserva `linkedUserId` internamente sem expor UUID;
- login, papéis e permissões continuam pertencendo à Administração;
- a autorização existente de Funcionários não foi ampliada.

## Validação da implementação

Head funcional validado antes da reconciliação documental:

- `eb144abf6e51dd99d89d96e7dbc0833b6597114b`;
- CI #535 / run `33197011401`: `success`;
- lint: `success`;
- typecheck: `success`;
- unit tests: `success`;
- production build: `success`;
- job de banco/migrations/RLS: `success`;
- Inventory Count Integration #253 / run `33197011414`: `success`;
- Business Transactions Integration #240 / run `33197011395`: `success`.

A reconciliação Markdown posterior deve manter o PR verde antes do merge.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Motivo operacional preservado: não fazer deploy Vercel manual/rotineiro apenas para validação durante esta fase. Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile.

## Guardrails preservados

- Q-022 continua aberta; não homologar papéis técnicos como cargos reais;
- Employee continua separado de membership/login;
- RLS/grants/RPCs existentes continuam sendo a fronteira real de autorização;
- nenhum UUID de identidade foi reintroduzido na UX;
- nenhum requisito PENDING foi resolvido por conveniência visual;
- nenhum schema/RLS/migration foi alterado nesta slice;
- #75/#121 continuam **TOTALMENTE ON HOLD**;
- nenhuma fixture de Production foi criada.

## Próxima slice da Fase 51

**Depois da integração do PR #153, a próxima área oficial é Estoque.**

A próxima execução deve consolidar a experiência de Estoque usando o inventário e os boundaries já existentes, sem refazer Cadastros.

Escopo macro esperado de Estoque, conforme roadmap:

- posição/saldos;
- entradas;
- baixas/perdas;
- devoluções existentes;
- transferências;
- inventários/contagens;
- lotes e validades;
- estoque mínimo.

Antes de editar, reconciliar o estado real de `main`, Issue #142, PRs/branches/CI e inventariar as rotas/repositories/gateways existentes de Estoque. Não mudar regra de negócio ou RLS sem gap comprovado.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. **Cadastros** — PR #153, aguardando integração no momento deste documento;
6. **Estoque** — próxima após integração;
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

`REQ-PLAT-005` será retomado no production-readiness final, salvo revogação explícita do operador.