# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece como frente ativa.**

Slices estruturais e de produto integradas até aqui:

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151.

Estado integrado confirmado após a slice de Administração:

- `main=a06e7c3dd96b4b010ca4c7754438b90e40720399` após o squash merge do PR #151;
- PR #151 `feat: add administration structure and access management`: merged;
- CI do PR #523 / run `33195119453`: `success`;
- Inventory Count Integration #244 / run `33195119447`: `success`;
- Business Transactions Integration #231 / run `33195119446`: `success`;
- CI pós-merge #524 / run `33195244017`: `success`;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhum deploy Vercel manual/rotineiro foi feito;
- nenhuma evidência ou fixture de Production foi fabricada.

Não refazer as slices acima sem nova evidência concreta.

## Administração agora integrada

Contrato/inventário durável:

- `docs/product/administration-capability-map.md`.

### Estrutura

Rota real:

- `/workspace/administracao/estrutura`.

A experiência persistente agora permite, dentro do RLS já existente:

- visualizar Negócios, Unidades, Setores e Locais de estoque visíveis;
- criar/editar/inativar as entidades cujo target scope é administrável pelo usuário;
- preservar relações pai/filho sem reparenting arbitrário;
- evitar exclusão física destrutiva;
- manter `allow_negative_stock` fora dessa jornada;
- impedir no banco que um Local de estoque seja associado a um Setor de outra Unidade.

A autorização continua nos grants/RLS, não na aparência da tela.

### Usuários e permissões

Rota real:

- `/workspace/administracao/acessos`.

A jornada agora permite para `owner/admin` Organization-wide, sem DML direto de memberships no browser:

- listar quem possui acesso usando e-mail e estado legível;
- convidar uma identidade por e-mail usando Auth Admin apenas server-side;
- adicionar/reactivar membership pelos RPCs autenticados;
- alterar role técnico, escopo e estado ativo/inativo;
- proteger o último owner Organization-wide;
- auditar criação/reactivação/alteração;
- vincular/desvincular Employee da identidade autenticada sem pedir UUID.

`Funcionários` não expõe mais o campo manual `UUID do auth.users`. Employee continua conceitualmente separado de login e autorização.

O callback de convite aceita o bootstrap inicial ou, para convite administrativo normal, uma identidade que já possua membership ativo comprovado via RLS. Um token de convite sozinho não concede acesso ao Lojasaph.

## Guardrail de autorização permanece

`docs/product/open-questions.md` mantém **Q-022 — Quem pode fazer cada ação?** aberta.

Portanto:

- `owner/admin/manager/finance/purchases/inventory/cashier/viewer` continuam nomes técnicos do modelo atual;
- nenhuma equivalência com cargos reais foi homologada;
- não ampliar, renomear ou redesenhar a matriz de acesso por conveniência de UI;
- qualquer próxima tela deve continuar refletindo boundaries/RLS existentes e registrar lacunas reais em vez de adivinhar política.

Q-001/Q-002 também permanecem sem inferência; a nova Estrutura não redefine por si só o significado operacional de cozinha/quiosque/empório.

## Validação e limite de homologação visual

O PR #151 e a `main` pós-merge passaram:

- lint;
- typecheck;
- unit tests;
- production build;
- migrations/seed;
- suites PostgreSQL/RLS completas;
- Inventory Count Integration;
- Business Transactions Integration.

**Não houve homologação visual em browser real nesta sessão.** Não registrar as novas jornadas administrativas como homologadas em desktop/tablet/mobile somente por código/CI. A homologação real continua em etapa posterior da Fase 51.

## Próxima slice da Fase 51

A próxima etapa oficial, conforme o roadmap, é:

> **Cadastros — refatorar Produtos, Fornecedores e Funcionários no padrão lista → detalhe → ação.**

Estado atual que justifica a slice:

- `/workspace/produtos` ainda combina tabela horizontal, criação e edição na mesma página e não possui rota de detalhe estável;
- `/workspace/fornecedores` ainda combina lista, contatos, condições comerciais, itens fornecidos, criação e edição na mesma página e não possui rota de detalhe estável;
- `/workspace/funcionarios` ainda combina lista, criação e edição na mesma página; o UUID técnico saiu, mas falta detalhe estável e apresentação contextual do vínculo de acesso;
- as três páginas ainda usam muitos controles/feedbacks locais anteriores ao design system mínimo;
- o padrão `lista → detalhe → ação` ainda não foi validado em um domínio completo.

A próxima sessão deve primeiro inventariar domínio/repositories/adapters e relações já existentes de Produtos, Fornecedores e Funcionários, definir as rotas/contratos de detalhe e somente então refatorar as três jornadas. Não alterar regra de negócio, RLS ou schema sem gap comprovado.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação~~ — PR #147;
3. ~~navegação desktop/mobile~~ — PR #147;
4. ~~design system mínimo~~ — PR #149;
5. ~~Administração~~ — PR #151;
6. **Cadastros** — próxima slice;
7. Estoque;
8. Compras;
9. Financeiro;
10. Caixa;
11. Dashboard;
12. limpeza de linguagem/resíduos de engenharia;
13. homologação UX em jornadas desktop/tablet/mobile;
14. reconciliação funcional final;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

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
