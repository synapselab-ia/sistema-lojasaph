# ADR-005 — Modelo de caixa por sessão e totais consolidados

Data: 2026-08-17
Status: aceito

## Contexto

As planilhas atuais usam uma aba por mês e uma linha por dia, com totais de crédito, débito, Pix, dinheiro, taxas, fundo, entradas, sangrias e encerramento. O sistema precisa abandonar a estrutura mensal fixa sem obrigar um PDV completo no MVP.

## Decisão

### 1. Unidade principal: CashSession

O caixa será modelado por sessão operacional associada a:
- CashRegister;
- Unit;
- business_date;
- responsável;
- abertura/fechamento.

Não existirão tabelas ou entidades mensais de caixa.

### 2. Formas de pagamento

O MVP registra `PaymentMethodTotal` por sessão.

Exemplos:
- dinheiro;
- Pix;
- débito;
- crédito;
- outros métodos habilitados.

### 3. Taxas

Taxas serão calculadas/configuradas por `FeeRule` versionada, nunca hardcoded em tela ou fórmula fixa.

O fechamento preserva gross_amount, fee_amount e net_amount usados naquele momento.

### 4. Entradas e sangrias

Entrada e sangria são eventos `CashMovement`, cada um com valor, momento, motivo e responsável.

### 5. Esperado versus contado

O sistema separa:
- valor esperado em dinheiro;
- valor efetivamente contado;
- divergência.

A divergência é derivada e auditável.

### 6. Fechamento e reabertura

Sessão fechada não é silenciosamente editada.

Reabertura, quando permitida, exige permissão específica e audit log. Alterações posteriores precisam deixar rastreabilidade.

### 7. Integração futura

Vendas individuais/POS podem futuramente alimentar `PaymentMethodTotal` ou projeções da CashSession. A sessão continua sendo a fronteira de fechamento, então a integração não exige redesenhar o módulo.

## Consequências

- relatórios mensais passam a ser consultas por período;
- caixa suporta vários terminais/unidades;
- divergência fica explícita;
- taxas podem mudar no tempo;
- integração com PDV pode ser adicionada depois.

## Fora do escopo

- controle de venda por item no MVP;
- TEF/adquirente em tempo real;
- conciliação automática com adquirentes;
- depósito bancário/tesouraria avançada.
