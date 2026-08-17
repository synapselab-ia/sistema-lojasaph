# Mapa das Planilhas de Origem

Data da análise inicial: 2026-08-17

## Objetivo

Registrar o que as planilhas atuais representam, quais dados e regras elas evidenciam, quais problemas existem no modelo atual e qual deve ser o destino conceitual dessas informações no Sistema Lojasaph.

As planilhas são evidência do processo atual. Elas não definem automaticamente a arquitetura final.

## Classificação usada

- **Entrada operacional**: informação digitada pelo usuário.
- **Dado mestre**: cadastro reutilizado em diversos processos.
- **Cálculo**: informação derivada por fórmula.
- **Visualização/relatório**: visão derivada de outros dados.
- **Configuração**: parâmetro usado por regras.
- **Pendente de validação**: significado não pode ser afirmado apenas pela planilha.

---

# 1. Controle Retirada Tabatinga.xlsx

## Aba `Retiradas`

A planilha possui duas tabelas paralelas na mesma aba:

1. **Retirada para o Capricórnio**;
2. **Devolução ao Tabatinga**.

### Retirada para o Capricórnio

Campos observados:

- Data;
- coluna booleana/checkbox sem título — **significado pendente de validação**;
- Produto;
- Fornecedor;
- Quantidade;
- Valor de custo unitário;
- Valor total;
- Observações.

Fórmula identificada:

- valor total da linha = quantidade × custo unitário.

### Devolução ao Tabatinga

Campos observados:

- Data;
- coluna booleana/checkbox sem título — **significado pendente de validação**;
- Produto;
- Fornecedor;
- Quantidade;
- Valor;
- Observações.

### Resumo financeiro lateral

A planilha calcula:

- valor total retirado para Capricórnio;
- valor total devolvido a Tabatinga;
- valor total `em haver` = retirado - devolvido.

### Processos evidenciados pelas observações

Não existe apenas uma transferência simples de estoque. A mesma planilha registra situações diferentes:

- retirada definitiva;
- devolução;
- empréstimo temporário;
- materiais levados para eventos;
- itens próximos do vencimento enviados para outra operação;
- itens vencidos/substituídos;
- acertos descritos como já pagos/marcados em comanda;
- equipamentos e materiais reutilizáveis, além de alimentos e bebidas.

Há referências adicionais a `Barba Negra`, indicando que podem existir outros destinos/origens além de Tabatinga e Capricórnio.

### Problemas do modelo atual

- retirada e devolução são linhas independentes, sem vínculo explícito entre si;
- produto é texto livre;
- fornecedor é texto livre;
- há datas ausentes;
- há custos ausentes;
- equipamentos e consumíveis são misturados no mesmo conceito;
- empréstimo temporário e transferência definitiva não são diferenciados estruturalmente;
- o significado do checkbox não está documentado;
- `em haver` mistura movimentação física com possível acerto financeiro entre operações;
- não existe identificador único da operação;
- não existe auditoria de quem criou/alterou o lançamento.

### Destino conceitual no sistema

- unidades/locais de origem e destino;
- itens de estoque;
- movimentações de estoque;
- transferências entre locais;
- vínculo entre transferência e devolução/retorno;
- empréstimos de itens reutilizáveis, se confirmado;
- motivo da movimentação;
- responsável;
- custo capturado/derivado;
- eventual controle de acerto financeiro entre unidades, se confirmado pelo cliente.

---

# 2. Retirada Cozinha, Quiosque e Empório.xlsx

## Aba `Gabarito`

Possui um catálogo com 583 registros e os campos:

- Código;
- Descrição;
- Grupo;
- Status;
- Unidade;
- EAN;
- NCM;
- CEST;
- Preço;
- Custo.

Foram identificados 17 grupos e todos os registros aparecem como ativos na amostra atual.

### Evidência importante

Os nomes dos itens das retiradas mensais não possuem correspondência exata com as descrições do `Gabarito` na análise normalizada.

Isso indica fortemente que o `Gabarito` pode representar **produtos de venda/cardápio/POS**, enquanto as retiradas representam **insumos e itens de estoque**.

Essa hipótese deve ser confirmada antes de unificar ambos em um único cadastro.

### Problemas de qualidade no Gabarito

- a maioria dos custos está zerada;
- diversos EANs usam valores genéricos/repetidos;
- existem descrições duplicadas com códigos diferentes;
- NCM/CEST contêm valores que aparentam placeholder em parte dos registros;
- o arquivo não demonstra relação entre produto vendido e insumo consumido.

## Aba `MODELO`

Modelo de retirada por setor/mês.

Campos:

- Data;
- Produto;
- Valor custo unitário;
- Quantidade;
- Valor custo total;
- Nome;
- Observações;
- Retirada mensal.

Fórmulas:

- valor custo total = custo unitário × quantidade;
- retirada mensal = soma dos custos totais.

## Abas mensais

Foram encontradas:

- Cozinha Agosto;
- Quiosque Agosto;
- Empório Agosto;
- Cozinha Julho;
- `Quisque Julho`;
- Empório Julho;
- Cozinha Junho;
- `Quioque Junho`;
- Empório Junho.

As variações `Quisque` e `Quioque` evidenciam dependência de nomes manuais e erro de digitação.

### Processo representado

Retirada interna de itens para operação de um setor, registrando data, item, quantidade, responsável e eventualmente custo.

### Problemas do modelo atual

- uma nova aba é criada para cada setor/mês;
- item é digitado como texto livre;
- existem variações de grafia para o mesmo item;
- custo unitário é frequentemente ausente, principalmente em algumas áreas/períodos;
- quando o custo não existe, o total calculado se torna zero e o resumo mensal perde valor gerencial;
- nome do responsável é texto livre;
- não existe fornecedor no lançamento mensal;
- não existe unidade/local de estoque de origem explicitamente registrado;
- não existe identificador único da retirada;
- fórmulas são replicadas até a linha 1000 mesmo sem lançamento.

### Destino conceitual no sistema

- uma única estrutura de retirada/movimentação, sem abas mensais;
- data real da operação;
- local de origem;
- setor/local de destino ou consumo;
- item cadastrado;
- quantidade;
- unidade de medida;
- responsável;
- custo derivado do estoque/lote ou regra de custeio, evitando digitação manual quando possível;
- observação/motivo.

---

# 3. Caixa Empório Espeticho Tabatinga.xlsx

## Abas

- MODELO;
- Caixa Junho;
- Caixa Julho;
- Caixa Agosto.

## Estrutura observada nas abas mensais

Linhas diárias `Dia 1` a `Dia 31` com:

- Crédito;
- Débito;
- Pix;
- Dinheiro;
- Faturamento do dia;
- Faturamento com taxa;
- Fundo de caixa;
- Entrada;
- Sangria;
- Encerramento de caixa.

A aba MODELO também contém `Voucher`, mas esse campo não está presente nas três abas mensais analisadas.

## Fórmulas principais

### Faturamento diário

Nas abas mensais:

`Crédito + Débito + Pix + Dinheiro`.

### Faturamento líquido de taxas

Aplica taxa apenas sobre crédito e débito e soma Pix e dinheiro integralmente.

As taxas atualmente estão armazenadas em células da própria planilha.

### Encerramento

A fórmula observada equivale a:

`Dinheiro + Fundo de caixa + Entrada - Sangria`.

### Resumo mensal

A planilha mantém:

- total por forma de pagamento;
- valores após taxas;
- total de taxas;
- taxas percentuais de crédito e débito;
- consumo de funcionários por semana;
- campo relacionado a freelancer;
- totais mensais.

## Problemas identificados

- o mês está embutido no nome da aba, em vez de cada registro possuir uma data real completa;
- a aba MODELO diverge das abas efetivamente utilizadas (`Voucher`);
- existe ao menos uma referência de fórmula inconsistente: na linha do Dia 23/25 do modelo mensal há referência a `D55` onde as demais usam a célula de taxa padrão da linha 45;
- taxas estão hardcoded na planilha;
- consumo de funcionários aparece agregado por semana, sem lançamentos individuais rastreáveis;
- não existe identificação do caixa/terminal;
- não existe usuário responsável por abertura/fechamento;
- não existe valor contado separado de valor esperado;
- não existe divergência estruturada de caixa;
- fundo de caixa é preenchido manualmente e não existe regra explícita de transporte do fechamento anterior;
- não há trilha de auditoria.

## Destino conceitual no sistema

- sessão/fechamento de caixa por unidade e data;
- valores por meio de pagamento;
- regras de taxas configuráveis e versionadas;
- fundo inicial;
- entradas e sangrias como movimentos separados;
- valor esperado;
- valor contado/informado;
- divergência;
- consumo de funcionários como eventos próprios;
- responsável e auditoria.

---

# 4. Controle NFs Espeticho.xlsx

## Aba `Lista`

É a principal base operacional do arquivo.

Campos visíveis:

- Descrição;
- Empresa;
- CNPJ;
- Parcela;
- Valor;
- Valor Pago;
- Vencimento;
- Dias até o vencimento;
- Status;
- Data de Pagamento;
- Data de emissão;
- Pix/Boleto.

### Significado observado de `Descrição`

Os valores utilizados são setores como Cozinha, Empório e Quiosque. No sistema esse campo deve ser tratado como setor/centro operacional, não como descrição genérica.

### Campo `Parcela`

Apesar de ser armazenado internamente como valor de data na planilha, a formatação visual o transforma em valores como `1/3`, `2/3`, `3/3`.

No novo sistema isso não deve ser uma data. Deve ser representado por conceitos explícitos, por exemplo:

- número da parcela;
- total de parcelas.

### Status e vencimento

A planilha deriva o estado a partir de vencimento e pagamento, com estados visuais equivalentes a:

- pago;
- atrasado;
- pendente/a vencer;
- checar data.

A presença de Data de Pagamento é usada como evidência de pagamento em várias fórmulas.

### Valor Pago

O arquivo possui Valor nominal e Valor Pago. Fórmulas gerenciais usam Valor Pago quando preenchido e, em determinadas métricas, Valor nominal quando não existe valor pago explícito.

A diferença entre valor pago e valor nominal é usada em um cálculo lateral associado a atraso. Isso indica necessidade de registrar juros, multa, desconto ou outra diferença financeira — sem assumir qual deles até validação.

### Campo `Pix/Boleto`

Os valores observados incluem sequências compatíveis com linhas/códigos de pagamento, e não apenas o nome de uma forma de pagamento.

Portanto o novo sistema deve separar:

- forma de pagamento;
- referência/instrução de pagamento (linha digitável, código, chave etc.), quando necessária.

## Aba `Visualização Organizada`

É uma visão derivada da `Lista`, ordenando registros por prioridade/status e vencimento.

Não representa nova entidade de negócio e não deve virar tabela separada no banco.

## Aba `Dados`

É uma área auxiliar para alimentar o dashboard, com agregações como:

- total pago no mês;
- total pago no ano;
- total pendente;
- total atrasado;
- a vencer em 7 dias;
- empresas mais pagas;
- pagamentos por mês;
- pagamentos por setor;
- distribuição por status.

Não representa fonte primária de dados.

## Aba `Dashboard`

Possui filtros por:

- ano;
- mês;
- referência temporal usada na visualização;
- setor.

KPIs identificados:

- total pago no período;
- total pago no ano;
- total pendente;
- total atrasado;
- a vencer em 7 dias.

## Problema técnico importante

Diversas fórmulas usam recursos típicos do Google Sheets, como combinações de `QUERY`, `FILTER`, `ARRAYFORMULA`, `REGEXMATCH`, `TO_TEXT` e outras expressões exportadas como funções não reconhecidas pelo Excel.

No arquivo analisado várias células aparecem como `#NAME?`.

No novo sistema essas regras devem existir como consultas e regras do domínio, e não depender de fórmulas de planilha.

## Problemas de modelagem

- empresa e CNPJ são repetidos em cada parcela;
- não existe identificador estável do fornecedor;
- não há número/chave explícita da NF na estrutura principal observada;
- invoice e parcelas estão achatadas na mesma tabela;
- status é visual/fórmula, não estado estruturado;
- pagamento é inferido principalmente de uma data;
- uma parcela não possui entidade de pagamento própria;
- o campo Pix/Boleto mistura conceito de método com referência de pagamento;
- data de emissão não está preenchida em todos os registros;
- fórmulas complexas e não portáveis dificultam confiabilidade e manutenção.

## Destino conceitual no sistema

- fornecedores;
- notas/documentos financeiros;
- parcelas;
- pagamentos;
- instruções/referências de pagamento;
- setor/unidade responsável;
- anexos (PDF, XML, boleto, comprovante) quando aplicável;
- status calculado pelo sistema;
- dashboards derivados da base transacional.

---

# 5. Validades.xlsx

## Aba `MODELO`

A planilha analisada é apenas um template, sem histórico preenchido.

Campos:

- Produto;
- Quantidade;
- Validade.

## Processo evidenciado

Existe necessidade explícita de controlar quantidade por data de validade.

## Limitação do modelo atual

Uma data de validade isolada no produto não é suficiente, porque o mesmo item pode existir simultaneamente em diferentes lotes e datas de validade.

## Destino conceitual no sistema

- item de estoque;
- lote ou entrada identificável;
- quantidade;
- data de validade;
- local de estoque;
- histórico de movimentação do lote;
- alertas configuráveis de vencimento.

---

# 6. Fornecedores Tabatinga.xlsx

## Aba `MODELO`

Estrutura prevista para fornecedor:

### Dados comerciais

- Fornecedor;
- Vendedor;
- Contato;
- Valor mínimo;
- Dia de pedido;
- Dia de entrega;
- Forma de pagamento;
- Observações/tipo de produtos.

### Produtos do fornecedor

- Produto;
- Medida;
- Quantidade;
- Valor;
- Valor unitário.

## Abas de fornecedores

Existem diversas abas nomeadas por fornecedor.

A maioria não utiliza o modelo completo e contém apenas nome de contato/vendedor e telefone. Uma minoria contém condições comerciais adicionais.

## Problemas do modelo atual

- uma aba por fornecedor;
- fornecedor e vendedor são frequentemente misturados no mesmo campo;
- múltiplos contatos não são estruturados;
- telefone é texto livre;
- condições de pedido/entrega não são uniformes;
- catálogo produto-fornecedor está praticamente ausente/incompleto;
- não há histórico de preços;
- não há CNPJ na maior parte dessa planilha;
- não existe vínculo formal com as empresas do controle de NFs.

## Destino conceitual no sistema

- fornecedor;
- contatos do fornecedor;
- condições comerciais;
- agenda de pedido/entrega;
- formas/condições de pagamento;
- produtos fornecidos;
- embalagem/unidade de compra;
- preço vigente e histórico de preços.

---

# Relações entre os arquivos

## Fornecedores

O conceito aparece em:

- transferências Tabatinga/Capricórnio;
- controle de NFs;
- planilha específica de fornecedores.

Hoje não existe uma chave comum entre essas fontes. O novo sistema deve manter um único cadastro canônico de fornecedor e permitir aliases durante a migração.

## Produtos/itens

Há pelo menos dois conjuntos aparentemente diferentes:

1. catálogo `Gabarito` com código, EAN, NCM, CEST e preço de venda;
2. itens de estoque/retirada digitados livremente.

Não devem ser unificados automaticamente sem validação.

## Setores

Cozinha, Quiosque e Empório aparecem em retiradas e financeiro. Devem se tornar entidades/centros operacionais reutilizados, e não texto duplicado.

## Unidades e destinos

Tabatinga e Capricórnio aparecem explicitamente. Observações também citam Barba Negra. O sistema não deve hardcodar apenas duas unidades.

## Responsáveis

Nomes de pessoas são registrados como texto em retiradas. O novo sistema deve relacionar o lançamento a funcionário/usuário quando apropriado.

---

# Conclusões da engenharia reversa

1. O sistema precisa normalizar cadastros antes de migrar lançamentos.
2. Estoque não pode ser modelado apenas como `produto + saldo`; existem transferências, retiradas, devoluções, empréstimos, perdas/vencimentos e possíveis acertos financeiros.
3. O cadastro de itens precisa distinguir ou relacionar itens vendidos e itens de estoque, caso a hipótese sobre o `Gabarito` seja confirmada.
4. Caixa deve registrar dados por data e sessão, sem criar uma estrutura por mês.
5. Financeiro deve separar nota/documento, parcela e pagamento.
6. Dashboard deve ser derivado da base transacional, nunca servir como fonte de dados.
7. Validades devem ser associadas a lote/quantidade/local.
8. Fornecedores precisam de cadastro único, contatos e condições comerciais normalizados.
9. Dados atuais possuem lacunas e inconsistências suficientes para exigir migração com staging, validação e mapeamento de aliases.
10. Antes do modelo definitivo, as dúvidas críticas registradas em `docs/product/open-questions.md` devem ser validadas.