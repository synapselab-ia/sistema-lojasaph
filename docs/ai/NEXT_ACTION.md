# Next Action — Sistema Lojasaph

## Contexto

- Fase 10 — Compras — integrada na `main` e Issue #28 completed.
- Fase 11 — Financeiro — integrada na `main` e Issue #31 completed.
- Fase 12 — Caixa — concluída tecnicamente no PR #34, com CI verde e homologação remota em rollback.
- Issue #33 deve ser encerrada pelo merge do PR #34.
- Próxima Issue registrada: #35 — Fase 13 — Dashboard operacional, alertas e KPIs.

## Fazer agora

1. Confirmar que o PR #34 foi integrado e a Issue #33 fechou como completed.
2. Tornar a Issue #35 a única frente em andamento.
3. Criar branch nova a partir da `main`, sugerida `agent/dashboard-runtime`.
4. Ler antes de implementar:
   - `docs/product/requirements.md` — REQ-DASH-001 a REQ-DASH-005;
   - `docs/architecture/data-model.md` — read models previstos;
   - `docs/modules/inventory.md`;
   - `docs/modules/purchases.md`;
   - `docs/modules/finance.md`;
   - `docs/modules/cash.md`;
   - ADRs de persistência, segurança e auditoria relacionados.
5. Inventariar consultas/status já existentes e reutilizá-los; não duplicar regra de vencimento, saldo, divergência ou status na UI.
6. Aplicar os defaults reversíveis da Issue #35:
   - priorizar pendências acionáveis antes de gráficos;
   - ausência de dado = indisponível, nunca zero inventado;
   - timezone da Organization governa datas e janelas;
   - filtros por período/unidade apenas onde a origem suporta;
   - dashboard respeita RLS e escopo atual;
   - read models/views são reconstruíveis e não substituem transações de origem.
7. Definir a menor camada de consulta/read model necessária para o dashboard inicial, preferindo consultas simples antes de materialização prematura.
8. Cobrir no mínimo:
   - Financeiro: nominal/pago/saldo, overdue, due_today e próxima janela disponível;
   - Caixa: sessões abertas, fechamentos recentes e divergências não-zero;
   - Compras: ordered/partially_received e entregas previstas;
   - Estoque: transferências em trânsito, inventários abertos e lotes vencidos/próximos do vencimento quando houver data.
9. Criar testes de consulta/cálculo para timezone, filtros, status e isolamento por Organization antes de considerar a UI concluída.
10. Evoluir `/workspace` para cards/filas acionáveis com links diretos aos módulos de origem.
11. Manter responsividade desktop/tablet/mobile e estados de vazio/erro explícitos.
12. Rodar lint, typecheck, testes, build e suites SQL afetadas.
13. Se houver migration/read model novo, gerar migration somente via Supabase CLI pinado, validar em CI e aplicar remotamente apenas depois de verde.
14. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION e somente então integrar.

## Não fazer na Fase 13

- previsão de demanda ou IA;
- estoque mínimo/sugestão de compra sem regra implementada;
- vendas individuais/POS;
- BI externo/data warehouse;
- notificações por WhatsApp/e-mail/push;
- métricas contábeis não existentes no domínio atual;
- refatorar módulos transacionais sem necessidade comprovada para o dashboard.

## Critério de conclusão da próxima fase

Ao abrir `/workspace`, um usuário autorizado vê as principais pendências e KPIs derivados dos módulos já persistidos, consegue usar os filtros suportados e navegar diretamente para a ação correspondente, com regras centralizadas, RLS e testes de regressão comprovados.
