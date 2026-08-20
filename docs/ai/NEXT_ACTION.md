# Next Action — Sistema Lojasaph

## Contexto

A Fase 26 / Issue #65 foi concluída e fechada após homologação real do primeiro owner no Workspace persistente. O runtime Production está novamente sem credencial administrativa de bootstrap.

Estado comprovado:

- merge funcional final da Fase 26: `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- PR #68 head `25e33d94cbbbc9ed91a74a2eb7db6a44a67c3521`;
- CI #294 — success;
- Inventory Count Integration #168 — success;
- Business Transactions Integration #151 — success;
- Supabase: 1 Organization ativa, 1 Auth user confirmado, 1 membership, 1 owner, 1 audit bootstrap, 0 duplicidade;
- Production final: `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` READY;
- `/health.adminAccess=blocked`;
- `/bootstrap` desabilitado;
- Workspace continuou operacional após cleanup;
- Issue #65 — closed;
- Issue #69 — open.

## Objetivo ativo

Executar a Fase 27 / Issue #69 e fechar `REQ-PLAT-001 — Responsivo` com validação transversal do Workspace persistente em celular, tablet e desktop.

A lacuna é de validação/UX. Várias telas já usam breakpoints e overflow local, mas não existe prova transversal documentada das rotas persistentes completas nos três tamanhos-alvo.

## Fazer agora

1. Confirmar estado real de `main`, branch `agent/responsive-workspace`, Issue #69, PRs e CI.
2. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-001`);
   - `src/components/runtime-shell.tsx`;
   - layouts/páginas das rotas persistentes principais.
3. Confirmar que a branch parte exatamente da `main` e não contém trabalho residual da Fase 26.
4. Antes de editar, inventariar problemas comprováveis por superfície e breakpoint. Não assumir que toda tela precisa de redesign.
5. Revisar pelo menos larguras representativas de:
   - celular estreito;
   - tablet;
   - desktop.
6. Cobrir no mínimo:
   - `/login`;
   - `/workspace`;
   - produtos;
   - fornecedores;
   - funcionários;
   - estoque;
   - baixas;
   - devoluções;
   - transferências;
   - inventários;
   - compras;
   - financeiro;
   - caixa.
7. Corrigir somente problemas comprovados de:
   - navegação inalcançável/cortada;
   - overflow acidental da viewport;
   - filtros/cards/grids que quebram em telas estreitas;
   - formulários/botões não operáveis;
   - tabelas sem estratégia deliberada em mobile;
   - mensagens/loading/estados vazios ilegíveis;
   - ações dependentes somente de hover;
   - foco/touch target básico quando houver defeito objetivo.
8. Para tabelas largas, preferir scroll horizontal **local** ou outra estratégia explícita sem ocultar informação crítica. Não forçar tabelas complexas a virar cards se isso piorar a leitura.
9. Preservar integralmente:
   - regras de domínio;
   - RLS e grants;
   - roles/escopos;
   - RPCs transacionais;
   - filtros e semânticas do Dashboard;
   - comportamento Auth da Fase 26.
10. Adicionar testes de regressão de baixo custo onde tecnicamente úteis. Não colocar credenciais Production em CI, fixtures, snapshots ou screenshots.
11. Rodar lint, typecheck, Vitest e build. Executar workflows adicionais somente quando os `paths`/mudanças realmente os tornarem aplicáveis; não alterar filtros de workflow para fabricar gates.
12. Não há DDL esperado. Se uma correção visual parecer exigir migration/RLS, reavaliar: isso provavelmente está fora do escopo da Fase 27.
13. Vercel continua com auto-deploy desabilitado. Não fazer deploy durante iteração. Se a validação final realmente depender do ambiente hospedado, fazer no máximo um deployment Production intencional após merge/CI verde.
14. A homologação visual hospedada pode usar a sessão/conta já provisionada pelo operador, mas o agente não deve solicitar, armazenar ou registrar senha.
15. Ao concluir #69:
   - registrar superfícies/breakpoints validados;
   - fechar a Issue somente com CI verde e ausência de regressão de negócio/segurança;
   - atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`;
   - auditar o próximo MUST verificável antes de criar nova Issue.

## Segurança e operação

- não reabrir o bootstrap do primeiro owner;
- não recolocar `SUPABASE_SECRET_KEY` ou envs temporárias de bootstrap em Production;
- não reenviar convite;
- não habilitar signup público;
- não usar credenciais reais em automação;
- não alterar RLS/grants para facilitar layout;
- `supabase/tests/security_hardening.sql` continua gate permanente quando workflows PostgreSQL forem aplicáveis.

## Vercel

- `vercel.json`: `git.deploymentEnabled=false`;
- Production funcional atual: commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` READY;
- admin access bloqueado como esperado;
- não desperdiçar quota com previews/deploys intermediários.

## Não fazer

- não refazer Fase 26/PRs #66/#67/#68;
- não transformar a Fase 27 em redesign completo/design system;
- não alterar regras de Estoque, Compras, Financeiro ou Caixa por conveniência visual;
- não resolver Q-001..Q-025 por inferência;
- não importar dados reais;
- não reativar auto-deploy;
- não contratar/adotar ferramenta externa de visual testing sem necessidade explícita.

## Critério de conclusão

As principais rotas persistentes permanecem funcionalmente utilizáveis em celular, tablet e desktop: navegação e ações alcançáveis, sem overflow acidental da viewport, formulários/filtros operáveis e tabelas com tratamento deliberado em telas estreitas. Nenhuma correção altera domínio, Auth, RLS ou transações; CI fica verde e a homologação final é registrada sem exposição de credenciais.
