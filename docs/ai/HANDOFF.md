# Handoff — Sistema Lojasaph

## Estado

A Fase 22 foi concluída, homologada e integrada na `main`.

- PR #58 — merged;
- Issue #57 — closed/completed;
- merge commit funcional: `26cf2a40e7c2c3948f5d82678408fe49e213ca16`;
- head funcional final pré-merge: `4459de528de9dd0fa68e83a867ce866f3fb5b23e`;
- `CI` #270 — success;
- `Inventory Count Integration` #164 — success;
- `Business Transactions Integration` #147 — success.

A próxima frente é a Issue #59 — `Fase 23 — vincular retirada de estoque ao Setor operacional`.

## O que ficou pronto na Fase 22

`REQ-ITEM-001` foi fechado para categoria obrigatória no StockItem canônico:

- `categoryId` obrigatório no domínio, create/update, providers, adapters e UI;
- erro defensivo `STOCK_ITEM_CATEGORY_REQUIRED` para categoria ausente/vazia;
- adapter Supabase rejeita linha legada sem categoria;
- `/workspace/produtos` e `/cadastros/produtos` não oferecem item persistível sem categoria;
- import dry run mantém ausência como `pending_mapping`/`ITEM_CATEGORY_REQUIRED`, sem default;
- `stock_items.category_id` passou a `NOT NULL`, sem default;
- migration aborta antes do DDL se encontrar legado nulo;
- FK composto categoria/Organization foi preservado;
- fixtures sintéticas foram corrigidas para respeitar o contrato;
- suíte PostgreSQL específica foi adicionada aos três workflows.

## Validação e Supabase

Head final `4459de528de9dd0fa68e83a867ce866f3fb5b23e` passou 3/3 verde.

Migration remota:

- `stock_item_category_required` — `20260819181239`.

Estado remoto final:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- 3 StockItems reais antes e depois do DDL;
- 0 itens sem categoria antes e depois;
- os mesmos três IDs mantiveram exatamente os mesmos `category_id`;
- `category_id`: `NOT NULL`, sem default;
- `stock_items_category_id_organization_id_fkey` preservado;
- RLS, grants e RPCs não foram alterados;
- smoke sintético em `BEGIN/ROLLBACK` validou categoria obrigatória e isolamento por Organization, com zero resíduo;
- advisors pós-DDL não mostraram regressão causal da Fase 22.

Nenhum deploy manual Vercel foi feito; `git.deploymentEnabled=false` permanece vigente.

## Hardening obrigatório daqui para frente

A Issue #54 continua sendo a baseline de segurança.

- `supabase/tests/security_hardening.sql` é gate permanente;
- migrations novas em `public` devem obedecer deny-by-default;
- tabela exposta: RLS + policies explícitas + grants mínimos;
- RPC público: revogar `PUBLIC/anon` e conceder somente o papel necessário;
- ao substituir assinatura de RPC, remover/revogar a antiga para evitar bypass;
- não depender de defaults do provedor;
- não criar objeto manualmente no Dashboard como atalho.

## Próxima frente — Issue #59

Motivo objetivo:

`REQ-STK-004` é MUST e exige retirada para consumo/operação em Setor, com data, quantidade e responsável. Hoje data, quantidade e responsável já são persistidos, mas o Setor não é parte da command surface:

- `public.record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text)` não recebe `sector_id`;
- o movimento de retirada não preenche `stock_movements.sector_id`, embora a coluna exista;
- `SupabaseStockWithdrawalGateway` não possui `sectorId`;
- `/workspace/estoque` não pede Setor.

### Defaults da Issue #59

- `sectorId` obrigatório para nova retirada persistente;
- não alterar nullability global de `stock_movements.sector_id`, pois outros tipos de movimento não exigem Setor;
- Setor deve existir na mesma Organization e estar no escopo autorizado do usuário;
- UI escolhe explicitamente entre `workspace.sectors` já filtrados por RLS; sem inferir pelo StockLocation;
- `occurred_at=now()` e `responsible_user_id=auth.uid()` continuam atendendo data/responsável; não introduzir data manual ou Employee sem requisito adicional;
- incluir Setor na semântica idempotente e no audit payload;
- remover/revogar a assinatura legada da retirada para `authenticated`, impedindo bypass sem Setor;
- preservar saldo, custo médio, FEFO/lotes, estoque negativo, lock e rollback existentes;
- não backfillar nem alterar movimentos históricos.

## Próximo chat deve fazer

1. confirmar `main`, Issue #59, branch ativa, PRs e CI reais;
2. reler `AGENTS.md`, START-HERE, CURRENT_STATE, HANDOFF, NEXT_ACTION e WORKFLOW na branch ativa;
3. ler `REQ-STK-004`, `docs/modules/inventory.md`, migrations de withdrawal e scoped permissions, gateway/provider/UI e testes de withdrawal;
4. confirmar a assinatura pública atual e helpers de autorização por Setor antes de editar;
5. criar/usar `agent/stock-withdrawal-sector` a partir da `main` pós-handoff; não refazer Fase 22;
6. versionar a substituição segura de `record_stock_withdrawal` com `p_sector_id` obrigatório;
7. validar Organization + escopo do Setor e persistir `stock_movements.sector_id`;
8. retirar a assinatura legada autenticada, sem deixar overload de bypass;
9. incluir Setor em idempotência/auditoria e alinhar gateway, runtime provider e `/workspace/estoque`;
10. cobrir Setor válido, ausência/assinatura legada, cross-Organization, fora de escopo, retry igual e retry com Setor divergente;
11. preservar integralmente regras já homologadas de saldo/custo/lote/FEFO/estoque negativo;
12. rodar lint, typecheck, Vitest, build e os três workflows PostgreSQL;
13. somente após CI verde homologar no Supabase remoto com smoke sintético `BEGIN/ROLLBACK`;
14. rodar advisors e corrigir apenas regressão causal da Fase 23;
15. atualizar PR/Issue e continuidade ao encerrar.

## Não fazer

- não reabrir Fase 22/Issue #57 nem hardening/Issue #54;
- não criar Setor default ou inferi-lo automaticamente do local;
- não tornar `stock_movements.sector_id` globalmente `NOT NULL`;
- não alterar movimentos históricos;
- não implementar empréstimo/retorno por funcionário;
- não adicionar filtros de dashboard nesta fase;
- não alterar transferências, perdas ou inventário fora do necessário para regressão;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não resolver Q-001..Q-025 por inferência;
- não corrigir advisors antigos fora de escopo.
