# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Baseline funcional após a consolidação do Dashboard / Visão geral:

- `main=395a2cd578b47c2b98ac449f50c1d4e3a094627d` — merge do PR #163;
- PR #163 — `feat: consolidar Visão geral do Dashboard` — **merged**;
- CI pós-merge da `main` #566 / run `33392864692`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- no head final do PR #163, CI #565 / run `33392616909`: **success**;
- Business Transactions Integration #255 / run `33392616971`: **success**;
- Inventory Count Integration #268 / run `33392616820`: **success**;
- o CI #564 falhou apenas no typecheck por duas guards de `snapshot`; a correção foi feita no mesmo PR antes do merge e todos os gates posteriores ficaram verdes;
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
9. Caixa: sessões + fechamento + configuração consolidados — PR #161;
10. Dashboard / Visão geral — PR #163.

Não refazer essas slices sem bug ou gap concreto.

## Dashboard consolidado

`/workspace` permanece um painel **somente leitura** sobre os read models existentes. O PR #163 não criou nova fronteira transacional nem alterou a semântica dos dados.

### Hierarquia e controles

A Visão geral agora organiza a experiência em:

- contexto da organização e data de negócio;
- filtros de Unidade, Setor, horizonte de alertas e período gerencial explícito;
- fila `Precisa de atenção` antes dos indicadores informativos;
- resumo financeiro;
- visão de Estoque;
- visão de Compras e fornecedores;
- sinais de operação atual de Caixa e Compras.

Os controles e estados tocados reutilizam `PageHeader`, `Panel`, `FormField`, `Select`, `Input`, `Button`, `FeedbackMessage` e `EmptyState` do design system existente.

### Semântica de filtros preservada

O inventário de `SupabaseDashboardQuery`, `buildDashboardSummary`, overview queries e testes confirmou e a UI continua respeitando:

- `Organization` continua sendo a fronteira global autorizada pelo banco/RLS;
- Unidade e Setor só filtram dados quando existe vínculo explícito;
- Caixa permanece em escopo de Unidade, mesmo quando um Setor está selecionado;
- métricas temporais de Caixa usam a data de negócio;
- o período gerencial explícito não é tratado como sinônimo do horizonte relativo;
- indicadores de estado atual, como caixas abertos, pedidos pendentes e estoque mínimo, não viram métricas históricas apenas porque um período foi selecionado;
- timezone da organização continua definindo a data de negócio;
- Financeiro, Estoque e Compras só recebem filtro setorial onde o contrato existente o suporta.

Nenhum KPI, threshold, SLA, score, meta, tendência, comparação ou janela nova foi inventado.

### Navegação consolidada

Alertas e cards agora preferem a jornada mais específica já existente quando os dados possuem contexto suficiente, incluindo:

- Financeiro → `/workspace/financeiro/contas` ou `/workspace/financeiro/vencimentos`;
- Caixa → `/workspace/caixa/sessoes`;
- Compras → `/workspace/compras/pedidos` e `/workspace/compras/recebimentos`;
- Estoque mínimo → `/workspace/estoque/minimos`;
- lotes/validades → `/workspace/estoque/lotes`;
- transferências → `/workspace/transferencias`;
- inventários → `/workspace/inventarios`.

O mapping de alertas foi separado em `dashboard-navigation.ts`, mantendo cálculo de KPI/read model desacoplado da decisão de rota da apresentação. O contrato possui teste próprio.

### Linguagem e estados

A Visão geral e as subseções tocadas deixaram de expor na experiência normal nomes como campos/tabelas de persistência quando não havia valor operacional. Loading, erro e vazio foram reconciliados com o design system sem ocultar falhas como ausência de dados.

## Boundaries e segurança preservados

A consolidação do Dashboard não criou ou alterou:

- schema;
- migration;
- RPC;
- grant;
- policy/RLS;
- regra de autorização;
- regra crítica de Estoque, Compras, Financeiro ou Caixa.

Queries, RLS/grants e boundaries dos módulos continuam sendo a fonte autoritativa. Q-022 permanece aberta; papel técnico não deve ser reinterpretado como cargo de negócio.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para produzir essa evidência.

## Próxima slice oficial: limpeza de linguagem/resíduos de engenharia

**A próxima área da Fase 51 é a limpeza de linguagem e resíduos de engenharia da experiência normal.**

O objetivo é revisar as jornadas já consolidadas e remover do que o operador vê termos técnicos desnecessários, IDs internos, nomes de provider, campos/tabelas/RPCs, referências de fase/implementação e mensagens herdadas que ainda exponham detalhes de engenharia.

Essa slice não deve refatorar domínio, alterar regra de negócio ou reabrir Administração, Cadastros, Estoque, Compras, Financeiro, Caixa ou Dashboard sem evidência concreta. Corrigir somente linguagem, apresentação e pequenos resíduos de UX que não mudem contrato funcional.

Débito documental conhecido a reconciliar nessa etapa: `docs/product/workspace-information-architecture.md` ainda contém no mapa de rotas a descrição pré-consolidação de Caixa. As rotas reais integradas do PR #161 prevalecem.

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
10. ~~Dashboard~~ — PR #163;
11. **limpeza de linguagem/resíduos de engenharia** — próxima;
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
