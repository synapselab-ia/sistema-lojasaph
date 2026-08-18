# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 13 — Dashboard operacional, alertas e KPIs — concluída tecnicamente no PR #36.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch da entrega: `agent/dashboard-runtime`
- PR atual: #36 — Fase 13 — dashboard operacional, alertas e KPIs
- Issue atual: #35 — deve ser encerrada pelo merge do PR #36
- Próxima Issue registrada: #37 — Fase 14 — Permissões por escopo de unidade/setor e hardening RLS

## Concluído até aqui

- governança, engenharia reversa, domínio e fundação Next.js;
- PostgreSQL/Supabase, migrations, RLS e Auth SSR;
- produtos e fornecedores persistentes;
- entrada, retirada/FEFO, transferência e inventário físico;
- compras, pedidos e recebimento operacional;
- documentos financeiros, parcelas, pagamentos e estornos;
- caixa operacional e fechamento diário;
- dashboard operacional somente leitura sobre os módulos persistentes.

O reparo de continuidade da transferência foi concluído no PR #30. Não reabrir o PR #26; detalhes em `docs/ai/RESTORE_TRANSFER_NOTE.md`.

## Fase 13 — Dashboard

Arquivos principais:

- `src/modules/dashboard/application/dashboard-summary.ts`;
- `src/modules/dashboard/application/dashboard-summary.test.ts`;
- `src/modules/dashboard/adapters/supabase-dashboard-query.ts`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

Não houve migration nova nesta fase. Consultas simples sobre tabelas/views já protegidas por RLS foram suficientes; não foi criada materialized view prematura.

## Fontes e regras

Financeiro:

- `payable_installment_summary` continua fonte de status e saldo;
- Dashboard não recalcula `paid/overdue/due_today/upcoming` na UI.

Caixa:

- sessões abertas;
- fechamentos recentes;
- divergências não-zero.

Compras:

- pedidos `ordered` / `partially_received`;
- entregas previstas atrasadas ou dentro do horizonte.

Estoque:

- transferências em trânsito;
- inventários `counting/review`;
- lotes ativos com saldo e validade informada.

Filtros:

- todas as unidades ou uma unidade ativa;
- horizonte de 7, 15 ou 30 dias;
- timezone da Organization define a data de negócio;
- transferência pertence ao filtro quando a unidade é origem ou destino.

## UX

`/workspace` agora prioriza `o que precisa de atenção` e liga cada sinal ao módulo transacional correspondente.

A fila de atenção só mostra ocorrências reais. KPIs separados cobrem Financeiro, Caixa, Compras e Estoque. Loading/erro são explícitos. Requests concorrentes de filtros usam uma sequência monotônica para impedir resposta antiga de sobrescrever seleção mais recente.

## Validação

Head material `64d61c0c3bcf8d6ea25e4b24d079fad9fd6ac94f` passou:

- lint;
- typecheck;
- testes unitários, incluindo `dashboard-summary.test.ts`;
- production build;
- CI PostgreSQL 17;
- Inventory Count Integration;
- Business Transactions Integration com Estoque, Inventário, Compras, Financeiro e Caixa.

Testes do Dashboard cobrem:

- agregação monetária exata;
- filtro por unidade;
- horizonte variável;
- Financeiro/Caixa/Compras/Estoque;
- timezone da Organization;
- horizonte inválido.

## Homologação remota

Não houve mudança de schema a aplicar.

Homologação de leitura em `BEGIN/ROLLBACK` no Supabase:

- usuário `viewer` temporário membro da Organization demo;
- segunda Organization/Unit temporária sem membership;
- consultas equivalentes às fontes do Dashboard executadas sob `authenticated`;
- Organization demo visível;
- Organization/Unit sem membership invisíveis;
- rollback sem resíduos.

Resíduos: zero usuário, membership, Organization e Unit temporários.

No fixture remoto atual as fontes retornaram 2 lotes com validade e zero registros pendentes de Financeiro/Caixa/Compras/Transferência/Inventário. Esses zeros são resultados reais da consulta, não placeholders da UI.

## Próxima lacuna comprovada

`REQ-SEC-002` exige autorização por função **e escopo de unidade/setor**. `organization_memberships` já possui `business_id`, `unit_id` e `sector_id`, porém os helpers atuais `private.is_org_member` / `private.has_org_role` verificam apenas Organization + role.

Issue #37 foi registrada para tornar esses escopos efetivos nas policies/RPCs sem inventar a distribuição real de pessoas/perfis enquanto Q-022 estiver aberta.

Defaults principais da próxima fase:

- membership sem escopo permanece Organization-wide;
- Business restringe aos filhos;
- Unit restringe à própria unidade/filhos;
- Sector restringe apenas recursos explicitamente relacionados ao setor;
- recursos globais compartilhados podem continuar legíveis, mas mutation global por membership restrito deve ser bloqueada ou explicitamente autorizada;
- transferência exige autorização conservadora nos extremos;
- owner/admin não ignoram escopo explicitamente informado.

## Próxima ação

Rodar o gate final do SHA documental do PR #36. Se CI permanecer verde, integrar o PR #36 e confirmar a Issue #35 como completed. Depois tornar a Issue #37 a única frente e iniciar a Fase 14 conforme `docs/ai/NEXT_ACTION.md`.
