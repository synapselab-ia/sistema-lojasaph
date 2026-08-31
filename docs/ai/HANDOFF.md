# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Caixa está integrada; a próxima slice é Dashboard / Visão geral.**

Baseline funcional ao final de Caixa:

- `main=7e841b77daae8eb7afc13cc39812dd93b948dd32` — merge do PR #161;
- PR #161 — `feat: consolidar jornada de Caixa` — merged;
- CI pós-merge #561 / run `33387966611`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- CI #560 / run `33387774581`: success no head final do PR;
- Business Transactions Integration #253 / run `33387774423`: success, incluindo ciclo de vida de Caixa e permissões escopadas;
- Inventory Count Integration #266 / run `33387774526`: success;
- Issue #142 permanece aberta;
- #75/#121 permanecem **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Não refazer

Slices já integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo;
- PR #151 — Administração: Estrutura + Usuários/Permissões;
- PR #153 — Cadastros: Produtos, Fornecedores e Funcionários;
- PR #155 — Estoque consolidado;
- PR #157 — Compras consolidado;
- PR #159 — Financeiro consolidado;
- PR #161 — Caixa consolidado.

Não reabrir essas áreas sem bug ou gap concreto.

## O que o PR #161 entregou

### Estrutura da área

Caixa agora possui visão principal e destinos subordinados:

- `/workspace/caixa` — visão da área e sessões recentes;
- `/workspace/caixa/sessoes` — lista pesquisável/filtrável;
- `/workspace/caixa/sessoes/nova` — abertura dedicada;
- `/workspace/caixa/sessoes/[id]` — detalhe estável, operação e fechamento;
- `/workspace/caixa/configuracao` — caixas físicos, meios de pagamento e regras de taxa.

A antiga megapágina deixou de concentrar configuração, abertura, totais, movimentos, fechamento, cancelamento e histórico.

### Sessão e fechamento

O detalhe estável apresenta:

- caixa, unidade, data de negócio, sequência e status;
- fundo inicial;
- totais por meio com bruto, taxa, líquido, impacto na gaveta e regra aplicada quando existente;
- entradas, sangrias e movimentos já registrados;
- fechamento com valor contado;
- esperado, contado e divergência persistidos em sessão encerrada;
- cancelamento por `Dialog`, sem `window.prompt()`.

Sessão inexistente ou inacessível usa estado seguro e não confirma registro fora do escopo.

### Regra autoritativa preservada

Nenhuma regra crítica foi transferida para React.

No fechamento, o backend continua calculando:

`expected_cash_amount = opening_float + bruto dos meios com affects_cash_drawer + cash_in - cash_out`

`cash_difference = counted_cash_amount - expected_cash_amount`

A UI pode mostrar os componentes persistidos para explicar a composição, mas não substitui esse cálculo autoritativo.

### PENDINGs preservados

- `REQ-CASH-007` — Consumo Funcionários — continua PENDING. A nova UX não oferece criação de novos movimentos `employee_consumption`; registros existentes podem continuar aparecendo como histórico, sem ganhar semântica nova.
- `REQ-CASH-008` — integração com vendas/POS — continua PENDING. O módulo permanece baseado em totais consolidados por meio de pagamento; nenhuma venda individual foi criada.

### Segurança e contratos

- nenhum schema/migration/RPC/RLS novo;
- todos os commands existentes foram preservados;
- `manageCashRegisters`, `manageCashConfig` e `operateCash` apenas orientam disponibilidade de UI;
- RLS/grants/RPCs continuam sendo a fronteira real de autorização;
- idempotência, atomicidade e auditoria permanecem nos boundaries existentes.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Caixa homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Observação documental

`docs/product/workspace-information-architecture.md` ainda contém, no mapa de rotas, uma frase antiga dizendo que Caixa compartilha a página pré-consolidação. Essa frase é anterior ao PR #161 e não deve prevalecer sobre as rotas reais integradas acima. A correção dessa linha pode entrar na próxima reconciliação documental/limpeza de linguagem sem reabrir a slice funcional de Caixa.

## Próxima ação: Dashboard / Visão geral

O próximo chat deve consolidar **Dashboard / Visão geral**, sem refazer Caixa.

Inventário preliminar já comprovado na `main`:

- `/workspace` já é um dashboard funcional e somente leitura;
- a página atual concentra diretamente filtros de Unidade/Setor, horizonte, período explícito, fila de atenção, KPIs financeiros, sinais de Caixa/Compras e seções de Estoque/Compras;
- parte dos controles ainda usa estilos manuais anteriores ao design system consolidado;
- `SupabaseDashboardQuery` e testes já existem;
- `buildDashboardSummary`/application summary já existem;
- queries/seções específicas de Estoque e Compras já existem em `src/modules/dashboard`;
- o dashboard diferencia estado atual, horizonte relativo e período gerencial explícito;
- Caixa continua em escopo de Unidade e usa `business_date` quando a métrica é temporal;
- Financeiro, Compras e Estoque só devem usar Setor onde há vínculo setorial explícito no contrato existente.

### Passos obrigatórios para Dashboard

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system, DoD, requisitos/open questions e documentação do Dashboard;
3. inventariar integralmente `/workspace`, `SupabaseDashboardQuery`, summary, overview queries/sections e testes antes de editar;
4. mapear cada KPI/alerta para sua fonte persistente e rota de destino;
5. provar a semântica dos filtros Unidade/Setor, horizonte e período explícito;
6. provar timezone/data de negócio e quais métricas são estado atual versus métricas por data;
7. alinhar links às jornadas consolidadas de Estoque, Compras, Financeiro e Caixa;
8. reutilizar o design system em filtros, feedback, cards/painéis e estados;
9. manter Dashboard somente leitura;
10. definir estratégia mobile deliberada;
11. não criar KPI, threshold, SLA, janela, comparação ou regra de negócio sem contrato já existente;
12. manter lint, typecheck, tests, build e banco/RLS verdes;
13. registrar ausência de browser real se continuar indisponível.

## Guardrails do Dashboard

Não usar a consolidação para:

- adicionar transações diretamente no painel;
- recalcular status financeiro em React;
- inventar alerta de validade, estoque, vencimento ou divergência;
- aplicar Setor a métricas que só possuem escopo de Unidade/Organization;
- tratar horizonte relativo e período explícito como a mesma semântica;
- resolver PENDINGs de Estoque, Financeiro ou Caixa;
- mudar Q-022/política de autorização;
- retomar #75/#121;
- tocar Production para prova;
- fazer deploy Vercel manual/rotineiro.

## Depois do Dashboard

Somente após integrar e reconciliar Dashboard, promover:

> **limpeza de linguagem/resíduos de engenharia da experiência normal**

Não saltar diretamente para homologação UX real sem executar essa etapa.

## Ordem oficial

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
11. limpeza de linguagem;
12. homologação UX real;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## Guardrails permanentes

GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; Q-022 e os requisitos PENDING permanecem sem inferência; #75/#121 permanecem ON HOLD até production-readiness final ou decisão explícita.
