# Handoff — Sistema Lojasaph

## Estado

A Fase 26 / Issue #65 foi concluída e homologada em Production. O próximo objetivo ativo é a Issue #69 / Fase 27, voltada exclusivamente à responsividade transversal do Workspace persistente.

Estado funcional fechado:

- PR #66 — merged;
- PR #67 — merged;
- PR #68 — merged;
- merge funcional final: `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- head do PR #68: `25e33d94cbbbc9ed91a74a2eb7db6a44a67c3521`;
- CI #294 — success;
- Inventory Count Integration #168 — success;
- Business Transactions Integration #151 — success;
- Issue #65 — closed/completed;
- Issue #69 — open;
- nenhuma migration/DDL na Fase 26.

## Fase 26 — evidência final

O primeiro owner foi provisionado pelo fluxo oficial do Supabase Auth, sem signup público, sem SQL em `auth.users` e sem senha conhecida pelo agente.

Supabase final:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- 1 audit `membership.bootstrap_owner`;
- 0 owners duplicados para o mesmo usuário/Organization.

O PR #68 corrigiu dois problemas observados somente na homologação real:

1. retry de definição de senha retornando `same_password`, agora tratado como sucesso idempotente;
2. instâncias `Money`/`Quantity` atravessando Server→Client em React Server Components, agora serializadas em wire format simples e reidratadas antes do provider.

## Production pós-cleanup

Vercel projeto `sistema-lojasaph`, auto-deploy ainda desabilitado.

Deployment final observado:

- `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` — READY;
- `main` em `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- `/health`: Production + Supabase allowed + admin blocked;
- `/bootstrap`: `Bootstrap desabilitado`;
- Workspace continuou respondendo 200 após a remoção das envs temporárias, inclusive rotas Financeiro e Caixa.

As envs temporárias de bootstrap e `SUPABASE_SECRET_KEY` foram removidas do target Production e um novo deployment tornou essa remoção efetiva no runtime.

Não persistir no GitHub o e-mail, senha ou qualquer outro dado de credencial usado pelo operador.

## Próxima Issue — #69 / Fase 27

Título: **responsividade e usabilidade mobile/tablet do Workspace persistente**.

Requisito alvo: `REQ-PLAT-001`.

Motivo: o código possui várias decisões responsivas locais, mas não existe prova transversal documentada do Workspace persistente completo em celular, tablet e desktop após Auth/Supabase reais estarem operacionais.

### Defaults

- preservar layout/identidade visual existentes; sem redesign completo;
- sem DDL/migration esperado;
- sem mudança de RLS, roles, RPCs ou regras de negócio;
- sem credenciais Production em testes/CI;
- tabelas largas podem usar scroll horizontal local, mas a viewport não deve ter overflow acidental;
- ações devem permanecer alcançáveis por toque e teclado e não depender de hover;
- no máximo um deployment Production intencional ao final se a homologação visual hospedada for necessária;
- CI continua sendo o gate técnico principal.

### Superfícies mínimas

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

Revisar especialmente:

- shell/navegação em largura móvel;
- filtros do Dashboard;
- grids e cards;
- formulários e botões;
- tabelas/overflow local;
- mensagens/estados vazios/loading;
- touch targets e foco básico.

## Branch de trabalho esperada

`agent/responsive-workspace`

Ela deve partir do commit final de continuidade desta sessão e ficar idêntica à `main` antes do primeiro patch funcional.

## Não fazer

- não reabrir #65;
- não criar novo owner nem reenviar convite;
- não recolocar secret administrativa em Production para testar UI;
- não refazer #66/#67/#68;
- não usar credenciais reais em automação;
- não alterar regras transacionais sob pretexto de responsividade;
- não ampliar RLS/grants;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
