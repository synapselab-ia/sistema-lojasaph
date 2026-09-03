# Regras de Negócio — Evidências das Planilhas e Decisões Validadas

Data da análise inicial: 2026-08-17  
Última validação de negócio: 2026-09-03

## Níveis de confiança

- **Confirmada pela estrutura/fórmula**: regra implementada explicitamente na planilha atual.
- **Evidência forte**: comportamento aparece repetidamente, mas o significado empresarial precisa ser confirmado.
- **Decisão validada**: resposta explicitamente fornecida pelo operador/cliente.
- **Pendente**: não existe informação suficiente para afirmar a regra.

---

# Organização

## BR-ORG-001 — Setores operacionais reutilizáveis

**Nível:** evidência forte.

Cozinha, Quiosque e Empório aparecem em diferentes controles. No novo sistema devem ser referências estruturadas e reutilizáveis, não textos livres repetidos.

## BR-ORG-002 — Múltiplos locais/unidades

**Nível:** evidência forte.

Tabatinga e Capricórnio são origem/destino de movimentações. Há também referência textual a Barba Negra. A arquitetura deve permitir quantidade variável de unidades/locais.

---

# Itens e catálogo

## BR-ITEM-001 — Itens de retirada exigem cadastro canônico

**Nível:** evidência forte.

Os lançamentos atuais utilizam texto livre e apresentam variações de grafia. No novo sistema o item operacional deve possuir identificador estável.

## BR-ITEM-002 — Produto de venda/POS não entra no primeiro go-live

**Nível:** decisão validada em 2026-09-03.

O operador decidiu adiar o conceito próprio de produto de venda/POS no Lojasaph. O PDV Legal permanece como sistema de vendas. A distinção conceitual entre produto vendido e item de estoque pode ser retomada se a importação do PDV exigir mapeamento explícito.

Isso não autoriza associar automaticamente o histórico `Gabarito` a `stock_items`.

## BR-ITEM-003 — Aliases devem ser suportados na migração

**Nível:** evidência forte.

Variações de grafia e abreviações precisam ser mapeadas para um item canônico sem apagar o texto histórico de origem.

## BR-ITEM-004 — Ficha técnica/receita adiada

**Nível:** decisão validada em 2026-09-03.

Ficha técnica/BOM e consumo teórico derivado de vendas não bloqueiam o primeiro go-live. Retomar somente se surgir necessidade operacional explícita.

---

# Retiradas, estoque, transferências e empréstimos

## BR-STK-001 — Custo total de uma retirada

**Nível:** confirmada pela fórmula.

`custo_total = custo_unitario × quantidade`.

No sistema o custo deve ser derivado da regra de custeio aprovada, e não digitado arbitrariamente em cada retirada.

## BR-STK-002 — Total mensal atual

**Nível:** confirmada pela fórmula.

A planilha soma o custo total das retiradas do setor no mês. No sistema isso deve ser consulta por período, não campo armazenado em aba mensal.

## BR-STK-003 — Transferência precisa de origem e destino

**Nível:** evidência forte.

Movimentos Tabatinga → Capricórnio e retornos demonstram necessidade de origem e destino explícitos.

## BR-STK-004 — Retorno deve poder ser relacionado ao movimento original

**Nível:** evidência forte.

O sistema deve relacionar retorno/devolução ao movimento anterior quando aplicável.

## BR-STK-005 — Existem motivos diferentes de movimentação

**Nível:** evidência forte.

As observações evidenciam abastecimento/retirada, transferência, devolução, empréstimo, evento, proximidade de vencimento, vencimento/substituição e acertos. Esses motivos não devem depender apenas de observação textual.

## BR-STK-006 — Consumíveis e itens reutilizáveis coexistem

**Nível:** evidência forte.

As movimentações incluem alimentos/bebidas e bens reutilizáveis como mesas, cadeiras e guarda-sóis.

## BR-STK-007 — Saldo/acerto `em haver`

**Nível:** confirmada pela fórmula quanto ao cálculo; significado histórico ainda pendente.

A planilha calcula `em_haver = valor_retirado - valor_devolvido`. A regra de empréstimo aprovada não autoriza assumir que toda ocorrência histórica de `em haver` representa exatamente o mesmo processo.

## BR-STK-008 — Checkbox sem título

**Nível:** pendente.

Existe coluna booleana sem cabeçalho ao lado da data em retirada e devolução. Seu significado deve ser confirmado antes da migração.

## BR-STK-009 — Empréstimo é processo distinto com restituição física e/ou monetária

**Nível:** decisão validada em 2026-09-03.

O empréstimo deve registrar quantidade e valor do que foi emprestado e manter saldo pendente. A restituição pode ocorrer total ou parcialmente por:

- retorno físico ao estoque;
- restituição em valor;
- combinação das duas formas.

As restituições permanecem relacionadas ao empréstimo original e não apagam o histórico. O valor/custo de referência depende da regra final de custeio. Implementação: Issue #183.

## BR-STK-010 — Custeio é obrigatório, método ainda não aprovado

**Nível:** decisão parcialmente validada em 2026-09-03.

O operador confirmou que o sistema precisa de custeio. Ainda falta escolher explicitamente o método. Não promover custo médio, última compra ou lote específico a regra empresarial apenas porque existe comportamento técnico atual.

---

# Validade e lotes

## BR-EXP-001 — Validade pertence a uma quantidade específica

**Nível:** evidência forte.

O mesmo item pode necessitar múltiplos registros de validade.

## BR-EXP-002 — Validade deve ser modelada por lote/entrada/local

**Nível:** decisão de projeto derivada da necessidade.

Não armazenar uma única validade diretamente no cadastro do item.

## BR-EXP-003 — Movimentação por proximidade de vencimento

**Nível:** evidência forte.

O sistema deve preservar motivo e rastreabilidade de movimentações por proximidade de vencimento.

## BR-EXP-004 — FEFO aprovado

**Nível:** decisão validada em 2026-09-03.

Quando houver lotes comparáveis, a saída deve priorizar o lote que vence primeiro. A implementação técnica existente que usa FEFO deixa de ser apenas decisão interna e passa a refletir regra empresarial aprovada.

---

# Caixa e vendas

## BR-CASH-001 — Faturamento diário bruto

**Nível:** confirmada pela fórmula histórica.

Nas abas mensais analisadas: `faturamento_bruto = credito + debito + pix + dinheiro`. Evoluções devem distinguir faturamento de entrada física na gaveta.

## BR-CASH-002 — Faturamento líquido de taxas

**Nível:** confirmada pela fórmula atual.

Taxas devem ser configuráveis/versionadas; não hardcoded.

## BR-CASH-003 — Encerramento de dinheiro

**Nível:** confirmada pela fórmula atual.

`encerramento = dinheiro + fundo_de_caixa + entradas - sangrias`.

## BR-CASH-004 — Fundo inicial precisa ser registrado por sessão/data

**Nível:** evidência forte.

O fundo varia por dia e é parte do cálculo de encerramento.

## BR-CASH-005 — Entrada e sangria são eventos próprios

**Nível:** decisão de projeto derivada da estrutura atual.

Registrar movimentos de entrada/sangria com valor, motivo, horário e responsável.

## BR-CASH-006 — Consumo de funcionários é venda com desconto em folha

**Nível:** decisão validada em 2026-09-03.

Consumo de funcionário:

- é venda, não cortesia;
- deve ser atribuível ao funcionário;
- compõe faturamento;
- não é entrada imediata na gaveta/meio de pagamento;
- gera valor que será descontado no processo de folha.

O Lojasaph não se torna sistema de folha/RH. Deve fornecer registro e informação rastreável para o processo externo. Implementação: Issue #184.

## BR-CASH-007 — Fechamento profissional deve ter esperado x contado

**Nível:** decisão de projeto.

Separar valor esperado do contado para gerar divergência auditável.

## BR-CASH-008 — PDV Legal permanece como sistema de vendas

**Nível:** decisão validada em 2026-09-03.

O primeiro go-live não exige POS próprio no Lojasaph. Deve-se estudar intercâmbio de dados com o PDV Legal. A direção inicial é importação por exportações oficiais Excel/CSV; integração direta/API só pode ser adotada se houver mecanismo oficial comprovado. Estudo: Issue #185.

---

# Notas, contas e pagamentos

## BR-FIN-001 — Setor responsável

**Nível:** evidência forte.

O campo histórico `Descrição` contém setores. No sistema deve ser relacionamento com setor/centro operacional.

## BR-FIN-002 — Nota/documento e parcela são entidades diferentes

**Nível:** decisão de projeto derivada da estrutura atual.

Uma obrigação pode possuir múltiplas parcelas.

## BR-FIN-003 — Parcela possui posição e total

**Nível:** confirmada visualmente pela planilha.

Armazenar explicitamente número e quantidade total de parcelas.

## BR-FIN-004 — Status financeiro é derivado

**Nível:** confirmada pelas fórmulas.

Pago, vencido e a vencer devem ser derivados quando possível.

## BR-FIN-005 — Pago

**Nível:** confirmada pelas fórmulas atuais, sujeita a refinamento.

Pagamento deve ser evento explícito, não apenas uma data sobrescrita.

## BR-FIN-006 — Valor nominal e valor efetivamente pago

**Nível:** confirmada pela estrutura.

Preservar os dois quando houver diferença.

## BR-FIN-007 — Diferença financeira

**Nível:** evidência forte; causa pendente.

A diferença pode representar juros, multa, desconto ou ajuste; não classificar automaticamente sem regra.

## BR-FIN-008 — Referência de pagamento

**Nível:** evidência forte.

Separar método de pagamento de chave/linha/código/instrução.

## BR-FIN-009 — Indicadores gerenciais

**Nível:** confirmada pelas fórmulas/dashboard.

O sistema deve calcular total pago, pendente, atrasado, a vencer e distribuições gerenciais por período/escopo quando os dados permitirem.

## BR-FIN-010 — Dashboard não é fonte de dados

**Nível:** decisão de projeto.

Dashboard deve derivar de entidades transacionais.

## BR-FIN-011 — Pagamento parcial/múltiplo não é requisito do primeiro go-live

**Nível:** decisão validada em 2026-09-03.

A operação inicial não exige UX/regra específica para pagamentos parciais ou múltiplos por parcela. A capacidade técnica existente pode permanecer sem ser expandida por inércia.

---

# Fornecedores

## BR-SUP-001 — Fornecedor pode ter múltiplos contatos

**Nível:** confirmada pela planilha.

Contato/vendedor deve ser coleção, não coluna única fixa.

## BR-SUP-002 — Condições comerciais do fornecedor

**Nível:** evidência forte.

O modelo prevê pedido mínimo, dias de pedido/entrega, condição de pagamento e observações.

## BR-SUP-003 — Fornecedor pode fornecer múltiplos itens

**Nível:** confirmada pela estrutura do modelo.

## BR-SUP-004 — Preço de fornecedor precisa de histórico

**Nível:** decisão de projeto.

Evitar sobrescrever apenas o preço atual; preservar vigência/histórico.

---

# Regras transversais de qualidade e auditoria

## BR-SYS-001 — Não usar texto livre quando existe entidade canônica

Aplicável a unidade, setor, item, fornecedor, funcionário/responsável, motivo de movimentação e forma de pagamento. Texto livre continua permitido em observações.

## BR-SYS-002 — Preservar origem da migração

Todo registro migrado deve poder ser rastreado para arquivo/aba/linha de origem por metadados de importação.

## BR-SYS-003 — Registros operacionais críticos não devem ser apagados silenciosamente

Movimentações de estoque, empréstimos, pagamentos e fechamentos devem usar cancelamento/estorno/restituição quando aplicável e manter trilha de auditoria.

## BR-SYS-004 — Regras calculáveis não devem depender da interface

Cálculos de estoque, custeio, status financeiro, permissões e fechamento devem ser aplicados no domínio/backend/banco conforme a arquitetura.
