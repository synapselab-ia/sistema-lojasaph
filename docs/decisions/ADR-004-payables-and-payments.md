# ADR-004 — Documento financeiro, parcelas e pagamentos

Data: 2026-08-17
Status: aceito

## Contexto

A planilha financeira atual mistura nota/documento, parcela, valor pago, vencimento, data de pagamento e referência Pix/Boleto na mesma linha. Isso dificulta parcelamento, pagamento parcial, anexos e auditoria.

## Decisão

### 1. Três conceitos separados

- `PayableDocument`: obrigação/documento de origem;
- `Installment`: parcela com valor nominal e vencimento;
- `Payment`: evento de pagamento efetivamente realizado.

### 2. Cardinalidade

Um PayableDocument possui uma ou mais Installments.

Uma Installment pode receber zero, um ou vários Payments.

Adotar N pagamentos por parcela desde o início evita remodelagem caso exista pagamento parcial, complemento, reprocessamento ou divisão entre meios.

### 3. Status derivado

Estados como `open`, `due_today`, `overdue`, `partially_paid` e `paid` são derivados de:
- vencimento;
- valor nominal;
- pagamentos válidos;
- cancelamentos/estornos.

Não são editados livremente.

### 4. Diferenças financeiras

Pagamento pode registrar componentes explícitos:
- juros;
- multa;
- desconto;
- ajuste.

A diferença entre valor nominal e efetivamente desembolsado não deve ser perdida em um único campo genérico.

### 5. Instrução de pagamento

Pix, linha digitável e outros dados usados para pagar pertencem a `PaymentInstruction`, separados do `Payment` já realizado.

### 6. Estorno

Pagamento confirmado não é apagado. Correção usa reversão vinculada ao evento original e auditoria.

### 7. Anexos

NF, XML, boleto, comprovante e outros documentos podem usar infraestrutura genérica `Attachment` relacionada ao documento/pagamento.

## Consequências

- parcelamento fica normalizado;
- pagamento parcial é suportado sem alteração estrutural;
- status são consistentes;
- referências de pagamento deixam de ser confundidas com forma de pagamento;
- auditoria e anexos ganham rastreabilidade.

## Fora do escopo desta decisão

- conciliação bancária;
- emissão de pagamentos pelo sistema;
- integração bancária/Open Finance;
- contabilidade formal.
