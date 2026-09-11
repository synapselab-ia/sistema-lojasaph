# Next Action — Sistema Lojasaph

## Estado

A frente ativa é **Issue #190 / Fase 60 — compositor modular do sistema para owner**.

#187 e #183 estão concluídas. As frentes #185/#188/#189/#184 continuam condicionadas aos gatilhos documentados e não devem ser usadas para desviar a execução atual.

A primeira entrega incremental da #190 está no **PR #197**, branch `feat/190-modular-composition-foundation`. Ela prova registry/resolver, configuração por Organization, owner-only mutation, audit trail, navegação resolvida e backend gating usando `stock-loans` como primeira capability configurável.

## NEXT_ACTION objetiva

Executar **a primeira condição pendente** abaixo, com base no estado real do GitHub/Supabase. Não repetir condições já concluídas.

### 1. Se o PR #197 ainda estiver aberto

- conferir head/mergeability/checks reais;
- corrigir somente regressões do PR;
- exigir lint, typecheck, testes, build e suíte PostgreSQL verdes;
- mergear o PR quando os checks estiverem verdes;
- não fechar a Issue #190, porque esse PR é somente a primeira fatia incremental.

Contexto do primeiro CI: a única falha encontrada foi a policy de leitura de `organization_capability_settings`; `private.has_org_role(..., NULL)` não autoriza qualquer role. O helper correto é `private.is_org_member(...)`. Verificar o head atual para confirmar que a correção foi validada.

### 2. Se o PR #197 já estiver mergeado e Production ainda não tiver `20260911153000_modular_product_composition`

Fazer rollout **version-preserving** conforme `docs/qa/database-migrations.md`:

1. verificar drift/migration list antes de escrever;
2. aplicar somente a migration mergeada, mantendo a versão `20260911153000`;
3. não usar seed, reset, `migration repair` ou DDL ad hoc;
4. executar dry-run/verificação final;
5. confirmar read-only:
   - `organization_capability_settings` existe com RLS;
   - `authenticated` pode SELECT conforme membership, mas não DML direto;
   - `set_organization_capability(...)` existe e é executável somente pelo papel de banco aprovado, com autorização owner Organization-wide dentro do RPC;
   - `record_stock_loan(...)` contém o gate de capability;
   - ausência de override mantém `stock-loans` ativo;
6. executar advisors de security/performance e tratar apenas regressões do rollout;
7. remover eventual workflow/reconciliador one-shot depois do sucesso;
8. confirmar CI pós-merge/ops verde.

### 3. Se PR #197 e rollout Production já estiverem concluídos

Continuar a **segunda fatia incremental da #190**, sem criar uma matriz grande de toggles.

Objetivo:

- tornar a experiência de rota direta coerente quando uma capability estiver desativada, usando resolução server-side e sem confundir module gating com autorização/RLS;
- auditar os boundaries reais de uma segunda capability de baixo risco;
- estudar **Estoque mínimo** como candidato preferencial, mas só torná-lo configurável se o mapeamento confirmar isolamento/dependências simples;
- se o candidato não for seguro, documentar o bloqueio e escolher outro com base no mapa real, não por conveniência;
- reutilizar o mesmo registry/resolver, configuração Organization-scoped, owner-only mutation, audit trail e backend gate;
- preservar histórico e default compatível;
- cobrir enabled/disabled, dependências, autorização, isolamento por Organization, navegação/rota/backend e reativação;
- CI verde → PR → merge → rollout versionado se houver nova migration;
- atualizar `CURRENT_STATE`, `HANDOFF` e este arquivo.

## Contrato arquitetural que permanece obrigatório

- registry estrutural versionado no código; banco guarda apenas configuração;
- core de contexto/auth/autorização/audit/integridade/compositor não é desligável;
- dependências são explícitas e combinações inválidas são bloqueadas;
- frontend não é boundary de segurança;
- RLS/autorização continuam obrigatórios e independentes do compositor;
- desabilitar não apaga dados, ledger, audit ou histórico;
- reativar recupera o comportamento sobre o histórico intacto;
- primeiro rollout de configuração continua restrito a `owner` Organization-wide;
- UX deve falar em módulos/capabilities de produto, nunca flags/UUIDs/tabelas.

## Frentes bloqueadas

- #185 PDV Legal: ON HOLD até amostra/estrutura oficial/documentação suficiente;
- #188: ON HOLD por #185;
- #189: ON HOLD por #185/#188;
- #184: ON HOLD até definir origem/granularidade/estorno;
- #75/#121: TOTALMENTE ON HOLD até production-readiness;
- Q-022 continua obrigatório antes de usuários reais de go-live.

## Guardrails

GitHub é fonte de verdade; consultar estado real antes de agir. Supabase/schema/RLS/grants são hard boundaries. Não hardcodar identidade real. Não usar fixture Production. Não aplicar DDL ad hoc. Não disparar deploy Vercel manual rotineiro. Não repetir etapa concluída.
