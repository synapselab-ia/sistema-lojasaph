# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI.** Não usar SHAs documentais como estado permanente.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. documentos/ADRs da área afetada.

## Frente ativa

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva é **Fase 53 / #181 — conclusão de negócio**.

A próxima frente principal é **Fase 60 / Issue #190 — compositor modular do sistema para owner**.

A #183 não está mais ativa: empréstimos foram implementados, mergeados, validados e promovidos a Production.

## Fechamento da #183

### Feature

- Issue #183: `completed`;
- PR #194 `feat: implementar empréstimos de estoque`;
- merge em `main`: `15bac74c2b43b0f428e394caadcc72efb17fb68a`;
- CI do PR: CI #634, Inventory Count Integration #294, Business Transactions Integration #281 e Stock Loans Integration #9 verdes;
- pós-merge: CI #635 / `34610618614` e Stock Loans Integration #10 / `34610618603` verdes.

### Contrato integrado

- empréstimo não é transferência;
- valuation histórico vem das camadas realmente emprestadas;
- FEFO quando não há lote explícito; lote explícito prevalece;
- ordem de consumo é persistida para restituição física parcial correta;
- saldo físico e econômico são separados;
- retorno físico restaura camadas e gera `loan_return`;
- restituição monetária não fabrica movimento de estoque nem lançamento automático em Caixa/Financeiro;
- físico e monetário podem coexistir;
- over-return / over-settlement são bloqueados;
- idempotência, lock/concorrência, RLS, Organization scope e audit trail cobertos;
- UX: `/workspace/emprestimos` → detalhe → restituir.

### Rollout Production

- PR #195 `ops: reconciliar migrations da issue 183 em Production`;
- merge: `17c6cabd9e532096155757e7b050cfe75ea5088c`;
- CI PR #636 / run `34611784238`: verde;
- CI pós-merge #637 / run `34611952509`: verde;
- Production Migration Reconcile 183 #1 / run `34611952669`: verde;
- mecanismo: `supabase db push` version-preserving, dry-run + allowlist fail-closed + dry-run final;
- migrations aplicadas:
  - `20260911102000_stock_loans`;
  - `20260911102500_stock_loan_allocation_order`;
- Production `fhbvwyttikrbeaanatlr` agora contém ambas as versions;
- sem seed, reset, `migration repair`, DDL ad hoc ou edição direta de migration history;
- reconciliador one-shot removido depois do sucesso.

### Verificação read-only Production

Confirmado:

- tabelas `stock_loans` e `stock_loan_restitutions` existem e possuem RLS;
- `stock_movement_batch_allocations.allocation_order` existe;
- RPCs de criar empréstimo e registrar restituição existem;
- `authenticated` pode executar somente os commands previstos;
- `anon` não executa os commands;
- `authenticated` não recebeu INSERT/UPDATE direto nas tabelas de empréstimo.

Advisors pós-DDL não apontaram erro crítico específico da #183. Permanecem warnings/INFOs já conhecidos de RPCs públicos `SECURITY DEFINER`, leaked-password protection, FKs sem índice e índices ainda não usados. Não transformar isso em extensão silenciosa da #183.

## Regra de custeio que NÃO deve ser rediscutida

Autoridade: `REQ-STK-010`, `BR-STK-010`, `ADR-003-inventory-costing.md`.

- custo por lote/camada efetivamente movimentada;
- `average_cost` é analítico/cache e não reprecifica histórico;
- FEFO é default quando não há seleção explícita;
- lote explícito prevalece;
- devoluções, transferências, perdas, vencimentos e empréstimos preservam origem econômica;
- legado sem camada = `legacy_estimate`;
- excedente permitido de estoque negativo = `negative_estimate`;
- ajuste positivo sem custo explícito permanece bloqueado.

## Frentes abertas que estão ON HOLD

### #185 — PDV Legal

A própria Issue exige amostra real anonimizada ou estrutura oficial das colunas exportadas. Isso ainda não existe no repositório.

**Retomar somente quando:** houver amostra/estrutura oficial ou documentação/contrato oficial suficiente. Não criar fixture falsa, scraping ou dado Production para desbloquear.

### #188 — catálogo comercial, preços e margem

Tem dependência explícita de #185 para a forma real de vendas/preços/identificadores. #187 já está satisfeita; #185 ainda não.

### #189 — fichas técnicas/receitas

Depende explicitamente de #188 e #185, além do custeio já resolvido.

### #184 — consumo de funcionários

Semântica está aprovada, porém origem do lançamento, granularidade e estorno ainda precisam ser definidos. A origem real de venda está ligada a #185. Não inventar.

## Próxima frente viável — #190

A arquitetura foi formalizada em `docs/decisions/ADR-010-modular-product-composition.md` e a Issue #190 permanece aberta.

Princípios obrigatórios:

- definição estrutural em `Module/Capability Registry` versionado no código;
- banco persiste só configuração por Organization;
- desabilitar não apaga dados/histórico;
- module gating complementa autorização/RLS e também deve alcançar backend;
- capacidades core de Organization/auth/RLS/audit/integridade não são desligáveis;
- dependency graph impede combinações inválidas;
- área de composição inicialmente apenas para `owner` Organization-wide;
- alterações auditáveis;
- UX de produto, não painel técnico de flags;
- rollout incremental: mapear dependências → registry/resolver → 1–2 capabilities de baixo risco → validar → expandir.

Não implementar #190 como simples hide/show do menu.

## Q-022 e autorização

Q-022 continua necessário antes do go-live para mapear pessoas/cargos reais às capacidades existentes. Isso **não bloqueia a arquitetura da #190**: implementar contra role/capability `owner`, nunca contra pessoa, e-mail ou UUID específicos.

## #75/#121

Continuam **TOTALMENTE ON HOLD** até production-readiness. Não retomar nesta fase.

## Estado infra que não deve ser refeito

- Git/Production alinhados até `20260911102500`;
- não repetir migration reconciliation sem drift real;
- reconciliador #183 era one-shot e foi removido;
- não disparar deploy Vercel manual por rotina;
- não criar dados Production para evidência.

## NEXT_ACTION

### Executar #190 — compositor modular do sistema para owner

O próximo chat deve:

1. ler governança/estado real e Issue #190 + ADR-010;
2. auditar `src/modules/*`, `workspace-navigation.ts`, rotas/actions/RPCs e capabilities atuais;
3. mapear dependências reais antes de criar toggles;
4. definir registry/resolver estático e modelo persistente mínimo por Organization;
5. selecionar 1–2 capabilities de baixo risco para prova de gating;
6. garantir navegação **e backend** coerentes com enabled/disabled;
7. preservar histórico na desativação/reativação;
8. registrar mudanças de composição em audit trail;
9. entregar UX compreensível para `owner`, sem flags técnicas;
10. validar PostgreSQL + aplicação + CI → PR → merge → rollout versionado se houver migration;
11. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`.

## Guardrails

GitHub é fonte de verdade; Supabase/schema/RLS/grants são hard boundaries; nenhum secret; nenhuma fixture Production; nenhuma regra contábil/fiscal por inferência; nenhum deploy Vercel manual rotineiro; não retomar #75/#121.
