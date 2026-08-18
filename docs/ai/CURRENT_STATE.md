# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 19 — funcionários operacionais e separação de identidade de acesso — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #50 — merged
- Issue #49 — closed/completed
- merge commit: `f9eae62dd7e2de062c7a48eae326aeec51f6cee0`
- head final validado pré-merge: `2ed1317bd6b8a74e99d8deaa907d2645f6e414fa`
- próxima Issue: #51 — `Fase 20 — perdas, quebras e vencimentos como baixas rastreáveis`

## Fase 19 — entregue

A entrega fecha `REQ-ORG-004` no escopo MVP atual:

- `public.employees` separado de `auth.users`;
- Employee pode existir sem login;
- vínculo opcional `auth_user_id` identifica a pessoa, mas não cria/edita `organization_memberships`;
- Organization obrigatória, nome, código opcional, status e Unit/Sector padrão opcionais;
- hierarquia Unit/Sector validada no banco;
- diretório administrativo restrito por RLS a `owner`, `admin` e `manager` dentro do escopo efetivo;
- Employee Organization-wide exige membership administrativo Organization-wide;
- sem `DELETE` para cliente autenticado; ciclo de vida usa inativação;
- domínio, service, repository e adapter Supabase dedicados;
- UI persistente `/workspace/funcionarios`;
- navegação e workspace carregam Employees/Unit/Sector respeitando RLS;
- suíte PostgreSQL e testes unitários específicos.

Fora do escopo continuam RH/folha/ponto/cargos e salários, CPF/dados sensíveis não requeridos, pessoas reais e resolução de Q-022.

## Validação final da Fase 19

No head `2ed1317bd6b8a74e99d8deaa907d2645f6e414fa` passaram:

- `CI` #249 — success;
- `Inventory Count Integration` #153 — success;
- `Business Transactions Integration` #136 — success.

O CI confirmou lint, typecheck, Vitest, build, migrations em PostgreSQL 17 limpo, seed, backup/restore, suites PostgreSQL anteriores e `supabase/tests/employees.sql`.

## Supabase remoto

Projeto conectado:

- status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero branches de desenvolvimento.

Migrations da Fase 19 aplicadas:

- `20260818215813` — `employees`;
- `20260818220222` — `employee_privilege_hardening`.

A homologação remota encontrou uma diferença importante em relação ao PostgreSQL limpo do CI: default privileges do projeto hospedado deixavam `authenticated` com `DELETE` na tabela recém-criada. A correção foi versionada em migration separada, sem reescrever migration aplicada:

- `anon` sem privilégios em `employees`;
- `authenticated` somente com `SELECT`, `INSERT` e `UPDATE` em nível de tabela;
- `DELETE=false`;
- RLS ativo com `employees_admin_select`, `employees_admin_insert` e `employees_admin_update`;
- índices explícitos cobrindo FKs de `auth_user_id`, Unit e Sector.

Smoke sintético de inserção/hierarquia foi executado dentro de transação e revertido. `public.employees` permaneceu com zero linhas e nenhum dado real foi criado.

Os advisors finais não apontaram warning de segurança específico de Employee nem FK Employee sem índice. Warnings restantes pertencem a objetos preexistentes e não foram ampliados nesta fase.

## Vercel — política vigente

`vercel.json` mantém `git.deploymentEnabled=false`.

- Vercel não é gate rotineiro de desenvolvimento;
- CI é o gate principal;
- deployment manual só quando uma validação realmente depender de ambiente hospedado ou em milestone/release apropriada;
- não reativar auto-deploy para validar commits comuns.

## Próxima lacuna MUST real

`REQ-STK-008 — Perdas e vencimentos` permanece incompleto e `REQ-STK-003` exige motivo estruturado.

O schema já reserva `stock_movements.movement_type = loss | expiration` e possui `reason_code`, mas o módulo persistente documentado cobre entrada, retirada, transferência e inventário — não existe fluxo transacional/UI de baixa por perda, quebra ou vencimento.

Issue #51 foi aberta para a Fase 20 com escopo conservador:

- baixa sempre pelo ledger;
- motivo estruturado, observação apenas complementar;
- perda/quebra/vencimento sem inventar categorias do cliente;
- lote/validade e custo preservados;
- idempotência, auditoria, RLS e escopo existentes;
- fixtures exclusivamente sintéticas;
- `REQ-STK-006` devolução/retorno relacionado permanece separado;
- Q-005 empréstimo x transferência não será inferida.

## Não repetir

- não reabrir Fases 18 ou 19;
- não misturar Employee com autorização/membership;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não reaplicar migrations antigas;
- não corrigir advisors preexistentes fora da Issue ativa por oportunismo;
- não inferir Q-001 a Q-025;
- não implementar devolução/empréstimo dentro da Fase 20 sem requisito específico.
