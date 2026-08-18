# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada e tecnicamente validada; aguardando homologação do Preview no head final antes do merge**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #45 — open
- PR #46 — draft/open
- branch: `agent/environment-isolation`
- base da branch: `main` em `5c617e7f26c514139be3b6171f38e28ae5ae30af`
- SHA técnico validado antes dos commits documentais finais: `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`
- nenhuma migration/DDL da Fase 18 foi necessária.

## Fase 18 — implementado

A entrega cobre a fundação de `REQ-PLAT-007 — Ambientes separados` e reforça `REQ-SEC-004`:

- política central fail-closed em `src/lib/runtime/environment.ts`;
- identificação explícita de `development`, `preview`, `production` e estado `unknown`;
- mismatch entre `LOJASAPH_APP_ENV` e `VERCEL_ENV` bloqueia acesso operacional;
- Production rejeita backend local e pode fixar a ref esperada do projeto Supabase;
- Preview fica sem acesso Supabase por padrão até existir backend hospedado próprio, com ref explícita e diferente de Production;
- Development aceita Supabase local por padrão; backend remoto exige identidade própria distinta de Production;
- `SUPABASE_SECRET_KEY` continua server-only e o admin client fica bloqueado fora de Production por padrão;
- opt-in administrativo não-prod exige backend já isolado + `LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN=true`;
- callbacks de Preview usam o domínio do próprio deployment, não reutilizam silenciosamente a URL de Production;
- Proxy continua renderizando páginas quando Preview está isolado, mas não cria cliente Supabase;
- Auth, callback, password reset, signout, bootstrap e workspace respeitam a política;
- browser client usa somente variáveis públicas permitidas e também aplica fail-closed nos clientes diretos legados;
- workspace recebe configuração Supabase já validada pelo servidor;
- `/health` expõe somente ambiente/estado/reason codes não sensíveis;
- login e recuperação ficam visualmente desabilitados em ambiente sem backend operacional aprovado;
- `.env.example` documenta identidade de ambiente e refs públicas sem valores reais;
- testes cobrem parsing, mismatch, refs distintas, Development local/remoto, admin, callbacks e fronteira client/server de secrets.

## Documentação da Fase 18

- decisão: `docs/decisions/ADR-008-environment-isolation.md`;
- runbook: `docs/operations/environments.md`;
- runtime Supabase atualizado em `docs/modules/supabase-runtime.md`.

## CI técnico da Fase 18

No SHA `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0` passaram:

- `CI` #229 — success;
- `Inventory Count Integration` #139 — success;
- `Business Transactions Integration` #122 — success.

O `CI` validou:

- lint;
- typecheck;
- Vitest, incluindo os testes novos de isolamento;
- build de produção Next.js;
- migrations/seed existentes;
- drill de backup/restore;
- schema/RLS;
- Auth/Organization isolation;
- estoque/transferências;
- import staging/dry run.

Uma primeira execução (`CI` #225) falhou somente porque cinco páginas cliente existentes ainda chamavam `createBrowserSupabaseClient()` sem argumento. A correção preservou esses call sites, adicionando fallback client-side protegido exclusivamente por variáveis públicas e pela mesma política fail-closed. A revalidação completa ficou verde no SHA técnico acima.

## Estado externo verificado

### Supabase

Verificação somente leitura confirmou:

- um único projeto conectado;
- projeto saudável;
- PostgreSQL 17;
- organização no plano Free;
- zero Supabase branches.

A Fase 18 **não**:

- criou migration;
- executou DDL;
- criou branch/projeto adicional;
- alterou configuração remota;
- escreveu dados;
- copiou dados reais para ambiente não-prod.

Nenhum upgrade de plano ou infraestrutura paga foi feito por inferência.

### Vercel

O projeto possui ambientes Preview/Production e suporta identificação de ambiente/variáveis escopadas. O conector disponível nesta sessão não expõe a auditoria segura dos valores/targets das environment variables; portanto o estado anterior foi tratado como **não comprovado**, e não como comprovadamente seguro ou comprovadamente compartilhado.

O primeiro commit da Fase 18 (`7307ccf8dc53295e0bf4c01448eac8bdbcd962db`) chegou a gerar Preview `READY` (`dpl_7f4gBBdmdTsRfWWiAz3ddCVzGnjT`), mas esse deployment **não contém a implementação final** e não serve como homologação da fase.

Os commits posteriores, incluindo o SHA técnico final, ficaram sem novo deployment porque a Vercel passou a retornar `build-rate-limit`/`upgradeToPro`. Isso é um bloqueio de frequência da plataforma, não uma falha de código identificada.

## Bloqueio restante para fechar a Fase 18

A Fase 18 **não deve ser mergeada ainda**.

Falta exclusivamente homologar um Preview criado a partir do **head final atual** quando a Vercel voltar a aceitar builds.

Smoke esperado, sem dados reais e sem mutação:

1. `/health` retorna `environment=preview`;
2. enquanto não houver backend isolado aprovado, `supabaseAccess=blocked` e `adminAccess=blocked`;
3. `/login` mostra aviso de ambiente isolado e não apresenta formulário operacional;
4. `/auth/callback` sem credencial real redireciona de forma segura;
5. nenhuma autenticação real, reset de senha, token ou mutação é usada.

Se `/health` retornar `supabaseAccess=allowed`, **não executar nenhuma mutação**: primeiro comprovar que o backend identificado é realmente distinto de Production.

## Não repetir

- não reimplementar a política de ambientes;
- não reimplementar observabilidade da Fase 17;
- não reabrir backup/restore da Fase 16;
- não fazer alteração de código para contornar `build-rate-limit` da Vercel;
- não contratar/ativar plano pago por inferência;
- não reaplicar migrations antigas;
- não importar dados reais/cutover;
- não inferir Q-001 a Q-025.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: revalidar o head do PR #46 e o estado da Vercel. Se o rate limit persistir, manter PR/Issue abertos sem alterar código. Quando existir Preview `READY` do head final, executar somente o smoke não mutável documentado, registrar a evidência, exigir os três workflows verdes no SHA final e então fechar corretamente PR #46 / Issue #45.