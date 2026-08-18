# Handoff — Sistema Lojasaph

## Estado

Fase 13 — Dashboard operacional, alertas e KPIs — concluída tecnicamente no PR #36.

Ao integrar o PR #36:

- fechar a Issue #35 como completed;
- manter a Issue #37 como próxima frente única;
- iniciar Fase 14 — Permissões por escopo de unidade/setor e hardening RLS.

## Não repetir

- engenharia reversa e modelo lógico consolidados;
- Auth SSR/membership/RLS base;
- estoque, transferência e inventário persistentes;
- Compras da Fase 10;
- Financeiro da Fase 11;
- Caixa da Fase 12;
- Dashboard da Fase 13 após merge;
- reparo da transferência do PR #30;
- write direto em tabelas críticas;
- materialização de read model sem evidência de necessidade.

## Dashboard — arquivos principais

- `src/modules/dashboard/application/dashboard-summary.ts`;
- `src/modules/dashboard/application/dashboard-summary.test.ts`;
- `src/modules/dashboard/adapters/supabase-dashboard-query.ts`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

## Regras que devem permanecer

- Dashboard é somente leitura;
- não recalcular status financeiro na UI: usar `payable_installment_summary`;
- não criar segunda fonte de verdade para estoque/caixa/compras;
- absence de dado não vira métrica inventada;
- data de negócio usa timezone da Organization;
- filtro de unidade preserva transferências quando a unidade for origem ou destino;
- horizonte 7/15/30 é filtro de visualização, não configuração persistente;
- fila de atenção só exibe ocorrências reais;
- cada alerta liga ao módulo de origem;
- requests de filtro antigos não podem sobrescrever seleção nova.

## KPIs atuais

Financeiro:

- nominal;
- pago líquido;
- saldo em aberto;
- vencidas;
- vencendo hoje;
- vencendo no horizonte.

Caixa:

- sessões abertas;
- fechamentos recentes;
- divergências não-zero.

Compras:

- pedidos pendentes;
- entrega prevista atrasada;
- entrega prevista no horizonte.

Estoque:

- transferências em trânsito;
- inventários em andamento;
- lotes vencidos com saldo;
- lotes próximos da validade.

## Validação da Fase 13

Head material `64d61c0c3bcf8d6ea25e4b24d079fad9fd6ac94f` verde em:

- lint;
- typecheck;
- Vitest;
- production build;
- CI PostgreSQL 17;
- Inventory Count Integration;
- Business Transactions Integration.

Homologação remota somente leitura, sem migration:

- viewer temporário da Organization demo acessou as fontes previstas;
- Organization/Unit temporária sem membership ficou invisível sob RLS;
- rollback deixou zero resíduos.

Dataset demo remoto atual: 2 lotes com validade e zero pendências em Financeiro/Caixa/Compras/Transferência/Inventário.

## Próxima lacuna — Issue #37

`REQ-SEC-002` é MUST e ainda não está completo.

Evidência:

- membership já possui `business_id`, `unit_id`, `sector_id`;
- `private.is_org_member` e `private.has_org_role` consideram apenas Organization + role;
- várias policies/RPCs usam esses helpers, portanto um membership limitado ainda não é efetivamente limitado dentro da Organization.

Defaults profissionais registrados na Issue #37:

- sem escopo = Organization-wide;
- Business limita a unidades filhas;
- Unit limita a própria Unit/filhos;
- Sector limita recursos explicitamente vinculados;
- owner/admin não ignoram um escopo explicitamente informado;
- recursos mestres compartilhados podem continuar legíveis, mas mutation global por membership restrito é conservadoramente bloqueada até regra explícita;
- criação/despacho de transferência exige autorização nos dois extremos; recebimento exige destino;
- Q-022 continua aberta para mapear perfis/pessoas reais; a fase trata da mecânica genérica.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Não refatorar regras transacionais fora do necessário para escopo. Migrations somente via Supabase CLI pinado. Homologação remota apenas depois de CI verde.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
