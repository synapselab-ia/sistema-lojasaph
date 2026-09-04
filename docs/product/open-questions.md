# Questões Abertas para Validação

Data inicial: 2026-08-17  
Última triagem: 2026-09-04

Não preencher respostas por suposição. Perguntas resolvidas permanecem abaixo apenas como histórico e apontam para requisitos/regras consolidados.

---

# Resolvidas ou decididas na Fase 53

## Q-005 — Transferência e empréstimo precisam ser processos diferentes?

**Resolvida em 2026-09-03: sim.**

Empréstimo é processo distinto e deve controlar quantidade/valor emprestados, saldo pendente e restituição total/parcial por estoque e/ou valor.

Fonte consolidada: `REQ-STK-007`, `BR-STK-009`. Implementação: Issue #183.

## Q-007 — O sistema deverá controlar vendas ou apenas receber dados do sistema de vendas?

**Resolvida para a arquitetura atual em 2026-09-03 e refinada em 2026-09-04.**

O sistema de vendas utilizado é o **PDV Legal** e ele permanece como PDV. O Lojasaph não deve virar frente de caixa por inferência.

O Lojasaph, porém, poderá possuir catálogo comercial próprio para mapear produtos vendidos, preços, fichas técnicas e relatórios, além de importar dados do PDV Legal por mecanismo oficial quando viável.

Fonte consolidada: `REQ-ITEM-004`, `REQ-CASH-008`, `BR-ITEM-002`, `BR-CASH-008`. Issues #185, #188 e #189.

## Q-008 — Como o estoque deve ser custeado?

**Resolvida em 2026-09-04: por lote/camada física efetivamente movimentada.**

Se a quantidade perdida/saiu de uma camada adquirida por R$ 5, seu custo de saída é R$ 5; se saiu de uma camada adquirida por R$ 2, é R$ 2. Não substituir o custo real conhecido por custo médio ou última compra.

FEFO escolhe a camada quando não houver seleção física explícita. Quando a operação identifica um lote específico real, esse lote prevalece.

Casos legados/negativos sem camada de custo confiável ainda exigem fallback técnico explícito e auditável na Issue #187, mas **a regra empresarial de custeio não está mais aberta**.

Fonte consolidada: `REQ-STK-010`, `BR-STK-010`, `ADR-003-inventory-costing.md`. Implementação: Issue #187.

## Q-009 — O que é `Consumo Funcionários` no caixa?

**Resolvida em 2026-09-03.**

É venda atribuída ao funcionário e o valor é descontado na folha. Compõe faturamento, mas não deve ser tratado como recebimento imediato na gaveta. O Lojasaph não se torna sistema de folha/RH.

Fonte consolidada: `REQ-CASH-007`, `BR-CASH-006`. Implementação: Issue #184.

## Q-014 — Uma parcela pode receber pagamento parcial ou múltiplos pagamentos?

**Decidida para o primeiro go-live em 2026-09-03: não é necessário.**

Não ampliar o produto por esse comportamento agora. A capacidade técnica já existente pode permanecer.

Fonte consolidada: `REQ-FIN-004`, `BR-FIN-011`.

## Q-019 — Saída deve priorizar o lote que vence primeiro (FEFO)?

**Resolvida em 2026-09-03: sim; refinada em 2026-09-04.**

FEFO é regra empresarial aprovada quando não houver um lote físico específico identificado pela operação. Para perdas/quebras de lote conhecido, o lote real informado prevalece.

Fonte consolidada: `REQ-EXP-004`, `BR-EXP-004`.

---

# Questões históricas/de migração que não bloqueiam o desenho atual

## Q-006 — O `Gabarito` é o catálogo do sistema de vendas/POS?

A semântica histórica exata do `Gabarito` continua não comprovada.

Isso **não bloqueia** o desenho atual de catálogo comercial/ficha técnica. Não associar automaticamente `Gabarito` a `stock_items` nem a produtos vendáveis. Resolver somente se a migração ou o estudo do PDV Legal demonstrar que essa fonte precisa ser mapeada.

Refs: `REQ-ITEM-004`, `REQ-ITEM-005`, Issues #185/#188/#189.

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

A capacidade de **compor módulos do sistema** prevista na Issue #190 deve ficar inicialmente restrita a `owner` Organization-wide; não hardcode e-mail/ID pessoal.

### Q-023 — Fornecedor pode ter vários vendedores/contatos por categoria ou região?

O produto suporta múltiplos contatos; confirmar semântica adicional apenas se necessária à operação.

### Q-024 — Dias de pedido/entrega são fixos ou apenas referência?

Confirmar antes de qualquer automação/alerta baseado nessa agenda.

### Q-025 — Há pedido mínimo por fornecedor, produto ou condição de pagamento?

O produto já suporta condição comercial corrente; confirmar regra real para cadastro/cutover.

---

# Próxima ordem de validação

Q-008 está encerrada. Não perguntar novamente qual método de custeio usar.

1. implementar/reconciliar #187 — custeio por lote/camada no runtime;
2. implementar #183 — empréstimos usando o custo das camadas efetivamente emprestadas;
3. avançar #185 quando houver estrutura/amostra oficial de exportação do PDV Legal;
4. desenhar/implementar #188 e #189 sem duplicar POS nem baixa de estoque;
5. refinar #184 conforme a origem real das vendas/consumos;
6. mapear Q-022 antes de preparar usuários reais de go-live;
7. responder Q-001/Q-002/Q-003/Q-004 e demais questões históricas apenas no nível necessário à migração/cutover.
