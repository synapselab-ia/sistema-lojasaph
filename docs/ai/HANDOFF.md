# Handoff — Sistema Lojasaph

## Frente atual

**Fase 48 / Issue #134 — Dashboard de Estoque (`REQ-DASH-004`) implementada e validada no PR #135.**

Branch: `agent/dashboard-stock-overview`.

Não refazer a Fase 47 / #132: estoque mínimo por item + local já está integrado em `main` por #133.

## Entrega da Fase 48

O Dashboard já possuía transferências em trânsito, inventários em andamento, lotes vencidos/vencendo e alerta de estoque mínimo. A #134 fecha o gap restante de `REQ-DASH-004`:

- posições atuais com saldo como contagem item + local (`quantity_on_hand != 0`);
- movimentos confirmados do ledger;
- perdas/vencimentos confirmados (`loss` / `expiration`);
- período por `stock_movements.occurred_at` no timezone da Organization;
- sem período = histórico visível completo;
- horizonte não interfere em movimento/perda;
- Unit/Setor apenas por relações explícitas de local e `sector_id`;
- nenhuma soma de quantidades heterogêneas;
- nenhuma migration/view/RPC;
- browser session + RLS, sem bypass.

Arquivos principais:

- `src/modules/dashboard/adapters/supabase-stock-overview-query.ts`;
- `src/modules/dashboard/adapters/supabase-stock-overview-query.test.ts`;
- `src/modules/dashboard/ui/stock-overview-section.tsx`;
- `src/app/workspace/(operacao)/page.tsx`;
- `docs/modules/dashboard.md`.

## Validação

A primeira tentativa de CI (#491) falhou somente no lint novo `react-hooks/set-state-in-effect` do componente. Foi corrigido sem alterar domínio/query.

Head corrigido:

- CI #492 / `33113200782`: database, lint, typecheck, Vitest e production build verdes;
- Inventory Count Integration #236 / `33113200850`: success;
- Business Transactions Integration #220 / `33113200888`: success.

Production foi consultada read-only, sem criar dados:

- 4 posições item/local com saldo não zero;
- 6 movimentos confirmados;
- 1 movimento `loss/expiration`;
- datas de negócio: 2026-08-01 (3 movimentos) e 2026-08-20 (3 movimentos, incluindo a perda).

## ON HOLD — #121

Issue #121 continua **ON HOLD** e não é a frente ativa.

A checagem única feita nesta retomada encontrou:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos para retomar:

1. primeira execução agendada do `Production Storage Backup` — próxima janela esperada em 2026-08-28 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo pelo produto;
3. incidente/regressão real do pipeline.

Sem gatilho:

- não usar dispatch manual para antecipar prova;
- não criar fixture Production;
- não repetir introspecção vazia;
- não refazer tooling/S3/R2/guardrails.

## Próxima frente

Depois de integrar #135 e confirmar #134 fechada, promover **`REQ-DASH-005 — Fornecedores/compras`**.

Inventariar primeiro o que já existe em:

- `suppliers` / contatos / condições;
- `supplier_items`;
- `supplier_prices` e histórico de preços/custos;
- `purchase_orders`, itens e recebimentos;
- filtros Unit/Setor/período já existentes no Dashboard.

Objetivo da próxima slice deve sair do gap real, não de uma lista genérica. Não antecipar avaliação/ranking de fornecedor sem dados canônicos suficientes e não inventar critérios de “desempenho”.

Após `REQ-DASH-005`, a ordem registrada segue para `REQ-ITEM-003` salvo nova prioridade/regressão.

## Restrições permanentes relevantes

- defaults profissionais, conservadores e reversíveis;
- GitHub/documentação são a fonte de continuidade;
- RLS é boundary de acesso;
- nenhum secret no browser/GitHub/docs;
- não resolver requisitos PENDING por inferência;
- sem deploy Vercel rotineiro;
- repo temporariamente public por decisão operacional; não alterar automaticamente.
