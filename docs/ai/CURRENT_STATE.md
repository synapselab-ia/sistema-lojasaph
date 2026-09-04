# Current State — Sistema Lojasaph

Última atualização: 2026-09-04

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais.** SHAs/runs abaixo são âncoras de evidência, não substituem a consulta ao estado atual.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

A **Fase 57 / Issue #187 — custeio por lote/camada física** está concluída, integrada e alinhada em Production.

Evidência de fechamento:

- PR #192 `feat: custear saídas por camada física` mergeado em `main` no commit `1b795bf358a417e6f3e8dbaf9e574e2b3383ad93`;
- Issue #187 fechada como `completed`;
- CI do PR verde em CI, Inventory Count Integration e Business Transactions Integration;
- CI pós-merge #623 / run `33907422006`: `validate` e `database` verdes;
- Production Migration Reconcile 187 / run `33907623545`: success;
- Production `fhbvwyttikrbeaanatlr` alinhada até `20260904103000_negative_stock_cost_fallback`;
- dry-run pós-aplicação: `Remote database is up to date.`

## Custeio vigente — implementação concluída

`REQ-STK-010`, `BR-STK-010` e `ADR-003-inventory-costing.md` agora refletem o runtime:

- saída física usa custo da camada/lote efetivamente consumida;
- FEFO escolhe a camada quando não há seleção explícita;
- lote explicitamente selecionado prevalece;
- perdas/vencimentos usam a camada efetivamente baixada;
- transferências preservam custo e não criam ganho/perda artificial;
- devoluções relacionadas restauram custo/rastreabilidade histórica;
- `inventory_balances.average_cost` permanece indicador/cache analítico e não reprecifica saída física conhecida;
- item não rastreado por lote usa camada econômica oculta;
- saldo legado sem camada física é explicitado como `legacy_estimate`;
- excedente permitido de estoque negativo usa `negative_estimate`; operação combinada pode resultar em `mixed_estimate`;
- fallback estimado é auditável e visível, nunca retorno silencioso ao custo médio;
- ajuste positivo sem custo explícito permanece bloqueado.

Casos de teste de referência:

- FEFO: R$ 2,10/unidade;
- lote selecionado: R$ 3,00/unidade;
- devolução: preserva R$ 8,00 da camada original;
- transferência multi-camada: 5 × R$ 3,00 + 5 × R$ 2,10 = R$ 2,55/unidade.

Verificação read-only em Production após rollout encontrou:

- `inventory_batches`: 3 camadas `traceable` com 147 unidades remanescentes;
- `inventory_batches`: 1 camada `legacy_estimate` com 20 unidades remanescentes;
- movimentos existentes classificados sem reescrever história;
- helpers internos de custeio em schema `private`, `SECURITY DEFINER`, sem `EXECUTE` para `anon` ou `authenticated`.

## Advisors Production

Advisors foram executados depois do DDL.

- não apareceu erro crítico específico da #187;
- Security mantém warnings amplos já conhecidos para RPCs públicos `SECURITY DEFINER` executáveis por `authenticated`, além de leaked-password protection desabilitada;
- os helpers internos novos da #187 não estão expostos a `anon`/`authenticated`;
- Performance mantém INFOs históricos de FKs sem índice e índices ainda não utilizados, inclusive estruturas de estoque existentes.

Não expandir #183 para corrigir esses itens por inércia; tratar em hardening/performance próprio quando houver prioridade/evidência.

## Próxima frente principal — #183 Empréstimos

A dependência técnica da #183 foi satisfeita pela #187. Empréstimo é processo distinto de transferência e deve registrar quantidade, valor histórico e restituições total/parcial por:

- retorno físico;
- restituição monetária;
- combinação das duas formas.

O valor físico do empréstimo usa **as camadas/lotes efetivamente emprestados**, preservando quantidade × custo de cada camada. Não usar custo médio nem última compra.

A restituição monetária deve ser registrada de forma auditável, mas **não inferir automaticamente lançamento em Caixa/Financeiro** sem regra explícita; evitar dupla contabilização.

## Outras decisões empresariais vigentes

### FEFO

`REQ-EXP-004` aprovado. FEFO é default quando não houver lote físico explicitamente indicado.

### Catálogo comercial, preços e margem — #188

O Lojasaph não vira PDV, mas pode representar produto vendável para mapear vendas, preço, ficha técnica e relatórios. Preço de fornecedor, custo real do lote, preço de venda e margem são conceitos distintos. Margem bruta não é lucro líquido.

### Fichas técnicas/receitas — #189

Recolocadas na fila. Devem suportar produto/preparação, ingredientes, rendimento e custo teórico. A existência de ficha técnica não autoriza baixa automática de estoque.

### Consumo de funcionários — #184

Venda atribuída ao funcionário, compõe faturamento e é descontada em folha; não equivale a entrada imediata de caixa e não transforma o sistema em folha/RH.

### PDV Legal — #185

PDV Legal continua sendo o sistema de venda. Direção atual: importação oficial Excel/CSV → staging/dry-run/idempotência enquanto não houver API/integrador oficial comprovado.

### Compositor modular — #190

Área estrutural inicialmente para `owner` Organization-wide; desligar módulo não apaga histórico; backend e navegação devem respeitar capability gating; auth/RLS/Organization/auditoria/integridade são core.

### Qualidade visual

Novas áreas devem manter linguagem operacional, hierarquia clara, progressive disclosure, feedback, acessibilidade e consistência com o design system da Fase 51. CRUD bruto não é aceite de produto.

## Itens ainda deferidos / ON HOLD

- `REQ-FIN-004`: UX/regra específica de pagamento parcial/múltiplo não necessária para primeiro go-live;
- tablet live: deferido por decisão operacional;
- #75/#121 e `REQ-PLAT-005`: **TOTALMENTE ON HOLD** até production-readiness.

## Pergunta ainda prioritária para go-live

**Q-022 — perfis reais:** mapear pessoas/cargos reais às capacidades técnicas existentes antes de preparar usuários de go-live. Não assumir equivalência automática com `owner/admin/manager/...`.

Q-008 está encerrada e não deve ser perguntada novamente.

## Ordem funcional ativa

1. **#183 — empréstimos** com restituição física e/ou monetária;
2. **#185 — PDV Legal** quando houver estrutura/amostra oficial;
3. **#188 — catálogo comercial, preços e margem**;
4. **#189 — fichas técnicas/receitas**;
5. **#184 — consumo de funcionários**, refinado conforme origem real da venda;
6. **#190 — compositor modular** após mapear dependências e provar gating inicial;
7. concluir **Q-022** antes da preparação dos usuários reais;
8. homologação com dados representativos → migração/cutover → production-readiness.

## Runtime / infraestrutura

- Git e Production estão alinhados até migration `20260904103000`;
- não repetir reconciliation de migrations sem drift novo comprovado;
- nenhum deploy Vercel manual foi disparado como parte do fechamento da #187;
- não gastar deploy por rotina documental/smoke sem regressão concreta.

## NEXT_ACTION

**Executar Issue #183 — empréstimos com restituição física e/ou financeira**, agora sobre o runtime de custeio por camada já integrado e validado.
