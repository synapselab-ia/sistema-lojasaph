# Next Action — Sistema Lojasaph

## Contexto

- Fase 10 — Compras — está integrada na `main` e a Issue #28 está completed.
- Fase 11 — Financeiro — está concluída tecnicamente no PR #32, com CI e homologação remota em rollback.
- Issue #31 deve ser encerrada pelo merge do PR #32.
- Próxima Issue registrada: #33 — Fase 12 — Caixa: sessões, meios de pagamento e fechamento diário.

## Fazer agora

1. Confirmar que o PR #32 foi integrado e a Issue #31 fechou como completed.
2. Tornar a Issue #33 a única frente em andamento.
3. Criar branch nova a partir da `main`, sugerida `agent/cash-runtime`.
4. Ler antes de implementar:
   - `docs/product/requirements.md` — REQ-CASH-001 a REQ-CASH-008;
   - `docs/architecture/data-model.md` — seção Caixa;
   - `docs/product/open-questions.md` — Q-007 e Q-009 a Q-012;
   - `docs/source-data/spreadsheets-map.md` — Caixa Empório Espeticho Tabatinga;
   - ADR-006 e regras de auditoria/segurança existentes.
5. Reconciliar o modelo físico com `cash_registers`, `cash_sessions`, `cash_movements`, `payment_methods`, `payment_method_totals` e `fee_rules`.
6. Aplicar os defaults reversíveis da Issue #33:
   - totais consolidados por meio de pagamento; não criar venda individual/PDV;
   - fundo de caixa como valor inicial da sessão, não saldo financeiro da empresa;
   - esperado e contado separados; divergência derivada;
   - taxas configuráveis/versionadas, sem regra hardcoded por adquirente/bandeira/parcelamento;
   - Voucher como meio habilitável;
   - Consumo Funcionários como categoria operacional separada, fora do faturamento automático enquanto Q-009 estiver aberta;
   - correções por cancelamento/estorno auditado, não delete físico.
7. Gerar nova migration somente via Supabase CLI pinado e versioná-la no GitHub.
8. Implementar RLS/papéis `owner/admin/manager/cashier` com escopo organizacional/unidade compatível com memberships.
9. Criar commands transacionais/idempotentes para, no mínimo:
   - abrir sessão;
   - registrar/atualizar totais por meio de pagamento;
   - registrar entrada/sangria;
   - fechar sessão com esperado, contado e divergência;
   - cancelar/corrigir dentro das regras permitidas.
10. Criar testes SQL antes da UI para:
   - identidade de sessão por caixa/data/sequence;
   - retry/conflito de command ID;
   - meios habilitados e Voucher opcional;
   - bruto/taxa/líquido;
   - fundo inicial;
   - entradas/sangrias;
   - esperado x contado/divergência;
   - viewer/role negado;
   - cross-Organization;
   - anon;
   - rollback atômico.
11. Integrar `/workspace/caixa` somente depois do banco verde.
12. Aplicar migration remotamente somente após CI limpo; rodar Advisors e homologar em `BEGIN/ROLLBACK` sem resíduos.
13. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION antes do merge.

## Não fazer na Fase 12

- vendas individuais;
- integração POS/PDV;
- conciliação bancária/adquirente;
- folha/desconto de funcionário;
- classificar definitivamente Consumo Funcionários;
- inventar regra de fechamento que contradiga Q-010;
- importar dados reais.

## Critério de conclusão da próxima fase

Usuário autorizado consegue abrir uma sessão de caixa por unidade/data, registrar meios de pagamento, fundo, entradas/sangrias e fechar com esperado x contado/divergência, com RLS, idempotência e auditoria comprovados por CI e homologação remota.
