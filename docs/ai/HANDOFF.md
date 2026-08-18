# Handoff — Sistema Lojasaph

## Estado

A Fase 19 foi concluída e integrada.

- PR #50 — merged;
- Issue #49 — closed/completed;
- merge commit: `f9eae62dd7e2de062c7a48eae326aeec51f6cee0`;
- head final pré-merge: `2ed1317bd6b8a74e99d8deaa907d2645f6e414fa`;
- `CI` #249 — success;
- `Inventory Count Integration` #153 — success;
- `Business Transactions Integration` #136 — success.

## Fase 19 — o que ficou pronto

`REQ-ORG-004` agora possui caminho persistente real:

- Employee separado de identidade autenticada;
- Employee sem login é válido;
- vínculo opcional com `auth.users` sem efeito sobre memberships/roles;
- cadastro administrativo com Unit/Sector padrão opcionais;
- RLS administrativo por escopo;
- inativação em vez de delete físico;
- UI `/workspace/funcionarios`;
- testes unitários e PostgreSQL integrados ao CI.

### Hardening remoto importante

Ao aplicar a primeira migration no Supabase hospedado, a checagem pós-DDL mostrou que os default privileges do projeto davam `DELETE` a `authenticated`, embora o PostgreSQL limpo do CI não fizesse isso.

Foi criada e validada uma segunda migration:

- `employee_privilege_hardening`;
- revoga todos os privilégios de `anon` na tabela;
- revoga `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` de `authenticated`;
- garante apenas `SELECT`/`INSERT`/`UPDATE` em nível de tabela;
- adiciona índices cobrindo FKs apontadas pelo advisor.

Estado remoto final:

- projeto `ACTIVE_HEALTHY`, PostgreSQL 17;
- zero branches;
- migrations `employees` (`20260818215813`) e `employee_privilege_hardening` (`20260818220222`) aplicadas;
- RLS ativo;
- `anon` sem acesso à tabela;
- `authenticated` sem `DELETE`;
- três policies administrativas de Employee;
- smoke sintético executado com rollback;
- zero linhas em `employees` após homologação;
- nenhum dado real usado.

## Vercel

Não usar Vercel como gate rotineiro.

`vercel.json` continua com `git.deploymentEnabled=false`. CI é o gate principal. Deployment manual somente quando houver validação que realmente dependa de hosting/browser real ou em milestone/release apropriada.

## Próxima frente — Issue #51

Título: `Fase 20 — perdas, quebras e vencimentos como baixas rastreáveis`.

Motivo objetivo:

- `REQ-STK-008` é MUST;
- `REQ-STK-003` exige motivo estruturado;
- `stock_movements` já aceita `loss` e `expiration` e possui `reason_code`;
- o módulo persistente atual documenta entrada, retirada, transferência e inventário, mas não baixa por perda/quebra/vencimento;
- não havia Issue aberta após o fechamento da Fase 19.

### Defaults já registrados na Issue #51

- toda baixa passa pelo ledger, nunca por edição de saldo;
- motivo estruturado; observação apenas complementar;
- motivos mínimos reversíveis (`loss`, `breakage`, `expiration`, `other`) sem inventar taxonomia real do cliente;
- lote/validade/custo preservados;
- idempotência por command ID;
- RLS e papéis/escopos de estoque existentes;
- sem dados reais;
- `REQ-STK-006` devolução/retorno fica separado;
- Q-005 empréstimo x transferência não deve ser inferida.

## Próximo chat deve fazer

1. confirmar Issue #51, `main`, branches e PRs reais;
2. criar/usar branch `agent/stock-losses` a partir da `main` atual;
3. reler `docs/modules/inventory.md`, `docs/product/requirements.md`, ADRs de ledger/custeio e migrations/RPCs de retirada/lotes/scoped permissions;
4. reutilizar as invariantes de `record_stock_withdrawal` para lock/saldo/lote/custo, sem duplicar lógica insegura;
5. definir motivo estruturado mínimo e como ele é configurado/versionado;
6. criar migration e testes PostgreSQL antes da integração de UI;
7. implementar comando/gateway/UI persistente de perda/quebra/vencimento;
8. validar idempotência, audit log, custo, lotes, roles/escopo, cross-Organization e rollback;
9. rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL;
10. só depois de CI verde aplicar/homologar no Supabase remoto com dados sintéticos e rollback;
11. não usar Vercel sem necessidade concreta;
12. atualizar PR/Issue e continuidade ao encerrar.

## Não fazer

- não reabrir Fase 19;
- não mexer em Employee sem defeito relacionado à nova frente;
- não reativar auto-deploy Vercel;
- não resolver advisors antigos fora de escopo por oportunismo;
- não implementar devolução/retorno (`REQ-STK-006`) nesta fase;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não importar dados reais;
- não inferir Q-001 a Q-025.
