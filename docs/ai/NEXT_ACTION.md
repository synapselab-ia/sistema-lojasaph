# Next Action — Sistema Lojasaph

## Estado

A frente ativa continua sendo **Issue #190 / Fase 60 — compositor modular do sistema para owner**.

A primeira fatia está concluída:

- PR #197 mergeado: registry/resolver, configuração Organization-scoped, owner-only mutation, audit trail, navegação resolvida e backend gating para `stock-loans`;
- PR #198 mergeado: rollout version-preserving da migration `20260911153000_modular_product_composition`;
- Production Migration Reconcile 190 run `34617253893`: success;
- CI pós-merge #644 / run `34617253823`: success;
- Production alinhada até `20260911153000 / modular_product_composition`;
- verificações read-only de RLS/grants/policies/RPCs/default concluídas;
- advisors executados sem finding de segurança acionável específico da fatia; INFO de FK sem índice em `updated_by_user_id` permanece documentado e não bloqueia esta etapa;
- reconciliador one-shot deve estar removido após o fechamento operacional.

#187 e #183 estão concluídas. As frentes #185/#188/#189/#184 continuam condicionadas aos gatilhos documentados e não devem desviar a execução atual.

## NEXT_ACTION objetiva — segunda fatia incremental da #190

Executar **somente esta fatia**, sem criar uma matriz ampla de toggles.

### Parte A — rota direta coerente para capability desativada

Hoje `stock-loans` já desaparece da navegação quando off e o backend bloqueia novos empréstimos, mas `/workspace/emprestimos` ainda pode ser digitada diretamente.

1. Inspecionar a rota/layout server-side de Empréstimos e o ponto em que o estado resolvido de capabilities já é carregado para o workspace.
2. Reutilizar `CapabilityResolver`/registry existentes; não criar uma segunda fonte de verdade.
3. Quando `stock-loans` estiver desativado, produzir UX coerente de **módulo desativado**, não confundir com `403`/falha de autorização se o usuário continua autorizado.
4. Preservar histórico e a capacidade de liquidar/restituir empréstimos já existentes. Não criar um gate que deixe obrigação sem caminho de encerramento.
5. Manter o backend como boundary autoritativo para novas operações; o tratamento de rota complementa, não substitui, `record_stock_loan(...)`.
6. Adicionar regressão para navegação + rota direta + backend com capability on/off.

### Parte B — mapear uma segunda capability de baixo risco

Candidato preferencial para **auditoria antes de implementação**: **Estoque mínimo**.

Ler e inspecionar, no mínimo:

- `docs/modules/stock-minimum.md`;
- `stock_minimum_policies` e migrations relacionadas;
- policies/RLS/grants/audit da tabela;
- superfície de manutenção em `/workspace/estoque`;
- Dashboard/sinal de estoque abaixo do mínimo;
- repositories/adapters/actions envolvidos;
- dependências com `inventory` e demais capacidades.

Produzir um mapa explícito de:

- capability id/nome de produto proposto;
- dependências;
- rotas/nav/cards afetados;
- gates de aplicação/backend necessários;
- comportamento de dados/histórico quando off;
- comportamento de reativação;
- testes necessários.

**Só tornar Estoque mínimo configurável se esse mapa confirmar isolamento e dependências simples.** Se houver acoplamento que torne o rollout inseguro, documentar o bloqueio e selecionar outro candidato de baixo risco com base no código real.

### Se Estoque mínimo for aprovado pelo mapeamento

Implementar como segunda capability usando o mesmo contrato já provado:

- registry estrutural versionado no código;
- banco guarda apenas override por Organization;
- dependência explícita, provavelmente em `inventory`, somente se confirmada pelo mapa real;
- alteração somente por owner Organization-wide;
- audit trail de antes/depois;
- navegação/cards/superfícies coerentes quando off;
- backend/server actions respeitam gating onde houver mutation;
- desativar não apaga policy/histórico;
- reativar recupera configuração anterior;
- default retrocompatível;
- testes de enabled/disabled, dependências, autorização, isolamento por Organization, navegação/rota/backend e reativação.

Depois: lint + typecheck + testes + build + PostgreSQL relevantes -> PR -> merge. Só fazer rollout Production se houver nova migration e somente após provar drift real.

## Contrato arquitetural obrigatório

- registry estrutural versionado no código; banco guarda apenas configuração;
- core de contexto/auth/autorização/audit/integridade/compositor não é desligável;
- dependências são explícitas e combinações inválidas são bloqueadas;
- frontend não é boundary de segurança;
- RLS/autorização continuam obrigatórios e independentes do compositor;
- desabilitar não apaga dados, ledger, audit ou histórico;
- reativar recupera o comportamento sobre o histórico intacto;
- primeiro rollout de configuração continua restrito a `owner` Organization-wide;
- UX fala em módulos/capabilities de produto, nunca flags/UUIDs/tabelas;
- não repetir rollout/reconcile da migration `20260911153000` já aplicada.

## Frentes bloqueadas

- #185 PDV Legal: ON HOLD até amostra/estrutura oficial/documentação suficiente;
- #188: ON HOLD por #185;
- #189: ON HOLD por #185/#188;
- #184: ON HOLD até definir origem/granularidade/estorno;
- #75/#121: TOTALMENTE ON HOLD até production-readiness;
- Q-022 continua obrigatório antes de usuários reais de go-live.

## Guardrails

GitHub é fonte de verdade; consultar estado real antes de agir. Supabase/schema/RLS/grants são hard boundaries. Não hardcodar identidade real. Não usar fixture Production. Não aplicar DDL ad hoc. Não disparar deploy Vercel manual rotineiro. Não repetir etapa concluída.
