# Administration Capability Map

Status: integrado na Fase 51 / Issue #142 após o PR #151.  
Data: 2026-08-28.

Este documento registra o inventário exigido para a slice de Administração. Ele descreve capacidades técnicas existentes e a UI que pode utilizá-las sem transformar nomes de roles em política de negócio homologada.

## Guardrail

`docs/product/open-questions.md` mantém Q-022 — **Quem pode fazer cada ação?** — aberta. Portanto os nomes `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier` e `viewer` continuam sendo papéis técnicos do sistema, não cargos reais aprovados do cliente.

A UI pode expor as capacidades abaixo porque elas são sustentadas por RLS/RPCs atuais. Ela não deve extrapolar essa fronteira nem inferir que um cargo real corresponde automaticamente a um desses papéis.

## Estrutura

| Capacidade | Boundary atual | Autorização técnica atual | UI integrada | Gap preservado |
| --- | --- | --- | --- | --- |
| Ler Negócios | `businesses` + RLS scope-aware | membership ativo que alcance o Business | Administração → Estrutura | sem redefinir significado da hierarquia real |
| Criar/editar/inativar Negócio | DML autenticado em `businesses` + RLS | `owner/admin/manager` Organization-wide | formulário contextual | sem exclusão física/reparenting |
| Ler Unidades | `units` + RLS scope-aware | membership que alcance a Unit | hierarquia de Estrutura | sem reinterpretar nomes atuais |
| Criar/editar/inativar Unidade | DML autenticado em `units` + RLS | `owner/admin/manager` que alcance o Business | formulário contextual | sem mover Unit entre Businesses |
| Ler Setores | `sectors` + RLS scope-aware | membership que alcance o Sector | hierarquia de Estrutura | Q-001/Q-002 continuam sem inferência |
| Criar/editar/inativar Setor | DML autenticado em `sectors` + RLS | `owner/admin/manager` que alcance a Unit/Sector | formulário contextual | sem mover Sector entre Units |
| Ler Locais de estoque | `stock_locations` + RLS scope-aware | membership que alcance o local | hierarquia de Estrutura | tipo/local não redefine semântica operacional por si só |
| Criar/editar/inativar Local | DML autenticado em `stock_locations` + RLS | `owner/admin/manager` no target scope | formulário contextual | `allow_negative_stock` não é alterado pela jornada administrativa |
| Garantir Sector/Unit coerentes no Local | trigger `private.validate_stock_location_scope_hierarchy` | invariável de banco | transparente à UI | nenhum bypass por formulário |

## Identidade, acesso e permissões

| Capacidade | Boundary atual | Autorização técnica atual | UI integrada | Gap preservado |
| --- | --- | --- | --- | --- |
| Listar acessos e identidade legível | RPC `admin_list_organization_access` | `owner/admin` Organization-wide | Administração → Usuários e permissões | Q-022 ainda decide perfis reais |
| Convidar identidade por e-mail | server action + Supabase Auth Admin `inviteUserByEmail`; membership criado pelo RPC autenticado | chamador precisa ser `owner/admin` Organization-wide; secret permanece server-only | formulário por e-mail/perfil/escopo | entrega/configuração de Auth depende do ambiente; nenhum secret no browser |
| Adicionar/recriar membership | RPC `admin_create_organization_membership` | `owner/admin` Organization-wide | mesma jornada de convite/adicionar acesso | usa somente roles técnicas existentes |
| Alterar papel/escopo/estado | RPC `admin_update_organization_membership` | `owner/admin` Organization-wide | ação contextual no acesso | último owner Organization-wide é protegido; sem nova matriz de autorização |
| Revogar operacionalmente acesso | `target_active=false` no RPC de update | `owner/admin` Organization-wide | estado Ativo/Inativo | não apaga histórico nem identidade Auth |
| Vincular Employee à identidade Auth | RPC `admin_link_employee_identity` | `owner/admin` Organization-wide | seleção pelo nome do funcionário | vínculo identifica a mesma pessoa; não concede autorização |
| Preservar separação Employee/Auth | `employees.auth_user_id` opcional + memberships independentes | RLS de Employee e RPC administrativo | Funcionários não pede UUID; Acessos gerencia o vínculo | Employee continua identidade operacional distinta de login/permissões |
| Proteger último owner | regra dentro de `admin_update_organization_membership` | invariável de boundary | erro de produto legível | não decide quantos owners reais o cliente deve ter |
| Auditar mudanças administrativas | `audit_logs` dentro dos RPCs | server-side no boundary transacional | transparente à UI | trilha não substitui homologação de política |

## Convites

O callback `/auth/invite` continua suportando o bootstrap inicial e o convite administrativo normal. Para convites normais, a identidade convidada só estabelece sessão quando já possui membership ativo visível para ela própria via RLS. O token não autoriza acesso sozinho.

A chave administrativa do Supabase permanece server-only. O browser recebe somente o fluxo normal de convite/sessão.

## Validação integrada

O PR #151 adicionou/alterou testes para:

- escopos e helpers administrativos;
- isolamento por Organization;
- execução restrita dos RPCs;
- criação e alteração de membership com auditoria;
- proteção do último owner;
- vínculo e desvínculo de Employee;
- coerência Sector → Unit de `stock_locations`;
- navegação das novas rotas;
- convite normal versus bootstrap.

A CI do PR #523, Inventory Count Integration #244 e Business Transactions Integration #231 passaram. A CI pós-merge #524 também passou integralmente.

## Limite de homologação

Não houve browser real disponível nesta sessão. Portanto as jornadas de Administração não devem ser registradas como homologadas visualmente em desktop/tablet/mobile apenas por terem passado build e testes. A etapa explícita de homologação UX da Fase 51 continua obrigatória.
