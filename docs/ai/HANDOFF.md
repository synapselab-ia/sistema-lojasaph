# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Dashboard / Visão geral está integrada; a próxima slice é limpeza de linguagem/resíduos de engenharia da experiência normal.**

Baseline funcional atual:

- `main=395a2cd578b47c2b98ac449f50c1d4e3a094627d` — merge do PR #163;
- PR #163 — `feat: consolidar Visão geral do Dashboard` — merged;
- CI pós-merge #566 / run `33392864692`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- CI #565 / run `33392616909`: success no head final do PR;
- Business Transactions Integration #255 / run `33392616971`: success;
- Inventory Count Integration #268 / run `33392616820`: success;
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
- PR #161 — Caixa consolidado;
- PR #163 — Dashboard / Visão geral consolidado.

Não reabrir essas áreas sem bug ou gap concreto.

## O que o PR #163 entregou

### Visão geral e hierarquia

`/workspace` continua somente leitura, mas agora apresenta uma hierarquia operacional explícita:

1. contexto da organização e data de negócio;
2. filtros;
3. `Precisa de atenção`;
4. resumo financeiro;
5. Estoque;
6. Compras e fornecedores;
7. operação atual de Caixa e Compras.

A página deixou de depender dos controles visuais antigos e passou a reutilizar o design system consolidado para cabeçalho, filtros, botões, painéis, feedback e empty states.

### Semântica comprovada e preservada

Antes da edição foram inventariados integralmente:

- `src/app/workspace/(operacao)/page.tsx`;
- `SupabaseDashboardQuery` e seus contratos;
- `buildDashboardSummary` e testes;
- overview queries de Estoque e Compras;
- componentes `StockOverviewSection` e `PurchaseOverviewSection`;
- requirements/open questions, roadmap, IA, design system e DoD.

Permanece comprovado:

- horizonte relativo e período explícito possuem semânticas diferentes;
- período só limita métricas com data operacional comprovada;
- indicadores de estado atual não se tornam históricos por seleção de período;
- Caixa permanece no escopo de Unidade mesmo com Setor selecionado;
- métricas temporais de Caixa usam data de negócio;
- timezone da organização continua determinando a data de negócio;
- Estoque, Compras e Financeiro só recebem Setor onde existe vínculo setorial explícito;
- histórico de preços de fornecedor permanece no escopo da organização quando não existe vínculo local comprovado.

Nenhum KPI, threshold, SLA, janela, score, meta, tendência ou regra de negócio nova foi criado.

### Destinos de navegação

A apresentação agora envia sinais para rotas consolidadas específicas sempre que o contexto permite:

- Financeiro → contas/vencimentos;
- Caixa → sessões;
- Compras → pedidos/recebimentos;
- Estoque mínimo → política de mínimos;
- validade → lotes;
- transferências → jornada de transferências;
- inventários → jornada de inventários.

`src/modules/dashboard/application/dashboard-navigation.ts` contém apenas o mapping de apresentação dos alertas. Cálculo de KPI e derivação continuam em `dashboard-summary`, evitando acoplamento de read model a rotas. O mapping possui teste próprio.

### Linguagem e estados

Foram removidos dos trechos tocados nomes de campos/tabelas e detalhes de persistência que apareciam como texto normal ao operador. Loading, erro, empty e atualização ganharam tratamento compatível com o design system existente.

### Segurança e contratos

- nenhum schema/migration/RPC/RLS novo;
- nenhuma regra crítica foi movida para React;
- Dashboard permanece somente leitura;
- RLS/grants/queries existentes continuam sendo a fronteira real;
- Q-022 continua aberta;
- nenhum PENDING foi resolvido.

## Validação do PR #163

O primeiro CI do PR, #564, encontrou duas referências de `snapshot` que o TypeScript considerava possivelmente nulas. A guard foi tornada explícita antes do merge.

Head final:

- CI #565: success;
- lint: success;
- typecheck: success;
- unit tests: success;
- production build: success;
- banco/migrations/RLS: success;
- Business Transactions Integration #255: success;
- Inventory Count Integration #268: success.

Após o merge, CI #566 na `main`: success.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Dashboard homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Próxima ação: limpeza de linguagem/resíduos de engenharia

O próximo chat deve executar a slice de **limpeza de linguagem/resíduos de engenharia da experiência normal**, sem reimplementar as jornadas já consolidadas.

### Objetivo

Percorrer as áreas que o usuário realmente vê e remover detalhes técnicos sem valor operacional, mantendo exatamente a regra e os boundaries existentes.

Priorizar ocorrências visíveis como:

- UUID/IDs internos exibidos sem necessidade;
- nomes de tabela, view, RPC, migration, RLS ou provider;
- nomes crus de campos de banco/API;
- termos de implementação como read model, adapter, gateway, schema, branch, PR, fase ou fixture quando apareçam na UI normal;
- códigos internos de status/tipo quando já existe linguagem operacional;
- mensagens de erro herdadas que exponham infraestrutura;
- textos com crases/código em helper text apenas para explicar implementação;
- rótulos incoerentes com a arquitetura de informação aprovada.

### Passos obrigatórios

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system e DoD;
3. fazer busca ampla no código de UI por resíduos técnicos, mas confirmar cada ocorrência em contexto antes de editar;
4. percorrer shell/Visão geral/Administração/Cadastros/Estoque/Compras/Financeiro/Caixa;
5. distinguir texto de UI real de documentação, testes, logs de desenvolvimento e código interno legítimo;
6. alterar somente linguagem/apresentação ou pequenos resíduos de UX que não mudem regra funcional;
7. preservar URLs estáveis e rotas consolidadas, salvo link realmente incorreto;
8. não mudar query, domínio, RPC, RLS ou contrato de dados apenas para “simplificar” texto;
9. corrigir o débito documental conhecido do mapa de rotas de Caixa em `workspace-information-architecture.md`;
10. manter design system e acessibilidade existentes;
11. validar lint, typecheck, testes, build e gates aplicáveis;
12. registrar ausência de browser real se persistir.

### Guardrails

Não usar a limpeza para:

- refatoração arquitetural ampla;
- redesign de jornadas já consolidadas;
- criar nova regra de negócio;
- renomear campos persistentes por estética;
- resolver PENDINGs;
- mudar Q-022;
- retomar #75/#121;
- tocar Production para prova;
- fazer deploy Vercel manual/rotineiro.

## Depois da limpeza de linguagem

Somente após integrar e reconciliar essa slice, promover:

> **homologação UX em jornadas reais desktop/tablet/mobile**

Não saltar diretamente para reconciliação funcional final.

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
10. ~~Dashboard~~ — PR #163;
11. **limpeza de linguagem/resíduos de engenharia** — próxima;
12. homologação UX real;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## Guardrails permanentes

GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; Q-022 e os requisitos PENDING permanecem sem inferência; #75/#121 permanecem ON HOLD até production-readiness final ou decisão explícita.
