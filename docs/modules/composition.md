# Composição modular do produto

## Objetivo

Implementar a direção da Issue #190 e da ADR-010 sem transformar o Lojasaph em uma coleção de feature flags desconectadas. A definição estrutural de cada capability fica versionada no código; o banco persiste apenas o override aprovado por Organization.

## Registry atual

O registry contém capabilities de fundação (`organization-context`, `authorization`, `audit`, `composition`) e as capabilities operacionais inicialmente modeladas (`inventory`, `stock-loans`, `stock-minimum`).

As capabilities de fundação são core e nunca podem ser desativadas. `inventory` continua bloqueada para configuração porque é base de dependências. `stock-loans` e `stock-minimum` são configuráveis e declaram a dependência `-> inventory`.

Ausência de override significa **ativo** para preservar o comportamento das organizações existentes.

## Persistência e autorização

`organization_capability_settings` armazena apenas `organization_id`, `capability_id`, `enabled` e metadados de atualização. Escrita direta pelo papel `authenticated` é negada. Alterações passam por `public.set_organization_capability(...)`, que exige `owner` Organization-wide e registra antes/depois em `audit_logs`.

Todos os membros ativos da Organization podem ler o estado necessário para resolver a experiência do produto; isso não concede permissão para alterar a composição.

O helper interno `private.is_capability_enabled(...)` não é executável por `authenticated`. Quando uma policy RLS precisa consultar a composição, usa `private.can_use_capability(...)`, wrapper que primeiro confirma membership da Organization e só então resolve a capability. Isso evita transformar o resolver interno em uma superfície de enumeração cross-Organization.

## Empréstimos

Quando `stock-loans` está desativada:

- o item **Empréstimos** deixa de aparecer na navegação resolvida;
- a URL direta `/workspace/emprestimos` entra em modo explícito de **histórico/liquidação**;
- o formulário de novo empréstimo não é exibido;
- `public.record_stock_loan(...)` continua sendo o gate autoritativo e recusa novas operações com `CAPABILITY_DISABLED`;
- lista, detalhe e histórico existentes permanecem consultáveis conforme autorização normal;
- `public.record_stock_loan_restitution(...)` continua disponível de propósito, para permitir liquidar obrigações já abertas;
- tabelas, movimentos e auditoria permanecem intactos;
- reativar restaura navegação e criação sem reconstruir histórico.

Essa distinção é intencional: desabilitar uma capability não pode criar uma obrigação sem caminho de encerramento.

## Estoque mínimo

`stock-minimum` foi aprovado como segunda capability configurável depois do mapeamento de seus boundaries reais. Ela depende somente de `inventory` e não cria obrigação transacional pendente.

Quando desativada:

- `/workspace/estoque/minimos` deixa a navegação e mostra estado de produto desativado se acessada diretamente;
- atalhos, filtro, coluna e resumo de mínimo desaparecem da posição de Estoque;
- o card e os alertas derivados de mínimo deixam o Dashboard;
- RLS esconde `stock_minimum_policies` da superfície Data API e bloqueia `INSERT/UPDATE` mesmo que alguém tente contornar a interface;
- nenhuma policy física é apagada ou reescrita.

Ao reativar, as mesmas policies voltam a ser visíveis e operacionais. O ciclo de regressão cobre preservação do valor anterior e bloqueio de mutation durante a desativação.

## UX do compositor

`Administração -> Montar sistema` aparece somente para `owner` Organization-wide. A tela mostra Estoque como base necessária e as duas capabilities configuráveis em linguagem de produto, explicando dependência, impacto de desativação e preservação de histórico/configuração antes da confirmação.

O estado resolvido é carregado uma única vez no layout server-side. `RuntimeShell` usa o mesmo conjunto tanto para navegação quanto para um `CapabilityProvider` client-side consumido pelas superfícies operacionais, evitando fontes de verdade paralelas no frontend.

## Próximas expansões

Não liberar novos toggles por quantidade. Antes de adicionar uma terceira capability, mapear os boundaries e dependências reais da candidata e exigir o mesmo contrato: registry, default compatível, navegação/superfícies coerentes, backend/RLS gate quando aplicável, auditoria, isolamento por Organization e reativação sem perda de dados.

Compras, Financeiro, Caixa, Cadastros, FEFO/Validades, importação/PDV, fichas técnicas, consumo de funcionários e dashboards derivados ainda exigem análise própria de dependências antes de qualquer configuração.
