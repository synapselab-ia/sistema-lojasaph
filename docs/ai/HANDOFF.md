# Handoff — Sistema Lojasaph

## Estado

A Fase 25 foi concluída, homologada e integrada na `main`.

- PR #64 — merged;
- Issue #63 — closed/completed;
- merge commit funcional: `e345401fa80e98c6c3433fc98843c44c146a74fb`;
- head funcional final pré-merge: `7040d7ec7faf356504ce3dd10f2dd4628ea69ca0`;
- `CI` #281 — success;
- `Inventory Count Integration` #167 — success;
- `Business Transactions Integration` #150 — success.

A próxima frente é a Issue #65 — `Fase 26 — convite seguro do primeiro owner para homologação persistente`.

## O que ficou pronto na Fase 25

`REQ-DASH-002` agora possui Unit, Setor e período gerencial explícito:

- `dateFrom`/`dateTo` opcionais, completos, ISO válidos, ordenados e inclusivos;
- `horizonDays` continua separado como janela relativa de alertas;
- Financeiro usa `due_date` da obrigação;
- `net_paid_amount` continua acumulado da obrigação e não é apresentado como pagamentos ocorridos no intervalo;
- Caixa aberto é estado atual; fechamentos/divergências usam `business_date`;
- pedidos pendentes são estado atual; entregas usam `expected_delivery_date` conhecida;
- transferências em trânsito e inventários abertos são estado atual;
- validades usam `expiration_date`;
- Unit + Setor da Fase 24 foi preservado, incluindo Transferências no mesmo endpoint e Caixa Unit-level;
- UI explica Horizonte x Período x Estado atual;
- não houve DDL, grants, policies ou dados reais alterados.

## Validação e Supabase

Head `7040d7ec7faf356504ce3dd10f2dd4628ea69ca0` passou 3/3 verde.

Homologação remota read-only:

- projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17;
- timezone `America/Sao_Paulo`;
- 0 linhas em Financeiro/Caixa/Compras/Transferências/Inventários no dataset atual;
- 2 lotes ativos com validade, em `2026-08-20` e `2026-08-28`;
- boundaries inclusivos foram comprovados com 1/0/1 para os intervalos de 20, 21–27 e 28 de agosto;
- fixture autenticado sintético usado apenas em `BEGIN/ROLLBACK` deixou 0 resíduo;
- `security_hardening.sql` permaneceu verde.

Auditoria RLS recente segue limpa: 45/45 tabelas public com RLS, nenhuma sem policy, sem DML anon/PUBLIC e sem leak para authenticated sem membership. `payable_installment_summary` continua `security_invoker=true`.

## Próxima frente — Issue #65

Motivo objetivo:

O usuário consegue chegar ao login do Workspace persistente, mas o Supabase remoto possui **0 usuários Auth, 0 memberships e 0 owners**. O código já possui login, recuperação e bootstrap seguro de membership, porém o bootstrap exige uma identidade Auth previamente existente e autenticada.

### Evidência no código

- `/login` usa `signInWithPassword`, sem signup público;
- `/bootstrap` só libera bootstrap quando admin access está permitido, `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` está configurado e a sessão autenticada tem exatamente esse e-mail;
- `bootstrapOwnerAction` verifica Organization ativa e ausência de outro owner, cria membership `owner`, registra `membership.bootstrap_owner` em `audit_logs` e reverte membership se audit falhar;
- `.env.example` já documenta `SUPABASE_SECRET_KEY`, `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` e `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID`;
- falta somente o caminho seguro para a **primeira identidade Auth** receber convite/estabelecer sessão.

### Defaults da Issue #65

- sem signup público;
- sem senha padrão, temporária hardcoded ou compartilhada em issue/log/repo;
- sem INSERT direto em `auth.users`;
- convite deve ser enviado somente para o e-mail configurado server-side em `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
- browser não escolhe e-mail arbitrário;
- usar API Auth Admin oficial do Supabase pelo admin client server-only;
- antes do convite, confirmar ausência de owner ativo;
- após autenticação, reutilizar `bootstrapOwnerAction`; não duplicar criação de membership/role;
- fluxo deve permanecer fail-closed/idempotente;
- desabilitar/remover configuração de bootstrap após primeira inicialização;
- nenhuma migration esperada;
- nenhum convite real sem e-mail explicitamente fornecido pelo operador;
- não tocar RLS/grants para facilitar onboarding.

## Vercel

O projeto conectado é `sistema-lojasaph`. O último deployment Production observado está READY no commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`, portanto está atrás da `main` atual.

`vercel.json` mantém `git.deploymentEnabled=false`. Nesta sessão nenhum deployment foi disparado. Não fazer deploy rotineiro; um deployment final pode ser necessário apenas quando a Fase 26 estiver pronta para homologação real.

## Próximo chat deve fazer

1. confirmar `main`, Issue #65, branch ativa, PRs, CI e estado Vercel real;
2. reler `AGENTS.md`, START-HERE, CURRENT_STATE, HANDOFF, NEXT_ACTION e WORKFLOW na branch ativa;
3. ler `docs/modules/supabase-runtime.md`, `docs/operations/environments.md`, `.env.example`, `/login`, `/bootstrap`, `src/lib/auth/actions.ts`, `src/lib/auth/bootstrap.ts`, callbacks Auth e server Supabase client;
4. consultar documentação oficial atual do Supabase Auth Admin sobre `inviteUserByEmail`, redirects/callback e comportamento de usuário já existente;
5. usar a branch `agent/bootstrap-owner-invite`; não refazer Dashboard/Fase 25;
6. implementar convite server-only preso ao e-mail autorizado da env, sem campo de e-mail livre no browser;
7. preservar `bootstrapOwnerAction` como única criação do membership owner/audit;
8. testar guardrails, retries/estado já existente e erro sem configuração;
9. atualizar runbook de bootstrap/desativação;
10. rodar lint, typecheck, Vitest, build e os três workflows;
11. antes de convite real, confirmar read-only que ainda há 0 owners e nenhuma regressão RLS;
12. não enviar convite real sem o operador fornecer explicitamente o e-mail a autorizar;
13. se o fluxo técnico ficar verde, só então decidir deployment Vercel intencional para homologação; não fazer deploy a cada commit;
14. atualizar PR/Issue e continuidade.

## Não fazer

- não reabrir Fase 25/Issue #63, Fase 24/Issue #61 ou hardening/Issue #54;
- não habilitar signup público;
- não inserir em `auth.users` por SQL;
- não inventar e-mail do owner;
- não pedir/armazenar senha em GitHub ou env;
- não expor `SUPABASE_SECRET_KEY` no browser;
- não ampliar RLS/grants;
- não criar gestão geral de usuários nessa fase;
- não importar dados reais;
- não fazer deployment Vercel rotineiro;
- não resolver Q-001..Q-025 por inferência.
