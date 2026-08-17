# Validação da Fase 2 — Modelo lógico

Data: 2026-08-17
Status: concluída

## Objetivo da validação

Confirmar que o modelo lógico consegue representar os processos identificados nas seis planilhas e os defaults aprovados, sem depender da estrutura mensal/visual dos arquivos legados.

## Cenários cobertos

### Organização
- múltiplos negócios dentro de um grupo;
- múltiplas unidades por negócio;
- setores independentes de locais de estoque;
- expansão futura sem hardcode de Tabatinga/Capricórnio/Barba Negra.

### Estoque
- entrada de compra;
- retirada para setor;
- transferência entre locais/unidades;
- envio e recebimento em etapas distintas;
- empréstimo com retorno parcial;
- devolução;
- perda/quebra/vencimento;
- inventário e ajuste auditável;
- múltiplos lotes e validades;
- saldo reconstruível por ledger.

### Fornecedores/compras
- múltiplos contatos;
- condições comerciais;
- um item com vários fornecedores;
- histórico de preços;
- pedido e recebimento parcial.

### Financeiro
- documento com várias parcelas;
- parcela com zero ou vários pagamentos;
- pagamento parcial;
- juros/multa/desconto/ajuste;
- instrução de pagamento separada do pagamento realizado;
- status derivado e auditável.

### Caixa
- sessão por caixa/unidade/data;
- fundo inicial;
- entradas e sangrias;
- totais por método;
- taxas versionadas;
- esperado x contado e divergência;
- futura integração com PDV sem redesenhar o fechamento.

### Migração/auditoria
- batch de importação idempotente;
- referência a arquivo/aba/linha;
- preservação de campos legados ambíguos;
- audit log separado de ledgers transacionais.

## Invariantes críticas verificadas

1. Nenhum saldo físico é alterado sem movimento.
2. Movimento confirmado não é apagado para correção.
3. Transferência não pode ter mesma origem e destino.
4. Setor/local/unidade não podem cruzar Organizations indevidamente.
5. Pagamento não é representado apenas por uma data em parcela.
6. Status financeiro é derivado.
7. Caixa mensal é relatório, não entidade.
8. Custo histórico é preservado por snapshots.
9. Valor monetário será decimal exato.
10. Operações críticas deverão ser idempotentes e transacionais.

## Pontos P1/P2 que não bloqueiam a fundação técnica

Podem ser definidos durante os módulos correspondentes sem mudar os agregados principais:
- tratamento exato do consumo de funcionários;
- voucher e métodos adicionais de pagamento;
- regras detalhadas de taxas por adquirente/bandeira;
- regra especial `Checar data` do legado;
- momento operacional exato de cadastro de validade;
- FEFO obrigatório ou apenas sugestão;
- janela padrão de alerta de validade;
- agenda fixa versus informativa de fornecedores;
- regras específicas de pedido mínimo.

## Conclusão

A Fase 2 atende o critério de conclusão da Issue #8.

O domínio está suficientemente definido para iniciar a fundação técnica da aplicação sem criar Supabase ou schema físico prematuramente.

A próxima fase deve criar o projeto web, estrutura modular, contratos de domínio/repositories, fixtures e qualidade automatizada, mantendo persistência inicialmente desacoplada.