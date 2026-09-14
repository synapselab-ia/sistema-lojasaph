# Next Action — Sistema Lojasaph

## Estado

A **Issue #190 / Fase 60 — compositor modular do sistema para owner está concluída e fechada**.

Entregas finais:

- PR #197: fundação do registry/resolver, overrides por Organization, owner-only mutation, audit e `stock-loans`;
- PR #198: rollout Production de `20260911153000_modular_product_composition`;
- PR #200: segunda capability `stock-minimum`, rota direta/histórico coerente de Empréstimos e gating em navegação/Estoque/Dashboard/RLS;
- PR #201: rollout Production de `20260914120000_stock_minimum_composition`;
- Production Migration Reconcile run `34841150576`: success;
- CI pós-rollout #650 / run `34841150555`: success;
- Production alinhada até `20260914120000 / stock_minimum_composition`;
- verificações read-only de constraint, RLS, grants, helpers e defaults concluídas;
- advisors pós-DDL executados sem regressão bloqueante específica da fatia;
- workflow one-shot removido no closeout.

A frente guarda-chuva volta a ser **#181 / Fase 53 — decisões de negócio e perfis reais para conclusão**.

## NEXT_ACTION objetiva

**Não iniciar nova implementação enquanto nenhum gatilho abaixo tiver sido desbloqueado.**

Antes de agir em um novo chat:

1. conferir GitHub real de Issues/PRs/branches/CI;
2. verificar se surgiu novo insumo para algum gatilho abaixo;
3. executar somente o primeiro gatilho realmente desbloqueado;
4. se nenhum estiver desbloqueado, registrar que não há trabalho técnico seguro a iniciar — não fabricar fixtures, integrações, toggles ou production-readiness.

### Gatilho A — #185 / PDV Legal

Desbloqueia quando existir ao menos um destes insumos confiáveis:

- amostra real anonimizada de exportação;
- estrutura oficial das colunas/arquivo;
- documentação/contrato oficial suficiente para determinar formato e identificadores.

Quando desbloqueado, executar o estudo da #185 antes de #188/#189/#184. Não fabricar planilha sintética para fingir compatibilidade com PDV Legal e não usar dado Production como fixture.

### Gatilho B — Q-022 / perfis reais

Desbloqueia quando o operador fornecer o mapeamento real de pessoas/cargos para responsabilidades/capacidades.

Quando desbloqueado:

- mapear funções reais aos roles/capabilities existentes;
- não inferir que cargo empresarial equivale automaticamente a `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier` ou `viewer`;
- não hardcodar e-mail, UUID ou identidade pessoal no código;
- usar esse resultado na preparação de usuários reais para go-live.

### Gatilho C — #184 / consumo de funcionários

Só desbloqueia quando estiverem definidos, com base na fonte real de vendas:

- origem do lançamento;
- granularidade necessária;
- tratamento de cancelamento/estorno;
- relação com o processo de desconto em folha sem transformar Lojasaph em sistema de folha.

Se a origem depender do PDV Legal, aguardar #185.

### Gatilho D — #188 e #189

- #188 catálogo comercial/preços/margem depende do entendimento real de vendas/preços de #185;
- #189 fichas técnicas/receitas depende de #185/#188.

Não implementar antes das dependências concretas.

### Gatilho E — #75/#121 / production-readiness

Permanece **TOTALMENTE ON HOLD** até production-readiness ou nova autorização explícita do operador. Não provisionar serviço pago, provider, bucket, credencial, automação armada ou restore Production por antecipação.

## Compositor depois da #190

Não existe terceira fatia automática.

Se surgir necessidade real de tornar outra área configurável:

- abrir Issue própria;
- mapear capability boundary e dependências reais;
- manter registry estrutural no código e override no banco;
- preservar RLS/autorização independentes;
- desativar nunca apaga dados/histórico;
- adicionar gates backend e UX coerente;
- fazer rollout incremental.

Não reabrir #190 apenas para adicionar mais toggles.

## Contrato arquitetural que permanece vigente

- registry estrutural versionado no código; banco guarda apenas configuração;
- core de contexto/auth/autorização/audit/integridade/compositor não é desligável;
- dependências explícitas; combinações inválidas são bloqueadas;
- frontend não é boundary de segurança;
- RLS/autorização continuam obrigatórios;
- desabilitar não apaga ledger, audit ou histórico;
- reativar recupera comportamento sobre dados intactos;
- configuração estrutural permanece restrita a `owner` Organization-wide até decisão posterior;
- UI fala em linguagem de produto, não flags/UUID/tabelas.

## Guardrails

GitHub é fonte de verdade. Supabase/schema/RLS/grants são hard boundaries. Não repetir etapa concluída. Não aplicar DDL ad hoc. Não fabricar dado externo. Não usar fixture Production. Não hardcodar identidade real. Não disparar deploy Vercel manual rotineiro.