# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 48 / Issue #134 — `REQ-DASH-004` implementada e validada no PR #135 (`agent/dashboard-stock-overview`).**

A slice completa a cobertura mínima coerente de Estoque no Dashboard sem criar nova fonte de verdade, migration, view ou RPC.

Baseline integrada antes do PR #135:

- `main=afe1848353beff8b2d09e9b6a3f044b56d28502c` — Fase 47 / PR #133;
- Issue #132 encerrada;
- CI pós-merge da Fase 47 `33111519670`: success.

## Fase 48 — #134 / PR #135

Gap confirmado de `REQ-DASH-004`:

- transferências em trânsito, inventários em andamento, validades e estoque abaixo do mínimo já estavam cobertos;
- faltavam saldos atuais, atividade do ledger e perdas como KPIs gerenciais explícitos.

Entregue:

- `Posições com saldo`: contagem item + local com `quantity_on_hand != 0`, sem somar UOMs heterogêneas;
- movimentos confirmados do ledger `stock_movements`;
- perdas/vencimentos confirmados (`loss` / `expiration`);
- período de movimentos/perdas por `occurred_at`, usando timezone da Organization e limites UTC corretos;
- sem período: histórico visível completo;
- horizonte 7/15/30 não recorta movimentos/perdas;
- Unit/Setor somente por `source_location_id`, `destination_location_id` e `sector_id` explícitos;
- sessão autenticada + RLS, sem service/admin key;
- seção específica de Estoque no Dashboard, sem duplicação na seção Operação.

Validação do head corrigido da implementação:

- CI #492 / `33113200782`: database + lint + typecheck + Vitest + production build verdes;
- Inventory Count Integration #236 / `33113200850`: success;
- Business Transactions Integration #220 / `33113200888`: success.

Production foi validada apenas read-only, sem fixtures:

- 4 posições com saldo;
- 6 movimentos confirmados;
- 1 perda/vencimento confirmado;
- datas de negócio observadas: 2026-08-01 e 2026-08-20.

Nenhuma migration Production é necessária nesta fase.

## Issue #121 — ON HOLD

`REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage` continua aberta, mas **não é frente ativa**.

A checagem única exigida pela `NEXT_ACTION` em 2026-08-27 confirmou que ainda não há gatilho:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Retomar somente quando ocorrer um destes eventos:

1. primeira execução **agendada** do `Production Storage Backup` após o armamento — próxima janela esperada: 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo criado pelo fluxo normal;
3. falha/incidente/regressão real do pipeline Storage.

Até lá: não fazer `workflow_dispatch` artificial, não criar fixture Production e não repetir a mesma validação sem evidência nova.

A Issue #75 permanece umbrella de proteção de dados e não é frente ativa.

## Ordem de trabalho

Após integração do PR #135 / encerramento da #134, salvo bug, regressão ou nova prioridade explícita:

1. `REQ-DASH-005` — fornecedores/compras, usando histórico e relações já persistidos;
2. `REQ-ITEM-003` — EAN/código de barras/dados fiscais;
3. requisitos PENDING somente após decisão de negócio real.

A #121 pode ser retomada quando seu gatilho existir, mas simples espera não bloqueia essa ordem.

## Não fazer

- não reabrir Fase 47/#132 sem regressão concreta;
- não tocar #121 sem gatilho real;
- não criar dados Production para fabricar evidência;
- não somar quantidades de UOMs diferentes em um saldo total;
- não criar histórico artificial a partir de snapshots atuais;
- não antecipar previsão de demanda/IA ou compra automática;
- não misturar `REQ-DASH-005` / `REQ-ITEM-003` nesta slice concluída;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente.
