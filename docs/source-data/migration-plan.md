# Plano Preliminar de Migração das Planilhas

Data: 2026-08-17
Status: preliminar — executar apenas depois do modelo de dados estar estabilizado.

## Objetivo

Migrar os dados úteis das planilhas para o novo sistema com rastreabilidade, validação e possibilidade de reprocessamento, sem copiar a estrutura ruim das abas para o banco.

---

# Princípios

1. Não importar diretamente para tabelas finais sem camada de staging/validação.
2. Não depender de fórmulas das planilhas como fonte final de verdade quando o valor puder ser recalculado.
3. Preservar referência ao arquivo, aba e linha de origem.
4. Não duplicar registros se uma importação for executada novamente.
5. Mapear textos históricos para entidades canônicas por aliases.
6. Produzir relatório de registros aceitos, rejeitados e que exigem revisão.
7. Fazer dry run antes da importação definitiva.
8. Não versionar arquivos reais no GitHub por padrão.

---

# Etapa 1 — Congelamento das fontes

No momento da migração real:

- solicitar cópia final de cada planilha;
- registrar data/hora da extração;
- gerar hash do arquivo;
- manter backup seguro fora do repositório;
- impedir que o mesmo arquivo seja confundido com versão anterior.

---

# Etapa 2 — Staging

Criar estruturas temporárias/importação para receber valores praticamente como aparecem na origem, incluindo:

- arquivo;
- aba;
- linha;
- valores brutos;
- erros de parsing;
- status de transformação.

Staging não deve ser usado pela aplicação operacional.

---

# Etapa 3 — Cadastros canônicos antes dos lançamentos

Ordem sugerida:

1. unidades/locais;
2. setores;
3. unidades de medida;
4. itens de estoque;
5. aliases de item;
6. fornecedores;
7. contatos;
8. funcionários/responsáveis conhecidos;
9. regras/configurações necessárias.

Só depois importar transações.

---

# Etapa 4 — Normalizações específicas

## Produtos e itens

- preservar descrição original em staging;
- normalizar espaços/caixa apenas para matching;
- não fundir itens automaticamente apenas por similaridade;
- manter `ItemAlias` para grafias antigas;
- separar catálogo Gabarito dos itens de estoque até Q-006 ser validada.

## Fornecedores

- usar CNPJ quando disponível como forte candidato a chave de deduplicação;
- mapear nomes abreviados/aliases das outras planilhas ao fornecedor canônico;
- separar empresa de vendedor/contato;
- não inventar CNPJ ausente.

## Setores

Normalizar grafias conhecidas para entidades canônicas, por exemplo variações ortográficas de Quiosque nos nomes de abas.

## Datas

- converter datas reais para tipo de data;
- reconstruir datas de caixa usando mês/ano da aba somente quando a origem for inequívoca;
- registrar alerta quando a data original estiver ausente.

## Parcela financeira

O valor visual `n/total` deve ser parseado para:

- `installment_number`;
- `installment_count`.

Não persistir como data.

## Status financeiro

Não importar símbolos e textos calculados como estado definitivo.

Recalcular a partir de dados transacionais após a migração.

## Pix/Boleto

Preservar como referência/instrução bruta até classificação segura do tipo.

---

# Etapa 5 — Transações

Ordem preliminar:

1. lotes/validades disponíveis;
2. movimentações históricas de estoque;
3. transferências e devoluções;
4. documentos financeiros;
5. parcelas;
6. pagamentos;
7. caixa;
8. outros lançamentos.

A ordem pode mudar após o schema definitivo.

---

# Etapa 6 — Regras de reconciliação

## Estoque

Como as planilhas atuais não formam um ledger completo de todas as entradas/saídas, pode não ser possível reconstruir saldo histórico perfeito apenas pelos arquivos fornecidos.

Se necessário, iniciar o sistema com:

- inventário inicial por local;
- movimentos históricos importados apenas para consulta/análise;
- data de corte explícita para o novo ledger.

## Transferências

- tentar vincular devoluções a saídas usando item, quantidade, datas e observação;
- casos ambíguos devem ficar para revisão manual;
- nunca inventar vínculo automaticamente sem grau de confiança suficiente.

## Financeiro

Reconciliar por fornecedor/período:

- valor nominal;
- valor pago;
- quantidade de parcelas;
- pagamentos;
- pendências.

Comparar resultados do novo sistema com totais atuais, levando em conta que fórmulas/caches do arquivo podem estar inconsistentes.

## Caixa

Reconciliar por mês:

- crédito;
- débito;
- Pix;
- dinheiro;
- faturamento bruto;
- taxas;
- entradas/sangrias;
- consumo de funcionários.

---

# Etapa 7 — Idempotência

Cada linha transformada deve receber chave de importação determinística ou combinação equivalente baseada em:

- batch;
- arquivo;
- aba;
- linha;
- tipo do registro.

Executar novamente o mesmo batch não pode criar duplicatas.

---

# Etapa 8 — Relatório de importação

Cada execução deve informar:

- quantidade lida;
- quantidade importada;
- quantidade ignorada;
- duplicatas detectadas;
- registros com warning;
- registros rejeitados;
- aliases criados/mapeados;
- diferenças de reconciliação.

---

# Etapa 9 — Cutover

Antes da produção:

1. realizar dry run;
2. validar amostras com o cliente;
3. corrigir regras de transformação;
4. executar migração final;
5. reconciliar totais;
6. realizar inventário inicial quando necessário;
7. definir data/hora de corte;
8. bloquear uso paralelo das planilhas para os processos migrados ou definir procedimento temporário explícito.

---

# Riscos conhecidos

- produtos/itens digitados livremente;
- ausência de custos em retiradas;
- datas ausentes;
- nomes de abas inconsistentes;
- fornecedor sem chave comum entre arquivos;
- possível mistura de produto de venda e item de estoque;
- transferência misturada com empréstimo e acerto financeiro;
- planilha de validades sem histórico preenchido;
- fórmulas financeiras específicas do Google Sheets e resultados quebrados no Excel;
- dados de caixa agregados por dia, sem transações individuais;
- ausência de identificador claro da NF no controle financeiro analisado.

---

# Critério para iniciar a migração real

Não começar migração definitiva enquanto não existirem:

- modelo de domínio validado;
- schema versionado;
- regras de transformação documentadas;
- ambiente de staging;
- importadores testados;
- estratégia de backup;
- procedimento de reconciliação;
- aceite da data de corte.