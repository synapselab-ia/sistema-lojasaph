# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 12 — Caixa: sessões, meios de pagamento e fechamento diário — concluída tecnicamente no PR #34.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch da entrega: `agent/cash-runtime`
- PR atual: #34 — Fase 12 — caixa, meios de pagamento e fechamento diário
- Issue atual: #33 — deve ser encerrada pelo merge do PR #34
- Próxima Issue registrada: #35 — Fase 13 — Dashboard operacional, alertas e KPIs

## Concluído até aqui

- governança, engenharia reversa, domínio e fundação Next.js;
- PostgreSQL/Supabase, migrations, RLS e Auth SSR;
- produtos e fornecedores persistentes;
- entrada, retirada/FEFO, transferência e inventário físico;
- compras, pedidos e recebimento operacional;
- documentos financeiros, parcelas, pagamentos e estornos;
- caixa operacional e fechamento diário.

O reparo de continuidade da transferência foi concluído no PR #30. Não reabrir o PR #26; detalhes em `docs/ai/RESTORE_TRANSFER_NOTE.md`.

## Fase 12 — Caixa

Persistência:

- `cash_registers`;
- `payment_methods`;
- `fee_rules`;
- `cash_sessions`;
- `payment_method_totals`;
- `cash_movements`.

Commands:

- `create_cash_register`;
- `create_payment_method`;
- `create_fee_rule`;
- `open_cash_session`;
- `set_cash_payment_total`;
- `record_cash_movement`;
- `close_cash_session`;
- `cancel_cash_session`.

Configuração exige `owner/admin/manager`. Operação aceita `owner/admin/manager/cashier`. As tabelas críticas não aceitam write direto do browser; os commands revalidam `auth.uid()`, papel, Organization, payload e idempotência.

## Regras preservadas

- Q-007: apenas totais consolidados; não há venda individual/POS.
- Q-009: `employee_consumption` é categoria separada e não entra automaticamente no faturamento nem no caixa esperado.
- Q-010: esperado e contado são campos distintos; divergência é derivada.
- Q-011: Voucher é meio habilitável, não obrigatório.
- Q-012: taxas são configuráveis/versionadas, sem regra hardcoded por adquirente/bandeira/parcelamento.

Fórmula atual:

`expected_cash_amount = opening_float + meios com affects_cash_drawer + cash_in - cash_out`

`cash_difference = counted_cash_amount - expected_cash_amount`

## Workspace

`/workspace/caixa` possui:

- configuração de caixa físico;
- meios de pagamento;
- regras de taxa;
- abertura por data/sequence;
- totais consolidados por meio;
- entrada/sangria/Consumo Funcionários;
- fechamento esperado x contado;
- divergência;
- cancelamento controlado.

A navegação e a visão geral do workspace incluem Caixa.

## Validação local/CI

Head material da Fase 12 passou:

- lint;
- typecheck;
- testes unitários;
- production build;
- migrations em PostgreSQL 17 limpo;
- schema/RLS/roles;
- retirada;
- transferência simples/multi-lote;
- inventário físico;
- compras;
- financeiro;
- `cash_sessions.sql`.

A suíte de Caixa cobre configuração por papel, direct write negado, abertura/retry, identidade caixa/data/sequence, Dinheiro/Crédito/Pix/Voucher, taxa versionada, bruto/taxa/líquido, entradas/sangrias, Consumo Funcionários separado, esperado x contado, cancelamento, viewer, cross-Organization e anon.

Durante o primeiro gate foi corrigida uma ambiguidade PL/pgSQL em `close_cash_session`: colunas de `cash_movements` passaram a usar alias explícito. A fórmula não mudou.

## Supabase remoto

A migration `cash_sessions_flow` está aplicada no projeto homologado em `sa-east-1` como versão remota `20260818135623`.

Homologação em `BEGIN/ROLLBACK` confirmou:

- caixa e meios configuráveis;
- Voucher opcional;
- regra de taxa de 2%: R$ 1.000 bruto, R$ 20 taxa, R$ 980 líquido;
- abertura e retries idempotentes;
- entrada R$ 100 e sangria R$ 40;
- Consumo Funcionários R$ 25 preservado separadamente;
- esperado R$ 660;
- contado R$ 650;
- divergência `-R$ 10`;
- cancelamento idempotente de segunda sessão;
- trilha de auditoria.

Após rollback: zero sessão, caixa, meio, regra, movimento, usuário e membership temporários.

Security Advisor mantém warnings esperados dos command RPCs `SECURITY DEFINER`. Performance Advisor retornou apenas INFO de FKs/índices e índices ainda sem uso para tuning baseado em carga real.

## Higiene de migrations

O gerador temporário da Fase 12 criou shells vazios duplicados enquanto runs antigos ainda estavam em voo. Todos foram removidos. A única migration GitHub de Caixa com schema é:

- `supabase/migrations/20260818130358_cash_sessions_flow.sql`.

Não restaurar os shells vazios removidos.

## Próxima ação

Rodar o gate final do SHA documental do PR #34. Se CI permanecer verde, integrar o PR #34 e confirmar a Issue #33 como completed. Depois tornar a Issue #35 a única frente e iniciar a Fase 13 conforme `docs/ai/NEXT_ACTION.md`.
