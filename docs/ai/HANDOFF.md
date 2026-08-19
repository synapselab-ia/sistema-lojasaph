# Handoff — Sistema Lojasaph

## Estado

A Fase 20 foi concluída e integrada.

- PR #52 — merged;
- Issue #51 — closed/completed;
- merge commit: `a6da7e46e340763c2cf724c2c3b625616c149a80`;
- head final pré-merge: `e5d3b2e0f6752f732ae86c32c66fd488f633eb90`;
- `CI` #253 — success;
- `Inventory Count Integration` #155 — success;
- `Business Transactions Integration` #138 — success.

## Fase 20 — o que ficou pronto

`REQ-STK-008` agora possui fluxo persistente de baixas:

- `stock_loss_reasons` com motivos estruturados por Organization;
- defaults `loss`, `breakage`, `expiration`, `other`;
- `record_stock_loss` transacional e idempotente;
- `movement_type` derivado pelo banco;
- saldo/custo/lote/audit processados atomicamente;
- retirada e baixa compartilham o núcleo privado de saída, evitando divergência de FEFO/locks/custo/estoque negativo;
- vencimento rastreado exige lote explícito já vencido e não derrama quantidade para lote futuro;
- UI `/workspace/baixas` com histórico recente;
- nova suíte PostgreSQL no CI.

### Fix de policy importante

O primeiro CI encontrou um erro real na leitura do catálogo: `private.has_org_role(..., NULL)` não representa membership genérica. A migration `stock_loss_reason_read_scope_fix` recriou somente a policy de SELECT com `private.is_org_member`.

Resultado final:

- membro ativo pode ler motivos;
- configuração permanece Organization-wide para `owner/admin/manager/inventory`;
- `anon` não acessa a tabela nem o RPC;
- `authenticated` não possui `DELETE`.

## Supabase remoto

Estado homologado:

- projeto `ACTIVE_HEALTHY`, PostgreSQL 17;
- zero branches;
- `stock_loss_flow` (`20260819004720`) aplicado;
- `stock_loss_reason_read_scope_fix` (`20260819004730`) aplicado;
- RLS ativo;
- 4 motivos-base na Organization existente;
- grants/policies conferidos diretamente no PostgreSQL;
- `record_stock_loss` executável somente por `authenticated` entre os papéis de API verificados e protegido internamente por auth/role/scope;
- smoke sintético registrou `breakage`, validou movimento/saldo/custo/audit e fez rollback;
- zero resíduo sintético.

O advisor de segurança reporta `record_stock_loss` por ser `SECURITY DEFINER` executável por `authenticated`. Isso é esperado e intencional para este RPC transacional: ele valida `auth.uid()`, role e escopo antes de chamar funções privadas. Não revogar EXECUTE sem redesenhar a API. Não usar esse lint como motivo para alterar RPCs antigos fora de escopo.

## Vercel

Não usar Vercel como gate rotineiro.

`vercel.json` mantém `git.deploymentEnabled=false`. CI é o gate principal. Deployment manual apenas quando houver validação concreta de hosting/browser ou em milestone/release.

## Próxima frente — Issue #53

Título: `Fase 21 — devolução relacionada de retiradas no ledger`.

Motivo objetivo:

- `REQ-STK-006` é MUST;
- schema já possui `return_in`, `return_out` e `reversal_of_movement_id`;
- não existe comando/UI persistente de devolução ligada a movimento anterior;
- Fase 20 deixou essa lacuna explicitamente separada;
- não havia Issue aberta equivalente após o merge da Fase 20.

### Defaults registrados na Issue #53

- começar pelo retorno ao estoque de uma retirada (`withdrawal`) existente;
- gerar novo `return_in`; nunca editar/apagar o movimento original;
- aceitar retorno parcial/total e impedir over-return;
- custo vem do snapshot histórico da retirada;
- lote/validade devem ser preservados a partir das alocações históricas quando identificáveis;
- idempotência por command ID, locks, RLS/escopo e auditoria;
- Q-005 continua aberta: não chamar esse fluxo de empréstimo nem criar prazo/pendência de empréstimo;
- Q-003/Q-004 continuam abertas: não inferir checkbox nem componente financeiro;
- sem dados reais.

## Próximo chat deve fazer

1. confirmar Issue #53, `main`, branches, PRs e CI reais;
2. criar/usar branch `agent/stock-returns` a partir da `main` atual;
3. reler `docs/modules/inventory.md`, REQ-STK-006, ADR-002/ADR-003, migrations de inventory/withdrawal/scoped permissions e testes de retirada/perda;
4. inspecionar o uso atual de `reversal_of_movement_id` e decidir se ele representa de forma segura múltiplos retornos parciais relacionados; não criar coluna nova sem necessidade comprovada;
5. modelar elegibilidade e quantidade pendente de retorno por retirada/item;
6. reutilizar locks, idempotência, custo e lote do ledger existente em vez de duplicar lógica;
7. criar migration/RPC e suíte PostgreSQL antes da integração de UI;
8. implementar gateway/UI para selecionar retirada elegível e registrar retorno parcial/total;
9. testar over-return, retry, concorrência, custo, lote, roles/escopo, cross-Organization e rollback;
10. rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL;
11. somente após CI verde aplicar/homologar no Supabase remoto com dados sintéticos e rollback;
12. não usar Vercel sem necessidade concreta;
13. atualizar PR/Issue e continuidade ao encerrar.

## Não fazer

- não reimplementar Fase 20;
- não alterar catálogo de perdas sem defeito relacionado;
- não reativar auto-deploy Vercel;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não implementar `return_out` para fornecedor/processo externo sem requisito comprovado;
- não inferir Q-003/Q-004;
- não importar dados reais;
- não corrigir advisors antigos fora de escopo.
