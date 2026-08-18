# Handoff — Sistema Lojasaph

## Estado

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada; falta apenas o gate final do head atual e o fechamento do PR #46**.

- Issue #45 — open;
- PR #46 — draft/open;
- branch: `agent/environment-isolation`;
- a branch foi reconciliada com a `main` após os PRs #47/#48;
- `vercel.json` está em modo `git.deploymentEnabled=false` tanto na `main` quanto na branch;
- nenhuma migration/DDL/write/config change remoto no Supabase na Fase 18.

## Já concluído — não refazer

### Política e runtime

- política fail-closed em `src/lib/runtime/environment.ts`;
- runtime server-only em `src/lib/runtime/server.ts`;
- `development`, `preview`, `production` e `unknown`;
- mismatch de identidade de ambiente bloqueia acesso;
- Preview só permite Supabase quando backend próprio e Production têm refs explícitas e distintas;
- Development aceita Supabase local; remoto exige identidade própria;
- Production rejeita backend local e pode fixar ref esperada;
- `SUPABASE_SECRET_KEY` continua server-only;
- admin não-prod bloqueado por padrão.

### Browser/Auth/UI

- browser usa apenas `NODE_ENV`/`NEXT_PUBLIC_*` permitidas;
- workspace recebe configuração validada pelo servidor;
- Proxy/Auth/callback/reset/signout/bootstrap respeitam a política;
- login/recuperação mostram estado isolado sem formulário operacional quando bloqueado;
- `/health` não expõe URL, ref, key ou secret.

### Testes e docs

- `src/lib/runtime/environment.test.ts`;
- `src/lib/runtime/client-boundary.test.ts`;
- `.env.example` sem valores reais;
- ADR-008;
- `docs/operations/environments.md`;
- `docs/modules/supabase-runtime.md`.

## CI

O último head completo antes da política Vercel, `0979a33f05fefb75f554219d8552e9f7b74c3601`, ficou 3/3 verde:

- `CI` #236;
- `Inventory Count Integration` #146;
- `Business Transactions Integration` #129.

O próximo chat deve sempre conferir os workflows do **head atual**, porque a política manual-only e a reconciliação com `main` criaram commits posteriores.

## Vercel

Os PRs #47 e #48 desligaram deployments automáticos Git para evitar consumo acidental da quota Hobby. A política vigente é manual-only.

Não esperar que um push gere Preview. Não reativar deploy automático para cumprir o gate.

Último Preview homologado:

- `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` — `READY`;
- commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`;
- `GET /health` confirmou `environment=preview`, `supabaseAccess=blocked`, `preview_backend_unverified` e `adminAccess=blocked`;
- zero autenticação, senha, token ou mutação.

## Supabase remoto

Último estado read-only conhecido:

- projeto saudável;
- PostgreSQL 17;
- zero development branches.

Não criar branch/projeto pago, não executar migration/DDL e não usar dados reais para fechar esta fase.

## Próxima ação exata

1. conferir Issue #45, PR #46 e o head atual da branch;
2. confirmar que a branch contém a `main` atual e que não há drift funcional além da política de deployment/documentação;
3. exigir `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes no head atual;
4. somente após 3/3 verde, executar **um único deployment manual de Preview** do head atual;
5. fazer smoke não mutável:
   - `GET /health`;
   - esperar `environment=preview`;
   - enquanto não houver backend Preview isolado, esperar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` se a proteção Vercel permitir e confirmar estado isolado;
   - callback somente sem credenciais reais, se necessário;
6. se `/health` indicar `supabaseAccess=allowed`, não testar escrita; primeiro comprovar backend distinto de Production;
7. após smoke aprovado, atualizar PR #46, marcar ready e fazer merge normal;
8. confirmar Issue #45 closed/completed;
9. revisar os MUST/Issues reais e selecionar a próxima frente;
10. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` pós-merge.

## Regras

- não reimplementar Fase 18;
- não reabrir Fase 17/backup;
- não reativar deployments automáticos;
- secrets nunca no browser/Git/log;
- dados reais nunca em Preview/Development;
- nenhuma questão Q-001..Q-025 por inferência;
- nenhuma contratação/operação destrutiva sem autorização explícita.
