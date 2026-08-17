# Catálogo de Campos das Planilhas

Data: 2026-08-17

Este catálogo relaciona campos atuais com conceitos candidatos do novo sistema. Os nomes de destino são conceituais; não são ainda nomes definitivos de colunas do banco.

---

## Controle Retirada Tabatinga — Retirada para Capricórnio

| Campo atual | Tipo observado | Classificação | Conceito de destino | Observação |
|---|---|---|---|---|
| Data | data | entrada | movement_date | Há linhas sem data |
| checkbox sem título | booleano | entrada | pendente | Significado precisa ser validado |
| Produto | texto livre | entrada | stock_item_id | Exige normalização/alias |
| Fornecedor | texto livre | entrada | supplier_id opcional | Pode refletir origem do custo, não necessariamente da transferência |
| Quantidade | número | entrada | quantity | Há lacunas |
| Valor Custo Un. | moeda | entrada | unit_cost_snapshot | Muitos registros sem custo |
| Valor | moeda | cálculo | total_cost | quantidade × custo unitário |
| Observações | texto | entrada | notes / movement_reason | Hoje contém regras que devem virar campos estruturados |

## Controle Retirada Tabatinga — Devolução

| Campo atual | Tipo observado | Classificação | Conceito de destino | Observação |
|---|---|---|---|---|
| Data | data | entrada | return_date | Há linhas sem data |
| checkbox sem título | booleano | entrada | pendente | Significado precisa ser validado |
| Produto | texto livre | entrada | stock_item_id | Deve ser vinculado à saída original quando possível |
| Fornecedor | texto livre | entrada | supplier_id opcional | Pouco preenchido |
| Quantidade | número | entrada | quantity | |
| Valor | moeda | entrada/cálculo | returned_value | Sem custo unitário separado |
| Observações | texto | entrada | notes / return_reason | Inclui `devolveu`, `emprestou`, pagamento etc. |

## Resumo Tabatinga ↔ Capricórnio

| Campo atual | Classificação | Destino |
|---|---|---|
| Valor total retirado | cálculo | relatório |
| Valor total devolvido | cálculo | relatório |
| Valor total em haver | cálculo | relatório/financeiro pendente de validação |

---

# Retiradas Cozinha/Quiosque/Empório

## Gabarito

| Campo atual | Tipo | Classificação | Conceito candidato |
|---|---|---|---|
| Cod | inteiro | dado mestre | sales_item.external_code ou item.external_code |
| Descricao | texto | dado mestre | name |
| Grupo | texto | dado mestre | category |
| Status | texto | dado mestre | active/status |
| Unidade | texto | dado mestre | unit_of_measure |
| EAN | texto | dado mestre | barcode |
| NCM | texto | dado mestre | tax_ncm |
| Cest | texto | dado mestre | tax_cest |
| Preco | moeda | dado mestre | sale_price |
| Custo | moeda | dado mestre | current/reference_cost |

**Atenção:** destino definitivo depende da validação de que `Gabarito` representa produtos de venda/POS.

## Abas de retirada por setor/mês

| Campo atual | Tipo | Classificação | Conceito de destino |
|---|---|---|---|
| Data | data | entrada | occurred_at/date |
| Produto | texto livre | entrada | stock_item_id |
| Valor custo Un. | moeda | entrada | unit_cost_snapshot |
| Quantidade | número | entrada | quantity |
| Valor custo total | moeda | cálculo | total_cost |
| Nome | texto livre | entrada | employee_id / actor_id |
| Observações | texto | entrada | notes |
| Retirada mensal | moeda | cálculo | relatório por período |
| nome da aba | texto implícito | configuração inadequada | sector_id + período derivado da data |

---

# Caixa Empório

| Campo atual | Tipo | Classificação | Conceito de destino |
|---|---|---|---|
| Dia N | texto implícito | entrada inadequada | business_date |
| Crédito | moeda | entrada | payment_total.credit |
| Débito | moeda | entrada | payment_total.debit |
| Pix | moeda | entrada | payment_total.pix |
| Dinheiro | moeda | entrada | payment_total.cash |
| Voucher | moeda | modelo/pendente | payment_total.voucher |
| Faturamento dia | moeda | cálculo | gross_sales |
| Faturamento c/ taxa | moeda | cálculo | net_sales_after_fees |
| Fundo de caixa | moeda | entrada | opening_float |
| Entrada | moeda | entrada | cash_in_movements |
| Sangria | moeda | entrada | cash_out_movements |
| Encerramento de caixa | moeda | cálculo atual | expected_cash |
| Taxa crédito | percentual | configuração | fee_rule |
| Taxa débito | percentual | configuração | fee_rule |
| Total taxas | moeda | cálculo | fees_total |
| Consumo Funcionários | moeda | entrada agregada | employee_consumption transactions |
| Freelancer | texto/valor | pendente | pendente de validação |

Campos que o sistema deverá acrescentar embora não existam claramente na planilha:

- unidade;
- caixa/terminal;
- responsável;
- horário de abertura/fechamento;
- valor contado;
- divergência;
- motivo de divergência;
- auditoria.

---

# Controle de NFs

## Lista

| Campo atual | Tipo observado | Classificação | Conceito de destino |
|---|---|---|---|
| Descrição | texto | entrada | sector_id |
| Empresa | texto | entrada repetida | supplier_id |
| CNPJ | texto | entrada repetida | supplier.tax_id |
| Parcela | formatação `n/total` | entrada | installment_number + installment_count |
| Valor | moeda | entrada | installment.amount_due |
| Valor Pago | moeda | entrada | payment.amount |
| Vencimento | data | entrada | installment.due_date |
| Dias até o vencimento | texto/fórmula | cálculo | não armazenar; derivar |
| Status | símbolo/fórmula | cálculo | não editar diretamente; derivar |
| Data de Pagamento | data/texto especial | entrada | payment.paid_at |
| Data de emissão | data | entrada | invoice.issue_date |
| Pix/Boleto | texto/código | entrada | payment_instruction/reference |

Campos ausentes que devem ser investigados para o sistema:

- número da NF/documento;
- série;
- chave de acesso;
- data de competência, se necessária;
- unidade além de setor;
- fornecedor canônico;
- anexos;
- forma de pagamento explícita;
- juros/multa/desconto/ajuste;
- comprovante;
- identificador da importação.

## Visualização Organizada

Todos os campos são derivados da `Lista`. Não criar tabela de persistência equivalente.

## Dados

Agregações para dashboard. Não criar fonte transacional equivalente.

## Dashboard

Filtros e KPIs derivados. Não criar tabela transacional equivalente.

---

# Validades

| Campo atual | Tipo | Classificação | Conceito de destino |
|---|---|---|---|
| Produto | texto | entrada | stock_item_id |
| Quantidade | número | entrada | batch_quantity |
| Validade | data | entrada | expires_at |

Campos necessários no novo sistema:

- lote/identificador da entrada;
- local de estoque;
- fornecedor/recebimento quando aplicável;
- quantidade inicial;
- quantidade remanescente;
- status;
- histórico de movimentação.

---

# Fornecedores Tabatinga

## Dados comerciais

| Campo atual | Tipo | Classificação | Conceito de destino |
|---|---|---|---|
| Fornecedor | texto | mestre | supplier.name |
| Vendedor | texto | mestre | supplier_contact.name |
| Contato | texto | mestre | supplier_contact.phone/contact |
| Valor mínimo | moeda | mestre | minimum_order_value |
| Pedido dia | texto/dia | mestre | ordering_schedule |
| Entrega dia | texto/dia | mestre | delivery_schedule |
| Forma de pag. | texto | mestre | payment_terms |
| Observações | texto | mestre | notes |
| Tipo de produtos | texto | mestre | categories/notes |

## Catálogo por fornecedor

| Campo atual | Tipo | Classificação | Conceito de destino |
|---|---|---|---|
| Produto | texto | mestre | supplier_item.stock_item_id |
| Medida | texto | mestre | purchase_unit |
| Quantidade | número | mestre | pack_quantity |
| Valor | moeda | mestre/histórico | package_price |
| Valor Un. | moeda | cálculo/mestre | unit_price |

---

# Campos de migração que o novo sistema deve manter

Independentemente do módulo, importações legadas devem registrar metadados como:

- `import_batch_id`;
- `source_file`;
- `source_sheet`;
- `source_row`;
- `source_raw_identifier` quando aplicável;
- data/hora da importação;
- regra de transformação usada;
- eventuais alertas de qualidade.

Esses metadados permitem auditoria e correção sem manter os arquivos operacionais reais dentro do GitHub.