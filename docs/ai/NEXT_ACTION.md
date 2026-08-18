# Next Action — Sistema Lojasaph

## Contexto

- Fase 9 está consistente na `main` após o reparo do PR #30.
- Fase 10 — Compras — está concluída tecnicamente no PR #29, com CI verde e homologação remota em rollback.
- Issue #28 deve ser encerrada pelo merge do PR #29.
- Próxima Issue registrada: #31 — Fase 11 — Financeiro: documentos, parcelas e contas a pagar.

## Fazer agora

1. Confirmar que o PR #29 foi integrado e a Issue #28 fechou como completed.
2. Tornar a Issue #31 a única frente em andamento.
3. Criar branch nova a partir da `main`, sugerida `agent/finance-runtime`.
4. Ler antes de implementar:
   - `docs/product/requirements.md` — REQ-FIN-001 a REQ-FIN-009;
   - `docs/architecture/data-model.md` — seção Financeiro;
   - `docs/product/open-questions.md` — Q-013 a Q-017;
   - `docs/source-data/spreadsheets-map.md` — Controle NFs Espeticho;
   - ADR-006 e regras de segurança/auditoria já consolidadas.
5. Reconciliar o modelo físico com `payable_documents`, `installments`, `payments` e `payment_instructions`; não duplicar Supplier/Unit/Sector.
6. Aplicar os defaults reversíveis da Issue #31:
   - pagamento é evento separado vinculado à parcela;
   - schema pode suportar múltiplos pagamentos sem obrigar a UI inicial a expor pagamento parcial avançado;
   - não inferir juros/multa/desconto enquanto Q-015 estiver aberta;
   - instrução Pix/boleto fica separada do pagamento efetivo;
   - status pago/vencido/a vencer é derivado de saldo/datas;
   - correções usam estorno/cancelamento auditado, nunca delete físico de evento financeiro.
7. Criar migration nova somente via Supabase CLI pinado e versioná-la no GitHub.
8. Implementar RLS e papéis `owner/admin/manager/finance`; usuário sem escopo não pode mutar financeiro.
9. Criar commands idempotentes/transacionais para, no mínimo:
   - criar documento + parcelas;
   - registrar pagamento;
   - estornar/cancelar dentro das regras permitidas.
10. Criar testes SQL antes da UI para:
   - múltiplas parcelas;
   - saldo/status derivados;
   - vencimento;
   - pagamento/retry;
   - múltiplos eventos compatíveis com o modelo;
   - estorno;
   - viewer/role negado;
   - cross-Organization;
   - anon;
   - rollback atômico.
11. Integrar `/workspace/financeiro` somente depois do banco verde.
12. Preparar anexos/referências de pagamento sem bloquear o fluxo principal caso Storage precise ficar incremental.
13. Aplicar migration remotamente somente após CI limpo; rodar Security/Performance Advisors.
14. Homologar remotamente em `BEGIN/ROLLBACK` com dados demo, sem resíduos.
15. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION e somente então integrar.

## Não fazer na Fase 11

- caixa/fechamento diário;
- conciliação bancária;
- integração SEFAZ/OCR;
- classificação automática da diferença nominal x pago;
- importação definitiva de dados reais;
- reabrir estoque/compras sem bug ou dependência financeira comprovada.

## Critério de conclusão da próxima fase

Usuário financeiro autorizado consegue registrar uma obrigação de fornecedor com uma ou mais parcelas, consultar vencimento/saldo/status derivados e registrar pagamentos auditáveis, com RLS, idempotência, estorno e isolamento por Organization comprovados por CI e homologação remota.
