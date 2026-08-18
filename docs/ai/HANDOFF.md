# Handoff — Sistema Lojasaph

## Estado

Fase 10 — Compras, pedidos e recebimento operacional — concluída tecnicamente no PR #29.

Ao integrar o PR #29:

- fechar a Issue #28 como completed;
- manter a Issue #31 como próxima frente única;
- iniciar Fase 11 — Financeiro: documentos, parcelas e contas a pagar.

## Correção importante de continuidade

Durante a validação da Fase 10 foi detectado que a transferência do PR #26 nunca havia entrado na `main`, apesar de documentação posterior afirmar o contrário.

O PR #30 corrigiu a fonte de verdade:

- restaurou migration/testes/runtime de transferência;
- conciliou CI com inventário;
- adicionou a migration forward-only `reconcile_inventory_adjustment_type`;
- restaurou factories de domínio perdidas;
- foi validado em PostgreSQL limpo e Supabase remoto;
- Issue #24 voltou a completed;
- PR #26 foi fechado como superseded.

Não reabrir esse incidente nem tentar mergear o PR #26. Consulte `docs/ai/RESTORE_TRANSFER_NOTE.md` se necessário.

## Não repetir

- engenharia reversa/modelagem já consolidada;
- Auth SSR/membership;
- fundação PostgreSQL/Supabase/RLS;
- entrada, retirada, transferência ou inventário já persistidos;
- módulo de Compras do PR #29 após integração;
- edição direta de saldo;
- write direto do cliente no ledger ou nas tabelas críticas de compras;
- criação de lote/validade desconhecidos;
- conversão automática de embalagem/unidade de compra sem regra explícita.

## Compras — estado consolidado

Arquivos principais:

- `supabase/migrations/20260817234222_purchases_operational_flow.sql`;
- `supabase/tests/purchase_orders.sql`;
- `src/modules/purchases/adapters/supabase-purchase-gateway.ts`;
- `src/app/workspace/(operacao)/compras/page.tsx`;
- `docs/modules/purchases.md`.

Regras que devem permanecer:

- quantidade de pedido usa unidade-base do estoque na Fase 10;
- `purchase_unit_snapshot` é informativo;
- pedido: `draft → ordered → partially_received → received`;
- recebimento multi-item é uma única transação;
- saldo/custo/lote só mudam pelo command de recebimento;
- retry não duplica pedido, preço, recibo, movimento, lote ou saldo;
- `received` não é cancelável pelo command simples;
- cancelamento parcial preserva o que já foi recebido;
- payload `NULL` é inválido;
- motivo diferente no retry de cancelamento gera conflito de idempotência;
- RLS limita leitura à Organization;
- mutations críticas permanecem RPCs auditados.

## Validação da Fase 10

CI verde em aplicação e PostgreSQL limpo:

- lint;
- typecheck;
- Vitest;
- build;
- schema/RLS/roles;
- retirada;
- transferência simples/multi-lote;
- inventário;
- compras.

Supabase remoto:

- migration `purchases_operational_flow` aplicada;
- advisors sem nova vulnerabilidade crítica;
- homologação em `BEGIN/ROLLBACK` passou criação, emissão, parcial/final, retries, custo, lote e cancelamento;
- após rollback não restou dado de teste e os saldos/custos demo voltaram ao baseline.

## Próxima fase — Issue #31

Financeiro deve partir de:

- `docs/product/requirements.md` — REQ-FIN-001 a REQ-FIN-009;
- `docs/architecture/data-model.md` — `payable_documents`, `installments`, `payments`, `payment_instructions`;
- `docs/product/open-questions.md` — Q-013 a Q-017;
- engenharia reversa do `Controle NFs Espeticho.xlsx`.

Defaults reversíveis já registrados na Issue #31:

- `payments` é entidade separada da parcela e o modelo pode suportar múltiplos eventos sem obrigar a UI a expor casos avançados imediatamente;
- não inferir juros/multa/desconto a partir da diferença entre nominal e pago enquanto Q-015 estiver aberta;
- referência Pix/boleto é separada do pagamento efetivo e não deve receber tipo inventado enquanto Q-016 estiver aberta;
- status financeiro é derivado de vencimento/saldo, não digitado livremente;
- correção de pagamento deve preservar trilha via estorno/cancelamento, não delete físico.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro e reversível. Não pedir confirmação para decisões já cobertas por ADR/requisitos/defaults profissionais. Escalar somente decisão de negócio estrutural realmente aberta, credencial externa inevitável ou custo relevante.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
