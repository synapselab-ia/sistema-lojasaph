# Módulo — Financeiro, parcelas e contas a pagar

Status: Fase 11 concluída tecnicamente no PR #32.

## Objetivo

Substituir o controle de NFs/contas a pagar por documentos financeiros estruturados, parcelas, vencimentos e eventos de pagamento auditáveis, preservando as ambiguidades históricas em vez de inventar regras.

## Modelo persistente

- `payable_documents`: obrigação do fornecedor por Organization/Unit, setor opcional e identificadores do documento quando conhecidos.
- `installments`: parcela, quantidade total de parcelas, valor nominal e vencimento.
- `payment_instructions`: referência bruta associada à parcela, separada do pagamento executado.
- `payments`: eventos `payment` e `reversal`; o pagamento original nunca é apagado por estorno.
- `payable_installment_summary`: view `security_invoker` que deriva saldo e status sob RLS.

## Perguntas abertas preservadas

### Q-013 — identificadores do documento

Número, série, chave de acesso e data de emissão são opcionais. O sistema não fabrica identificadores ausentes no legado.

### Q-014 — pagamento parcial/múltiplos pagamentos

O modelo aceita vários eventos de pagamento por parcela. Isso evita uma cardinalidade 1:1 irreversível. A UI inicial permite registrar eventos individuais sem obrigar fluxo avançado de renegociação.

### Q-015 — valor pago diferente do nominal

A diferença é preservada como saldo positivo/negativo. O sistema não classifica automaticamente juros, multa, desconto ou taxa. Exemplo: nominal R$ 1.000 e pagamentos líquidos de R$ 1.100 resultam em saldo `-R$ 100` e status pago, sem criar uma causa fictícia para os R$ 100.

### Q-016 — Pix/Boleto

O valor histórico é armazenado em `payment_instructions.raw_reference`, com rótulo opcional. Não existe enum inventado que force o conteúdo a ser Pix, boleto ou linha digitável.

### Q-017 — `Checar data`

Não foi transformado em status editável. `paid`, `overdue`, `due_today` e `upcoming` são derivados de eventos, vencimento e timezone da Organization. A regra histórica de `Checar data` permanece pendente sem contaminar o modelo.

## Status derivados

Para documento ativo:

1. `paid`: pagamento líquido >= valor nominal;
2. `overdue`: saldo não pago e vencimento anterior à data local da Organization;
3. `due_today`: vencimento igual à data local;
4. `upcoming`: vencimento futuro.

Documento cancelado faz todas as parcelas derivarem `cancelled`.

`balance_amount = nominal_amount - net_paid_amount`.

Sobrepagamento gera saldo negativo e permanece visível.

## Commands PostgreSQL

### `create_payable_document`

- papéis `owner/admin/manager/finance`;
- command ID = ID do documento para idempotência forte;
- valida Organization, Unit, Sector e Supplier;
- exige conjunto completo/consistente de parcelas;
- rejeita duplicidade de número, datas ausentes e valores inválidos;
- normaliza ordem das parcelas para retry semântico;
- cria referências de pagamento separadamente;
- auditado.

### `record_installment_payment`

- papéis financeiros;
- evento separado, nunca overwrite de `Valor Pago`;
- valor > 0 com precisão monetária exata;
- retry idempotente compara parcela, valor, data, referência e observação;
- documento precisa estar ativo;
- pode haver múltiplos eventos e sobrepagamento, sem classificação automática da diferença;
- auditado.

### `reverse_installment_payment`

- cria evento `reversal` no mesmo valor do pagamento original;
- não apaga nem altera o pagamento original;
- somente um estorno integral por evento nesta primeira versão;
- idempotente e auditado.

### `cancel_payable_document`

- exige saldo líquido de pagamentos igual a zero;
- pagamentos existentes precisam ser estornados antes;
- não apaga parcelas, pagamentos ou referências;
- retry compara também o motivo;
- auditado.

## Segurança

As tabelas críticas permitem leitura de membros da Organization por RLS, mas não aceitam write direto do browser. Os quatro commands são `SECURITY DEFINER` intencionais, executáveis somente por `authenticated`, e revalidam `auth.uid()`, papel, Organization, referências e payload.

`payable_installment_summary` usa `security_invoker`, portanto não contorna as policies das tabelas-base.

## UI persistente

`/workspace/financeiro` oferece:

- KPIs de nominal, pago líquido, saldo em aberto e quantidade vencida;
- criação de documento e múltiplas parcelas;
- referência Pix/Boleto bruta separada;
- visão por parcela de vencimento, nominal, pago, diferença/saldo e status;
- registro de pagamentos;
- histórico de eventos;
- estorno sem exclusão;
- cancelamento apenas conforme regra do banco.

`manageFinance = owner/admin/manager/finance` controla ações visíveis. A UI não é fronteira de segurança.

## Testes

`supabase/tests/finance_payables.sql` roda depois das suites estabilizadas de estoque, inventário e compras. Cobre:

- direct write negado;
- payload nulo/incompleto;
- três parcelas e retry com ordem diferente;
- conflito de idempotência;
- preservação de referência de pagamento;
- `overdue`, `due_today` e `upcoming`;
- múltiplos pagamentos;
- sobrepagamento preservado;
- retry de pagamento;
- estorno e bloqueio de segundo estorno;
- cancelamento bloqueado com pagamento líquido;
- cancelamento após estornos;
- viewer read-only;
- cross-Organization;
- anon.

## Supabase remoto

A migration `finance_payables_flow` está aplicada no projeto homologado em `sa-east-1`.

Homologação em `BEGIN/ROLLBACK` confirmou criação/retry, status derivados, referência separada, pagamentos múltiplos, sobrepagamento, estornos, cancelamento e trilha de auditoria. A leitura administrativa do audit log foi feita após `reset role`, porque `authenticated` não possui leitura dessa trilha por RLS — comportamento intencional.

Após rollback não restaram documento, pagamentos, usuário ou membership de teste.

Security Advisor mantém warnings esperados para os quatro commands `SECURITY DEFINER`. Performance Advisor retornou apenas INFO de FKs/índices para tuning orientado a carga real.

## Fora do escopo da Fase 11

- Caixa e fechamento diário;
- conciliação bancária;
- SEFAZ/OCR;
- classificação automática de juros/multa/desconto;
- importação definitiva de dados reais;
- política avançada de anexos/Storage.

Próxima fase registrada: Issue #33 — Caixa: sessões, meios de pagamento e fechamento diário.
