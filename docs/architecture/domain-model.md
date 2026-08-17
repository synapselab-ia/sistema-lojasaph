# Modelo de Domínio Consolidado — Sistema Lojasaph

Data: 2026-08-17
Status: Fase 2 — modelo lógico independente de fornecedor de banco

Este documento consolida o domínio do Sistema Lojasaph. Ele substitui o uso das planilhas como especificação funcional e deve orientar código, banco, testes e migração.

## 1. Princípios do domínio

1. O sistema é multi-negócio e multi-unidade.
2. Regras críticas não dependem da interface.
3. Estoque, financeiro e caixa são rastreáveis por eventos.
4. Saldos e status calculáveis são derivados; não são campos livres para edição.
5. Cancelamento/estorno preserva histórico; exclusão física é exceção.
6. Dados legados ambíguos podem ser preservados como metadados sem controlar novas regras.
7. Entidades de domínio usam identificadores estáveis e independentes de nomes exibidos.
8. Toda entidade operacional pertence a um escopo organizacional explícito.

---

# 2. Organização

## Organization

Grupo/proprietário que utiliza a plataforma.

Campos conceituais:
- id
- name
- status
- timezone
- currency
- created_at / updated_at

Relacionamentos:
- 1:N Business
- 1:N UserMembership

## Business

Negócio, marca ou operação comercial dentro da Organization.

Campos:
- id
- organization_id
- name
- code
- status

Relacionamentos:
- N:1 Organization
- 1:N Unit

## Unit

Unidade física ou operacional. Tabatinga, Capricórnio e Barba Negra são defaults iniciais desta entidade.

Campos:
- id
- business_id
- name
- code
- status
- address opcional
- legal_entity_id opcional

Relacionamentos:
- N:1 Business
- 1:N Sector
- 1:N StockLocation
- 1:N CashRegister

## Sector

Área operacional como Cozinha, Quiosque ou Empório.

Campos:
- id
- unit_id
- name
- code
- status

Um setor não representa automaticamente um estoque.

## StockLocation

Local físico/lógico onde saldo é controlado.

Campos:
- id
- unit_id
- sector_id opcional
- name
- code
- type
- allow_negative_stock
- status

Exemplos de type:
- warehouse
- kitchen
- kiosk
- store_floor
- temporary
- external

## LegalEntity

Entidade fiscal opcional e separada da estrutura operacional.

Campos candidatos:
- id
- organization_id
- legal_name
- trade_name
- tax_id
- status

Não é obrigatória no primeiro ciclo funcional.

---

# 3. Pessoas, usuários e acesso

## Employee

Pessoa operacional que pode ser responsável por retirada, inventário, caixa ou outras operações.

Campos:
- id
- organization_id
- default_unit_id opcional
- default_sector_id opcional
- name
- role_title opcional
- status

## User

Identidade autenticada.

Nem todo Employee precisa ser User e nem todo User precisa estar vinculado a Employee.

## Role

Conjunto reutilizável de permissões.

Defaults candidatos:
- owner
- admin
- manager
- finance
- purchases
- inventory
- cashier
- viewer

## Permission

Capacidade atômica, por exemplo:
- inventory.read
- inventory.move
- inventory.adjust
- finance.read
- finance.pay
- cash.close
- settings.manage

## UserMembership / UserScope

Vincula User a Organization/Business/Unit/Sector e Role.

Permissões sempre consideram ação + escopo.

---

# 4. Catálogo

## ItemCategory

Classificação de itens de estoque.

## UnitOfMeasure

Unidade canônica: un, kg, g, l, ml, cx, pct etc.

Conversões não serão assumidas automaticamente sem regra explícita.

## StockItem

Item controlado fisicamente.

Campos:
- id
- organization_id
- category_id opcional
- name
- internal_code opcional
- base_unit_id
- item_type
- ean opcional
- ncm opcional
- cest opcional
- active
- track_expiration
- track_batch
- is_returnable

item_type inicial:
- consumable
- merchandise
- reusable
- supply

## ItemAlias

Nome histórico/alternativo usado para migração e busca.

Campos:
- id
- stock_item_id
- alias
- source opcional

## SalesItem

Item vendido/cardápio/POS, separado de StockItem.

Campos:
- id
- business_id
- name
- internal_code opcional
- ean opcional
- price opcional
- active

## Recipe / RecipeComponent — futuro

Relaciona SalesItem a StockItem para consumo teórico. Fora do MVP inicial.

---

# 5. Fornecedores e preços

## Supplier

Cadastro canônico do fornecedor.

Campos:
- id
- organization_id
- legal_name opcional
- trade_name
- tax_id opcional
- status
- notes

## SupplierContact

Campos:
- id
- supplier_id
- name
- role/title opcional
- phone opcional
- email opcional
- whatsapp opcional
- is_primary
- active

## SupplierTerms

Condições comerciais versionáveis/configuráveis.

Campos:
- id
- supplier_id
- minimum_order_value opcional
- payment_terms opcional
- order_schedule opcional
- delivery_schedule opcional
- valid_from
- valid_to opcional

## SupplierItem

Relação fornecedor ↔ StockItem.

Campos:
- id
- supplier_id
- stock_item_id
- supplier_sku opcional
- purchase_unit opcional
- units_per_package opcional
- active

## SupplierPrice

Histórico de preços.

Campos:
- id
- supplier_item_id
- unit_price
- package_price opcional
- observed_at
- source
- purchase_order_item_id opcional

Preço antigo nunca é sobrescrito para apagar histórico.

---

# 6. Compras e recebimentos

## PurchaseOrder

Pedido de compra.

Status:
- draft
- submitted
- confirmed
- partially_received
- received
- cancelled

Campos principais:
- id
- organization_id
- business_id/unit_id conforme escopo
- supplier_id
- ordered_at
- expected_at opcional
- status
- notes

## PurchaseOrderItem

- purchase_order_id
- stock_item_id
- ordered_quantity
- unit_price_snapshot
- purchase_unit opcional

## GoodsReceipt

Recebimento físico vinculado ou não a PurchaseOrder.

Campos:
- id
- supplier_id
- unit_id
- stock_location_id
- purchase_order_id opcional
- received_at
- responsible_employee_id/user_id
- status

## GoodsReceiptItem

- goods_receipt_id
- stock_item_id
- quantity_received
- unit_cost
- batch_code opcional
- expiration_date opcional

Confirmação do recebimento gera entrada de estoque.

---

# 7. Estoque

## StockMovement

Ledger operacional imutável de movimentações confirmadas.

Campos:
- id
- organization_id
- movement_type
- occurred_at
- source_location_id opcional
- destination_location_id opcional
- sector_id opcional
- responsible_user_id opcional
- responsible_employee_id opcional
- reason_code opcional
- reference_type opcional
- reference_id opcional
- notes
- status
- reversal_of_movement_id opcional

movement_type inicial:
- purchase_receipt
- sector_withdrawal
- transfer_out
- transfer_in
- return_in
- return_out
- loan_out
- loan_return
- loss
- expiration
- inventory_adjustment_positive
- inventory_adjustment_negative
- manual_adjustment_positive
- manual_adjustment_negative

## StockMovementItem

Campos:
- id
- movement_id
- stock_item_id
- batch_id opcional
- quantity
- unit_cost_snapshot
- total_cost_snapshot

Quantidade deve ser positiva; a direção é determinada pelo tipo/local do movimento.

## InventoryBatch

Representa quantidade identificável de StockItem em um local com atributos de custo/lote/validade.

Campos:
- id
- stock_item_id
- stock_location_id
- goods_receipt_item_id opcional
- batch_code opcional
- expiration_date opcional
- received_at
- original_quantity
- unit_cost
- status

O saldo remanescente é derivado de movimentos alocados ao lote.

## InventoryBalance

Read model/materialização opcional para performance.

Chave lógica:
- stock_item_id + stock_location_id

Pode conter quantity_on_hand e average_cost, mas nunca é fonte autônoma de verdade: deve ser reconstruível a partir do ledger confirmado.

## Transfer

Operação de negócio que coordena movimentação entre locais.

Status:
- draft
- requested
- dispatched
- partially_received
- received
- cancelled

Campos:
- id
- source_location_id
- destination_location_id
- requested_at
- dispatched_at opcional
- received_at opcional
- responsible ids

TransferItem:
- stock_item_id
- requested_quantity
- dispatched_quantity
- received_quantity

Despacho e recebimento são eventos separados para permitir trânsito e divergência.

## Loan

Empréstimo com expectativa de retorno.

Status:
- open
- partially_returned
- returned
- overdue
- cancelled

Campos:
- source_location_id
- destination_location_id ou external_destination
- loaned_at
- due_at opcional
- closed_at opcional

LoanItem mantém:
- quantity_loaned
- quantity_returned derivada
- quantity_pending derivada

## InventoryCount

Inventário físico.

Status:
- draft
- counting
- review
- confirmed
- cancelled

Campos:
- id
- stock_location_id
- started_at
- counted_at
- confirmed_at
- responsible ids

## InventoryCountLine

- inventory_count_id
- stock_item_id
- expected_quantity_snapshot
- counted_quantity
- difference derivada

Confirmar inventário gera movimentos de ajuste, nunca sobrescreve saldo diretamente.

## LossReason

Catálogo estruturado de motivos: quebra, vencimento, dano, desperdício, furto, outro.

---

# 8. Financeiro / Contas a pagar

## PayableDocument

Obrigação/documento do fornecedor. Pode representar NF ou outro título permitido.

Campos:
- id
- organization_id
- business_id/unit_id
- sector_id opcional
- supplier_id
- document_type
- document_number opcional
- series opcional
- access_key opcional
- issued_at opcional
- total_amount
- notes
- status operacional

## Installment

Parcela da obrigação.

Campos:
- id
- payable_document_id
- installment_number
- installment_count
- nominal_amount
- due_date

Status financeiro é derivado de vencimento, cancelamento e pagamentos.

## Payment

Evento de pagamento explícito.

Campos:
- id
- installment_id
- paid_at
- amount
- payment_method_id opcional
- interest_amount default 0
- penalty_amount default 0
- discount_amount default 0
- adjustment_amount default 0
- reference opcional
- responsible_user_id
- reversed_payment_id opcional

Uma parcela pode ter zero ou vários pagamentos. Isso suporta pagamento parcial sem reconstrução futura.

## PaymentInstruction

Informação para executar pagamento.

Tipos candidatos:
- pix_key
- pix_copy_paste
- boleto_barcode
- boleto_digitable_line
- bank_details
- other

## PaymentMethod

Catálogo reutilizável de meios de pagamento.

## Attachment

Arquivos vinculáveis a documento, parcela, pagamento, recebimento ou outras entidades suportadas.

---

# 9. Caixa

## CashRegister

Caixa/terminal lógico por unidade.

## CashSession

Sessão diária/operacional de caixa.

Status:
- open
- closing
- closed
- reopened
- cancelled

Campos:
- id
- cash_register_id
- unit_id
- business_date
- opened_at
- closed_at opcional
- opening_float
- responsible ids
- expected_cash_amount derivado/snapshot de fechamento
- counted_cash_amount opcional
- cash_difference derivada
- notes

## CashMovement

Entrada ou sangria.

Campos:
- id
- cash_session_id
- type: inflow | withdrawal
- amount
- reason
- occurred_at
- responsible ids

## PaymentMethodTotal

Total consolidado do período por forma de pagamento.

Campos:
- cash_session_id
- payment_method_id
- gross_amount
- fee_amount
- net_amount
- source: manual | imported | integrated

## FeeRule

Regra versionada de taxa.

Campos:
- id
- organization/business/unit scope
- payment_method_id
- acquirer opcional
- percentage_rate opcional
- fixed_fee opcional
- valid_from
- valid_to opcional

## EmployeeConsumption — extensão pronta

Pode ser introduzido sem alterar CashSession. No MVP pode ser registrado como evento próprio ou movimento de estoque, conforme regra operacional final.

---

# 10. Importação, auditoria e anexos

## ImportBatch

Execução identificada de importação.

Campos:
- id
- source_type
- source_file_hash
- started_at
- completed_at
- status
- dry_run
- totals

## ImportRowResult

Rastreia arquivo/aba/linha, entidade gerada, warning ou erro.

## AuditLog

Registro append-only de ações críticas.

Campos:
- id
- organization_id
- actor_user_id
- action
- entity_type
- entity_id
- occurred_at
- before_data opcional
- after_data opcional
- metadata

AuditLog não substitui ledger financeiro ou de estoque.

---

# 11. Estados e exclusão

Entidades mestres podem usar active/inactive.

Registros transacionais críticos usam estados/cancelamentos e estornos:
- StockMovement confirmado não é apagado; cria reversal quando necessário.
- Payment realizado não é apagado; cria reversão/estorno.
- CashSession fechada não é silenciosamente reescrita; reabertura exige permissão e auditoria.
- InventoryCount confirmado gera ajustes; correção posterior gera novo inventário/ajuste.

---

# 12. Escopo organizacional dos dados

Regra geral:
- Organization define isolamento principal.
- Business permite separação por marca/operação.
- Unit define contexto operacional frequente.
- Sector e StockLocation refinam o escopo.

Nenhuma consulta sensível deve confiar apenas no filtro enviado pelo frontend.

---

# 13. O que pode esperar sem bloquear o MVP

- estrutura jurídica avançada;
- ficha técnica/receitas;
- POS/PDV completo;
- conciliação bancária;
- folha/RH;
- FEFO obrigatório automático;
- previsão de demanda;
- integração WhatsApp;
- IA no produto;
- contabilidade completa.

Essas extensões devem encaixar no modelo sem exigir refazer os agregados centrais.