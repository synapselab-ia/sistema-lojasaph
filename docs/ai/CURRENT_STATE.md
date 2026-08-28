# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Estado real após a consolidação de Estoque:

- `main=3f0049c98f36f351d88ffe20afc5c77d17f73f70` — merge do PR #155;
- PR #155 — `feat: consolidar jornada de Estoque` — **merged**;
- CI pós-merge da `main` #544 / run `33199243676`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- no head final do PR #155, Inventory Count Integration #258 / run `33199098224`: **success**;
- no head final do PR #155, Business Transactions Integration #245 / run `33199098274`: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. reconciliação/handoff de Cadastros — PR #152;
6. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
7. Estoque: posição + jornadas operacionais consolidadas — PR #155.

## Estoque consolidado

A área de Estoque deixou de depender de uma megapágina e agora separa consulta, atenção operacional e execução sem alterar os boundaries transacionais existentes.

### Posição de estoque

`/workspace/estoque` agora é uma visão operacional de leitura:

- saldos por produto e local;
- busca por produto/local;
- filtro por situação do estoque mínimo;
- indicadores de posições abaixo do mínimo, lotes já vencidos com saldo e transferências em trânsito;
- atalhos para as tarefas da área;
- tabela desktop + cards mobile.

Alteração de saldo continua acontecendo somente pelas operações próprias.

### Jornadas dedicadas

- `/workspace/estoque/entradas` — registro de entrada usando `recordEntry`/gateway existente;
- `/workspace/estoque/retiradas` — retirada para consumo por setor usando `recordWithdrawal` existente;
- `/workspace/baixas` — baixas/perdas/vencimentos com motivos e regras de lote já existentes;
- `/workspace/devolucoes` — devolução relacionada à retirada original, sem expor IDs técnicos na UX;
- `/workspace/transferencias` — expedição e recebimento separados, inclusive recebimento parcial;
- `/workspace/inventarios` — início, contagem, confirmação/cancelamento e histórico, com confirmação explícita ao cancelar;
- `/workspace/estoque/lotes` — consulta de lotes com saldo e validades registradas;
- `/workspace/estoque/minimos` — consulta/manutenção de mínimo por produto/local conforme política existente.

### UX e linguagem

- Estoque passou a aparecer como área com destinos subordinados na navegação;
- a raiz de Estoque não fica marcada como página ativa quando uma subárea está aberta;
- históricos críticos possuem alternativa mobile própria em vez de depender somente de tabela larga;
- jargão de implementação foi removido das páginas de Estoque tocadas nesta slice;
- estados de permissão/read-only, loading, empty, sucesso e erro foram tratados conforme aplicável.

A limpeza global de linguagem técnica fora de Estoque continua sendo uma etapa posterior da Fase 51.

## Boundaries e regras preservados

Nenhum schema, migration, RPC ou policy/RLS foi criado ou alterado para esta consolidação.

Continuam autoritativos:

- gateways/serviços de entrada, retirada, perda, devolução, transferência, inventário e mínimo;
- transações atômicas já existentes;
- escopos Organization/Unit/Location/Sector;
- validações de saldo, lote e validade já implementadas;
- RLS/grants/RPCs como fronteira de autorização.

A UI não passou a definir FEFO, custeio, empréstimo ou outra regra PENDING.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para criar essa evidência.

## Próxima slice oficial: Compras

**A próxima área da Fase 51 é Compras. Não refazer Cadastros ou Estoque sem bug/gap concreto.**

A próxima execução deve primeiro reconciliar o estado real e inventariar a jornada existente de pedidos, recebimentos e histórico antes de editar. O objetivo é separar responsabilidades e criar contexto estável para pedidos/recebimentos, preservando a integração transacional com Estoque e sem duplicar movimentação.

Não resolver regras de negócio por inferência nem criar migration/RPC para corrigir layout antes de provar gap real.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. **Compras** — próxima;
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