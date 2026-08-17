# Glossário — Sistema Lojasaph

Este glossário foi refinado a partir da engenharia reversa das planilhas. Termos marcados como pendentes ainda exigem validação do cliente.

## Empresa
Entidade proprietária da operação.

## Unidade / Loja
Local operacional pertencente à empresa. A classificação exata de Tabatinga, Capricórnio e Barba Negra está pendente de validação.

## Setor
Área funcional dentro de uma unidade, como Cozinha, Quiosque ou Empório.

## Local de estoque
Local lógico ou físico onde um saldo de item é controlado. Não é necessariamente sinônimo de setor.

## Item de estoque
Bem, insumo, alimento, bebida, embalagem ou material cuja quantidade física precisa ser controlada.

## Produto de venda
Item comercializado ao cliente/POS/cardápio. Pode ou não ser a mesma entidade que um item de estoque. A relação com o `Gabarito` está pendente de validação.

## Alias de item
Nome histórico, abreviação ou variação de grafia associado a um item canônico para busca e migração.

## Fornecedor
Pessoa jurídica ou física responsável pelo fornecimento de produtos ou serviços.

## Contato do fornecedor
Vendedor, representante ou contato comercial associado a um fornecedor. Um fornecedor pode possuir vários contatos.

## Movimentação de estoque
Evento rastreável que altera quantidade ou localização de um item.

## Retirada
Saída de item de um local para uso/consumo operacional de um setor ou destino.

## Transferência
Movimentação de item entre locais ou unidades distintos.

## Devolução
Movimentação que retorna item anteriormente retirado ou transferido.

## Empréstimo
Movimentação temporária de item com expectativa de retorno. A necessidade de tratá-la como processo distinto de transferência está pendente de validação.

## Retorno de empréstimo
Devolução vinculada a um empréstimo anterior, reduzindo a quantidade ainda pendente de retorno.

## Em haver
Termo usado na planilha Tabatinga ↔ Capricórnio para a diferença entre valor retirado e valor devolvido. O significado financeiro/operacional exato está pendente de validação.

## Perda
Saída de estoque causada por descarte, quebra, vencimento, dano ou outra ocorrência não destinada à operação normal.

## Inventário
Processo de contagem física e comparação com o saldo registrado pelo sistema.

## Lote
Conjunto identificável de unidades de um item que compartilha atributos de recebimento, custo ou validade.

## Validade
Data limite associada a um lote ou quantidade específica de item.

## Documento financeiro / Nota
Obrigação registrada contra um fornecedor, podendo possuir uma ou mais parcelas. O nome definitivo do agregado depende do escopo real de documentos além de NFs.

## Parcela
Parte de um documento financeiro, com número, total de parcelas, valor nominal e vencimento.

## Pagamento
Evento que liquida total ou parcialmente uma obrigação financeira, registrando data, valor e demais informações pertinentes.

## Referência de pagamento
Informação usada para efetuar um pagamento, como linha digitável, código ou chave. Não é sinônimo do pagamento já realizado.

## Sangria
Retirada de valor do caixa durante o período operacional.

## Entrada de caixa
Valor adicionado ao caixa durante uma sessão sem representar necessariamente venda.

## Fundo de caixa
Valor disponibilizado no início da operação para troco e funcionamento do caixa.

## Fechamento de caixa
Consolidação de uma sessão/período de caixa com meios de pagamento, movimentos, valor esperado e conferência.

## Divergência de caixa
Diferença entre o valor esperado pelo sistema e o valor efetivamente informado ou contado.

## Consumo de funcionário
Consumo registrado separadamente do faturamento comum. O tratamento financeiro exato está pendente de validação.

## Auditoria
Registro de ações relevantes realizadas por usuários, incluindo alterações críticas e seus contextos.

## Import Batch
Execução identificável de uma importação de dados legados, usada para idempotência, rastreabilidade e reconciliação.