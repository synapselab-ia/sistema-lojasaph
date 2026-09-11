# Current State — Sistema Lojasaph

Última atualização: 2026-09-11

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais antes de agir.** O estado documental registra contexto e decisões; não substitui a verificação do repositório nem do Supabase.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

As bases de Estoque que desbloqueavam a sequência estão concluídas e em Production:

- **#187 / Fase 57 — custeio por lote/camada física**;
- **#183 / Fase 54 — empréstimos com restituição física e/ou financeira**.

A frente ativa continua sendo **#190 / Fase 60 — compositor modular do sistema para owner**. A Issue #190 permanece aberta porque a entrega é incremental.

## #190 — primeira fatia concluída e em Production

A arquitetura é regida por `docs/decisions/ADR-010-modular-product-composition.md`.

### Implementação

PR **#197 — `feat: iniciar compositor modular por Organization`** foi mergeado em `main` no commit `954192c7b2cc4af7a9cad530679ef38dcdac4a2c`.

A primeira fatia prova:

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
- testes unitários do resolver/navegação e regressão PostgreSQL de default -> desativação -> bloqueio -> reativação -> auditoria.

A primeira execução da nova suíte SQL encontrou uma policy incorreta baseada em `private.has_org_role(..., NULL)`. O defeito foi corrigido para `private.is_org_member(...)` antes do merge; os workflows do head final ficaram verdes.

### Rollout Production

Migration versionada: `20260911153000_modular_product_composition.sql`.

PR **#198 — `ops: reconciliar compositor modular em Production`** foi mergeado em `main` no commit `4823d58e4d6b1859da13b54daf85e5ed3dfaf379`.

Evidência operacional:

- antes do rollout, Production terminava em `20260911102500_stock_loan_allocation_order`;
- reconciliador one-shot usou `supabase db push --dry-run`, allowlist exata e `supabase db push`, sem seed/reset/repair/DDL ad hoc;
- `Production Migration Reconcile 190` run `34617253893`: **success**;
- CI pós-merge #644 / run `34617253823`: **success**;
- histórico remoto agora termina em `20260911153000 / modular_product_composition`;
- `organization_capability_settings` existe com RLS ativo;
- `authenticated` possui SELECT direto e não possui INSERT/UPDATE/DELETE direto nessa tabela;
- única policy da tabela é `organization_capability_settings_member_select`, `TO authenticated`, com `private.is_org_member(organization_id)`;
- `set_organization_capability(uuid,text,boolean)` é `SECURITY DEFINER`, executável por `authenticated`, não por `anon`/`service_role`, e contém guarda Organization-wide de `owner` + bloqueio de capability não configurável;
- `record_stock_loan(...)` continua executável por `authenticated`, não por `anon`, e contém `private.is_capability_enabled(...)` + erro `CAPABILITY_DISABLED: stock-loans`;
- Production possui 0 overrides; a Organization existente resolve `stock-loans` como ativa por default.

### Advisors pós-DDL

Security Advisor:

- mantém o warning geral de RPCs públicas `SECURITY DEFINER` executáveis por `authenticated`;
- o novo `set_organization_capability(...)` aparece nesse warning, mas o padrão é intencional e já documentado em `docs/qa/rls-preflight.md`: `auth.uid()` + autorização explícita no RPC + ausência de EXECUTE para `anon`;
- leaked-password protection continua como finding Auth independente e não foi alterado por #190.

Performance Advisor:

- mantém INFOs históricos de FKs sem índice e índices ainda não usados;
- a nova tabela acrescenta INFO para `organization_capability_settings_updated_by_user_id_fkey` sem índice;
- isso não foi tratado como regressão operacional nesta fatia: a tabela é esparsa por Organization/capability, o caminho operacional usa a PK `(organization_id, capability_id)` e não existe consulta por `updated_by_user_id` no fluxo; reavaliar se cardinalidade/queries reais justificarem índice.

O reconciliador one-shot da #190 deve permanecer removido após o fechamento operacional; não transformar esse mecanismo em deploy automático permanente sem decisão arquitetural própria.

## Limites deliberados da primeira fatia

- apenas `stock-loans` é configurável; `inventory` fica ativo e bloqueado para configuração no rollout inicial;
- Compras, Financeiro, Caixa, Cadastros e demais áreas ainda não recebem toggles;
- digitar diretamente `/workspace/emprestimos` ainda pode abrir a superfície histórica; isso não concede autorização nem permite nova operação quando a capability está off, porque o gate autoritativo está no backend;
- module gating complementa autorização/RLS e nunca substitui esses boundaries.

## Próxima fatia da #190

A próxima implementação deve ser incremental e começar por dois trabalhos:

1. tornar a experiência de **rota direta** coerente quando uma capability estiver desativada, usando resolução server-side e sem converter module gating em autorização;
2. auditar os boundaries reais de uma segunda capability de baixo risco antes de liberar novo toggle.

Candidato preferencial para auditoria: **Estoque mínimo**, porque já possui superfície, tabela/RLS/auditoria e sinal de Dashboard relativamente isolados. Não torná-lo configurável até confirmar dependências e todos os pontos de entrada/efeito.

Não abrir uma matriz ampla de toggles ainda.

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
- frontend não é boundary de segurança;
- nenhum deploy Vercel manual deve ser disparado por rotina documental/smoke.

## NEXT_ACTION

Seguir `docs/ai/NEXT_ACTION.md`: iniciar a segunda fatia incremental da #190 pela rota direta de capability desativada e pelo mapeamento real de Estoque mínimo antes de qualquer novo toggle.
