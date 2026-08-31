# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Baseline funcional após a consolidação de Caixa:

- `main=7e841b77daae8eb7afc13cc39812dd93b948dd32` — merge do PR #161;
- PR #161 — `feat: consolidar jornada de Caixa` — **merged**;
- CI pós-merge da `main` #561 / run `33387966611`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- no head final do PR #161, CI #560 / run `33387774581`: **success**;
- Business Transactions Integration #253 / run `33387774423`: **success**, incluindo ciclo de vida de Caixa e permissões escopadas;
- Inventory Count Integration #266 / run `33387774526`: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
6. Estoque: posição + jornadas operacionais consolidadas — PR #155;
7. Compras: pedidos + recebimentos + histórico consolidados — PR #157;
8. Financeiro: documentos + parcelas + pagamentos consolidados — PR #159;
9. Caixa: sessões + fechamento + configuração consolidados — PR #161.

## Caixa consolidado

A área de Caixa deixou de concentrar configuração, abertura, totais, movimentos, fechamento, cancelamento e histórico em uma única página.

### Visão da área

`/workspace/caixa` agora apresenta:

- sessões abertas;
- sessões fechadas visíveis;
- caixas ativos;
- quantidade de fechamentos com divergência registrada;
- atalhos para Sessões e Configuração;
- sessões recentes com acesso ao detalhe estável.

### Sessões

`/workspace/caixa/sessoes` passou a ser a lista principal:

- busca por caixa, código, unidade, data, situação ou observação;
- filtro por status;
- fundo inicial, contado e divergência quando persistidos;
- tabela desktop e cards mobile;
- URL estável para cada sessão.

`/workspace/caixa/sessoes/nova` concentra a abertura com:

- caixa físico;
- data de negócio explícita;
- sequência;
- fundo inicial;
- observação opcional.

`/workspace/caixa/sessoes/[id]` apresenta:

- caixa, unidade, data de negócio, sequência e status;
- fundo inicial e valores finais persistidos;
- totais por meio com bruto, taxa, líquido, impacto na gaveta e regra aplicada quando registrada;
- entradas, sangrias e histórico de movimentos;
- composição informativa dos insumos da gaveta;
- fechamento explícito com valor contado;
- cancelamento por diálogo, sem `window.prompt()`.

Sessão inexistente ou inacessível usa o mesmo estado seguro, sem confirmar a existência fora do escopo.

### Configuração

`/workspace/caixa/configuracao` separa da operação diária:

- caixas físicos por unidade;
- meios de pagamento e indicação explícita de impacto na gaveta;
- regras de taxa versionadas por vigência.

A UI apenas reflete as permissões `manageCashRegisters`/`manageCashConfig`; autorização real permanece nos boundaries existentes.

### Regra de fechamento preservada

Nenhuma regra de fechamento foi movida para React.

O backend continua calculando e persistindo, no fechamento:

`expected_cash_amount = opening_float + bruto dos meios com affects_cash_drawer + cash_in - cash_out`

`cash_difference = counted_cash_amount - expected_cash_amount`

`employee_consumption` continua fora do esperado.

A tela de detalhe mostra os componentes persistidos para explicar a composição, mas deixa claro que o valor esperado autoritativo só é calculado/persistido pelo backend no fechamento.

### PENDINGs de Caixa preservados

- `REQ-CASH-007` — Consumo Funcionários — permanece PENDING. A nova UX **não oferece criação de novo movimento desse tipo**; registros legados/existentes podem aparecer no histórico sem ganhar semântica nova.
- `REQ-CASH-008` — integração com vendas/POS — permanece PENDING. Totais por meio continuam consolidados/manual-operacionais conforme o contrato atual; nenhuma venda individual foi inventada.

## Boundaries e segurança preservados

Nenhum schema, migration, RPC, grant ou policy/RLS foi criado ou alterado para esta consolidação.

Continuam autoritativos:

- `create_cash_register`;
- `create_payment_method`;
- `create_fee_rule`;
- `open_cash_session`;
- `set_cash_payment_total`;
- `record_cash_movement`;
- `close_cash_session`;
- `cancel_cash_session`;
- RLS/grants e permissões escopadas existentes;
- atomicidade/idempotência e auditoria dos commands.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para produzir essa evidência.

## Próxima slice oficial: Dashboard

**A próxima área da Fase 51 é Dashboard / Visão geral. Não refazer Cadastros, Estoque, Compras, Financeiro ou Caixa sem bug/gap concreto.**

Inventário preliminar confirmou que `/workspace` já possui um dashboard funcional e somente leitura, porém a página ainda concentra diretamente filtros, período, KPIs, fila de atenção e seções de múltiplos módulos em um componente grande, com controles visuais anteriores ao design system consolidado.

Já existem boundaries dedicados em `src/modules/dashboard` para query, summary e seções de Estoque/Compras. A próxima slice deve consolidar a experiência da Visão geral sobre esses dados existentes, revisar linguagem/hierarquia/filtros e alinhar navegação para as jornadas recém-consolidadas, sem inventar KPI ou regra de negócio.

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. ~~Caixa~~ — PR #161;
10. **Dashboard** — próxima;
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

Q-022 também permanece aberta; não reinterpretar papéis técnicos como cargos de negócio.

## #75/#121 — TOTALMENTE ON HOLD

Não investigar scheduling, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar Storage/R2/S3/retention/secrets/variables e não retomar restore nesta fase.

Execuções agendadas do workflow de Storage podem existir no histórico; isso não revoga o hold e não deve ser usado como motivo para retomar #121.

`REQ-PLAT-005` será retomado no production-readiness final, salvo decisão explícita do operador.
