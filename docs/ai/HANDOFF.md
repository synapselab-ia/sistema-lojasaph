# Handoff — Sistema Lojasaph

## Estado

A Fase 21 foi concluída e integrada na `main`.

- PR #56 — merged;
- Issue #53 — closed/completed;
- merge commit: `82372bc18bc54690eb5a4eca9d28554c32e76211`;
- head funcional final pré-merge: `56d2e3026e9400add9778ce0c7193a9d81d46d05`;
- `CI` #263 — success;
- `Inventory Count Integration` #161 — success;
- `Business Transactions Integration` #144 — success.

A próxima frente é a Issue #57 — `Fase 22 — categoria obrigatória no cadastro canônico de item`.

## O que ficou pronto na Fase 21

`REQ-STK-006` foi fechado para devolução ao estoque de retirada confirmada:

- novo `stock_movements.movement_type='return_in'`;
- `reversal_of_movement_id` relaciona o retorno à retirada original e suporta múltiplos retornos parciais;
- retirada original permanece imutável;
- lock da retirada serializa retornos e impede over-return concorrente;
- command ID é idempotente e retry divergente gera conflito;
- local, item, custo e lotes são derivados da retirada original;
- custo usa `unit_cost_snapshot` histórico e atualiza custo médio móvel;
- lotes rastreados são restaurados somente conforme alocações históricas comprovadas;
- audit `stock_return.recorded`;
- wrapper público valida auth, role e escopo do local original;
- RPC recebe grant explícito somente para `authenticated`; `anon` e `service_role` sem EXECUTE;
- gateway/caso de uso/UI `/workspace/devolucoes` e suíte PostgreSQL integrados ao CI.

Q-003, Q-004 e Q-005 continuam abertas. Não interpretar devolução como empréstimo nem adicionar componente financeiro.

## Validação e Supabase

Head final `56d2e3026e9400add9778ce0c7193a9d81d46d05` passou 3/3 verde.

Migrations remotas:

- `stock_return_flow` — `20260819151007`;
- `stock_return_conflict_resolution` — `20260819151604`.

A homologação encontrou uma incompatibilidade específica do Supabase hospedado: o owner de migrations não pode definir `plpgsql.variable_conflict`. Um fix intermediário foi rejeitado sem registrar migration; a solução final redefine a função de forma portátil e foi novamente validada integralmente antes da aplicação remota.

Estado remoto final:

- projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17, zero branches;
- 45/45 tabelas `public` com RLS;
- 0 mismatches de grants/policies em tabelas-base;
- `record_stock_return`: `SECURITY DEFINER`, `search_path=''`, `anon=false`, `authenticated=true`, `service_role=false` para EXECUTE;
- 0 devoluções reais criadas;
- smoke sintético em `BEGIN/ROLLBACK` validou retirada -> devolução parcial -> saldo/custo/lote/audit e deixou zero resíduo.

Security Advisor: o novo RPC aparece no mesmo lint genérico dos demais RPCs transacionais `SECURITY DEFINER` para `authenticated`; isso é intencional no desenho atual. Performance Advisor: o novo índice aparece `unused` porque não há retorno real ainda. Não fazer sweep oportunista.

## Hardening obrigatório daqui para frente

A Issue #54 continua sendo a baseline de segurança.

- `supabase/tests/security_hardening.sql` é gate permanente;
- migrations novas em `public` devem obedecer deny-by-default;
- tabela exposta: RLS + policies explícitas + grants mínimos;
- RPC público: revogar `PUBLIC/anon` e conceder somente o papel necessário;
- não depender de defaults do provedor;
- não criar objeto manualmente no Dashboard como atalho.

## Próxima frente — Issue #57

Motivo objetivo:

`REQ-ITEM-001` é MUST e exige categoria no item canônico. Hoje o contrato permite ausência de categoria em três camadas:

- `public.stock_items.category_id` nullable;
- `StockItem.categoryId?` e inputs opcionais no domínio;
- UI `/workspace/produtos` oferece `Sem categoria`.

No remoto, os 3 itens existentes já possuem `category_id`; há 3 categorias. Portanto a migration pode falhar rápido se outro ambiente tiver nulos, sem preencher ou alterar dado real automaticamente.

### Defaults da Issue #57

- categoria obrigatória no PostgreSQL, domínio, adapters e UI;
- não criar categoria default/genérica por inferência;
- preservar FK composto Organization/categoria;
- revisar fixtures/seed/testes que criem item sem categoria e fornecer categoria sintética válida;
- import dry run deve manter categoria ausente como inconsistência/mapeamento pendente, não auto-classificar;
- nenhum dado real novo;
- sem EAN/NCM/CEST, POS ou questões abertas nesta fase.

## Próximo chat deve fazer

1. confirmar `main`, Issue #57, branch `agent/item-category-required`, PRs e CI reais;
2. reler `AGENTS.md`, START-HERE, CURRENT_STATE, HANDOFF, NEXT_ACTION e WORKFLOW na branch ativa;
3. ler `REQ-ITEM-001`, documentação de catálogo/importação, foundation schema, RLS/hardening, domínio/adapters/UI de stock item e fixtures SQL/TS;
4. localizar todas as criações de `stock_items` e `createStockItem` sem categoria;
5. criar migration com precondition explícita para nulos e `ALTER COLUMN category_id SET NOT NULL`;
6. tornar `categoryId` obrigatório no domínio/create/update/adapters e exigir categoria na UI;
7. não inventar categoria para importação: ausência deve continuar explícita como rejeição/pending mapping conforme o fluxo atual;
8. atualizar testes/fixtures/seed sintéticos;
9. manter grants/RLS inalterados salvo necessidade objetiva; qualquer objeto novo segue hardening;
10. rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL;
11. só após CI verde aplicar a migration no projeto remoto e confirmar que os 3 itens reais mantiveram os mesmos IDs/categorias;
12. rodar advisors e corrigir apenas regressão causal da Fase 22;
13. atualizar PR/Issue e continuidade ao encerrar.

## Não fazer

- não reabrir Fase 21 ou Issue #54;
- não criar categoria `Outros`/`Sem categoria` automaticamente;
- não alterar categoria dos itens reais existentes;
- não remover/afrouxar `security_hardening.sql`;
- não reativar auto-deploy Vercel;
- não importar planilhas reais;
- não resolver Q-001..Q-025 por inferência;
- não corrigir advisors antigos fora de escopo.
