# Questões Abertas para Validação

Data inicial: 2026-08-17  
Última triagem: 2026-09-03

Não preencher respostas por suposição. Perguntas resolvidas permanecem abaixo apenas como histórico e apontam para requisitos/regras consolidados.

---

# Resolvidas ou decididas na Fase 53

## Q-005 — Transferência e empréstimo precisam ser processos diferentes?

**Resolvida em 2026-09-03: sim.**

Empréstimo é processo distinto e deve controlar quantidade/valor emprestados, saldo pendente e restituição total/parcial por estoque e/ou valor.

Fonte consolidada: `REQ-STK-007`, `BR-STK-009`. Implementação: Issue #183.

## Q-007 — O sistema deverá controlar vendas ou apenas receber dados do sistema de vendas?

**Resolvida para o primeiro go-live em 2026-09-03.**

O sistema de vendas utilizado é o **PDV Legal**. O Lojasaph não precisa virar POS próprio agora. Foi aprovado estudar intercâmbio/importação de dados do PDV Legal, começando por mecanismos oficiais/exportações disponíveis e sem assumir API direta.

Fonte consolidada: `REQ-CASH-008`, `BR-CASH-008`. Estudo: Issue #185.

## Q-009 — O que é `Consumo Funcionários` no caixa?

**Resolvida em 2026-09-03.**

É venda atribuída ao funcionário e o valor é descontado na folha. Compõe faturamento, mas não deve ser tratado como recebimento imediato na gaveta. O Lojasaph não se torna sistema de folha/RH.

Fonte consolidada: `REQ-CASH-007`, `BR-CASH-006`. Implementação: Issue #184.

## Q-014 — Uma parcela pode receber pagamento parcial ou múltiplos pagamentos?

**Decidida para o primeiro go-live em 2026-09-03: não é necessário.**

Não ampliar o produto por esse comportamento agora. A capacidade técnica já existente pode permanecer.

Fonte consolidada: `REQ-FIN-004`, `BR-FIN-011`.

## Q-019 — Saída deve priorizar o lote que vence primeiro (FEFO)?

**Resolvida em 2026-09-03: sim.**

FEFO passa a ser regra empresarial aprovada.

Fonte consolidada: `REQ-EXP-004`, `BR-EXP-004`.

---

# Decididas como adiadas para o primeiro go-live

## Q-006 — O `Gabarito` é o catálogo do sistema de vendas/POS?

A semântica histórica exata do `Gabarito` continua não comprovada, mas **não bloqueia o primeiro go-live**: produto de venda/POS separado e ficha técnica foram explicitamente adiados em 2026-09-03.

Não associar automaticamente `Gabarito` a `stock_items`. Retomar somente se o estudo/importação do PDV Legal exigir esse mapeamento.

Refs: `REQ-ITEM-004`, `REQ-ITEM-005`, `BR-ITEM-002`, `BR-ITEM-004`, Issue #185.

---

# Ainda abertas

## Prioridade P0 / modelo e migração

### Q-001 — O que são Tabatinga, Capricórnio e Barba Negra?

Confirmar se são unidades, empresas, estoques/localizações, operações parceiras ou outra estrutura.

**Impacto:** organização, permissões, estoque, financeiro, migração e transferências.

### Q-002 — Cozinha, Quiosque e Empório são setores ou operações independentes?

Confirmar relação com unidades e compartilhamento de estoque/financeiro.

### Q-003 — O que significa a coluna de checkbox sem título na planilha Tabatinga ↔ Capricórnio?

Necessário para migração do campo, não para inventar regra no produto.

### Q-004 — O que significa `Valor total em haver`?

A fórmula histórica é valor retirado menos valor devolvido. A aprovação do novo processo de empréstimo não prova que todas as linhas históricas de `em haver` tenham exatamente essa semântica.

### Q-008 — Como o estoque deve ser custeado?

**Obrigatoriedade resolvida; método continua aberto.**

Em 2026-09-03 o operador confirmou que custeio é necessário. Ainda deve escolher explicitamente entre custo médio, última compra, lote específico ou outro método operacional comprovado.

**Impacto:** estoque, perdas, retiradas, empréstimos, margem e relatórios.

---

## Prioridade P1 — detalhes financeiros/caixa

### Q-010 — O encerramento de caixa atual representa valor esperado ou dinheiro contado?

O produto já separa esperado x contado; manter a pergunta apenas para interpretação/migração dos dados históricos quando necessário.

### Q-011 — Voucher ainda é utilizado?

Confirmar se é meio efetivamente utilizado na operação escolhida.

### Q-012 — Taxas de cartão são fixas ou variam?

Confirmar variação por adquirente, bandeira, crédito/débito, parcelas ou contrato quando necessário configurar dados reais.

### Q-013 — Cada linha do controle de NFs representa uma parcela de uma mesma nota?

Confirmar semântica da fonte real para migração.

### Q-015 — Quando `Valor Pago` é diferente de `Valor`, o que a diferença representa?

Pode ser juros, multa, desconto, taxa ou ajuste. Não classificar por inferência.

### Q-016 — O campo `Pix/Boleto` deve guardar exatamente o quê?

Necessário principalmente para migração/mapeamento da referência histórica.

### Q-017 — Qual é a regra de `Checar data`?

Necessário para interpretar/migrar o estado histórico, não para criar status manual no produto sem regra.

---

## Prioridade P2 — refinamento operacional e go-live

### Q-018 — Validade é cadastrada no recebimento da compra?

Definir o momento operacional quando dados reais forem homologados.

### Q-020 — Qual antecedência de alerta de validade é desejada?

O produto suporta horizontes; escolher padrão/configuração real para go-live.

### Q-021 — Estoque negativo será permitido?

Confirmar política real por operação/local antes de configurar dados finais.

### Q-022 — Quem pode fazer cada ação?

**Continua prioritária para o go-live.**

Mapear pessoas/cargos reais às capacidades técnicas existentes sem assumir equivalência automática entre cargo e role (`owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier`, `viewer`).

### Q-023 — Fornecedor pode ter vários vendedores/contatos por categoria ou região?

O produto suporta múltiplos contatos; confirmar semântica adicional apenas se necessária à operação.

### Q-024 — Dias de pedido/entrega são fixos ou apenas referência?

Confirmar antes de qualquer automação/alerta baseado nessa agenda.

### Q-025 — Há pedido mínimo por fornecedor, produto ou condição de pagamento?

O produto já suporta condição comercial corrente; confirmar regra real para cadastro/cutover.

---

# Próxima ordem de validação

1. escolher Q-008 — método de custeio;
2. mapear Q-022 — perfis/pessoas reais;
3. responder Q-001/Q-002/Q-003/Q-004 somente no nível necessário à migração das fontes;
4. resolver detalhes de #183/#184/#185 antes das respectivas implementações;
5. demais perguntas podem ser respondidas durante homologação com dados representativos e preparação de cutover.
