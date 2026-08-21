# Auditoria de cancelamento e estorno — REQ-SEC-005

Data: 2026-08-21

## Resultado

**Atendido no escopo atual.** Não foi encontrada lacuna reproduzível que exija nova Issue, migration ou alteração funcional.

`REQ-SEC-005` exige que registros críticos não sejam simplesmente excluídos sem trilha de auditoria. A implementação atual usa três padrões compatíveis com esse requisito:

1. **lifecycle explícito** para cancelamentos (`cancelled`) em pedidos, documentos financeiros, sessões de caixa e inventários;
2. **evento compensatório relacionado ao original** para estornos financeiros e devoluções de estoque;
3. **ausência de DELETE direto para o cliente autenticado**, reforçada por grants, RLS e teste transversal.

A auditoria foi executada sobre a `main` de entrada `2518dab61825c103d763b23187da04ae075b5778` e com introspecção read-only do Supabase Production `fhbvwyttikrbeaanatlr`. Nenhum cancelamento, estorno, DDL ou DML de negócio foi executado em Production.

## Escopo revisado

- Estoque: `stock_movements`, devoluções relacionadas, perdas/baixas e ledger;
- Inventário: `inventory_counts`;
- Compras: `purchase_orders`, `purchase_order_items`, `purchase_receipts` e itens de recebimento;
- Financeiro: `payable_documents`, `installments`, `payments` e `payable_installment_summary`;
- Caixa: `cash_sessions`, `cash_movements` e `payment_method_totals`;
- Auditoria e configuração crítica: `audit_logs`, `stock_items`, `stock_locations` e `stock_loss_reasons`;
- gateways e telas persistentes que expõem cancelamento/estorno/devolução.

## Evidência de banco — DELETE, RLS e EXECUTE

Introspecção read-only em Production confirmou, para as relações críticas revisadas:

- RLS habilitado;
- `authenticated` sem `DELETE` direto;
- `anon` sem `DELETE` direto;
- tabelas de evento/lifecycle críticas sem `INSERT`/`UPDATE` direto para `authenticated` quando a mutação deve passar por command RPC;
- `audit_logs` sem `INSERT`/`UPDATE`/`DELETE` direto para `authenticated`;
- configurações críticas que aceitam criação/edição continuam sem `DELETE` direto.

Os RPCs públicos abaixo permanecem `SECURITY DEFINER`, com `search_path=''`, `EXECUTE` para `authenticated` e sem `EXECUTE` para `anon`:

- `cancel_purchase_order`;
- `cancel_payable_document`;
- `reverse_installment_payment`;
- `cancel_cash_session`;
- `cancel_inventory_count`;
- `record_stock_return`.

Os wrappers públicos revalidam `auth.uid()`, papel e escopo do recurso antes de delegar à implementação privada.

`supabase/tests/security_hardening.sql` já funciona como prova transversal contra regressão: falha se qualquer tabela pública de aplicação conceder a `authenticated` `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` ou `MAINTAIN`; também valida RLS, grants coerentes com policies, ausência de privilégios de relação para `anon` e default privileges fechados.

## Compras

### Cancelamento

`cancel_purchase_order`:

- serializa o command id com advisory lock;
- usa o audit log do command para replay idempotente;
- conflito de mesmo command id com pedido ou motivo diferentes é explícito;
- trava o pedido antes da mudança;
- pedido totalmente recebido é imutável para esse cancelamento;
- atualiza o lifecycle para `cancelled`, preservando a linha do pedido;
- registra `purchase_order.cancelled` na mesma transação, com ator, entidade, estado anterior, estado novo, motivo e command id.

Pedido parcialmente recebido pode ser cancelado sem apagar o recebimento já efetivado nem o efeito correspondente no estoque.

### Teste existente

`supabase/tests/purchase_orders.sql` cobre:

- write direto negado;
- pedido recebido não cancelável;
- cancelamento de draft;
- replay idempotente do mesmo cancelamento;
- conflito quando o motivo muda sob o mesmo command id;
- cancelamento de pedido parcialmente recebido preservando `received_quantity`;
- viewer, cross-Organization e anon negados.

## Financeiro

### Estorno

`reverse_installment_payment` não altera nem apaga o pagamento original. Ele:

- serializa command id e o pagamento alvo;
- exige evento original do tipo `payment` em documento ativo;
- bloqueia segundo estorno do mesmo pagamento;
- cria nova linha em `payments` com `event_type='reversal'`;
- relaciona o novo evento por `reverses_payment_id`;
- registra `payment.reversed` na mesma transação;
- deixa saldo e status serem derivados do histórico completo.

### Cancelamento de documento

`cancel_payable_document`:

- preserva o documento e muda `lifecycle_status` para `cancelled`;
- só permite cancelamento quando pagamentos líquidos foram neutralizados;
- faz replay idempotente por command id e motivo;
- registra `payable_document.cancelled` com before/after, motivo, ator e command id na mesma transação.

### Teste existente

`supabase/tests/finance_payables.sql` cobre replay de estorno, bloqueio de segundo estorno, bloqueio de cancelamento com pagamento líquido, cancelamento após neutralização, replay e conflito do cancelamento, além de impedir novo pagamento em documento cancelado.

## Caixa

`cancel_cash_session`:

- aceita apenas sessão `open`;
- preserva a sessão, muda `status='cancelled'` e grava `cancelled_at`;
- preserva/associa o motivo quando informado;
- usa advisory lock + audit por command id para replay idempotente;
- rejeita conflito de payload;
- grava `cash_session.cancelled` na mesma transação.

`supabase/tests/cash_sessions.sql` explicita que a segunda sequência é “cancelled without deleting its history”, executa o cancelamento duas vezes com o mesmo command id e valida conflito quando o motivo muda. Os movimentos de caixa são tratados como append-only e writes diretos de sessão são negados.

## Inventário

`cancel_inventory_count`:

- preserva a sessão e muda apenas o lifecycle para `cancelled`;
- inventário confirmado é imutável;
- serializa command id e a própria sessão;
- mesmo command id para a mesma sessão é replay seguro;
- mesmo command id apontando para outra sessão gera conflito;
- grava `inventory_count.cancelled` na mesma transação.

`supabase/tests/inventory_count_cancel.sql` confirma o replay, o conflito, a imutabilidade de inventário confirmado, a liberação segura do local para nova sessão e exatamente um audit event após retry.

A confirmação de inventário continua criando movimentos de ajuste em vez de reescrever o ledger histórico, e a suíte principal verifica que retry de confirmação não duplica movimentos nem audit.

## Estoque e devoluções

O ledger `stock_movements` não é corrigido por exclusão. Para o caso implementado de devolução de retirada, `record_stock_return`:

- mantém a retirada original confirmada e imutável;
- cria novo movimento `return_in`;
- relaciona-o ao original por `reversal_of_movement_id`;
- usa `reason_code='withdrawal_return'`;
- preserva custo histórico e linhagem de lote;
- trava a retirada e impede retorno cumulativo acima da quantidade original;
- é idempotente pelo próprio movement/command id;
- registra `stock_return.recorded` na mesma transação.

`supabase/tests/stock_return.sql` roda em `BEGIN/ROLLBACK` e comprova retirada original não alterada, relação explícita do retorno, custo/lote preservados, audit único após retry, bloqueio de over-return e rollback integral dos fixtures.

Perdas, quebras e vencimentos também são movimentos novos de ledger com motivo estruturado; não são exclusões do movimento original.

## Runtime / UI

Os gateways persistentes revisados usam command RPCs e `IdempotentCommandRegistry`:

- `SupabasePurchaseGateway.cancel()` → `cancel_purchase_order`;
- `SupabaseFinanceGateway.reversePayment()` → `reverse_installment_payment`;
- `SupabaseFinanceGateway.cancelDocument()` → `cancel_payable_document`;
- `SupabaseCashGateway.cancelSession()` → `cancel_cash_session`;
- `SupabaseInventoryCountGateway.cancel()` → `cancel_inventory_count`;
- `SupabaseStockReturnGateway.record()` → `record_stock_return`.

As telas de Compras, Financeiro, Caixa, Inventário e Devoluções chamam esses gateways. Não foi encontrado caminho crítico nessas superfícies que use Data API `DELETE` para cancelar, estornar ou devolver registros.

Há um `delete next[item.id]` na tela de Compras após recebimento, mas ele remove somente uma chave de um objeto de estado React local (`receiptItems`); não é chamada Supabase/Data API e não toca persistência.

## Atomicidade e falhas

Os commands de banco executam alteração de estado/novo evento e `audit_logs` dentro da mesma função PostgreSQL e da mesma transação da chamada. Uma exceção desfaz o command inteiro; não existe commit intermediário no cliente entre efeito de negócio e auditoria.

As suítes de domínio exercitam conflitos, estados inválidos, autorização e retries. `stock_return.sql` ainda encapsula os fixtures em `BEGIN/ROLLBACK`, fornecendo prova barata de ausência de resíduo. A suíte `audit_trail.sql` existente cobre rollback conjunto de mutation + audit para a trilha transversal.

## Conclusão

`REQ-SEC-005` está atendido para os registros críticos implementados hoje:

- não há DELETE direto do cliente autenticado nas relações críticas;
- cancelamentos preservam registros por lifecycle;
- estornos/devoluções preservam o original e criam evento relacionado;
- auditoria é gravada no mesmo boundary transacional;
- retry é idempotente ou falha por conflito explícito;
- falhas não exigem apagar histórico nem deixam efeito parcial intencional;
- runtime usa commands específicos, não exclusão física, para essas operações.

Não foi aberta Issue corretiva porque não existe finding concreto. A proteção deve continuar sendo revisitada quando novos registros críticos ou novos fluxos de correção forem introduzidos.
