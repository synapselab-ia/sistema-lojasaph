# Módulo — Dashboard operacional, alertas e KPIs

Status: Fase 25 — período gerencial explícito implementado sobre o Dashboard com Unit + Setor da Fase 24.

## Objetivo

Transformar `/workspace` em uma visão orientada a ação, consolidando sinais persistentes de Financeiro, Caixa, Compras e Estoque sem criar uma segunda fonte de verdade nem inventar granularidade organizacional ou temporal.

## Princípios

- dashboard é somente leitura;
- regras transacionais continuam nos módulos de origem;
- ausência de dado não é convertida em dado inventado;
- status financeiro vem de `payable_installment_summary`;
- timezone da Organization define a data de negócio do painel;
- RLS permanece a fronteira de isolamento; o dashboard não usa service role nem bypass;
- Unit e Setor só atuam quando a relação explícita existe;
- período só atua quando a métrica possui data de negócio canônica comprovada;
- indicadores de estado atual não são convertidos em históricos por conveniência;
- `horizonDays` e período explícito são conceitos diferentes e permanecem simultaneamente disponíveis;
- não foi necessária migration/read model nova nas Fases 24/25.

## Filtros

O Dashboard oferece:

- Unidade: todas ou uma Unit ativa autorizada;
- Setor: todos os Setores autorizados ou um Setor explícito;
- Horizonte de alertas: 7, 15 ou 30 dias;
- Período gerencial opcional: `dateFrom` + `dateTo`, inclusive.

### Unit + Setor

A lista de Setores é carregada pelo mesmo client Supabase autenticado do Dashboard. A policy `sectors_member_select`/RLS decide quais linhas são visíveis.

O adapter rejeita Unit invisível, Setor invisível e combinação Unit + Setor incompatível. Transferências consideram origem e destino separadamente: Unit + Setor devem coincidir no mesmo endpoint. Registros sem `sector_id` não são atribuídos por nome, Unit, usuário ou heurística.

Caixa permanece Unit-level porque `cash_registers` não possui `sector_id`.

### Período explícito

O período é opcional. Sem `dateFrom/dateTo`, o comportamento anterior é preservado.

Quando usado:

- as duas datas são obrigatórias;
- formato aceito: ISO `YYYY-MM-DD` válido;
- `dateFrom <= dateTo`;
- os limites são inclusivos;
- datas representam datas de negócio no timezone da Organization;
- `created_at` não é usado como substituto genérico de data de negócio.

`horizonDays` não é substituído pelo período. O horizonte continua definindo janelas relativas de alertas próximos/recentes; quando um período está ativo, métricas que usam ambos representam a interseção do período com a janela relativa.

## Matriz de semântica temporal

### Financeiro

Fonte: `payable_installment_summary`.

Período canônico: `due_date` da parcela.

Com período ativo, entram somente obrigações cujo vencimento esteja dentro do intervalo. Isso governa:

- total nominal;
- saldo em aberto;
- parcelas vencidas;
- parcelas vencendo hoje;
- parcelas a vencer dentro do horizonte;
- `net_paid_amount` agregado para essas obrigações.

`net_paid_amount` é **cumulativo por obrigação**. Portanto o Dashboard não o chama de “pagamentos realizados no período”. A UI usa `Pago líquido acumulado` quando existe período e explica que o valor se refere às obrigações com vencimento no intervalo. A Fase 25 não cria um novo KPI por `payments.paid_at`.

### Caixa

Fonte: `cash_sessions`; Unit por `cash_registers`.

Data canônica para fechamentos: `business_date`.

- caixas abertos: **estado atual**, não filtrado por período;
- divergências de fechamentos: filtradas por `business_date` quando período está ativo;
- fechamentos recentes: `business_date` dentro do horizonte e, quando aplicável, também dentro do período;
- Setor nunca filtra Caixa no modelo atual.

O adapter carrega sessões abertas separadamente de sessões fechadas para preservar o snapshot atual mesmo quando o período aponta para datas históricas.

### Compras

Fonte: `purchase_orders`; Unit/Setor pelo `stock_location` explícito.

- pedidos pendentes (`ordered` / `partially_received`): **estado atual**, não filtrado por período;
- entrega atrasada / entrega próxima: `expected_delivery_date`;
- pedido sem `expected_delivery_date` continua pendente no snapshot, mas não é fabricado dentro de um período de entregas.

### Transferências

Fonte: `stock_transfers`.

`transferências em trânsito` (`dispatched` / `partially_received`) é **estado atual**. `requested_at`, `dispatched_at` e `received_at` não são usados para fabricar uma métrica histórica nesta fase porque não existe um único evento temporal que represente corretamente “em trânsito no período”.

### Inventários

Fonte: `inventory_counts`.

`inventários em andamento` (`counting` / `review`) é **estado atual**. `started_at`/`confirmed_at` permanecem disponíveis no domínio, mas não são aplicados ao KPI atual sem alterar sua semântica.

### Validades

Fonte: `inventory_batches`.

Período canônico: `expiration_date`.

- lotes vencidos: expiraram antes da data de negócio atual e, com período ativo, dentro do intervalo explícito;
- lotes vencendo: `expiration_date` dentro do horizonte e, com período ativo, também dentro do intervalo;
- lotes sem validade permanecem desconhecidos e não geram alerta fictício.

## KPIs atuais

### Financeiro

- total nominal de obrigações no escopo;
- total líquido pago acumulado das obrigações no escopo;
- saldo positivo em aberto;
- quantidade vencida;
- quantidade vencendo hoje;
- quantidade a vencer dentro do horizonte.

### Caixa

- sessões abertas — estado atual;
- fechamentos recentes — horizonte + período quando aplicado;
- fechamentos com divergência — período quando aplicado, horizonte normal quando não há período explícito.

### Compras

- pedidos pendentes — estado atual;
- entregas previstas atrasadas — `expected_delivery_date`;
- entregas previstas dentro do horizonte — `expected_delivery_date`.

### Estoque

- transferências em trânsito — estado atual;
- inventários físicos em andamento — estado atual;
- lotes vencidos — `expiration_date`;
- lotes vencendo dentro do horizonte — `expiration_date`.

Nenhum KPI ou gráfico novo foi criado na Fase 25.

## Fila de atenção

A fila não mostra cards vazios. Cada sinal herda exatamente a semântica do KPI que o origina. Com período ativo, a UI informa que caixas abertos, pedidos pendentes, transferências em trânsito e inventários em andamento permanecem snapshots atuais.

Cada item continua navegando para o módulo transacional de origem.

## Implementação

### `dashboard-summary.ts`

Camada pura, sem dependência de Supabase/React:

- valida horizonte;
- valida período completo, ISO e ordenado;
- filtra Unit/Setor;
- aplica período apenas às métricas com data canônica;
- mantém snapshots atuais fora do recorte temporal;
- agrega Money sem float binário;
- produz KPIs e fila de atenção.

### `supabase-dashboard-query.ts`

Adapter de leitura:

- usa somente client autenticado normal;
- valida período antes das consultas;
- resolve timezone da Organization;
- carrega Units/Setores/locais/caixas sob RLS;
- Financeiro pode ser reduzido por `due_date` no próprio read path;
- sessões abertas de Caixa são consultadas separadamente dos fechamentos por `business_date`;
- Compras/Transferências/Inventários permanecem carregados conforme seu estado atual;
- lotes são carregados até o maior limite necessário entre horizonte e `dateTo`;
- não realiza mutation;
- não usa chave privilegiada.

### `/workspace`

Interface responsiva com:

- data de negócio + timezone;
- filtros de Unit, Setor e horizonte;
- dois campos de data + ação explícita `Aplicar período`;
- ação `Limpar` para retornar ao comportamento sem período;
- explicação permanente da diferença entre Horizonte e Período;
- indicação de `estado atual` nos cards que não são recortados temporalmente;
- indicação de escopo Unidade para Caixa quando Setor está ativo;
- explicação de que `Pago líquido acumulado` não representa eventos de pagamento do intervalo;
- proteção monotônica contra respostas concorrentes.

## Testes

`dashboard-summary.test.ts` cobre:

- agregação financeira exata;
- Unit/Setor e Transferências no mesmo endpoint;
- Caixa permanecendo Unit-level;
- período com boundaries inclusivos;
- Financeiro por `due_date`;
- Caixa fechado por `business_date` com caixa aberto preservado como current-state;
- Compras por `expected_delivery_date`, incluindo ausência de data;
- Validades por `expiration_date`;
- snapshots de pedidos/transferências/inventários preservados;
- separação entre horizonte e período;
- intervalo incompleto, data ISO inválida e `dateFrom > dateTo`;
- timezone da Organization;
- horizonte inválido.

`supabase-dashboard-query.test.ts` continua cobrindo a fronteira de seleção autenticada Unit/Setor. O período também é validado pela função pura compartilhada usada pelo adapter antes de consultar as fontes.

## Segurança e Supabase

A Fase 25 não cria migration, view, RPC, grant ou policy. O Dashboard continua usando as tabelas/views já expostas e protegidas. `payable_installment_summary` permanece `security_invoker=true`.

A mudança de Data API anunciada pelo Supabase em 2026, que exige grants explícitos para novas tabelas conforme a configuração do projeto, não altera esta fase porque nenhum objeto novo foi criado. RLS continua sendo aplicado normalmente às fontes existentes.

## Estado remoto observado antes da Fase 25

No dataset hospedado no início da fase:

- Financeiro: 0 parcelas no read model;
- Caixa: 0 sessões;
- Compras: 0 pedidos;
- Transferências: 0;
- Inventários: 0;
- lotes ativos com saldo e validade: 2, com `expiration_date` entre `2026-08-20` e `2026-08-28`.

Esses zeros são dados reais do ambiente demo atual, não placeholders.

## Fora do escopo da Fase 25

- pagamentos realizados no período como novo KPI por `payments.paid_at`;
- transformar snapshots atuais em séries históricas;
- novos KPIs/gráficos/BI;
- estoque mínimo/previsão de demanda;
- atribuir Caixa a Setor sem modelagem explícita;
- redefinir roles/memberships/Q-022;
- dados reais/importação;
- notificações externas;
- deployment Vercel rotineiro.
