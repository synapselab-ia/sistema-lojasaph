# Módulo — Dashboard operacional, alertas e KPIs

Status: Fase 24 — filtro gerencial por Setor implementado sobre as fontes persistentes existentes.

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
- filtro de Setor só atua onde existe relacionamento setorial explícito;
- registro sem `sector_id` comprovado não é atribuído a Setor por nome, Unit, usuário ou heurística;
- não foi necessária migration/read model novo para a Fase 24 porque as fontes existentes já carregam as relações necessárias.

## Fontes consultadas

### Financeiro

`payable_installment_summary` fornece:

- `unit_id` e `sector_id` do documento financeiro;
- valor nominal;
- total líquido pago;
- saldo;
- vencimento;
- status `cancelled`, `paid`, `overdue`, `due_today`, `upcoming`.

O Dashboard não recalcula esse status no React. Quando Setor é selecionado, somente linhas cujo `sector_id` corresponde explicitamente ao filtro entram nos KPIs.

### Caixa

`cash_sessions` fornece:

- sessões abertas;
- sessões fechadas no período;
- divergências não-zero.

A relação com unidade é resolvida por `cash_registers`. `cash_registers` não possui `sector_id` no modelo atual, portanto **Caixa permanece Unit-level mesmo quando existe Setor selecionado**. A interface sinaliza essa limitação em vez de simular granularidade setorial.

### Compras

`purchase_orders` fornece:

- pedidos `ordered` / `partially_received`;
- data prevista de entrega;
- pedidos com previsão atrasada;
- entregas dentro do horizonte selecionado.

A relação com Unit e Setor é resolvida pelo `stock_location`. Sob filtro de Setor, só entram pedidos cujo local possui `stock_locations.sector_id` explicitamente igual ao filtro. Local sem Setor fica fora do resultado setorial.

### Estoque

- `stock_transfers`: transferências `dispatched` / `partially_received`;
- `inventory_counts`: contagens `counting` / `review`;
- `inventory_batches`: lotes ativos com saldo e validade informada.

Inventários e validades herdam Unit/Setor exclusivamente de `stock_locations`.

Para transferências, o vínculo setorial é avaliado separadamente em origem e destino. Uma transferência pertence ao filtro quando **o mesmo endpoint** satisfaz os filtros ativos de Unit e Setor. Isso impede combinar a Unit de uma ponta com o Setor da outra. Endpoints sem `stock_locations.sector_id` não são classificados em Setor.

Lotes sem validade continuam desconhecidos e não viram alerta fictício.

## Filtros

O Dashboard oferece:

- unidade: todas ou uma Unit ativa autorizada;
- Setor: todos os Setores autorizados ou um Setor explícito;
- horizonte: 7, 15 ou 30 dias.

### Autorização do Setor

A lista de Setores é carregada pelo mesmo client Supabase autenticado do Dashboard. A policy `sectors_member_select`/RLS decide quais linhas são visíveis; não há service role, lista hardcoded ou bypass.

O adapter rejeita:

- Unit que não apareceu na leitura autenticada;
- Setor que não apareceu na leitura autenticada;
- combinação Unit + Setor em que o Setor não pertence à Unit selecionada.

Na UI, trocar a Unit remove automaticamente um Setor selecionado que se torne incompatível. Quando nenhuma Unit está selecionada, a lista pode conter todos os Setores que o RLS daquele usuário permitir.

### Semântica por fonte

Com Setor ativo:

- Financeiro: filtra por `payable_installment_summary.sector_id`;
- Compras: filtra pelo `sector_id` explícito do local do pedido;
- Inventários: filtra pelo `sector_id` explícito do local contado;
- Validades: filtra pelo `sector_id` explícito do local do lote;
- Transferências: filtra quando origem ou destino possui o Setor explícito, respeitando Unit + Setor no mesmo endpoint;
- Caixa: **não** é filtrado por Setor; continua usando Unit + horizonte e recebe indicação visual de “escopo Unidade”.

O horizonte afeta:

- contas a vencer;
- entregas previstas;
- lotes próximos da validade;
- período de fechamentos recentes de Caixa.

Ele é um filtro de visualização, não substitui futura decisão sobre intervalo de datas gerencial arbitrário.

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

A Fase 24 não cria KPI novo nem altera fórmula/status existente.

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

Cada item navega diretamente para o módulo de origem. Com Setor ativo, a interface informa que sinais de Caixa permanecem Unit-level.

## Implementação

### `dashboard-summary.ts`

Camada pura, sem dependência de Supabase/React:

- filtra Unit;
- filtra Setor apenas nos rows com relação explícita;
- trata Transferência por endpoint;
- mantém Caixa fora do filtro setorial;
- aplica horizonte;
- agrega Money sem float binário;
- produz KPIs;
- produz fila de atenção.

### `supabase-dashboard-query.ts`

Adapter de leitura:

- usa o client autenticado normal;
- consulta somente tabelas/views já protegidas;
- resolve Organization timezone;
- carrega Units, Setores, locais e caixas para relacionar dados aos escopos;
- valida Unit/Setor contra as linhas retornadas pelo RLS;
- restringe Financeiro pelo `sector_id` do read model quando selecionado;
- restringe fontes de estoque aos IDs de locais explicitamente vinculados ao Setor;
- não realiza mutation;
- não usa chave privilegiada.

### `/workspace`

Interface responsiva com:

- data de negócio + timezone;
- filtro de Unit;
- filtro de Setor;
- filtro de horizonte;
- explicação de granularidade quando Setor está ativo;
- fila de atenção;
- KPIs financeiros;
- KPIs operacionais;
- identificação explícita dos cards de Caixa que permanecem Unit-level;
- estados explícitos de loading/erro;
- links para os módulos transacionais.

Requests concorrentes de filtro usam sequência monotônica: uma resposta antiga não pode sobrescrever uma seleção mais recente do usuário.

## Testes

`dashboard-summary.test.ts` cobre:

- agregação financeira exata;
- isolamento lógico do filtro por Unit;
- filtro por Setor sem absorver registros sem vínculo;
- Unit + Setor no mesmo endpoint de Transferência;
- Caixa permanecendo Unit-level sob Setor;
- horizonte variável;
- timezone da Organization;
- rejeição de horizonte inválido.

`supabase-dashboard-query.test.ts` cobre a fronteira de seleção autenticada:

- Setor visível + Unit compatível;
- Setor visível sem Unit obrigatória;
- Setor ausente da lista RLS rejeitado;
- Unit + Setor incompatíveis rejeitados;
- Unit ausente da leitura autenticada rejeitada.

## Estado remoto observado antes da Fase 24

No Supabase hospedado atual:

- existem 3 Setores ativos;
- `payable_installment_summary` expõe `sector_id`;
- `stock_locations` possui coluna `sector_id`;
- os 3 locais ativos atuais estão sem Setor explícito;
- `cash_registers` não possui `sector_id`;
- `authenticated` possui SELECT nas fontes necessárias;
- a leitura de Setores é protegida por `private.can_read_sector(...)` via RLS.

Esses fatos determinam o comportamento: o sistema suporta granularidade setorial quando o dado possuir vínculo, mas não classifica os locais atuais em Setor artificialmente.

## Fora do escopo da Fase 24

- novos KPIs ou gráficos;
- estoque mínimo/previsão de demanda;
- atribuir Caixa a Setor sem modelagem explícita;
- redefinir roles/memberships/Q-022;
- resolver toda a semântica de intervalo de datas arbitrário de `REQ-DASH-002`;
- dados reais/importação;
- BI/data warehouse;
- notificações externas;
- deployment Vercel rotineiro.
