# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 11 — Financeiro: documentos, parcelas e contas a pagar — concluída tecnicamente no PR #32.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch da entrega: `agent/finance-runtime`
- PR atual: #32 — Fase 11 — financeiro, parcelas e contas a pagar
- Issue atual: #31 — deve ser encerrada pelo merge do PR #32
- Próxima Issue registrada: #33 — Fase 12 — Caixa: sessões, meios de pagamento e fechamento diário

## Concluído até aqui

- governança, engenharia reversa, domínio e fundação Next.js;
- PostgreSQL/Supabase, migrations, RLS e Auth SSR;
- produtos e fornecedores persistentes;
- entrada, retirada/FEFO, transferência e inventário físico;
- compras, pedidos e recebimento operacional;
- documentos financeiros, parcelas, pagamentos e estornos.

O reparo de continuidade da transferência foi concluído no PR #30. Não reabrir o PR #26; detalhes em `docs/ai/RESTORE_TRANSFER_NOTE.md`.

## Fase 11 — Financeiro

Persistência:

- `payable_documents`;
- `installments`;
- `payment_instructions`;
- `payments` como eventos `payment`/`reversal`;
- view `payable_installment_summary` com `security_invoker`.

Commands:

- `create_payable_document`;
- `record_installment_payment`;
- `reverse_installment_payment`;
- `cancel_payable_document`.

Todos exigem `auth.uid()`, papel `owner/admin/manager/finance`, command ID/idempotência e auditoria. As tabelas críticas não aceitam write direto do browser.

## Regras financeiras preservadas

- Q-013: identificadores fiscais continuam opcionais; não fabricar número/série/chave ausentes.
- Q-014: a parcela aceita múltiplos eventos de pagamento, sem obrigar UI avançada de pagamento parcial.
- Q-015: diferença entre nominal e pago é preservada como saldo; não inferir juros/multa/desconto.
- Q-016: Pix/Boleto histórico fica como referência bruta separada do pagamento executado.
- Q-017: `Checar data` não virou status artificial; status é derivado.
- pagamento original não é apagado no estorno;
- documento só pode ser cancelado quando pagamentos líquidos foram neutralizados por estorno.

Status derivados por parcela:

- `cancelled`;
- `paid`;
- `overdue`;
- `due_today`;
- `upcoming`.

A data de vencimento usa o timezone da Organization.

## Workspace

`/workspace/financeiro` possui:

- KPIs nominal/pago/saldo/vencidos;
- cadastro de documento e parcelas;
- referência de pagamento separada;
- visão de vencimento/status/saldo;
- registro de pagamentos;
- estorno preservando histórico;
- cancelamento controlado.

Navegação e visão geral do workspace foram alinhadas a Estoque + Compras + Financeiro persistentes.

## Validação

Fase 11 passou em PostgreSQL 17 limpo:

- todas as migrations;
- schema/RLS/roles;
- retirada;
- transferência simples/multi-lote;
- inventário;
- compras;
- `finance_payables.sql`.

Aplicação passou lint, typecheck, Vitest e production build no head material da implementação.

A suíte financeira cobre payload inválido, múltiplas parcelas, status derivados, pagamentos múltiplos, sobrepagamento, retry/conflito de idempotência, estorno, cancelamento, viewer, cross-Organization e anon.

## Supabase remoto

A migration `finance_payables_flow` foi aplicada ao projeto homologado em `sa-east-1`.

Security Advisor mostrou apenas warnings esperados/intencionais dos RPCs `SECURITY DEFINER`. Performance Advisor trouxe INFO de FKs/índices para tuning orientado a carga real.

Homologação em `BEGIN/ROLLBACK` confirmou:

- criação/retry do documento;
- referência de pagamento separada;
- `overdue`, `due_today` e `upcoming`;
- pagamentos múltiplos e retry sem duplicação;
- sobrepagamento preservado como saldo negativo;
- estornos como eventos separados;
- cancelamento após neutralização dos pagamentos;
- audit log gravado, mas corretamente não legível pela role `authenticated` comum.

Após rollback: zero documento, zero pagamentos, zero usuário e zero membership de teste residuais.

## Próxima ação

Integrar o PR #32 e confirmar o fechamento da Issue #31. Depois tornar a Issue #33 a única frente em andamento e iniciar a Fase 12 — Caixa conforme `docs/ai/NEXT_ACTION.md`.
