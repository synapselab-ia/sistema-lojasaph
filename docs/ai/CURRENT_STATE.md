# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

O hardening preventivo de RLS/grants da Issue #54 foi **concluído e integrado na `main`**, sem alterar regras de negócio. A próxima frente funcional continua sendo a Fase 21 / Issue #53.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #55 — merged
- Issue #54 — closed/completed
- merge commit do hardening: `c6b24c6cef935ae9652dbcc476e9131dcd2259cd`
- head final validado pré-merge: `d456abb02aef92a5f2f1295b1b03a2b760a5e2f1`
- `CI` #258 — success
- `Inventory Count Integration` #158 — success
- `Business Transactions Integration` #141 — success
- próxima Issue funcional: #53 — `Fase 21 — devolução relacionada de retiradas no ledger`

## Hardening de RLS/grants — concluído

A auditoria pré-fix não encontrou vazamento ativo por RLS, mas encontrou privilégios de objeto legados/permissivos no Supabase hospedado. O hardening agora estabelece duas barreiras independentes: grants mínimos no objeto + RLS por linha.

Estado final do schema `public` homologado no Supabase remoto:

- 45/45 tabelas com RLS habilitado;
- 78 policies;
- 0 policies destinadas a `anon`/`PUBLIC`;
- 0 grants de relação para `anon`;
- 0 mismatches entre `SELECT`/`INSERT`/`UPDATE` concedidos a `authenticated` e policies correspondentes;
- `authenticated` sem `DELETE`, `TRUNCATE`, `REFERENCES` ou `TRIGGER` direto nas tabelas da aplicação;
- 0 funções `SECURITY DEFINER` de `public` executáveis por `anon`;
- `public.set_updated_at()` sem EXECUTE para `anon`, `authenticated` e `service_role`;
- `payable_installment_summary` permanece `security_invoker=true`, legível por `authenticated` e não por `anon`.

### Default privileges

A migration `20260819110500_rls_grant_hardening.sql` fecha os defaults do owner de migrations `postgres`:

- tabelas novas em `public` não recebem grants automáticos para papéis de API;
- sequences novas em `public` não recebem grants automáticos;
- functions novas não recebem EXECUTE por `PUBLIC`, `anon`, `authenticated` ou `service_role` sem grant explícito;
- qualquer API nova deve receber grant explícito na própria migration.

O CI agora emula os defaults permissivos históricos do Supabase antes de aplicar migrations e executa `supabase/tests/security_hardening.sql`. A suíte cria probes temporários de tabela/function/sequence e falha se houver exposição automática, tabela sem RLS, policy insegura, grant de `anon`, grant de `authenticated` sem policy correspondente, view sem `security_invoker` ou `SECURITY DEFINER` executável por `anon`.

### Limitação gerenciada pelo provedor

O role `supabase_admin` é gerenciado pelo Supabase e `postgres` não é membro dele. Seus default ACLs em `public` permanecem sob controle do provedor e não podem ser alterados pela migration da aplicação.

Política resultante: objetos do Sistema Lojasaph devem ser criados por migrations versionadas do repositório, executadas pelo owner `postgres`. Objetos criados manualmente pelo Dashboard não podem ser presumidos seguros e exigem auditoria explícita de grants/RLS.

## Supabase remoto

Projeto conectado:

- status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero branches de desenvolvimento.

Migration de hardening aplicada após CI 3/3 verde:

- `rls_grant_hardening` — versão remota `20260819141546`.

Homologação pós-DDL:

- catálogo de RLS/grants conferido diretamente no PostgreSQL;
- probe remoto em `BEGIN/ROLLBACK` criou tabela + identity sequence + function e confirmou ausência de grants implícitos para `anon`, `authenticated` e `service_role`;
- rollback deixou zero objetos de probe;
- default ACL de `postgres` em `public` contém somente o próprio owner para tabelas/sequences/functions;
- default global de functions de `postgres` também contém somente `postgres`.

O Security Advisor continua reportando RPCs transacionais `SECURITY DEFINER` executáveis por `authenticated`. Isso é intencional na arquitetura atual: esses RPCs são fronteiras de comando e validam autenticação/role/escopo internamente; `anon` não possui EXECUTE. Não redesenhar esses RPCs por oportunismo sem Issue específica.

## Fase 20

A Fase 20 permanece concluída: perdas, quebras e vencimentos possuem fluxo persistente pelo ledger via `record_stock_loss`, com motivo estruturado, custo/lote/auditoria e UI `/workspace/baixas`.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`.

CI é o gate principal. Deployment manual somente quando uma validação depender concretamente de hosting/browser real ou em milestone/release apropriada. O hardening de segurança não usou Vercel.

## Próxima lacuna MUST real

`REQ-STK-006 — Devolução/retorno relacionado` continua incompleto e é a Issue #53.

Escopo conservador já registrado:

- começar pelo retorno ao estoque de uma retirada existente;
- criar novo movimento `return_in`, sem editar/apagar a retirada histórica;
- permitir retorno parcial/total sem over-return;
- derivar custo do snapshot histórico;
- preservar/restaurar lote identificado quando aplicável;
- idempotência, locks, RLS/escopo e auditoria;
- sem empréstimo enquanto Q-005 estiver aberta;
- sem componente financeiro de Q-004 ou interpretação do checkbox de Q-003;
- fixtures exclusivamente sintéticas.

## Não repetir

- não reabrir Issue #54 nem reaplicar `rls_grant_hardening`;
- não remover a suíte `security_hardening.sql` do CI;
- não criar objetos de aplicação manualmente no Dashboard sem migration/auditoria;
- não reabrir Fase 20;
- não criar segundo mecanismo de estoque fora do ledger;
- não reativar auto-deploy Vercel;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-003/Q-004 ou demais Q-001..Q-025;
- não importar dados reais.
