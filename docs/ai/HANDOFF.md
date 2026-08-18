# Handoff — Sistema Lojasaph

## Estado

Fase 11 — Financeiro: documentos, parcelas e contas a pagar — concluída tecnicamente no PR #32.

Ao integrar o PR #32:

- fechar a Issue #31 como completed;
- manter a Issue #33 como próxima frente única;
- iniciar Fase 12 — Caixa: sessões, meios de pagamento e fechamento diário.

## Não repetir

- engenharia reversa e modelo lógico consolidados;
- Auth SSR/membership/RLS base;
- estoque, transferência e inventário persistentes;
- Compras da Fase 10;
- Financeiro da Fase 11 após o merge do PR #32;
- reparo da transferência do PR #30;
- write direto em tabelas críticas;
- inferência de juros/multa/desconto a partir de diferença financeira;
- transformação da referência Pix/Boleto histórica em tipo inventado.

## Financeiro — arquivos principais

- `supabase/migrations/20260818123554_finance_payables_flow.sql`;
- `supabase/tests/finance_payables.sql`;
- `src/modules/finance/adapters/supabase-finance-gateway.ts`;
- `src/app/workspace/(operacao)/financeiro/page.tsx`;
- `docs/modules/finance.md`.

## Regras que devem permanecer

- documento pertence a Organization/Unit, setor opcional e Supplier;
- múltiplas parcelas são explícitas e numeradas;
- status de pagamento é derivado, não editável;
- pagamento é evento append-only;
- estorno cria outro evento e não apaga o original;
- sobrepagamento pode gerar saldo negativo e não recebe causa automática;
- `payment_instructions.raw_reference` preserva o conteúdo histórico sem inferir Pix/Boleto;
- documento cancelado exige pagamentos líquidos zerados por estornos;
- command IDs com payload diferente conflitam;
- RLS permite leitura por membership, mas mutations ficam em RPCs validados.

## Validação da Fase 11

PostgreSQL limpo:

- migrations + seed;
- schema/RLS/roles;
- estoque/transferência/inventário;
- compras;
- financeiro.

Aplicação:

- lint;
- typecheck;
- Vitest;
- production build.

Supabase remoto:

- `finance_payables_flow` aplicada;
- advisors sem nova vulnerabilidade crítica;
- homologação em rollback passou criação/retry, status derivados, pagamentos múltiplos, sobrepagamento, estornos, cancelamento e auditoria;
- zero resíduos após rollback.

Observação de segurança: `audit_logs` não é legível pela role `authenticated` comum; a asserção administrativa de homologação precisou de `reset role`. Isso é comportamento esperado de RLS, não falta de trilha.

## Próxima fase — Issue #33

Caixa deve partir de:

- REQ-CASH-001 a REQ-CASH-008;
- `cash_registers`, `cash_sessions`, `cash_movements`, `payment_method_totals`, `fee_rules` e `payment_methods` do modelo lógico;
- engenharia reversa de `Caixa Empório Espeticho Tabatinga.xlsx`;
- Q-007 e Q-009 a Q-012.

Defaults reversíveis da Issue #33:

- trabalhar inicialmente com totais consolidados, não vendas individuais;
- `fundo de caixa` = valor inicial da sessão, sem inferir caixa financeiro da empresa;
- valor esperado e contado ficam separados; divergência é derivada;
- taxas ficam configuráveis/versionadas, sem regra hardcoded de adquirente/bandeira;
- Voucher é meio habilitável, não obrigatório;
- Consumo Funcionários fica categoria operacional separada do faturamento até Q-009 ser resolvida;
- correções usam cancelamento/estorno auditado, não delete físico.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Escalar apenas decisão estrutural realmente aberta, custo relevante ou credencial externa inevitável.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
