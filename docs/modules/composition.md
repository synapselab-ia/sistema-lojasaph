# Composição modular do produto

## Objetivo

Implementar a direção da Issue #190 e da ADR-010 sem transformar o Lojasaph em uma coleção de feature flags desconectadas. A definição estrutural de cada capability fica versionada no código; o banco persiste apenas o override aprovado por Organization.

## Registry inicial

A primeira entrega registra explicitamente capabilities de fundação (`organization-context`, `authorization`, `audit`, `composition`) e duas capabilities operacionais (`inventory` e `stock-loans`). As capabilities de fundação são core e nunca podem ser desativadas. `inventory` permanece bloqueada para configuração durante o rollout inicial. `stock-loans` é a primeira capability configurável e declara a dependência `stock-loans -> inventory`.

Ausência de override significa **ativo** para preservar o comportamento das organizações existentes.

## Persistência e autorização

`organization_capability_settings` armazena apenas `organization_id`, `capability_id`, `enabled` e metadados de atualização. Escrita direta pelo papel `authenticated` é negada. Alterações passam por `public.set_organization_capability(...)`, que exige `owner` Organization-wide e registra antes/depois em `audit_logs`.

Todos os membros ativos da Organization podem ler o estado necessário para resolver a experiência do produto; isso não concede permissão para alterar a composição.

## Gating da prova inicial

Quando `stock-loans` está desativada:

- o item **Empréstimos** deixa de aparecer na navegação resolvida;
- `public.record_stock_loan(...)` recusa novos empréstimos com `CAPABILITY_DISABLED`;
- tabelas, movimentos, auditoria e empréstimos existentes permanecem intactos;
- `public.record_stock_loan_restitution(...)` continua disponível de propósito, para permitir liquidar obrigações já abertas;
- reativar restaura a navegação e a criação sem reconstruir histórico.

A rota histórica ainda pode ser alcançada por URL direta nesta primeira prova; isso não constitui boundary de autorização. O backend é o gate autoritativo para novas operações. O endurecimento de superfícies diretas e a expansão para outras capabilities ficam para as próximas fatias da Issue #190.

## UX inicial

`Administração -> Montar sistema` aparece somente para `owner` Organization-wide. A tela explica dependências e impacto antes da alteração, diferencia base necessária de capability configurável e evita expor UUIDs, nomes de tabela ou flags técnicas ao operador.

## Próximas expansões

Antes de liberar novos toggles, mapear os boundaries e dependências reais de Compras, Financeiro, Caixa, Cadastros, FEFO/Validades, importação/PDV, fichas técnicas, consumo de funcionários e dashboards. Cada capability nova deve ter navegação coerente, gate no backend quando aplicável, auditoria e teste de reativação sem perda de dados.
