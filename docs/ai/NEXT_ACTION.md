# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Baseline funcional para a próxima execução:

- `main=7e841b77daae8eb7afc13cc39812dd93b948dd32` — merge do PR #161;
- PR #161 — Caixa consolidado — merged;
- CI pós-merge #561 / run `33387966611`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- CI #560 / run `33387774581`: success no head final do PR;
- Business Transactions Integration #253 / run `33387774423`: success, incluindo lifecycle de Caixa e permissões escopadas;
- Inventory Count Integration #266 / run `33387774526`: success;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Cadastros, Estoque, Compras, Financeiro ou Caixa sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **Dashboard / Visão geral**

O objetivo é consolidar `/workspace` como painel operacional coerente, legível e responsivo sobre os read models já existentes, preservando exatamente a semântica de escopos, filtros, datas, KPIs e alertas. O Dashboard continua **somente leitura** e nunca vira uma nova fronteira transacional.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- `docs/product/requirements.md`;
- documentação/ADRs do Dashboard e dos módulos cujos dados aparecem no painel.

### 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. inventariar integralmente `src/app/workspace/(operacao)/page.tsx`;
4. inventariar `SupabaseDashboardQuery`, seus testes e todas as tabelas/views/queries usadas;
5. inventariar `buildDashboardSummary` e testes de summary;
6. inventariar as queries/seções específicas de Estoque e Compras em `src/modules/dashboard`;
7. localizar todos os KPIs, itens da fila de atenção e respectivos destinos;
8. provar a semântica de Unidade, Setor, horizonte relativo e período gerencial explícito;
9. provar timezone/data de negócio e quais métricas representam estado atual versus eventos/obrigações por data;
10. mapear quais métricas aceitam escopo de Setor e quais permanecem apenas em Unidade/Organization;
11. identificar controles manuais/linguagem técnica e padrões anteriores ao design system;
12. definir hierarquia e responsabilidades do painel antes do código.

Inventário preliminar já comprovado:

- `/workspace` já possui Dashboard funcional, somente leitura e integrado aos módulos persistentes;
- a página atual concentra filtros, período, fila de atenção, cartões financeiros, sinais operacionais e seções de Estoque/Compras em um componente grande;
- `SupabaseDashboardQuery` já existe com testes;
- `buildDashboardSummary` já concentra derivações de apresentação;
- queries e componentes específicos de overview de Compras e Estoque já existem;
- o painel diferencia **estado atual**, **horizonte relativo** e **período explícito**;
- Caixa é escopado por Unidade e usa `business_date` quando a métrica é temporal;
- Financeiro, Compras e Estoque só usam Setor quando existe vínculo setorial explícito;
- parte dos filtros/controles ainda usa estilos manuais e deve ser reconciliada com `src/components/ui`.

Não criar schema/RPC/view novo para resolver layout. Reaproveitar primeiro os read models e boundaries existentes.

### 2. Escopo funcional da consolidação

Organizar o painel conforme dados já suportados:

- cabeçalho/contexto da organização;
- filtros operacionais claros de Unidade/Setor quando aplicáveis;
- horizonte relativo de alertas onde o contrato já usa esse conceito;
- período gerencial explícito onde a métrica possui data de negócio/vencimento comprovada;
- fila prioritária de atenção com links para a jornada correta;
- resumo financeiro;
- sinais de Caixa e Compras;
- visão de Estoque e Compras já suportada pelos overview queries;
- estados loading, erro e vazio;
- links para rotas consolidadas, preferindo o destino mais específico e útil.

O objetivo é melhorar hierarquia, compreensão e navegação, não adicionar novos indicadores.

### 3. Preservar semântica dos dados

Não mover regra crítica para componentes React e não alterar silenciosamente o significado de indicadores.

Preservar, conforme os contracts existentes:

- RLS e escopos de Organization/Unit/Sector;
- timezone e data de negócio;
- diferença entre estado atual e métricas por período;
- diferença entre horizonte relativo e intervalo explícito;
- status financeiro já derivados pelos read models existentes;
- Caixa em escopo de Unidade quando não existe relação setorial real;
- métricas de Estoque/Compras/Financeiro filtradas por Setor somente quando há vínculo explícito;
- saldo, divergência, quantidade pendente, vencimento e demais valores conforme as fontes persistentes existentes.

Se um KPI parecer ambíguo, provar o contrato em query/summary/testes antes de mudar rótulo ou comportamento.

### 4. KPIs e alertas

Não inventar regra de negócio para tornar o Dashboard mais “completo”.

Em especial, não criar sem requisito comprovado:

- novos thresholds de estoque;
- nova janela de validade;
- novo SLA de compras;
- alerta financeiro por quantidade arbitrária de dias;
- meta/tendência/comparação percentual;
- regra de divergência de caixa;
- faturamento/vendas;
- consumo de funcionários como receita/despesa;
- ranking ou score de fornecedor/produto/unidade.

Cada alerta deve ser rastreável a uma fonte real e levar a uma jornada operacional existente.

### 5. Arquitetura de informação e UX

Usar linguagem operacional, não nomes de tabela, view, RPC, RLS ou detalhes de infraestrutura.

Preferir:

- `PageHeader`, `Panel`, `FormField`, `Select`, `Input`, `Button`, `EmptyState`, `FeedbackMessage`, `StatusBadge` e outros primitives já consolidados;
- hierarquia clara entre “precisa de atenção” e indicadores informativos;
- filtros apresentados com explicação curta somente onde a semântica não for óbvia;
- ações que navegam para Estoque, Compras, Financeiro ou Caixa em vez de duplicar transações no Dashboard;
- mobile deliberado, sem depender de grids/tabelas largas ou controles espremidos;
- feedback de atualização/carregamento que não faça o usuário perder contexto.

Não criar abstração genérica sem repetição comprovada.

### 6. Rotas de destino

Revisar links do Dashboard após as consolidações da Fase 51.

Sempre que o contexto permitir, preferir destinos específicos como:

- Estoque → posição ou jornada correspondente;
- Compras → pedidos/recebimentos conforme o sinal;
- Financeiro → contas/vencimentos conforme o indicador;
- Caixa → sessões ou sessão apropriada quando houver contexto suficiente.

Não inventar deep link quando os dados não carregarem identidade suficiente para um destino seguro.

### 7. Autorização

Q-022 continua aberta.

Portanto:

- Dashboard só mostra o que as queries/RLS autorizam;
- não ampliar escopo por conveniência de filtro;
- não reinterpretar papéis técnicos como cargos;
- não usar UI como fronteira de segurança;
- não inferir acesso Organization-wide a partir de papel escopado.

### 8. Testes e validação

Adicionar/ajustar testes somente nos contratos tocados, especialmente para:

- summary/derivações puras;
- semântica de Unidade/Setor;
- horizonte versus período explícito;
- estado atual versus métricas temporais;
- timezone/data de negócio quando relevante;
- destinos de alertas/KPIs alterados;
- loading/erro/empty;
- responsividade por estrutura/contrato quando tecnicamente possível.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- integrações de banco somente quando realmente afetadas.

Se browser real permitido estiver disponível, validar Dashboard em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

### 9. Guardrails desta execução

Não:

- reabrir áreas já consolidadas sem evidência concreta;
- adicionar transações no Dashboard;
- inventar KPI/threshold/janela/regra;
- resolver `REQ-CASH-007`, `REQ-CASH-008`, `REQ-FIN-004` ou outros PENDINGs;
- mudar Q-022/política de autorização;
- criar migration cosmética;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite para Dashboard

A slice só pode ser encerrada quando:

- `/workspace` comunica prioridade operacional com hierarquia clara;
- filtros de Unidade/Setor/horizonte/período continuam semanticamente corretos;
- horizonte e período não são apresentados como equivalentes;
- cada KPI/alerta possui origem e significado comprovados;
- links levam às jornadas consolidadas apropriadas;
- Dashboard continua somente leitura;
- design system é reutilizado nos controles/superfícies tocados;
- mobile possui estrutura deliberada;
- loading/erro/empty e atualização são compreensíveis;
- RLS/escopos continuam a fronteira real;
- nenhum PENDING é resolvido por conveniência visual;
- lint, typecheck, testes, build e gates aplicáveis estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois do Dashboard

Somente após a integração da consolidação do Dashboard, promover:

> **limpeza de linguagem/resíduos de engenharia da experiência normal**

Não saltar diretamente para homologação UX real.

## Ordem macro

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

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. Execuções agendadas eventualmente presentes no histórico não revogam o hold. O hold só termina por decisão explícita ou no production-readiness final.
