# Módulo — Dashboard operacional, alertas e KPIs

Status: Fase 13 concluída tecnicamente no PR #36.

## Objetivo

Transformar `/workspace` em uma visão orientada a ação, consolidando sinais já existentes em Financeiro, Caixa, Compras e Estoque sem criar uma segunda fonte de verdade nem antecipar regras ainda não implementadas.

## Princípios

- dashboard é somente leitura;
- regras transacionais continuam nos módulos de origem;
- ausência de dado não é convertida em dado inventado;
- status financeiro vem de `payable_installment_summary`;
- saldos/estoque continuam derivados do ledger e das projeções existentes;
- Caixa usa sessões/fechamentos persistidos;
- timezone da Organization define a data de negócio do painel;
- RLS permanece a fronteira de isolamento; o dashboard não usa service role nem bypass;
- não foi criada migration/read model materializado nesta fase porque as consultas simples foram suficientes.

## Fontes consultadas

### Financeiro

`payable_installment_summary` fornece:

- valor nominal;
- total líquido pago;
- saldo;
- vencimento;
- status `cancelled`, `paid`, `overdue`, `due_today`, `upcoming`.

O Dashboard não recalcula esse status no React.

### Caixa

`cash_sessions` fornece:

- sessões abertas;
- sessões fechadas no período;
- divergências não-zero.

A relação com unidade é resolvida por `cash_registers`.

### Compras

`purchase_orders` fornece:

- pedidos `ordered` / `partially_received`;
- data prevista de entrega;
- pedidos com previsão atrasada;
- entregas dentro do horizonte selecionado.

A relação com unidade é resolvida pelo local de estoque.

### Estoque

- `stock_transfers`: transferências `dispatched` / `partially_received`;
- `inventory_counts`: contagens `counting` / `review`;
- `inventory_batches`: lotes ativos com saldo e validade informada.

Lotes sem validade continuam desconhecidos e não viram alerta fictício.

## Filtros

A primeira versão oferece:

- unidade: todas ou uma unidade ativa;
- horizonte: 7, 15 ou 30 dias.

O horizonte afeta:

- contas a vencer;
- entregas previstas;
- lotes próximos da validade;
- período de fechamentos recentes de Caixa.

Ele é um filtro de visualização, não substitui futura configuração persistente de janelas de alerta.

Transferências entram no filtro quando a unidade selecionada é origem **ou** destino.

## KPIs atuais

### Financeiro

- total nominal de parcelas não canceladas;
- total líquido pago;
- saldo positivo em aberto;
- quantidade vencida;
- quantidade vencendo hoje;
- quantidade a vencer dentro do horizonte.

### Caixa

- sessões abertas;
- fechamentos recentes;
- fechamentos com divergência não-zero dentro do período carregado.

### Compras

- pedidos pendentes;
- entregas previstas atrasadas;
- entregas previstas dentro do horizonte.

### Estoque

- transferências em trânsito;
- inventários físicos em andamento;
- lotes vencidos com saldo;
- lotes vencendo dentro do horizonte.

## Fila de atenção

A fila não mostra cards vazios. Um sinal só aparece quando sua contagem é maior que zero.

Prioridade alta:

- parcelas vencidas;
- parcelas vencendo hoje;
- divergências de Caixa;
- pedidos com entrega prevista atrasada;
- lotes vencidos com saldo.

Prioridade média:

- parcelas a vencer no horizonte;
- caixas abertos;
- entregas previstas no horizonte;
- lotes próximos do vencimento;
- transferências em trânsito;
- inventários em andamento.

Cada item navega diretamente para o módulo de origem.

## Implementação

### `dashboard-summary.ts`

Camada pura, sem dependência de Supabase/React:

- filtra unidade;
- aplica horizonte;
- agrega Money sem float binário;
- produz KPIs;
- produz fila de atenção.

### `supabase-dashboard-query.ts`

Adapter de leitura:

- usa o client autenticado normal;
- consulta somente tabelas/views já protegidas;
- resolve Organization timezone;
- carrega unidades/locais/caixas para relacionar dados aos escopos;
- não realiza mutation;
- não usa chave privilegiada.

### `/workspace`

Interface responsiva com:

- data de negócio + timezone;
- filtro de unidade;
- filtro de horizonte;
- fila de atenção;
- KPIs financeiros;
- KPIs operacionais;
- estados explícitos de loading/erro;
- links para os módulos transacionais.

Requests concorrentes de filtro usam sequência monotônica: uma resposta antiga não pode sobrescrever uma seleção mais recente do usuário.

## Testes

`dashboard-summary.test.ts` cobre:

- agregação financeira exata;
- isolamento lógico do filtro por unidade;
- Caixa/Compras/Estoque;
- horizonte variável;
- timezone da Organization;
- rejeição de horizonte inválido.

CI do head material passou:

- lint;
- typecheck;
- testes unitários;
- production build;
- CI PostgreSQL 17;
- Inventory Count Integration;
- Business Transactions Integration, incluindo Caixa.

## Homologação remota

Não houve migration nova nesta fase.

A homologação no Supabase foi somente de leitura, em `BEGIN/ROLLBACK`:

- criou usuário `viewer` temporário membro da Organization demo;
- criou segunda Organization/Unit sem membership;
- executou as consultas equivalentes às fontes do Dashboard sob role `authenticated`;
- confirmou visibilidade da Organization demo;
- confirmou que Organization/Unit sem membership não eram visíveis;
- confirmou acesso às fontes Financeiro, Caixa, Compras, Transferências, Inventários e Validades;
- rollback removeu usuário, membership e Organization/Unit temporários.

Resíduos após rollback: zero.

No fixture remoto atual, as consultas retornaram:

- Financeiro: 0 linhas;
- Caixa: 0 sessões;
- Compras pendentes: 0;
- Transferências em trânsito: 0;
- Inventários abertos: 0;
- lotes ativos com validade: 2.

Esses zeros são resultados reais do dataset demo atual; não são placeholders produzidos pela interface.

## Fora do escopo da Fase 13

- previsão de demanda/IA;
- estoque mínimo sem regra persistida;
- vendas individuais/POS;
- BI/data warehouse;
- notificações externas;
- métricas contábeis não existentes no domínio;
- materialized views prematuras.

## Próxima lacuna estrutural

`REQ-SEC-002` exige permissões por função e escopo de unidade/setor. Hoje a membership já possui `business_id`, `unit_id` e `sector_id`, mas os helpers de autorização consolidados verificam apenas Organization + role. A próxima fase deve tornar esses escopos efetivos sem redefinir perfis reais enquanto Q-022 estiver aberta.
