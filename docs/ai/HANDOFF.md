# Handoff — Sistema Lojasaph

## Estado

O hardening preventivo de RLS/grants foi concluído antes da Fase 21.

- PR #55 — merged;
- Issue #54 — closed/completed;
- merge commit: `c6b24c6cef935ae9652dbcc476e9131dcd2259cd`;
- head final pré-merge: `d456abb02aef92a5f2f1295b1b03a2b760a5e2f1`;
- `CI` #258 — success;
- `Inventory Count Integration` #158 — success;
- `Business Transactions Integration` #141 — success.

A próxima frente funcional continua sendo a Issue #53 — `Fase 21 — devolução relacionada de retiradas no ledger`.

## Hardening — o que ficou pronto

A auditoria inicial confirmou que as RLS já impediam vazamento ativo, mas encontrou grants/default privileges legados desnecessariamente amplos no Supabase hospedado. A Issue #54 reduziu essa superfície sem mudar regras de negócio.

### Estado final de `public`

- 45/45 tabelas com RLS;
- 78 policies;
- nenhuma policy para `anon` ou `PUBLIC`;
- `anon` sem privilégios em relações da aplicação;
- grants de `authenticated` em tabelas reconciliados com as policies existentes para `SELECT`, `INSERT` e `UPDATE`;
- nenhum `DELETE`, `TRUNCATE`, `REFERENCES` ou `TRIGGER` direto para `authenticated`;
- nenhuma função `SECURITY DEFINER` pública executável por `anon`;
- `set_updated_at()` não é RPC acessível a papéis da API;
- `payable_installment_summary` continua `security_invoker=true`, read-only para `authenticated` e inacessível a `anon`.

### Default privileges

A migration `20260819110500_rls_grant_hardening.sql` fecha os defaults do owner `postgres` usado pelas migrations da aplicação.

A suíte nova do CI também cria objetos-probe depois de todas as migrations e exige que tabela, identity sequence e function novas nasçam sem grants implícitos para `anon`, `authenticated` ou `service_role`.

Dois heads intermediários falharam exatamente nesse probe porque PostgreSQL ainda concedia EXECUTE de functions novas via `PUBLIC`. O fix final revoga esse EXECUTE no default ACL global de functions do owner `postgres`; o REVOKE limitado ao schema não era suficiente para subtrair o grant global.

### `supabase_admin`

O role `supabase_admin` é gerenciado pelo provedor e `postgres` não é membro dele. Seus default ACLs em `public` permanecem fora da autoridade da migration da aplicação.

Regra operacional resultante: criar/alterar objetos do Sistema Lojasaph somente por migrations versionadas do repositório. Se algum objeto for criado manualmente pelo Dashboard, auditar RLS/grants explicitamente antes de considerá-lo seguro.

## Supabase remoto

Estado homologado:

- projeto `ACTIVE_HEALTHY`, PostgreSQL 17;
- zero branches;
- `rls_grant_hardening` aplicado como versão remota `20260819141546`;
- auditoria pós-DDL com zero mismatch de grant/policy e zero acesso de relação para `anon`;
- probe remoto de tabela/function/sequence executado em `BEGIN/ROLLBACK` e aprovado;
- zero resíduo do probe;
- default ACLs de `postgres` em `public` fechados para papéis de API.

O Security Advisor continua sinalizando RPCs `SECURITY DEFINER` executáveis por `authenticated`. Esse é o desenho intencional das APIs transacionais atuais, que validam `auth.uid()`, role e escopo internamente; `anon` não possui EXECUTE. Não revogar esses RPCs sem redesenho explícito.

## CI de segurança daqui para frente

`supabase/tests/security_hardening.sql` é gate permanente do job database e não deve ser removido. O bootstrap do CI emula os defaults permissivos históricos do ambiente hospedado para impedir falso verde.

Toda migration nova em `public` deve:

1. habilitar RLS em tabela exposta;
2. criar policies explícitas;
3. conceder somente os comandos necessários a `authenticated`;
4. não conceder nada a `anon` sem requisito explícito e revisão de segurança;
5. em RPC `SECURITY DEFINER`, revogar `PUBLIC`/`anon` e conceder EXECUTE explicitamente somente ao papel necessário;
6. manter view exposta com `security_invoker=true`.

## Vercel

Não usar Vercel como gate rotineiro. `git.deploymentEnabled=false` continua vigente.

## Próxima frente — Issue #53

Título: `Fase 21 — devolução relacionada de retiradas no ledger`.

Motivo objetivo:

- `REQ-STK-006` é MUST;
- schema já possui `return_in`, `return_out` e `reversal_of_movement_id`;
- não existe comando/UI persistente de devolução ligada a movimento anterior;
- Q-005 continua aberta, portanto esse fluxo não deve ser modelado como empréstimo.

### Defaults da Issue #53

- começar pelo retorno ao estoque de uma retirada (`withdrawal`) existente;
- gerar novo `return_in`; nunca editar/apagar o movimento original;
- aceitar retorno parcial/total e impedir over-return;
- custo vem do snapshot histórico da retirada;
- lote/validade devem ser preservados a partir das alocações históricas quando identificáveis;
- idempotência por command ID, locks, RLS/escopo e auditoria;
- Q-005 continua aberta: não criar prazo/pendência de empréstimo;
- Q-003/Q-004 continuam abertas: não inferir checkbox nem componente financeiro;
- sem dados reais.

## Próximo chat deve fazer

1. confirmar Issue #53, `main`, branch `agent/stock-returns`, PRs e CI reais;
2. confirmar que `agent/stock-returns` parte da `main` pós-hardening;
3. reler `docs/modules/inventory.md`, REQ-STK-006, ADR-002/ADR-003, migrations de inventory/withdrawal/loss/scoped permissions e testes correspondentes;
4. inspecionar `reversal_of_movement_id` e preferir reutilizá-lo se suportar múltiplos retornos parciais com segurança;
5. modelar elegibilidade e quantidade pendente por retirada/item;
6. reutilizar locks, idempotência, custo e lote do ledger existente;
7. criar migration/RPC e suíte PostgreSQL antes da UI;
8. obedecer ao novo gate `security_hardening.sql` e conceder grants explicitamente na migration da Fase 21;
9. implementar gateway/UI para listar retiradas elegíveis e registrar retorno parcial/total;
10. testar over-return, retry, concorrência, custo, lote, roles/escopo, cross-Organization e rollback;
11. rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL;
12. somente após CI verde aplicar/homologar no Supabase remoto com dados sintéticos e rollback;
13. não usar Vercel sem necessidade concreta;
14. atualizar PR/Issue e continuidade ao encerrar.

## Não fazer

- não reimplementar o hardening da Issue #54;
- não retirar o gate de segurança do CI;
- não criar objeto de aplicação manualmente no Dashboard como atalho;
- não reimplementar Fase 20;
- não alterar catálogo de perdas sem defeito relacionado;
- não reativar auto-deploy Vercel;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não implementar `return_out` para fornecedor/processo externo sem requisito comprovado;
- não inferir Q-003/Q-004;
- não importar dados reais;
- não corrigir advisors antigos fora de escopo.
