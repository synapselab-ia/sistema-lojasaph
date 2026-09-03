# Fase 53 — decisões de negócio

Data: 2026-09-03  
Issue: #181

## Objetivo

Registrar somente decisões explicitamente fornecidas pelo operador e separar o que está aprovado, deferido, ainda depende de definição e exige implementação própria.

## Decisões recebidas

| Requisito | Decisão | Consequência |
| --- | --- | --- |
| `REQ-ITEM-004` — produto de venda/POS separado | **adiado** | PDV Legal continua sendo o sistema de vendas; não criar catálogo de venda próprio no primeiro go-live |
| `REQ-ITEM-005` — ficha técnica/receita | **adiado** | não bloquear primeiro go-live por BOM/consumo teórico |
| `REQ-STK-007` — empréstimo | **necessário** | processo distinto de transferência, com valor e restituição total/parcial por estoque e/ou valor; Issue #183 |
| `REQ-STK-010` — custeio | **necessário, método ainda não escolhido** | não assumir última compra, custo médio ou lote até nova decisão |
| `REQ-EXP-004` — FEFO | **aprovado** | priorizar o lote que vence primeiro; o núcleo técnico já aplica FEFO em saídas compatíveis |
| `REQ-FIN-004` — pagamento parcial/múltiplo | **não necessário para o primeiro go-live** | não ampliar UX específica; capacidade técnica já existente pode permanecer |
| `REQ-CASH-007` — consumo de funcionários | **necessário** | é venda atribuída ao funcionário e descontada em folha; Issue #184 |
| `REQ-CASH-008` — integração com vendas/POS | **estudo aprovado** | PDV Legal permanece como PDV; estudar importação/exportação, sem assumir API direta; Issue #185 |

## Empréstimos — regra aprovada

O empréstimo precisa registrar valor do que foi emprestado e manter saldo pendente. A restituição pode ocorrer de forma total ou parcial por:

- devolução física ao estoque;
- restituição em valor;
- combinação de estoque e valor.

Toda restituição deve permanecer vinculada ao empréstimo original e ser auditável. O método usado para determinar o valor/custo de referência ainda depende da decisão de custeio.

## Custeio — decisão incompleta por definição

O operador confirmou que **o sistema precisa de custeio**, mas não escolheu ainda o método.

Opções não devem ser inferidas. A próxima decisão deve escolher explicitamente, por exemplo:

- custo médio ponderado/móvel;
- custo da última compra;
- custo do lote específico;
- outro método operacional comprovado.

O runtime atual já usa custo médio em partes relevantes do estoque, mas isso é evidência técnica, não aprovação da regra empresarial.

## FEFO — regra aprovada

A saída deve priorizar o lote com vencimento mais próximo quando houver lotes comparáveis. `REQ-EXP-004` deixa de ser PENDING.

A implementação atual de estoque já utiliza FEFO no núcleo de saídas e inventário negativo compatíveis; a Fase 53 não exige alteração de schema apenas para registrar a decisão.

## Pagamento parcial/múltiplo

O operador respondeu que esse comportamento **não é necessário para o primeiro go-live**.

O modelo financeiro já aceita múltiplos eventos de pagamento por parcela. Essa capacidade não precisa ser removida, mas também não deve provocar expansão funcional específica sem nova necessidade.

## Consumo de funcionários

Regra aprovada:

> consumo de funcionário entra como venda, mas o valor é descontado na folha.

Consequências mínimas:

- precisa identificar o funcionário;
- compõe venda/faturamento;
- não representa entrada imediata na gaveta/meio de pagamento;
- deve fornecer valor rastreável para o processo de desconto em folha.

Isso **não** aprova um módulo de folha/RH. Origem do lançamento, granularidade por item e eventual baixa de “descontado em folha” ainda devem ser definidos na Issue #184.

## PDV Legal — pesquisa inicial

O operador informou que o sistema de vendas utilizado é o PDV Legal.

A documentação pública oficial consultada em 2026-09-03 mostra:

- exportação Excel de relatórios de vendas, inclusive Produtos Vendidos por Filial;
- exportação Excel de cadastros, estoque e tabelas de preço;
- integrações oficiais com ERPs selecionados;
- canal comercial para sistemas que não aparecem na lista de integrações.

Não foi encontrada documentação pública suficiente para afirmar uma API aberta para integração customizada do Lojasaph.

Direção conservadora aprovada para estudo: **começar por arquivo Excel/CSV exportado**, usando staging/dry-run/idempotência do Lojasaph, e investigar API/integrador somente se houver documentação/contrato oficial.

Issue: #185.

## Itens que permanecem para a Fase 53

1. escolher o método final de custeio (`REQ-STK-010` / Q-008);
2. mapear Q-022 — pessoas/cargos reais para as capacidades técnicas;
3. responder apenas as perguntas adicionais necessárias às Issues #183/#184/#185;
4. não retomar #75/#121;
5. não executar migração/cutover antes dessas decisões e homologação com dados representativos.
