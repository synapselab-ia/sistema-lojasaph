# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI antes de executar qualquer etapa.** Depois conferir o estado do Supabase quando a ação envolver migrations/schema.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. ADRs/documentos da área afetada.

## Frente ativa

A frente ativa é **Fase 60 / Issue #190 — compositor modular do sistema para owner**, dentro da Fase 53 / #181.

#187 (custeio por camada/lote) e #183 (empréstimos) já estão concluídas. Production `fhbvwyttikrbeaanatlr` estava alinhada até migration `20260911102500_stock_loan_allocation_order` antes da primeira fatia da #190.

## Primeira fatia da #190

Veículo de entrega: **PR #197 — `feat: iniciar compositor modular por Organization`**, branch `feat/190-modular-composition-foundation`.

Consultar o GitHub para saber se o PR ainda está aberto ou já foi mergeado. Não recriar essa implementação em outra branch.

### Arquitetura implementada

- `src/modules/composition/domain/capability.ts`: registry estático/versionado;
- `src/modules/composition/application/capability-resolver.ts`: resolução de defaults, overrides e dependências;
- `organization_capability_settings`: guarda somente override por Organization;
- `set_organization_capability(...)`: mutation RPC owner-only, auditável;
- `stock-loans -> inventory`: primeira dependência operacional explícita;
- `inventory` permanece ativo/não configurável nesta etapa;
- `stock-loans` é configurável e default-enabled para não quebrar organizações existentes;
- `record_stock_loan(...)` é o gate autoritativo para impedir novos empréstimos quando off;
- restituição de empréstimos existentes continua permitida deliberadamente;
- shell/navegação consomem estado resolvido e removem Empréstimos quando off;
- `Administração -> Montar sistema` aparece apenas para owner Organization-wide;
- histórico/tabelas/audit permanecem intactos durante desativação.

### Limite conhecido

A rota histórica `/workspace/emprestimos` ainda pode ser digitada diretamente quando a capability está desativada. Isso **não** libera nova operação: o backend recusa criação. A próxima expansão deve decidir e implementar uma experiência server-side coerente para rota direta, sem confundir gating de produto com autorização/RLS.

## CI da implementação

No primeiro head `f758189...`:

- CI geral, Inventory Count Integration e Business Transactions Integration passaram;
- lint, typecheck, unit tests e production build do workflow de empréstimos passaram;
- somente a nova suíte SQL falhou inicialmente;
- causa confirmada nos logs: policy de leitura usou `private.has_org_role(organization_id, NULL)`, mas esse helper exige `role = ANY(allowed_roles)` e não serve para `NULL`;
- correção preparada: policy usa `private.is_org_member(organization_id)`, helper já existente e apropriado para leitura por qualquer membro ativo.

**Obrigatório:** verificar o CI do head atual do PR #197; só mergear com checks verdes.

## Production / migrations

A primeira fatia adiciona migration `20260911153000_modular_product_composition.sql`.

Depois do merge:

1. comparar migration history local/remota;
2. se Production estiver atrás, usar o procedimento version-preserving de `docs/qa/database-migrations.md`;
3. não usar seed/reset/repair nem DDL ad hoc;
4. verificar read-only tabela, RLS, grants, RPCs e default efetivo;
5. executar advisors após DDL;
6. remover qualquer reconciliador one-shot criado para o rollout.

Não aplicar a migration por um caminho que gere versão remota diferente da versão do repositório.

## Próxima fatia da #190 depois do rollout

Não abrir dezenas de toggles. Primeiro consolidar o padrão já provado:

- adicionar comportamento server-side coerente para rota direta de capability desativada;
- mapear uma segunda capability de baixo risco antes de torná-la configurável;
- candidato preferencial para estudo: **Estoque mínimo**, por ser uma capability operacional mais isolada que Compras/Financeiro/Caixa; confirmar boundaries reais antes de implementar;
- manter registry, resolver, backend gate, navegação, auditoria e preservação de histórico como contrato único;
- atualizar testes de combinações/dependências e UX do compositor à medida que capabilities forem liberadas.

## Frentes ON HOLD

- #185 PDV Legal: aguarda amostra/estrutura oficial/documentação suficiente;
- #188: depende de #185;
- #189: depende de #185/#188;
- #184: aguarda definição real de origem/granularidade/estorno;
- #75/#121: TOTALMENTE ON HOLD até production-readiness;
- Q-022 segue necessário antes de usuários reais de go-live.

## Guardrails

GitHub é fonte de verdade; Supabase/schema/RLS/grants são hard boundaries; module gating não substitui autorização; nenhum secret; nenhuma fixture Production; nenhuma regra contábil/fiscal por inferência; nenhuma identidade pessoal hardcoded; nenhum deploy Vercel manual rotineiro; não repetir reconciliation sem drift comprovado.
