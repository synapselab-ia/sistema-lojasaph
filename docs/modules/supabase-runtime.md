# Runtime Supabase — persistência, Auth e RLS

Status: Auth/runtime estabilizados, núcleo transacional persistente, observabilidade, isolamento de ambientes e bootstrap seguro do primeiro owner documentados.

## Sessão e autorização

- `@supabase/ssr` no browser/server;
- `getClaims()` + cookies por request;
- memberships por Organization;
- secret/admin client somente `server-only`;
- operações normais usam JWT do usuário + RLS.

## RLS, grants e least privilege

O schema `public` usa duas barreiras independentes:

1. privilégios de objeto (`GRANT`/`REVOKE`) decidem se o papel da API pode executar um comando na relação ou função;
2. RLS decide quais linhas são acessíveis depois que o comando está autorizado no nível do objeto.

A Issue #54 formaliza a política de least privilege após auditoria do projeto hospedado:

- toda tabela de aplicação em `public` deve ter RLS habilitado;
- `anon` não recebe privilégios em tabelas/views operacionais nem EXECUTE de RPCs privados/transacionais;
- `authenticated` recebe somente `SELECT`, `INSERT` e/ou `UPDATE` quando existe policy explícita correspondente;
- não existe `DELETE` direto no schema operacional atual; cancelamento/estorno e RPCs transacionais preservam rastreabilidade;
- views expostas devem usar `security_invoker=true` para respeitar RLS das tabelas subjacentes;
- funções `SECURITY DEFINER` públicas são APIs controladas: `PUBLIC`/`anon` sem EXECUTE e validação interna de `auth.uid()`, role e escopo;
- helpers de trigger, como `set_updated_at`, não são RPC público e não precisam de EXECUTE para papéis da API;
- migrations executadas pelo owner `postgres` usam default privileges fechados para tabelas, sequences e functions; qualquer exposição nova deve receber grant explícito na própria migration;
- o CI emula os defaults permissivos históricos do Supabase e executa uma suíte dedicada que falha se RLS/grants/default privileges regredirem.

O role gerenciado `supabase_admin` pertence ao provedor e não é controlado pelas migrations da aplicação executadas como `postgres`. Por isso mudanças de schema do Sistema Lojasaph devem ocorrer exclusivamente pelas migrations versionadas do repositório; objetos criados manualmente pelo Dashboard não podem ser presumidos seguros e precisam de auditoria explícita de grants/RLS.

## Isolamento de ambientes

A Fase 18 adiciona uma política fail-closed antes da criação de clientes Supabase.

- Production pode usar o backend hospedado aprovado;
- Preview não cria cliente operacional até existir backend próprio com ref explicitamente diferente de Production;
- Development aceita Supabase local por padrão e exige identidade explícita para backend remoto;
- mismatch entre identidade explícita e `VERCEL_ENV` bloqueia acesso;
- browser usa apenas configuração pública validável; `SUPABASE_SECRET_KEY` permanece fora do bundle;
- o workspace recebe configuração já validada pelo servidor;
- clientes diretos legados também aplicam política client-side com `NEXT_PUBLIC_VERCEL_ENV` e refs públicas;
- admin client é bloqueado fora de Production salvo opt-in explícito sobre backend já isolado;
- Preview sem backend continua renderizando páginas/health, mas Auth e operações ficam desabilitados.

Project refs usadas no guardrail não são tratadas como secret porque já fazem parte da URL pública do Supabase. Chaves privilegiadas continuam server-only.

Runbook: `docs/operations/environments.md`. Decisão: `docs/decisions/ADR-008-environment-isolation.md`.

## Bootstrap do primeiro owner — Fase 26

O acesso persistente inicial usa dois passos separados:

1. Supabase Auth Admin cria/convida apenas a identidade cujo e-mail foi explicitamente configurado em `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
2. depois que essa identidade autentica e define sua própria senha, `bootstrapOwnerAction` continua sendo o único caminho que cria `organization_memberships.role = 'owner'` e o audit `membership.bootstrap_owner`.

Guardrails:

- signup público continua ausente;
- não existe campo de e-mail no formulário de convite; o destinatário vem somente de env server-only;
- não existe senha padrão ou senha conhecida pelo operador/agente;
- a identidade não é inserida por SQL em `auth.users`;
- `inviteUserByEmail` roda somente no admin client server-side;
- antes do convite são revalidados runtime/admin, Organization alvo, ausência de owner ativo e estado da identidade Auth;
- identidade pendente ou confirmada não recebe novo convite automaticamente;
- owner ativo encerra o bootstrap;
- `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true` é um gate explícito e temporário; sem ele o app não envia convite;
- nenhum DDL, policy ou grant é necessário para esse fluxo.

Como convites Admin não usam PKCE, o template hospedado `Invite user` precisa entregar `TokenHash` + `type=invite` ao `/auth/callback`. O callback existente usa `verifyOtp()` para estabelecer a sessão SSR em cookie antes de enviar o usuário ao formulário de senha. O `next` é sempre validado por `safeInternalPath`.

Runbook operacional completo: `docs/operations/bootstrap-owner.md`.

## Commands críticos do ledger

Executáveis somente por `authenticated`, todos revalidando `auth.uid()` + role organizacional:

- `record_stock_entry`;
- `record_stock_withdrawal`;
- `dispatch_stock_transfer`;
- `receive_stock_transfer`;
- `start_inventory_count`;
- `set_inventory_count_line`;
- `confirm_inventory_count`;
- `cancel_inventory_count`.

`PUBLIC`/`anon` não possuem EXECUTE e clientes não recebem INSERT/UPDATE direto no ledger.

## Inventário

A sessão captura quantidade e custo médio esperados. Confirmação usa locks, rejeita stale, gera ajustes de ledger e nunca materializa lote desconhecido. Cancelamento é explícito e auditado.

## Observabilidade do runtime

A Fase 17 adicionou logging estruturado no Next.js sem alterar schema, RLS ou RPCs.

- Vercel Runtime Logs recebe os eventos server-side do app;
- Supabase Logs Explorer/API permanece a fonte de diagnóstico para Postgres/Auth/Data API;
- consultas feitas nessas fases foram somente leitura;
- a organização Supabase conectada permanece no plano Free;
- Log Drains não foram configurados porque a capacidade exige plano compatível;
- chamadas Supabase feitas diretamente pelo browser não recebem automaticamente o `correlationId` do Next.js, então a correlação entre as duas fontes usa horário, RPC/rota e código de erro quando necessário.

Nunca registrar JWT, cookies, e-mail, secrets, connection strings ou payloads sensíveis para tentar facilitar correlação.

Runbook: `docs/operations/observability.md`. Decisão: `docs/decisions/ADR-007-observability-contract.md`.

## Estado remoto na Fase 18

Verificação read-only confirmou:

- um projeto Supabase conectado;
- PostgreSQL 17;
- organização no plano Free;
- zero branches Supabase.

A Fase 18 não cria migration, DDL, branch, projeto adicional nem escreve dados remotos. Branching/ambiente hospedado adicional não deve ser ativado sem revalidar plano/custo e obter autorização explícita.

## Homologação remota histórica

As migrations da Fase 9 foram aplicadas ao projeto homologado em `sa-east-1`. Entrada, retirada, transferência e inventário foram validados com dados demo em transações `BEGIN/ROLLBACK`; os cenários de teste não deixam usuários/movimentos artificiais.

Fases posteriores aplicaram migrations adicionais conforme seus handoffs. Fases 17, 18, 24, 25 e a implementação técnica da Fase 26 não criam migration nem executam DDL no projeto remoto.

## Advisors

O Security Advisor reporta os command RPCs `SECURITY DEFINER` executáveis por `authenticated`; isso é intencional porque são a API controlada de mutações críticas, com role/inputs/referências validados. Performance INFO permanece backlog orientado a carga real; não criar índices indiscriminadamente para zerar linter em banco demo.
