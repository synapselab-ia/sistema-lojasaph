# Current State — Sistema Lojasaph

Última atualização: 2026-09-11

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais.** SHAs e runs abaixo são âncoras de evidência, não substituem a consulta ao estado atual.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

As frentes de Estoque que desbloqueavam a sequência estão concluídas:

- **#187 / Fase 57 — custeio por lote/camada física**: concluída, integrada e alinhada em Production;
- **#183 / Fase 54 — empréstimos com restituição física e/ou financeira**: concluída, integrada e alinhada em Production.

## Fechamento da #183 — empréstimos

Evidência:

- PR #194 `feat: implementar empréstimos de estoque` mergeado em `main` no commit `15bac74c2b43b0f428e394caadcc72efb17fb68a`;
- Issue #183 fechada como `completed`;
- CI do head do PR verde: CI #634, Inventory Count Integration #294, Business Transactions Integration #281 e Stock Loans Integration #9;
- CI pós-merge verde: CI #635 / run `34610618614` e Stock Loans Integration #10 / run `34610618603`;
- PR operacional #195 `ops: reconciliar migrations da issue 183 em Production` mergeado no commit `17c6cabd9e532096155757e7b050cfe75ea5088c`;
- CI do PR operacional #636 / run `34611784238`: verde;
- CI pós-merge do rollout #637 / run `34611952509`: verde;
- Production Migration Reconcile 183 #1 / run `34611952669`: verde;
- Production `fhbvwyttikrbeaanatlr` alinhada pelas migrations:
  - `20260911102000_stock_loans`;
  - `20260911102500_stock_loan_allocation_order`;
- dry-run pós-push confirmou banco remoto sem migration local pendente;
- reconciliador one-shot removido após o sucesso.

## Contrato de empréstimos vigente

Empréstimo é processo **distinto de transferência**.

- valor histórico usa as camadas/lotes efetivamente emprestados;
- FEFO é usado quando não existe lote explícito; lote explícito prevalece;
- ordem original das alocações físicas é persistida por `allocation_order`, permitindo restituição parcial historicamente correta;
- saldo físico e saldo econômico são separados e explicáveis;
- retorno físico gera movimento `loan_return` e restaura as camadas originais;
- restituição monetária não cria movimento fictício de estoque e não lança automaticamente Caixa/Financeiro;
- físico + monetário podem coexistir;
- over-return e over-settlement são bloqueados;
- commands são transacionais, idempotentes e protegidos por lock para concorrência;
- restituições permanecem ligadas ao empréstimo original;
- RLS, escopo de Organization e audit trail são obrigatórios;
- jornada operacional é `lista → detalhe → restituir` em `/workspace/emprestimos`.

### Verificação read-only em Production

Após o rollout foi confirmado que:

- `public.stock_loans` existe e possui RLS;
- `public.stock_loan_restitutions` existe e possui RLS;
- `stock_movement_batch_allocations.allocation_order` existe;
- `record_stock_loan(...)` e `record_stock_loan_restitution(...)` existem;
- `authenticated` executa os commands aprovados;
- `anon` não executa os commands;
- `authenticated` não possui INSERT/UPDATE direto em `stock_loans` nem INSERT direto em `stock_loan_restitutions`.

## Advisors Production após #183

Advisors foram executados depois do DDL.

- Security mantém o aviso amplo de RPCs `SECURITY DEFINER` executáveis por `authenticated`; os dois commands de empréstimo aparecem nessa categoria porque são RPCs intencionalmente expostos a usuários autenticados e fazem autorização/escopo no próprio contrato testado;
- leaked-password protection continua desabilitada, aviso já conhecido e não pertencente ao escopo da #183;
- Performance mantém INFOs de FKs sem índice e índices ainda não usados; tabelas novas de empréstimo aparecem nesse inventário, sem erro crítico de rollout;
- não ampliar a #183 por inércia para hardening/performance não relacionado.

## Custeio vigente — não rediscutir

`REQ-STK-010`, `BR-STK-010` e `ADR-003-inventory-costing.md` permanecem autoridade:

- saída física usa custo da camada/lote efetivamente consumida;
- `inventory_balances.average_cost` é cache/indicador analítico e não reprecifica histórico;
- FEFO escolhe quando não há seleção explícita;
- lote explicitamente selecionado prevalece;
- transferências, devoluções, perdas, vencimentos e empréstimos preservam custo/rastreabilidade de origem;
- legado sem camada usa `legacy_estimate`; excedente permitido de estoque negativo usa `negative_estimate`;
- ajuste positivo sem custo explícito permanece bloqueado.

## Frentes abertas e dependências reais

### #185 — PDV Legal — ON HOLD

A Issue exige amostra real anonimizada ou estrutura oficial de colunas dos arquivos escolhidos. Nenhuma nova amostra/estrutura oficial está disponível no repositório. Não fabricar arquivo, não fazer scraping e não usar dado Production para desbloquear o estudo.

**Gatilho de retomada:** estrutura/amostra oficial do PDV Legal ou documentação/contrato oficial suficiente para definir o formato de integração.

### #188 — catálogo comercial, preços e margem — ON HOLD por dependência

Depende de #185 para definir quais vendas/preços/identificadores realmente chegam do PDV. #187 já está satisfeita, mas #185 ainda não.

### #189 — fichas técnicas/receitas — ON HOLD por dependência

Depende explicitamente de #188 e #185. Não implementar antes dessas bases.

### #184 — consumo de funcionários — ON HOLD por decisão/origem

A semântica empresarial está decidida, mas a Issue ainda exige definir origem do lançamento (manual, PDV ou ambos), granularidade e estorno. A definição de fonte de venda está ligada ao estudo #185; não inventar comportamento.

## Próxima frente principal — #190 compositor modular

**#190 / Fase 60 é a próxima frente independente e viável.**

A direção arquitetural já foi aprovada em `ADR-010-modular-product-composition.md`:

1. mapear dependências reais das áreas atuais;
2. criar `Module/Capability Registry` estático versionado;
3. persistir somente configuração habilitada/desabilitada por Organization;
4. aplicar gating também nos boundaries de backend, não apenas no menu;
5. preservar histórico quando um módulo é desabilitado;
6. provar o desenho com 1–2 capabilities de baixo risco antes de expandir;
7. acesso inicial à composição somente para `owner` Organization-wide;
8. mudanças de composição auditáveis.

Não implementar como simples hide/show de navegação.

## Itens deferidos / ON HOLD

- `REQ-FIN-004`: UX/regra específica de pagamento parcial/múltiplo não necessária para primeiro go-live;
- tablet live: deferido por decisão operacional;
- #75/#121 e `REQ-PLAT-005`: **TOTALMENTE ON HOLD** até production-readiness;
- Q-022 — perfis/pessoas reais: continua necessário antes de preparar usuários reais de go-live; não hardcodar pessoa/e-mail/UUID no compositor.

## Runtime / infraestrutura

- Git e Production estão alinhados até migration `20260911102500`;
- não repetir reconciliation sem drift novo comprovado;
- o workflow Production Migration Reconcile 183 foi one-shot e deve permanecer removido após o fechamento;
- nenhum seed/reset/repair/DDL ad hoc foi usado em Production;
- não disparar deploy Vercel manual por rotina documental/smoke sem regressão concreta.

## NEXT_ACTION

**Executar Issue #190 — compositor modular do sistema para owner**, começando pelo mapeamento real de dependências e pela prova incremental prevista no ADR-010.
