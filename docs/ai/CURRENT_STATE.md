# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 26 foi concluída e a Issue #65 foi fechada após homologação real do primeiro owner no Workspace persistente.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #65 — closed/completed
- PR #66 — merged: convite server-only do primeiro owner
- PR #67 — merged: compatibilidade com convite padrão do Supabase Free
- PR #68 — merged: correção da homologação real de senha + fronteira Server→Client do Workspace
- merge funcional final da Fase 26: `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`
- head do PR #68 validado: `25e33d94cbbbc9ed91a74a2eb7db6a44a67c3521`
- CI #294 — success
- Inventory Count Integration #168 — success
- Business Transactions Integration #151 — success
- nenhuma migration/DDL na Fase 26
- signup público continua ausente

## Fase 26 — homologação concluída

O fluxo real foi exercitado de ponta a ponta:

1. convite oficial do Supabase enviado somente ao destinatário autorizado server-side;
2. redirect `/auth/invite` validado;
3. sessão SSR estabelecida;
4. credencial definida pelo próprio usuário;
5. `bootstrapOwnerAction` criou o primeiro membership `owner` e audit;
6. sessão persistente abriu diretamente o Workspace;
7. erro de retry `same_password` foi tratado idempotentemente no PR #68;
8. `Money`/`Quantity` passaram a usar wire format serializável na fronteira RSC Server→Client e são reidratados no primeiro Client Component;
9. variáveis temporárias de bootstrap e a secret administrativa foram removidas do target Production;
10. novo deployment comprovou o bootstrap desabilitado e o Workspace ainda operacional.

Nenhuma senha, token, secret ou e-mail do owner foi persistido no GitHub.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Estado final comprovado após cleanup:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- 1 `audit_logs.action = 'membership.bootstrap_owner'`;
- 0 memberships owner duplicados.

RLS/grants não foram alterados nesta fase. O hardening permanente continua sendo validado pelo CI, incluindo `supabase/tests/security_hardening.sql`.

## Vercel Production

Projeto `sistema-lojasaph`; `vercel.json` continua com `git.deploymentEnabled=false`.

Deployment final pós-cleanup:

- `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` — READY;
- branch `main`;
- commit funcional `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- `/health`: `environment=production`, `supabaseAccess=allowed`, `adminAccess=blocked`;
- `/bootstrap`: 200 com estado explícito `Bootstrap desabilitado`;
- rotas do Workspace continuaram respondendo 200 após o cleanup, incluindo Financeiro e Caixa.

Não reativar auto-deploy. Novos deployments ficam reservados para homologação que realmente dependa do ambiente hospedado.

## Próxima fase

Issue #69 — **Fase 27 — responsividade e usabilidade mobile/tablet do Workspace persistente** — open.

Objetivo: fechar `REQ-PLAT-001` com validação transversal das rotas persistentes em celular, tablet e desktop, corrigindo apenas problemas comprovados de navegação, overflow, formulários, tabelas, filtros e ações.

Evidência da lacuna:

- várias telas já usam breakpoints Tailwind e tratamento local de tabelas;
- `RuntimeShell` já muda para navegação horizontal em telas menores;
- fases anteriores exigiram responsividade em módulos isolados;
- porém não há uma homologação transversal documentada do Workspace persistente completo nos três tamanhos-alvo após ele passar a operar com Auth/Supabase reais.

Defaults da Fase 27:

- sem DDL esperado;
- sem mudança de RLS/roles/RPCs/regras de negócio;
- sem credenciais Production em CI ou fixtures;
- sem redesign oportunista;
- no máximo um deployment Production intencional ao final se a validação hospedada for realmente necessária.

## Não repetir

- não reabrir a Fase 26 ou recriar o primeiro owner;
- não recolocar `SUPABASE_SECRET_KEY`/envs de bootstrap em Production sem nova necessidade administrativa aprovada;
- não refazer PRs #66/#67/#68;
- não reabrir Fases 24/25;
- não ampliar RLS/grants para facilitar UI;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
