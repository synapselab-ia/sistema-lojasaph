# Current State — Sistema Lojasaph

Última atualização: 2026-09-11

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais antes de agir.** O estado documental registra contexto e decisões; não substitui a verificação do repositório nem do Supabase.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

As bases de Estoque que desbloqueavam a sequência estão concluídas e em Production:

- **#187 / Fase 57 — custeio por lote/camada física**;
- **#183 / Fase 54 — empréstimos com restituição física e/ou financeira**.

Production `fhbvwyttikrbeaanatlr` estava alinhada até `20260911102500_stock_loan_allocation_order` antes da primeira entrega da #190. Não repetir reconciliation sem drift real comprovado.

## Frente ativa — #190 compositor modular

**#190 / Fase 60 é a frente ativa.** A arquitetura é regida por `docs/decisions/ADR-010-modular-product-composition.md`.

A primeira fatia incremental está materializada no **PR #197 — `feat: iniciar compositor modular por Organization`**, branch `feat/190-modular-composition-foundation`. Consultar o GitHub para confirmar estado final do PR/merge/CI antes de continuar.

### O que a primeira fatia prova

- registry estático/versionado de capabilities no código;
- core explícito e não configurável para contexto da Organization, autorização, auditoria e compositor;
- configuração persistida por Organization somente como override, sem duplicar o registry no banco;
- `stock-loans` como primeira capability configurável, com dependência explícita `stock-loans -> inventory`;
- compatibilidade retroativa: ausência de override mantém Empréstimos ativo;
- alteração somente por `owner` Organization-wide;
- audit trail de antes/depois via `organization_capability.changed`;
- navegação resolvida server-side: Empréstimos desaparece quando desativado e `Administração -> Montar sistema` aparece somente para owner;
- gate autoritativo em `public.record_stock_loan(...)`, bloqueando **novos** empréstimos quando a capability está desativada;
- restituições de empréstimos existentes continuam permitidas para não criar obrigação sem caminho de liquidação;
- desativar nunca apaga tabelas, movimentos, audit ou histórico; reativar recupera o comportamento anterior;
- testes unitários do resolver/navegação e regressão PostgreSQL de default → desativação → bloqueio → reativação → auditoria.

### CI observado durante a implementação

No primeiro SHA do PR #197 (`f758189...`):

- CI geral: verde;
- Inventory Count Integration: verde;
- Business Transactions Integration: verde;
- aplicação do Stock Loans Integration (lint/typecheck/tests/build): verde;
- a nova suíte SQL falhou inicialmente porque a policy de leitura usava `private.has_org_role(..., NULL)`, helper incompatível com “qualquer papel”; a correção é usar o helper existente `private.is_org_member(...)`.

Sempre verificar os checks do **head atual** do PR antes de mergear; não considerar esse snapshot como validação final.

## Limites deliberados da primeira fatia

- apenas `stock-loans` é configurável; `inventory` fica ativo e bloqueado para configuração no rollout inicial;
- Compras, Financeiro, Caixa, Cadastros e demais áreas ainda não recebem toggles;
- digitar diretamente `/workspace/emprestimos` ainda pode abrir a superfície histórica; isso não concede autorização nem permite nova operação quando a capability está off, porque o gate autoritativo está no backend;
- module gating complementa autorização/RLS e nunca substitui esses boundaries.

## Frentes abertas condicionadas

- **#185 — PDV Legal:** ON HOLD até existir amostra real anonimizada, estrutura oficial de colunas ou documentação/contrato oficial suficiente. Não fabricar fixture nem usar dado Production para desbloquear.
- **#188 — catálogo comercial, preços e margem:** ON HOLD por #185.
- **#189 — fichas técnicas/receitas:** ON HOLD por #185/#188.
- **#184 — consumo de funcionários:** ON HOLD até definir origem do lançamento, granularidade e estorno; a fonte real se relaciona com #185.
- **#75/#121 / REQ-PLAT-005:** TOTALMENTE ON HOLD até production-readiness.
- **Q-022:** ainda necessário antes de preparar pessoas reais para go-live; nunca hardcodar pessoa/e-mail/UUID em autorização ou compositor.

## Regras que não devem ser rediscutidas

- custeio físico segue `REQ-STK-010`, `BR-STK-010` e `ADR-003-inventory-costing.md`;
- FEFO é default quando não há seleção explícita; lote explícito prevalece;
- histórico econômico não é reprecificado por `average_cost`;
- nenhum módulo desabilitado pode apagar histórico;
- nenhum deploy Vercel manual deve ser disparado por rotina documental/smoke.

## NEXT_ACTION

Seguir `docs/ai/NEXT_ACTION.md`: terminar a primeira fatia da #190 no estado real (CI verde → merge), fazer rollout version-preserving da migration se/quanto Production estiver atrás e então continuar a #190 pela próxima fatia incremental, sem multiplicar toggles antes de provar os boundaries.
