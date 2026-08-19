# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 20 — perdas, quebras e vencimentos como baixas rastreáveis — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #52 — merged
- Issue #51 — closed/completed
- merge commit: `a6da7e46e340763c2cf724c2c3b625616c149a80`
- head final validado pré-merge: `e5d3b2e0f6752f732ae86c32c66fd488f633eb90`
- `CI` #253 — success
- `Inventory Count Integration` #155 — success
- `Business Transactions Integration` #138 — success
- próxima Issue: #53 — `Fase 21 — devolução relacionada de retiradas no ledger`

## Fase 20 — concluído

`REQ-STK-008` foi fechado e `REQ-STK-003` reforçado com caminho persistente real:

- catálogo `stock_loss_reasons` por Organization;
- motivos-base conservadores `loss`, `breakage`, `expiration` e `other`;
- `record_stock_loss` transacional/idempotente;
- `movement_type` derivado do motivo estruturado no banco, não escolhido livremente pela UI;
- retirada e baixa compartilham o mesmo núcleo privado para locks, saldo, custo, política de negativo, lote preferido e FEFO;
- baixa grava movimento, item, alocação de lote e auditoria atomicamente;
- vencimento de item rastreado exige lote explícito já vencido e quantidade suficiente no próprio lote;
- UI persistente `/workspace/baixas` com formulário e histórico recente;
- suíte PostgreSQL dedicada integrada ao CI.

### Correção encontrada pelo CI

O primeiro head revelou que a policy de leitura do catálogo usava `private.has_org_role(..., NULL)`, embora esse helper exija uma lista de roles. O fix foi versionado separadamente em `stock_loss_reason_read_scope_fix`, usando `private.is_org_member` para leitura.

Semântica final:

- membership ativa pode ler o catálogo de motivos da Organization;
- configurar motivos continua exigindo membership Organization-wide com `owner`, `admin`, `manager` ou `inventory`;
- `anon` não possui acesso;
- `authenticated` não possui `DELETE` na tabela.

## Validação final da Fase 20

No head `e5d3b2e0f6752f732ae86c32c66fd488f633eb90` passaram:

- `CI` #253 — success;
- `Inventory Count Integration` #155 — success;
- `Business Transactions Integration` #138 — success.

O CI validou lint, typecheck, Vitest, build, todas as migrations, seed, backup/restore, retirada existente, perda/vencimento, transferências, multi-lote, importação e Employee.

## Supabase remoto

Projeto conectado:

- status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero branches de desenvolvimento.

Migrations da Fase 20 aplicadas após CI verde:

- `stock_loss_flow` — versão remota `20260819004720`;
- `stock_loss_reason_read_scope_fix` — versão remota `20260819004730`.

Homologação pós-DDL:

- RLS ativo em `stock_loss_reasons`;
- 4 motivos-base para a Organization existente;
- policies de select/insert/update presentes;
- `anon`: sem SELECT/INSERT/UPDATE/DELETE e sem EXECUTE de `record_stock_loss`;
- `authenticated`: SELECT/INSERT/UPDATE em nível de tabela, `DELETE=false`;
- `record_stock_loss` executável por `authenticated`, revalidando `auth.uid()`, role e escopo no próprio RPC;
- smoke sintético confirmou `breakage -> loss`, saldo, custo snapshot e audit log;
- transação revertida e zero resíduo sintético.

O advisor de segurança sinaliza o RPC público pelo lint genérico de `SECURITY DEFINER` executável por `authenticated`, padrão já presente nos RPCs transacionais existentes. Neste caso o EXECUTE é intencional e protegido por validações internas; `anon` não possui EXECUTE. O advisor de performance não apontou FK sem índice na nova tabela.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`.

**Política vigente:** CI é o gate principal de desenvolvimento. Deployment manual somente quando uma validação realmente depender de hosting/browser real ou em milestone/release apropriada. A Fase 20 não usou Vercel.

## Próxima lacuna MUST real

`REQ-STK-006 — Devolução/retorno relacionado` continua incompleto.

O schema já prevê `return_in`, `return_out` e `reversal_of_movement_id`, mas não existe comando/UI persistente para relacionar uma devolução a movimento anterior. A Issue #53 foi aberta com escopo conservador:

- começar pelo retorno ao estoque de uma retirada existente;
- novo movimento `return_in`, sem editar/apagar a retirada histórica;
- permitir retorno parcial/total sem over-return;
- derivar custo do snapshot histórico;
- preservar/restaurar lote identificado quando aplicável;
- idempotência, RLS/escopo, concorrência e auditoria;
- sem empréstimo enquanto Q-005 estiver aberta;
- sem componente financeiro de Q-004 ou interpretação do checkbox de Q-003;
- fixtures exclusivamente sintéticas.

## Não repetir

- não reabrir Fase 20;
- não criar segundo mecanismo de saída de estoque fora do ledger;
- não reativar auto-deploy Vercel;
- não resolver advisors antigos fora de escopo por oportunismo;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-003/Q-004 ou demais Q-001..Q-025;
- não importar dados reais;
- não reaplicar migrations já homologadas.
