# Next Action — Sistema Lojasaph

## Frente ativa

**Issue #132 — Fase 47: estoque mínimo por local e alertas de reposição (`REQ-STK-011`).**

Branch: `agent/stock-minimum-alerts`.

## Frente ON HOLD

**Issue #121 — Backup e recuperação off-site do Supabase Storage.**

Não tocar #121 até existir um gatilho real:

- primeira execução agendada do `Production Storage Backup` após o armamento;
- primeiro anexo Production legítimo para a prova binária completa;
- falha/incidente/regressão real do pipeline.

Enquanto isso, não fazer `workflow_dispatch` artificial, não criar fixture Production, não revalidar repetidamente ausência de run e não refazer S3/R2/guardrails/PostgreSQL.

A próxima janela normal esperada do cron é 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo.

## Contexto da #132

`REQ-STK-011` exige estoque mínimo e alertas de reposição.

Gap confirmado em Production e no schema atual:

- saldo autoritativo existe por `stock_item_id + stock_location_id` em `inventory_balances`;
- não há threshold de mínimo em `stock_items`, `stock_locations` ou `inventory_balances`;
- não existe tabela equivalente de política de reposição;
- Dashboard não possui fonte autoritativa para dizer que um saldo está abaixo do mínimo.

Decisão da slice:

- configurar mínimo por **item + local de estoque**;
- `minimum_quantity` decimal exato e não negativo;
- ausência de política = não configurado;
- `below_minimum := quantity_on_hand < minimum_quantity`;
- igualdade ao mínimo não alerta;
- sem compra automática, previsão de demanda ou sugestão de quantidade.

## NEXT_ACTION imediata

### 1. Inventário técnico

Antes de editar:

1. localizar migrations que definem `stock_items`, `stock_locations`, `inventory_balances` e grants/RLS relacionados;
2. revisar adapters/gateways de estoque e o contrato atual do Workspace;
3. revisar query/modelo do Dashboard e seus filtros Unit/Sector;
4. revisar padrão atual de auditoria para mudanças de configuração de estoque;
5. confirmar o padrão de migration versionada e testes PostgreSQL do head atual.

### 2. Persistência mínima

Implementar uma fonte autoritativa de política de estoque mínimo por item/local, preferindo estrutura própria em vez de acoplar configuração à projeção `inventory_balances`.

O desenho deve garantir:

- FK/Organization consistentes entre item e local;
- uma política por item/local;
- `minimum_quantity >= 0`;
- RLS de leitura conforme visibilidade do local;
- manutenção somente por papéis/escopos de estoque já autorizados;
- nenhum DELETE físico necessário para o fluxo normal se ativação/inativação for suficiente;
- nenhuma permissão para `anon`;
- nenhuma chave privilegiada no browser.

### 3. Estado derivado e Dashboard

Adicionar leitura que compare a política com `inventory_balances` sem duplicar saldo como fonte de verdade.

No Dashboard:

- exibir itens abaixo do mínimo como pendência acionável;
- respeitar Organization + Unit + Sector já existentes;
- não inferir Sector quando o local não possuir vínculo;
- item/local sem política não gera alerta;
- não gerar pedido de compra automaticamente.

### 4. Testes

Cobrir pelo menos:

- criação/edição válida do mínimo;
- mínimo zero;
- valor negativo rejeitado;
- saldo abaixo, igual e acima do mínimo;
- política ausente;
- item/local cross-Organization rejeitado;
- usuário fora do escopo sem leitura/escrita indevida;
- `anon` sem acesso;
- regressão de filtros Unit/Sector do Dashboard;
- auditoria/configuração conforme padrão atual.

### 5. Validação e integração

1. rodar suites PostgreSQL aplicáveis;
2. rodar lint;
3. rodar typecheck;
4. rodar Vitest;
5. rodar production build;
6. validar workflows relevantes;
7. somente após CI verde aplicar/homologar migration em Production;
8. não preencher thresholds de dados existentes por inferência;
9. revalidar RLS/advisors após DDL;
10. atualizar `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION` e documentação do módulo;
11. abrir PR da #132.

## Ordem posterior

Se #132 concluir e não houver nova prioridade/regressão:

1. `REQ-DASH-004` — Dashboard/relatórios de estoque;
2. `REQ-DASH-005` — compras/fornecedores e histórico/variação;
3. `REQ-ITEM-003` — EAN/código de barras e dados fiscais.

Uma frente ON HOLD só volta à frente quando seu gatilho existir; simples espera nunca pausa essa sequência.

## Fora de escopo

- tocar #121 sem gatilho;
- compra automática;
- previsão de demanda/IA;
- estoque máximo/target;
- lead time/sugestão de compra;
- notificação externa;
- resolver itens PENDING por inferência;
- deploy Vercel rotineiro;
- tornar repo private automaticamente.