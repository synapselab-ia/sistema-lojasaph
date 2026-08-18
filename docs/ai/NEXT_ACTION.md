# Next Action — Sistema Lojasaph

## Contexto

Fase 18 está concluída e mergeada na `main` pelo PR #46. Issue #45 está closed/completed.

O próximo requisito MUST verificavelmente incompleto é `REQ-ORG-004 — Funcionários e usuários`:

- o escopo MVP inclui funcionários básicos;
- o modelo lógico prevê `employees` separado de `users`;
- a migration física de fundação possui `auth.users`/`organization_memberships`, mas não possui `employees`;
- não existe módulo dedicado de funcionários.

A Issue #49 documenta a Fase 19.

## Fazer agora

1. Confirmar estado real da Issue #49 e da `main`.
2. Criar/usar a branch `agent/employees` a partir da `main` atual.
3. Ler antes de editar:
   - `docs/architecture/data-model.md` — seção Pessoas e acesso;
   - `docs/modules/master-data.md`;
   - migrations de foundation, RLS e scoped permissions;
   - `src/modules/master-data` e `src/modules/organization`;
   - fluxo atual de `organization_memberships`/Auth.
4. Definir a representação física mínima de `employees`:
   - Organization obrigatória;
   - nome obrigatório;
   - código/identificador operacional opcional;
   - status ativo/inativo;
   - Unit/Sector padrão opcionais e coerentes com Organization;
   - vínculo opcional e explícito com identidade autenticada, sem conceder autorização por efeito colateral.
5. Criar migration versionada e RLS usando os helpers de escopo já homologados.
6. Criar testes PostgreSQL para:
   - cross-Organization;
   - membership Organization-wide e escopado;
   - roles administrativas permitidas/bloqueadas;
   - vínculo opcional com usuário;
   - inativação sem delete físico;
   - Employee sem login continuar válido como pessoa operacional.
7. Implementar domínio/casos de uso/repository/adapter persistente sem acoplamento do domínio ao SDK.
8. Criar UI administrativa mínima e responsiva para listar, criar, editar e inativar funcionários.
9. Atualizar `docs/modules/master-data.md` para refletir a persistência atual e o novo submódulo.
10. Rodar lint, typecheck, Vitest, build e todas as suites PostgreSQL relevantes.
11. Só após CI verde aplicar/homologar migration no Supabase remoto, com dados sintéticos e sem deixar resíduos desnecessários.
12. Atualizar PR/Issue e continuidade.

## Política de Vercel

- `git.deploymentEnabled=false` permanece vigente;
- não reativar deployments automáticos;
- não exigir Preview para cada commit/head;
- CI é o gate principal desta fase;
- usar deployment manual apenas se surgir uma validação concreta que dependa de ambiente hospedado.

## Não fazer

- não criar folha de pagamento/RH/ponto;
- não adicionar CPF, salário ou outros dados pessoais não requeridos;
- não importar funcionários reais;
- não inferir Q-022 ou demais Q-001..Q-025;
- não transformar Employee em role/membership;
- não alterar regras de negócio de Estoque/Compras/Financeiro/Caixa fora do necessário para referência a Employee;
- não reabrir Fase 18.

## Critério de conclusão da próxima fase

Employee existe como entidade persistente operacional separada de autenticação, com vínculo opcional e explícito a usuário, RLS/escopo corretos, UI mínima, testes e CI verdes. Criar/inativar Employee não altera acesso ao sistema automaticamente.
