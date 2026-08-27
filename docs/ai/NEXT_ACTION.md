# Next Action — Sistema Lojasaph

## Estado de saída da Fase 47

A **Fase 47 / Issue #132 (`REQ-STK-011`)** está implementada, validada em CI e homologada em Supabase Production pelo PR #133.

Não reabrir essa slice sem regressão concreta.

## Frente ON HOLD

**Issue #121 — Backup e recuperação off-site do Supabase Storage.**

Retomar somente se existir um gatilho objetivo:

- primeira execução agendada do `Production Storage Backup` após o armamento;
- primeiro anexo Production legítimo para prova binária;
- falha/incidente/regressão real.

Próxima janela normal esperada do cron: **2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo**.

Sem gatilho: não usar `workflow_dispatch`, não criar fixture Production e não repetir validações da mesma ausência de evidência.

## NEXT_ACTION

### Promover a próxima fase independente: `REQ-DASH-004 — Dashboard/relatórios de estoque`

Executar nesta ordem:

1. conferir estado real de `main`, Issues, PRs, branches e CI;
2. confirmar que o PR #133 está mergeado e a Issue #132 encerrada;
3. verificar **uma vez** se surgiu gatilho novo da #121; se não surgiu, manter ON HOLD e seguir;
4. reler `docs/product/requirements.md`, `docs/modules/dashboard.md` e `docs/modules/inventory.md`;
5. inventariar o gap real de `REQ-DASH-004` sobre:
   - saldos;
   - movimentações;
   - perdas;
   - inventários;
   - validades;
   - estoque abaixo do mínimo já entregue pela Fase 47;
6. não duplicar KPIs/alertas já existentes e não fabricar granularidade histórica onde o modelo não possui evento canônico;
7. abrir uma Issue própria para a nova fase com critérios de aceite verificáveis e fora de escopo explícito;
8. criar branch a partir de `main` somente depois da Issue;
9. implementar a menor slice coerente, com testes e CI, seguindo o workflow normal Issue → branch → PR → merge;
10. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Restrições para `REQ-DASH-004`

- Dashboard continua read-only;
- reutilizar fontes autoritativas existentes, sem criar segunda fonte de saldo;
- respeitar Organization + Unit + Sector e RLS;
- não transformar snapshots atuais em histórico por conveniência;
- não criar previsão de demanda/IA;
- não criar pedido de compra automático;
- não misturar `REQ-DASH-005` ou `REQ-ITEM-003` na mesma slice sem necessidade comprovada;
- não resolver requisitos PENDING por inferência;
- não fazer deploy Vercel rotineiro.

## Ordem posterior

1. `REQ-DASH-004` — estoque;
2. `REQ-DASH-005` — compras/fornecedores e histórico/variação;
3. `REQ-ITEM-003` — EAN/código de barras e dados fiscais.

Uma frente ON HOLD pode interromper essa ordem somente quando seu gatilho real existir; simples espera não pausa o desenvolvimento.