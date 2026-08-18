# Módulo — Caixa, meios de pagamento e fechamento diário

Status: Fase 12 concluída tecnicamente no PR #34.

## Objetivo

Substituir o controle mensal de Caixa por sessões persistentes por unidade/data/caixa, com fundo inicial, totais consolidados por meio de pagamento, taxas versionadas, entradas/sangrias e fechamento esperado x contado auditável, sem inventar vendas individuais ou regras ainda abertas.

## Modelo persistente

- `cash_registers`: caixa/terminal operacional por Organization/Unit.
- `payment_methods`: meios configuráveis (`cash`, `card`, `instant`, `voucher`, `other`) com indicação explícita de impacto na gaveta.
- `fee_rules`: taxa percentual/fixa versionada por vigência e meio de pagamento.
- `cash_sessions`: sessão por caixa, data de negócio e sequência, com fundo inicial, estado e valores de fechamento.
- `payment_method_totals`: snapshot consolidado de bruto, taxa e líquido por sessão/meio.
- `cash_movements`: eventos append-only `cash_in`, `cash_out` e `employee_consumption`.

## Perguntas abertas preservadas

### Q-007 — vendas ou apenas totais

A Fase 12 registra apenas totais consolidados por meio de pagamento. Não foram criadas entidades de venda individual, item vendido ou integração POS/PDV.

### Q-009 — Consumo Funcionários

`employee_consumption` é uma categoria operacional separada. Não compõe automaticamente faturamento, receita, desconto de folha ou caixa esperado. A semântica final permanece pendente.

### Q-010 — significado histórico de Encerramento

O sistema não copia a fórmula histórica como campo manual. Registra separadamente:

- `opening_float`;
- `expected_cash_amount`;
- `counted_cash_amount`;
- `cash_difference`.

A divergência é derivada no fechamento.

### Q-011 — Voucher

Voucher é um meio de pagamento habilitável e opcional, não um campo obrigatório do caixa.

### Q-012 — taxas

Taxas não ficam hardcoded. `fee_rules` preserva percentual, valor fixo e vigência. A Fase 12 não inventa regras adicionais por adquirente, bandeira ou número de parcelas.

## Fórmula de fechamento

Na Fase 12:

`expected_cash_amount = opening_float + meios que afetam a gaveta + cash_in - cash_out`

`cash_difference = counted_cash_amount - expected_cash_amount`

Somente meios com `affects_cash_drawer = true` entram no esperado da gaveta. Crédito, Pix, Voucher e outros meios podem ser registrados normalmente sem alterar o dinheiro físico esperado, salvo configuração explícita.

`employee_consumption` permanece fora da fórmula.

Exemplo validado em CI e homologação:

- fundo inicial: R$ 100;
- dinheiro: R$ 500;
- entrada: R$ 100;
- sangria: R$ 40;
- esperado: R$ 660;
- contado: R$ 650;
- divergência: `-R$ 10`.

## Commands PostgreSQL

### `create_cash_register`

- papéis `owner/admin/manager`;
- valida Organization e Unit ativos;
- command ID fornece idempotência;
- auditado.

### `create_payment_method`

- papéis `owner/admin/manager`;
- códigos normalizados por Organization;
- meio pode ou não afetar gaveta;
- Voucher é suportado sem ser obrigatório;
- auditado.

### `create_fee_rule`

- papéis `owner/admin/manager`;
- meio precisa existir na mesma Organization;
- vigência e valores são validados;
- taxa não é hardcoded na UI;
- auditado.

### `open_cash_session`

- papéis `owner/admin/manager/cashier`;
- identidade única por caixa/data/sequence;
- fundo inicial monetário exato;
- retry idempotente compara payload;
- auditado.

### `set_cash_payment_total`

- papéis operacionais;
- mantém uma linha consolidada por sessão/meio;
- aceita taxa informada ou calcula pela regra versionada selecionada;
- retry não duplica linha;
- bruto/taxa/líquido permanecem explícitos;
- auditado.

### `record_cash_movement`

- papéis operacionais;
- eventos append-only para entrada, sangria e Consumo Funcionários;
- exige sessão aberta;
- retry não duplica movimento;
- auditado.

### `close_cash_session`

- papéis operacionais;
- exige sessão aberta;
- calcula esperado no banco;
- persiste contado e divergência na mesma transação;
- retry idempotente compara contado/observação;
- sessão fechada não aceita novas mutações operacionais;
- auditado.

### `cancel_cash_session`

- somente sessão aberta;
- preserva histórico, não apaga registros;
- retry compara também o motivo;
- auditado.

## Segurança e permissões

As tabelas permitem leitura por membership da Organization via RLS e não aceitam INSERT/UPDATE/DELETE direto de `authenticated`/`anon`.

Os commands são `SECURITY DEFINER` intencionais e revalidam `auth.uid()`, papel e Organization. `EXECUTE` é concedido apenas a `authenticated`; `anon` não executa os commands.

Na aplicação:

- `manageCashConfig = owner/admin/manager`;
- `operateCash = owner/admin/manager/cashier`.

A UI apenas reflete a política; a fronteira de segurança permanece no PostgreSQL.

## UI persistente

`/workspace/caixa` oferece:

- configuração de caixas físicos;
- configuração de meios de pagamento;
- regra de taxa versionada;
- abertura de sessão por data/sequence;
- registro de totais consolidados;
- entrada, sangria e Consumo Funcionários separado;
- fechamento com esperado, contado e divergência;
- cancelamento de sessão aberta;
- histórico de sessões e valores.

A navegação persistente inclui Caixa.

## Testes e CI

`supabase/tests/cash_sessions.sql` roda no workflow `Business Transactions Integration` depois das suites estabilizadas de Estoque, Inventário, Compras e Financeiro.

Cobre:

- configuração por manager;
- cashier impedido de alterar configuração;
- direct write negado;
- abertura e retry;
- identidade única por caixa/data/sequence;
- Dinheiro, Crédito, Pix e Voucher;
- taxa de cartão por regra versionada;
- bruto/taxa/líquido;
- retry de total sem duplicação;
- entrada/sangria;
- Consumo Funcionários separado;
- fechamento esperado x contado/divergência;
- bloqueio após fechamento;
- segunda sequence e cancelamento;
- conflito de idempotência por motivo diferente;
- viewer read-only;
- cross-Organization;
- anon.

A implementação final passou lint, typecheck, testes unitários, production build, CI PostgreSQL 17 e replay completo dos módulos anteriores.

## Supabase remoto

A migration `cash_sessions_flow` está aplicada no projeto homologado em `sa-east-1`.

Homologação em `BEGIN/ROLLBACK` confirmou:

- configuração de caixa, Dinheiro, Crédito, Pix e Voucher;
- regra de taxa de 2%: bruto R$ 1.000, taxa R$ 20, líquido R$ 980;
- abertura e retries;
- entrada R$ 100 e sangria R$ 40;
- Consumo Funcionários de R$ 25 preservado fora da fórmula;
- esperado R$ 660, contado R$ 650 e divergência `-R$ 10`;
- cancelamento idempotente de segunda sessão;
- trilha de auditoria.

Após rollback ficaram em zero os registros temporários de sessão, caixa, meios, regras, movimentos, usuários e memberships.

Security Advisor mantém warnings esperados dos command RPCs `SECURITY DEFINER`; Performance Advisor retornou apenas INFO de FKs/índices e índices ainda sem uso para tuning baseado em carga real.

## Higiene de migrations

Durante a Fase 12 um gerador temporário de migration disparou mais de uma vez e criou shells vazios. Todos os shells duplicados foram removidos. A única migration de Caixa versionada que contém schema é:

- `supabase/migrations/20260818130358_cash_sessions_flow.sql`.

Não recriar nem restaurar os arquivos vazios removidos.

## Fora do escopo da Fase 12

- vendas individuais;
- integração POS/PDV;
- conciliação bancária/adquirente;
- folha/desconto de funcionário;
- classificação definitiva de Consumo Funcionários;
- dados reais do cliente.

Próxima fase registrada: Issue #35 — Dashboard operacional, alertas e KPIs.
