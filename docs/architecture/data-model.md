# Modelo Lógico de Dados — Sistema Lojasaph

Data: 2026-08-17
Status: Fase 2 — independente de Supabase/PostgreSQL físico

Este documento traduz o domínio consolidado em entidades lógicas, chaves, relações e invariantes. Nomes finais de tabelas/colunas poderão mudar na implementação física, mas as relações e responsabilidades abaixo são a referência atual.

## Convenções

- Identificadores: UUID/ULID ou equivalente estável; decisão física fica para a camada de persistência.
- Datas operacionais usam timezone da Organization; persistência física deve armazenar timestamps de forma segura para timezone.
- Valores monetários usam tipo decimal exato; nunca float binário.
- Quantidades usam decimal quando a unidade permitir fração.
- Campos `created_at`, `updated_at` e metadados de auditoria serão padronizados fisicamente depois.

---

# 1. Organização

## organizations
PK: id

Campos essenciais:
- name
- status
- timezone
- currency

## businesses
PK: id
FK: organization_id → organizations.id

Unique lógico:
- organization_id + code

## legal_entities
PK: id
FK: organization_id → organizations.id

Unique lógico quando informado:
- organization_id + tax_id

## units
PK: id
FK: business_id → businesses.id
FK opcional: legal_entity_id → legal_entities.id

Unique lógico:
- business_id + code

## sectors
PK: id
FK: unit_id → units.id

Unique lógico:
- unit_id + code

## stock_locations
PK: id
FK: unit_id → units.id
FK opcional: sector_id → sectors.id

Unique lógico:
- unit_id + code

Invariante:
- se sector_id existir, o Sector deve pertencer ao mesmo Unit.

---

# 2. Pessoas e acesso

## employees
PK: id
FK: organization_id → organizations.id
FK opcional: default_unit_id → units.id
FK opcional: default_sector_id → sectors.id

## users
PK: id

A identidade física de autenticação poderá ser externa ao domínio.

## roles
PK: id
FK: organization_id → organizations.id, nulo apenas para roles de sistema se adotadas

## permissions
PK: id
Unique: key

## role_permissions
PK composta/lógica: role_id + permission_id
FKs → roles / permissions

## user_memberships
PK: id
FK: user_id → users.id
FK: organization_id → organizations.id
FK: role_id → roles.id
FK opcionais: business_id, unit_id, sector_id

Invariantes:
- escopos filhos precisam pertencer aos escopos pais informados;
- ausência de business/unit/sector significa escopo mais amplo dentro da Organization, conforme Role.

---

# 3. Catálogo

## item_categories
PK: id
FK: organization_id → organizations.id

## units_of_measure
PK: id
Campos: code, name, decimal_scale

## stock_items
PK: id
FK: organization_id → organizations.id
FK opcional: category_id → item_categories.id
FK: base_unit_id → units_of_measure.id

Unique candidatos:
- organization_id + internal_code, quando internal_code existir
- organization_id + ean, quando EAN for confiável/único

## item_aliases
PK: id
FK: stock_item_id → stock_items.id

Index:
- normalized_alias

## sales_items
PK: id
FK: business_id → businesses.id

## recipes
PK: id
FK: sales_item_id → sales_items.id

## recipe_components
PK: id
FK: recipe_id → recipes.id
FK: stock_item_id → stock_items.id

Fora do MVP, mas reservado conceitualmente.

---

# 4. Fornecedores e compras

## suppliers
PK: id
FK: organization_id → organizations.id

Unique candidato:
- organization_id + tax_id quando existente

## supplier_contacts
PK: id
FK: supplier_id → suppliers.id

## supplier_terms
PK: id
FK: supplier_id → suppliers.id

Regra temporal:
- intervalos de vigência conflitantes para a mesma categoria de termo devem ser evitados.

## supplier_items
PK: id
FK: supplier_id → suppliers.id
FK: stock_item_id → stock_items.id

Unique lógico:
- supplier_id + stock_item_id + supplier_sku normalizado quando necessário

## supplier_prices
PK: id
FK: supplier_item_id → supplier_items.id
FK opcional: purchase_order_item_id → purchase_order_items.id

Index:
- supplier_item_id + observed_at desc

## purchase_orders
PK: id
FK: organization_id → organizations.id
FK opcional: business_id → businesses.id
FK opcional: unit_id → units.id
FK: supplier_id → suppliers.id

## purchase_order_items
PK: id
FK: purchase_order_id → purchase_orders.id
FK: stock_item_id → stock_items.id

Invariantes:
- ordered_quantity > 0
- unit_price_snapshot >= 0

## goods_receipts
PK: id
FK: supplier_id → suppliers.id
FK: unit_id → units.id
FK: stock_location_id → stock_locations.id
FK opcional: purchase_order_id → purchase_orders.id

Invariante:
- stock_location.unit_id = goods_receipts.unit_id

## goods_receipt_items
PK: id
FK: goods_receipt_id → goods_receipts.id
FK: stock_item_id → stock_items.id

Invariantes:
- quantity_received > 0
- unit_cost >= 0

---

# 5. Estoque

## stock_movements
PK: id
FK: organization_id → organizations.id
FK opcional: source_location_id → stock_locations.id
FK opcional: destination_location_id → stock_locations.id
FK opcional: sector_id → sectors.id
FK opcional: responsible_user_id → users.id
FK opcional: responsible_employee_id → employees.id
FK opcional: reversal_of_movement_id → stock_movements.id

Campos de referência polimórfica podem ser implementados por `reference_type` + `reference_id` ou FKs específicas; decisão física posterior.

Invariantes gerais:
- status confirmado é imutável salvo metadados não materiais;
- movimentos que exigem origem devem ter source_location_id;
- movimentos que exigem destino devem ter destination_location_id;
- source != destination quando ambos existirem;
- reversal_of_movement_id não pode apontar para si mesmo;
- reversão deve conservar rastreabilidade do original.

## stock_movement_items
PK: id
FK: movement_id → stock_movements.id
FK: stock_item_id → stock_items.id
FK opcional: batch_id → inventory_batches.id

Invariantes:
- quantity > 0
- unit_cost_snapshot >= 0
- se batch_id existir, batch.stock_item_id = stock_item_id

## inventory_batches
PK: id
FK: stock_item_id → stock_items.id
FK: stock_location_id → stock_locations.id
FK opcional: goods_receipt_item_id → goods_receipt_items.id

Índices:
- stock_item_id + stock_location_id
- expiration_date

Invariantes:
- original_quantity > 0
- unit_cost >= 0
- expiration_date só é obrigatória para item configurado para rastrear validade

## inventory_balances
Read model/materialização.

Chave lógica/unique:
- stock_item_id + stock_location_id

Campos:
- quantity_on_hand
- average_cost
- last_rebuilt_at

Invariante crítica:
- pode ser descartada e reconstruída sem perda de informação transacional.

## transfers
PK: id
FK: source_location_id → stock_locations.id
FK: destination_location_id → stock_locations.id

Invariante:
- source_location_id != destination_location_id

## transfer_items
PK: id
FK: transfer_id → transfers.id
FK: stock_item_id → stock_items.id

Invariantes:
- requested_quantity > 0
- 0 <= dispatched_quantity <= requested_quantity ou exceção explicitamente auditada
- 0 <= received_quantity <= dispatched_quantity salvo divergência tratada

## loans
PK: id
FK: source_location_id → stock_locations.id
FK opcional: destination_location_id → stock_locations.id

## loan_items
PK: id
FK: loan_id → loans.id
FK: stock_item_id → stock_items.id

quantity_pending = quantity_loaned - sum(returns válidos)

## inventory_counts
PK: id
FK: stock_location_id → stock_locations.id

## inventory_count_lines
PK: id
FK: inventory_count_id → inventory_counts.id
FK: stock_item_id → stock_items.id

Unique lógico:
- inventory_count_id + stock_item_id

Diferença = counted_quantity - expected_quantity_snapshot.

## loss_reasons
PK: id
FK: organization_id → organizations.id

---

# 6. Financeiro

## payable_documents
PK: id
FK: organization_id → organizations.id
FK opcional: business_id → businesses.id
FK: unit_id → units.id
FK opcional: sector_id → sectors.id
FK: supplier_id → suppliers.id

Invariantes:
- total_amount >= 0
- setor, quando informado, pertence à unidade

Unique candidatos condicionais:
- supplier_id + access_key quando chave fiscal existir
- supplier_id + document_number + series + issued_at em documentos sem chave

## installments
PK: id
FK: payable_document_id → payable_documents.id

Unique:
- payable_document_id + installment_number

Invariantes:
- installment_number >= 1
- installment_count >= installment_number
- nominal_amount >= 0

## payments
PK: id
FK: installment_id → installments.id
FK opcional: payment_method_id → payment_methods.id
FK opcional: responsible_user_id → users.id
FK opcional: reversed_payment_id → payments.id

Invariantes:
- amount > 0 em pagamento normal
- juros/multa/desconto/ajuste usam valores >= 0 com semântica explícita
- estorno não apaga pagamento original

Saldo da parcela = nominal_amount + acréscimos - descontos/ajustes aplicáveis - pagamentos líquidos válidos.

## payment_instructions
PK: id
FK: installment_id ou payable_document_id conforme granularidade física escolhida

## payment_methods
PK: id
FK opcional: organization_id → organizations.id

---

# 7. Caixa

## cash_registers
PK: id
FK: unit_id → units.id

Unique:
- unit_id + code

## cash_sessions
PK: id
FK: cash_register_id → cash_registers.id
FK: unit_id → units.id

Unique candidato:
- cash_register_id + business_date + sequence

Invariante:
- cash_register.unit_id = cash_sessions.unit_id

## cash_movements
PK: id
FK: cash_session_id → cash_sessions.id

Invariantes:
- amount > 0
- type em inflow/withdrawal

## payment_method_totals
PK: id
FK: cash_session_id → cash_sessions.id
FK: payment_method_id → payment_methods.id

Unique:
- cash_session_id + payment_method_id

Invariantes:
- gross_amount >= 0
- fee_amount >= 0
- net_amount <= gross_amount salvo ajustes explicitamente modelados

## fee_rules
PK: id
FK: payment_method_id → payment_methods.id
FKs opcionais de escopo organization/business/unit

Regra temporal:
- a regra aplicável deve ser resolvida pela vigência e escopo mais específico.

---

# 8. Arquivos, auditoria e migração

## attachments
PK: id
FK: organization_id → organizations.id

Vínculo polimórfico ou tabela de links será decidido fisicamente.

Campos mínimos:
- storage_key
- original_filename
- mime_type
- size_bytes
- checksum

## audit_logs
PK: id
FK: organization_id → organizations.id
FK opcional: actor_user_id → users.id

Append-only.

## import_batches
PK: id
FK: organization_id → organizations.id

Unique:
- organization_id + source_file_hash + importer_version, se política de idempotência adotar essa combinação

## import_row_results
PK: id
FK: import_batch_id → import_batches.id

Unique candidato:
- import_batch_id + source_sheet + source_row

---

# 9. Regras de integridade transversais

1. Toda FK entre entidades escopadas precisa preservar a mesma Organization.
2. Business/Unit/Sector/StockLocation não podem cruzar Organizations.
3. Valores monetários não aceitam NaN/float; usar decimal exato.
4. Datas de negócio e timestamps são conceitos diferentes.
5. IDs externos/importados nunca substituem a PK interna.
6. Operações críticas devem aceitar chave de idempotência quando expostas por comando/API.
7. Campos derivados não são editáveis pelo usuário.
8. Estados devem ser alterados apenas por transições válidas do domínio.
9. Registros confirmados de estoque/financeiro/caixa não são apagados para corrigir erro; são estornados/revertidos.
10. Dados importados preservam referência de origem.

---

# 10. Read models previstos

Para dashboards e performance, o sistema poderá manter projeções reconstruíveis:

- inventory_balances
- inventory_value_by_location
- expiring_batches
- payable_status_summary
- supplier_spend_summary
- cash_daily_summary
- dashboard_attention_items

Esses read models nunca substituem os eventos/transações de origem.

---

# 11. Decisões físicas adiadas

Ainda não está decidido:
- Supabase ou outro provedor;
- ORM/query builder;
- nomes finais SQL;
- estratégia concreta de UUID/ULID;
- RLS física;
- mecanismo de filas/realtime;
- storage de anexos;
- materialized views versus tabelas de projeção;
- triggers versus serviços transacionais.

Essas escolhas devem respeitar este modelo, não redefini-lo.