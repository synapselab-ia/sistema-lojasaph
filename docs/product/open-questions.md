# Questões Abertas para Validação

Data: 2026-08-17

Estas perguntas existem porque as planilhas não fornecem evidência suficiente para uma decisão segura. Não preencher respostas por suposição.

## Prioridade P0 — bloqueiam o modelo de domínio

### Q-001 — O que são Tabatinga, Capricórnio e Barba Negra?

Precisamos confirmar se são:

- lojas/unidades da mesma empresa;
- empresas diferentes;
- estoques/localizações;
- operações parceiras;
- outra estrutura.

**Impacto:** organização, permissões, estoque, financeiro e transferências.

### Q-002 — Cozinha, Quiosque e Empório são setores ou operações independentes?

Precisamos saber se pertencem à mesma unidade e compartilham estoque/financeiro ou se possuem gestão separada.

**Impacto:** estrutura Empresa → Unidade → Setor → Local de estoque.

### Q-003 — O que significa a coluna de checkbox sem título na planilha Tabatinga ↔ Capricórnio?

Ela aparece tanto em retirada quanto em devolução e parece estar relacionada a alguma confirmação/acerto.

**Impacto:** migração e status de movimentações.

### Q-004 — O que significa `Valor total em haver`?

A fórmula é valor retirado menos valor devolvido, mas precisamos saber se representa:

- dinheiro que uma unidade deve à outra;
- crédito interno;
- mercadoria pendente de devolução;
- simples controle gerencial;
- outro conceito.

**Impacto:** decidir se transferência possui componente financeiro.

### Q-005 — Transferência e empréstimo precisam ser processos diferentes?

Há itens descritos como emprestados para evento e posteriormente devolvidos, inclusive equipamentos reutilizáveis.

Precisamos confirmar se o sistema deve controlar:

- empréstimo com quantidade pendente de retorno;
- transferência definitiva;
- devolução parcial;
- previsão/data de devolução.

**Impacto:** modelo de movimentação.

### Q-006 — O `Gabarito` é o catálogo do sistema de vendas/POS?

O `Gabarito` contém código, preço, EAN, NCM e CEST, mas os nomes não correspondem aos itens usados nas retiradas.

Precisamos confirmar se existem dois conceitos:

1. produto vendido/cardápio;
2. insumo/item de estoque.

**Impacto:** cadastro de itens e eventual necessidade futura de ficha técnica/receita.

### Q-007 — O sistema deverá controlar vendas ou apenas receber os totais do caixa?

Hoje o caixa recebe totais diários por forma de pagamento. Precisamos saber se no futuro o Sistema Lojasaph:

- continuará recebendo totais manualmente;
- importará dados do sistema de vendas;
- integrará com POS/PDV;
- controlará as vendas individualmente.

**Impacto:** escopo do caixa e integração futura.

### Q-008 — Como o estoque deve ser custeado?

As retiradas possuem custo unitário, mas muitos lançamentos estão sem custo.

Precisamos escolher posteriormente entre regras como:

- custo da última compra;
- custo médio ponderado;
- custo do lote específico;
- outro método usado pelo cliente.

**Impacto:** estoque, perdas, retiradas, margem e relatórios.

---

## Prioridade P1 — bloqueiam detalhes importantes

### Q-009 — O que é `Consumo Funcionários` no caixa?

Precisamos saber se:

- é consumo gratuito;
- é venda ao funcionário;
- é descontado posteriormente;
- deve compor faturamento;
- precisa identificar funcionário e itens consumidos.

### Q-010 — O encerramento de caixa atual representa valor esperado ou dinheiro contado?

A fórmula atual calcula dinheiro + fundo + entradas - sangrias.

Precisamos saber como o funcionário faz a conferência física e como diferenças são tratadas.

### Q-011 — Voucher ainda é utilizado?

A aba MODELO possui Voucher, mas as abas mensais atuais não.

### Q-012 — Taxas de cartão são fixas ou variam?

Precisamos saber se variam por:

- adquirente;
- bandeira;
- crédito/débito;
- número de parcelas;
- período/contrato.

### Q-013 — Cada linha do controle de NFs representa uma parcela de uma mesma nota?

Precisamos confirmar como identificar a nota original e se existe:

- número da NF;
- chave de acesso;
- série;
- XML/PDF.

### Q-014 — Uma parcela pode receber pagamento parcial ou múltiplos pagamentos?

Hoje existe apenas uma Data de Pagamento e um Valor Pago por linha.

**Impacto:** decidir entre pagamento 1:1 ou N:N com parcela.

### Q-015 — Quando `Valor Pago` é diferente de `Valor`, o que a diferença representa?

Pode ser juros, multa, desconto, taxa ou ajuste. Há diferenças positivas e negativas nos dados atuais.

### Q-016 — O campo `Pix/Boleto` deve guardar exatamente o quê?

Há sequências longas compatíveis com códigos/linhas de pagamento. Precisamos saber quais tipos de informação são colocados ali.

### Q-017 — Qual é a regra de `Checar data`?

A planilha financeira possui estado especial relacionado à data de pagamento. Precisamos entender quando e por quem ele é usado.

---

## Prioridade P2 — refinamento operacional

### Q-018 — Validade é cadastrada no recebimento da compra?

Precisamos definir o momento do fluxo em que lote e validade entram no sistema.

### Q-019 — Saída deve priorizar o lote que vence primeiro (FEFO)?

Se sim, o sistema deverá sugerir/controlar lote por validade.

### Q-020 — Qual antecedência de alerta de validade é desejada?

Exemplos: 7, 15, 30 dias. Idealmente configurável.

### Q-021 — Estoque negativo será permitido?

Recomendação inicial: não permitir por padrão, com eventual ajuste autorizado. Precisa de validação operacional.

### Q-022 — Quem pode fazer cada ação?

Precisamos posteriormente mapear perfis reais, por exemplo:

- proprietário;
- gerente;
- estoque;
- financeiro;
- caixa;
- consulta.

### Q-023 — Fornecedor pode ter vários vendedores/contatos por categoria ou região?

A planilha já demonstra múltiplos contatos para alguns fornecedores.

### Q-024 — Dias de pedido/entrega são fixos ou apenas referência?

Impacta alertas e sugestão de compra.

### Q-025 — Há pedido mínimo por fornecedor, produto ou condição de pagamento?

O modelo atual prevê valor mínimo, mas é necessário confirmar a regra real.

---

# Como validar

Não é necessário responder tudo em uma reunião única.

A ordem recomendada é:

1. responder Q-001 a Q-008;
2. formalizar o modelo de domínio inicial;
3. responder Q-009 a Q-017 durante desenho dos módulos Caixa e Financeiro;
4. responder Q-018 a Q-025 antes dos módulos avançados de estoque/compras.

Toda resposta validada deve migrar deste arquivo para `business-rules.md`, requisitos ou ADR apropriado.