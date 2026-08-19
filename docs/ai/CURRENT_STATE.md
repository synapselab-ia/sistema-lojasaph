# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 21 foi concluída e integrada na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #56 — merged
- Issue #53 — closed/completed
- merge commit: `82372bc18bc54690eb5a4eca9d28554c32e76211`
- head funcional final validado: `56d2e3026e9400add9778ce0c7193a9d81d46d05`
- `CI` #263 — success
- `Inventory Count Integration` #161 — success
- `Business Transactions Integration` #144 — success
- próxima Issue: #57 — `Fase 22 — categoria obrigatória no cadastro canônico de item`

## Fase 21 — devolução relacionada

`REQ-STK-006` está fechado para o caso comprovado pelo domínio atual: retorno ao estoque de uma retirada confirmada.

Implementado:

- novo movimento `return_in`, sem editar/apagar a retirada original;
- relação por `stock_movements.reversal_of_movement_id`, permitindo múltiplos retornos parciais para a mesma retirada;
- retorno parcial/total com bloqueio de over-return acumulado sob lock da retirada;
- command ID idempotente e conflito semântico em retry divergente;
- local, item, custo e lotes derivados do histórico da retirada, não da UI;
- custo do retorno usa `unit_cost_snapshot` histórico e recompõe o custo médio móvel;
- item rastreado restaura somente lotes comprovados pelas alocações históricas;
- audit action `stock_return.recorded`;
- autorização `owner/admin/manager/inventory` + escopo do local original;
- RPC público `record_stock_return` com `PUBLIC/anon` revogados e `authenticated` concedido explicitamente;
- gateway/caso de uso, UI `/workspace/devolucoes`, navegação e documentação;
- suíte `supabase/tests/stock_return.sql` integrada aos três workflows de banco.

Não foi implementado empréstimo/Q-005, `return_out`, Q-003/Q-004 ou dados reais.

## Achados de validação

O primeiro head revelou dois defeitos localizados: ambiguidade PL/pgSQL no `ON CONFLICT` e lint React por `setState` síncrono dentro de effect. Ambos foram corrigidos.

Na homologação, o Supabase hospedado recusou um fix intermediário que dependia de `ALTER FUNCTION ... SET plpgsql.variable_conflict`, por privilégio insuficiente do owner de migrations. O código foi tornado portátil por redefinição da função sem esse parâmetro privilegiado, revalidado 3/3 no CI e então aplicado remotamente.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17, zero branches.

Migrations da Fase 21:

- `stock_return_flow` — versão remota `20260819151007`;
- `stock_return_conflict_resolution` — versão remota `20260819151604`.

Auditoria pós-DDL:

- 45/45 tabelas `public` com RLS;
- 0 mismatches de grants `SELECT/INSERT/UPDATE` versus policies em tabelas-base;
- índice `stock_movements_reversal_org_idx` presente;
- `record_stock_return` é `SECURITY DEFINER` com `search_path=''`;
- `anon` EXECUTE=false;
- `authenticated` EXECUTE=true;
- `service_role` EXECUTE=false;
- 0 movimentos reais `return_in` de devolução.

Smoke remoto sintético executado em `BEGIN/ROLLBACK` provou retirada rastreada -> devolução parcial -> relação, custo, saldo, lote e audit corretos. Rollback deixou zero Organization, usuário, movimento ou audit sintético.

O Security Advisor sinaliza `record_stock_return` pelo lint genérico de RPC `SECURITY DEFINER` executável por `authenticated`; aqui isso é intencional porque o wrapper revalida auth/role/escopo e `anon` não possui EXECUTE. O Performance Advisor marca o novo índice como `unused` porque ainda não há devoluções reais; não remover por oportunismo.

## Hardening vigente

A Issue #54 permanece concluída. `supabase/tests/security_hardening.sql` é gate permanente. Objetos novos em `public` devem nascer deny-by-default e receber RLS/policies/grants explícitos. Não criar objeto de aplicação manualmente no Dashboard como atalho.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`. CI é o gate principal; não usar deployment rotineiro.

## Próxima lacuna MUST real

`REQ-ITEM-001` exige que item canônico possua categoria, mas hoje:

- `public.stock_items.category_id` é nullable;
- o domínio usa `categoryId?: EntityId`;
- a UI de produtos permite `Sem categoria`.

No Supabase remoto, os 3 itens existentes já têm categoria e existem 3 categorias. A Fase 22 / Issue #57 deve endurecer domínio, UI e PostgreSQL sem criar categoria default nem alterar dados reais.

## Não repetir

- não reabrir Fase 21/Issue #53;
- não reabrir hardening/Issue #54;
- não reaplicar migrations antigas;
- não remover `security_hardening.sql`;
- não reativar auto-deploy Vercel;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-003/Q-004 ou demais questões abertas;
- não criar categoria genérica automática;
- não importar dados reais.
