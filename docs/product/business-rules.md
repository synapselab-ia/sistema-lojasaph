# Regras de Negócio — Evidências das Planilhas

Data da análise inicial: 2026-08-17

Este documento separa o que pode ser observado diretamente nas planilhas do que ainda depende de confirmação do cliente.

## Níveis de confiança

- **Confirmada pela estrutura/fórmula**: regra implementada explicitamente na planilha atual.
- **Evidência forte**: comportamento aparece repetidamente, mas o significado empresarial precisa ser confirmado.
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

## BR-ITEM-002 — Catálogo de venda e item de estoque podem ser conceitos distintos

**Nível:** pendente de validação.

O catálogo `Gabarito` e os itens das retiradas não apresentam correspondência exata de descrições na análise. Não unificar automaticamente os dois conjuntos.

## BR-ITEM-003 — Aliases devem ser suportados na migração

**Nível:** evidência forte.

Variações de grafia e abreviações precisam ser mapeadas para um item canônico sem apagar o texto histórico de origem.

---

# Retiradas, estoque e transferências

## BR-STK-001 — Custo total de uma retirada

**Nível:** confirmada pela fórmula.

Na planilha de retiradas por setor:

`custo_total = custo_unitario × quantidade`.

No sistema o custo deve preferencialmente ser derivado do estoque/lote/regra de custeio, em vez de digitado manualmente em cada retirada.

## BR-STK-002 — Total mensal atual

**Nível:** confirmada pela fórmula.

A planilha soma o custo total das retiradas do setor no mês.

No sistema isso deve ser uma consulta por período, e não um campo armazenado em aba mensal.

## BR-STK-003 — Transferência precisa de origem e destino

**Nível:** evidência forte.

Movimentos Tabatinga → Capricórnio e retornos Capricórnio → Tabatinga demonstram necessidade de origem e destino explícitos.

## BR-STK-004 — Retorno deve poder ser relacionado ao movimento original

**Nível:** evidência forte.

Hoje retirada e devolução são independentes. O sistema deve permitir relacionar retorno/devolução a uma transferência ou empréstimo anterior para saber quantidade pendente.

## BR-STK-005 — Existem motivos diferentes de movimentação

**Nível:** evidência forte.

As observações evidenciam pelo menos:

- abastecimento/retirada operacional;
- transferência entre unidades;
- devolução;
- empréstimo;
- evento;
- proximidade de vencimento;
- item vencido/substituído;
- acerto já pago/comanda.

Esses motivos não devem depender apenas de observação textual.

## BR-STK-006 — Consumíveis e itens reutilizáveis coexistem

**Nível:** evidência forte.

As movimentações incluem alimentos/bebidas e também mesas, cadeiras, guarda-sóis e outros bens reutilizáveis.

O modelo deverá classificar o tipo do item ou definir tratamento específico para bens retornáveis.

## BR-STK-007 — Saldo/acerto `em haver`

**Nível:** confirmada pela fórmula quanto ao cálculo; significado empresarial pendente.

A planilha calcula:

`em_haver = valor_retirado - valor_devolvido`.

É necessário confirmar se isso representa cobrança interna, crédito entre operações, controle informal ou apenas referência gerencial.

## BR-STK-008 — Checkbox sem título

**Nível:** pendente.

Existe coluna booleana sem cabeçalho ao lado da data em retirada e devolução. Seu significado deve ser confirmado antes da migração.

---

# Validade e lotes

## BR-EXP-001 — Validade pertence a uma quantidade específica

**Nível:** evidência forte.

O template registra Produto + Quantidade + Validade. Portanto um mesmo item pode necessitar múltiplos registros de validade.

## BR-EXP-002 — Validade deve ser modelada por lote/entrada/local

**Nível:** decisão de projeto derivada da necessidade.

Não armazenar uma única validade diretamente no cadastro do item. Usar lote ou registro equivalente associado a quantidade e local.

## BR-EXP-003 — Movimentação por proximidade de vencimento

**Nível:** evidência forte.

O controle de transferências contém registros de itens enviados a outro local por estarem próximos da validade. O sistema deve preservar motivo e rastreabilidade dessa movimentação.

---

# Caixa

## BR-CASH-001 — Faturamento diário bruto

**Nível:** confirmada pela fórmula.

Nas abas mensais utilizadas:

`faturamento_bruto = credito + debito + pix + dinheiro`.

Voucher existe no MODELO, mas não nas abas mensais analisadas e precisa de confirmação.

## BR-CASH-002 — Faturamento líquido de taxas

**Nível:** confirmada pela fórmula atual.

A planilha aplica taxas percentuais sobre crédito e débito e considera Pix e dinheiro integralmente.

No sistema as taxas devem ser configuráveis e versionadas; não hardcoded em código ou lançamento.

## BR-CASH-003 — Encerramento de dinheiro

**Nível:** confirmada pela fórmula atual.

`encerramento = dinheiro + fundo_de_caixa + entradas - sangrias`.

É necessário validar se esse valor representa caixa esperado ou caixa efetivamente contado.

## BR-CASH-004 — Fundo inicial precisa ser registrado por sessão/data

**Nível:** evidência forte.

O fundo varia por dia e é parte do cálculo de encerramento.

## BR-CASH-005 — Entrada e sangria são eventos próprios

**Nível:** decisão de projeto derivada da estrutura atual.

Em vez de apenas totais diários, o sistema deve permitir registrar movimentos de entrada/sangria com valor, motivo, horário e responsável, agregando-os no fechamento.

## BR-CASH-006 — Consumo de funcionários é separado do faturamento normal

**Nível:** evidência forte; tratamento financeiro pendente.

A planilha possui seção própria de consumo de funcionários e o utiliza em totais mensais. É necessário confirmar se consumo é cobrado, descontado, considerado venda ou apenas controle gerencial.

## BR-CASH-007 — Fechamento profissional deve ter esperado x contado

**Nível:** decisão de projeto.

O novo sistema deve separar valor esperado do valor informado/contado para gerar divergência auditável.

---

# Notas, contas e pagamentos

## BR-FIN-001 — Setor responsável

**Nível:** evidência forte.

O campo atualmente chamado `Descrição` contém setores como Cozinha, Empório e Quiosque. No sistema deve ser relacionamento com setor/centro operacional.

## BR-FIN-002 — Nota/documento e parcela são entidades diferentes

**Nível:** decisão de projeto derivada da estrutura atual.

Uma obrigação pode possuir múltiplas parcelas. Dados do fornecedor/documento não devem ser repetidos conceitualmente como se cada parcela fosse uma nota independente.

## BR-FIN-003 — Parcela possui posição e total

**Nível:** confirmada visualmente pela planilha.

A coluna Parcela exibe valores como `1/3`, `2/3`, `3/3`.

No sistema armazenar explicitamente número da parcela e quantidade total de parcelas.

## BR-FIN-004 — Status financeiro é derivado

**Nível:** confirmada pelas fórmulas.

O estado atual é determinado principalmente por:

- vencimento;
- existência de data de pagamento;
- situação especial `checar data`.

O sistema deve calcular status consistentes, evitando edição manual do estado quando ele puder ser derivado.

## BR-FIN-005 — Pago

**Nível:** confirmada pelas fórmulas atuais, sujeita a refinamento.

A presença de data de pagamento é utilizada como principal evidência de que a parcela foi paga.

No sistema, pagamento deve ser uma entidade/evento explícito. A data não deve ser o único mecanismo de prova.

## BR-FIN-006 — Valor nominal e valor efetivamente pago

**Nível:** confirmada pela estrutura.

Existem campos distintos para Valor e Valor Pago. O sistema deve preservar os dois quando houver diferença.

## BR-FIN-007 — Diferença financeira

**Nível:** evidência forte; causa pendente.

Há cálculo baseado na diferença entre valor pago e valor nominal. Essa diferença pode representar juros, multa, desconto ou ajuste. O motivo precisa ser estruturado no novo sistema após validação.

## BR-FIN-008 — Referência de pagamento

**Nível:** evidência forte.

O campo `Pix/Boleto` contém sequências compatíveis com referências/códigos de pagamento. O sistema deve separar método de pagamento de chave, linha digitável, código ou outra instrução.

## BR-FIN-009 — Indicadores gerenciais

**Nível:** confirmada pelas fórmulas/dashboard.

O sistema deve conseguir calcular, por período e setor:

- total pago;
- total pago no ano;
- total pendente;
- total atrasado;
- valores a vencer em janela configurável;
- distribuição por status;
- pagamentos por setor;
- pagamentos por fornecedor;
- pagamentos por mês.

## BR-FIN-010 — Dashboard não é fonte de dados

**Nível:** decisão de projeto.

Dashboard e visualizações devem ser sempre derivados das entidades transacionais.

---

# Fornecedores

## BR-SUP-001 — Fornecedor pode ter múltiplos contatos

**Nível:** confirmada pela planilha.

Há fornecedor com mais de um contato registrado. Contato/vendedor deve ser entidade filha ou coleção, não coluna única fixa.

## BR-SUP-002 — Condições comerciais do fornecedor

**Nível:** evidência forte.

O modelo prevê:

- pedido mínimo;
- dia de pedido;
- dia de entrega;
- forma/condição de pagamento;
- observações.

## BR-SUP-003 — Fornecedor pode fornecer múltiplos itens

**Nível:** confirmada pela estrutura do modelo.

O modelo prevê lista de produtos, medidas, quantidades e preços por fornecedor.

## BR-SUP-004 — Preço de fornecedor precisa de histórico

**Nível:** decisão de projeto.

Evitar sobrescrever apenas o preço atual. Registrar vigência/histórico para análise de custo e comparação.

---

# Regras transversais de qualidade e auditoria

## BR-SYS-001 — Não usar texto livre quando existe entidade canônica

Aplicável a:

- unidade;
- setor;
- item;
- fornecedor;
- funcionário/responsável;
- motivo de movimentação;
- forma de pagamento.

Texto livre continua permitido em observações.

## BR-SYS-002 — Preservar origem da migração

Todo registro migrado deve poder ser rastreado para arquivo/aba/linha de origem através de metadados de importação, sem exigir que a planilha real permaneça versionada no GitHub.

## BR-SYS-003 — Registros operacionais críticos não devem ser apagados silenciosamente

Movimentações de estoque, pagamentos e fechamentos devem usar cancelamento/estorno quando aplicável e manter trilha de auditoria.

## BR-SYS-004 — Regras calculáveis não devem depender da interface

Cálculos de estoque, status financeiro, permissões e fechamento devem ser aplicados no domínio/backend/banco conforme a arquitetura evoluir.