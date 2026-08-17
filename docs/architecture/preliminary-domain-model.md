# Modelo de Domínio Preliminar

Data: 2026-08-17
Status: preliminar — derivado da engenharia reversa, sujeito às questões P0 em `docs/product/open-questions.md`.

Este documento identifica entidades e agregados prováveis. Não define ainda o schema físico do banco.

---

# 1. Organização

## Company

Entidade proprietária do sistema/operação.

## Unit

Unidade/loja/operação física ou administrativa.

Exemplos atuais dependem de validação: Tabatinga, Capricórnio e possivelmente Barba Negra.

## Sector

Área operacional dentro de uma unidade.

Evidências: Cozinha, Quiosque, Empório.

## StockLocation

Local físico/lógico onde estoque é controlado.

Deve ser separado de `Sector` porque um setor pode consumir itens de um estoque compartilhado e uma unidade pode possuir mais de um local de estoque.

---

# 2. Pessoas e acesso

## Employee

Pessoa operacional referenciada em retiradas, consumo interno ou outras ações.

## User

Identidade autenticada no sistema.

Nem todo funcionário precisa possuir login.

## Role / Permission / Scope

Controle de acesso por função e escopo de unidade/setor.

---

# 3. Catálogo

## StockItem

Item controlado fisicamente em estoque.

Atributos conceituais:

- nome canônico;
- categoria;
- unidade de medida;
- tipo do item;
- ativo/inativo;
- código interno;
- códigos de barras quando aplicáveis.

## ItemAlias

Mapeia nomes históricos/alternativos para um item canônico, principalmente durante migração.

## SalesItem — pendente

Produto vendido/cardápio/POS.

Só deve existir como entidade separada se Q-006 confirmar que o `Gabarito` é catálogo de vendas distinto do estoque.

## Recipe / BOM — futuro e pendente

Relacionamento entre produto vendido e insumos consumidos. Não implementar até existir necessidade confirmada de consumo teórico por vendas.

## ReusableItem / classificação de ativo — pendente

Mesas, cadeiras, guarda-sóis e outros itens retornáveis aparecem no mesmo fluxo de movimentação de consumíveis. A implementação pode ser uma classificação do `StockItem` ou um agregado separado, dependendo da regra operacional validada.

---

# 4. Fornecedores e compras

## Supplier

Cadastro canônico do fornecedor.

## SupplierContact

Múltiplos vendedores/contatos por fornecedor.

## SupplierTerms

Condições comerciais, como:

- pedido mínimo;
- agenda de pedido;
- agenda de entrega;
- condição/forma de pagamento.

## SupplierItem

Relação entre fornecedor e item adquirido.

Pode conter:

- unidade/embalagem de compra;
- quantidade por embalagem;
- código do fornecedor;
- preço atual derivado do histórico.

## SupplierPrice

Histórico de preços com vigência/data da observação ou compra.

## PurchaseOrder — fase posterior

Pedido de compra com itens e recebimentos.

---

# 5. Estoque

## StockMovement

Evento que explica uma alteração física de estoque.

Atributos conceituais:

- tipo;
- data/hora;
- origem;
- destino;
- responsável;
- motivo;
- observações;
- referência a operação de origem;
- status quando necessário.

## StockMovementItem

Item e quantidade dentro da movimentação.

Deve preservar custo relevante/snapshot quando necessário para auditoria.

## MovementType

Tipos candidatos derivados das planilhas:

- entrada de compra;
- retirada para setor/consumo;
- transferência;
- devolução;
- empréstimo;
- retorno de empréstimo;
- perda;
- vencimento;
- ajuste de inventário.

Lista final depende de validação.

## Transfer

Agregado ou especialização para movimentação entre locais/unidades que precisa de origem, destino e confirmação/retorno.

## Loan — pendente

Processo para itens temporariamente emprestados e esperados de volta.

## InventoryBatch

Quantidade identificável de um item com atributos de recebimento/validade/custo.

## InventoryBalance

Saldo deve ser consequência das movimentações/lotes, não um número editado arbitrariamente no cadastro do item.

A estratégia física definitiva será registrada em ADR na Fase 2.

## InventoryCount

Cabeçalho de inventário físico.

## InventoryCountLine

Item, saldo esperado, quantidade contada e diferença.

## LossReason

Motivo estruturado de perda/baixa.

---

# 6. Validades

Validade deve viver em `InventoryBatch` ou entidade equivalente.

Informações mínimas:

- item;
- local;
- quantidade;
- validade;
- quantidade remanescente;
- vínculo com recebimento quando disponível.

Alertas são derivados e não devem alterar o dado de origem.

---

# 7. Financeiro / Contas a pagar

## Invoice / PayableDocument

Documento financeiro do fornecedor.

Nome definitivo depende de quanto o cliente precisa controlar NFs formais versus outros títulos/despesas.

Atributos candidatos:

- fornecedor;
- número/documento;
- série/chave quando aplicável;
- emissão;
- unidade/setor;
- valor total;
- observações;
- anexos.

## Installment

Parcela do documento.

- número;
- total de parcelas;
- valor nominal;
- vencimento;
- status derivado.

## Payment

Evento financeiro explícito.

- parcela/documento;
- data;
- valor pago;
- método;
- juros;
- multa;
- desconto;
- ajuste;
- comprovante;
- responsável.

A cardinalidade entre parcela e pagamentos depende da Q-014.

## PaymentInstruction

Informação necessária para efetuar o pagamento, por exemplo linha/código/referência.

Não confundir com `Payment` realizado.

---

# 8. Caixa

## CashRegister

Identificação lógica/física de um caixa/terminal, se houver mais de um.

## CashSession / CashClosing

Operação de caixa associada a uma data/unidade/caixa e responsável.

Informações candidatas:

- abertura;
- fechamento;
- fundo inicial;
- totais por meio de pagamento;
- vendas brutas;
- taxas;
- valor esperado em dinheiro;
- valor contado;
- divergência;
- observação/aprovação.

## CashMovement

Entrada ou sangria ocorrida durante a sessão.

## PaymentMethodTotal

Total consolidado por forma de pagamento quando o sistema não possuir vendas individuais.

## FeeRule

Taxa aplicável a um meio/adquirente/período.

## EmployeeConsumption

Evento separado para consumo de funcionário, caso Q-009 confirme sua necessidade e tratamento.

---

# 9. Arquivos e auditoria

## Attachment

Infraestrutura genérica de anexos vinculáveis a documentos financeiros, pagamentos, recebimentos ou ocorrências.

## AuditLog

Histórico de ações críticas.

## ImportBatch

Execução de importação legada.

## ImportSourceReference

Rastreabilidade para arquivo, aba e linha de origem.

---

# 10. Relações conceituais principais

```text
Company
  └── Unit
      ├── Sector
      ├── StockLocation
      └── CashRegister

Supplier
  ├── SupplierContact
  ├── SupplierTerms
  └── SupplierItem
       └── SupplierPrice[]

StockItem
  ├── ItemAlias[]
  ├── InventoryBatch[]
  └── StockMovementItem[]

StockMovement
  └── StockMovementItem[]

Invoice/PayableDocument
  └── Installment[]
       └── Payment[]  (cardinalidade a validar)

CashSession
  ├── PaymentMethodTotal[]
  └── CashMovement[]
```

---

# Decisões que NÃO estão tomadas ainda

- Supabase;
- schema SQL definitivo;
- separação final entre SalesItem e StockItem;
- modelagem final de itens reutilizáveis;
- algoritmo definitivo de custeio;
- RLS/permissões físicas no banco;
- cardinalidade pagamento ↔ parcela;
- integração com POS/PDV;
- forma de conciliação financeira entre unidades;
- FEFO por validade.

Essas decisões serão tomadas após a validação das questões críticas e registradas em ADRs quando afetarem arquitetura.