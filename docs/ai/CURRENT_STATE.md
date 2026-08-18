# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — **implementada e tecnicamente validada; fechamento depende do último gate hospedado**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #45 — open
- PR #46 — draft/open
- branch: `agent/environment-isolation`
- Fase 18 não exige migration/DDL.
- código funcional final já foi validado anteriormente em CI e em Preview fail-closed.

## Fase 18 — implementado

A entrega cobre `REQ-PLAT-007` e reforça `REQ-SEC-004`:

- política central fail-closed em `src/lib/runtime/environment.ts`;
- ambientes `development`, `preview`, `production` e `unknown`;
- mismatch entre `LOJASAPH_APP_ENV` e `VERCEL_ENV` bloqueia acesso;
- Production rejeita backend local e pode fixar a ref esperada do Supabase;
- Preview bloqueia Supabase até existir backend próprio comprovado por ref distinta de Production;
- Development aceita Supabase local e exige identidade própria para backend remoto;
- `SUPABASE_SECRET_KEY` permanece server-only;
- admin client fora de Production fica bloqueado por padrão;
- callbacks usam URL coerente com o ambiente;
- Proxy/Auth/reset/signout/bootstrap/workspace respeitam a política;
- browser usa somente variáveis públicas permitidas;
- `/health` expõe somente estado não sensível;
- login/recuperação ficam desabilitados sem backend operacional aprovado;
- testes cobrem parsing, refs, fail-closed, admin e fronteira client/server de secrets.

## Documentação

- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- `docs/modules/supabase-runtime.md`.

## CI historicamente validado

No SHA `0979a33f05fefb75f554219d8552e9f7b74c3601` passaram:

- `CI` #236;
- `Inventory Count Integration` #146;
- `Business Transactions Integration` #129.

Esse gate validou lint, typecheck, Vitest, build, migrations/seed, backup/restore e suítes PostgreSQL existentes.

## Vercel — política atual

Depois do bloqueio por quota Hobby, os PRs #47 e #48 foram integrados à `main` e `vercel.json` agora define:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Portanto **nenhum deployment Git automático deve ser esperado**, inclusive em `main`. Previews e Production devem ser disparados manualmente apenas quando explicitamente necessários.

A branch da Fase 18 foi reconciliada com a `main` mantendo o mesmo conteúdo final de `vercel.json`.

Último Preview homologado da Fase 18:

- commit `91738dc6f780c8269cdf9600fc57c64d63e6134d`;
- deployment `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` — `READY`;
- `/health`: `environment=preview`, `supabaseAccess=blocked`, `supabaseReason=preview_backend_unverified`, `adminAccess=blocked`;
- zero autenticação, senha, token ou mutação.

Esse commit já contém todo o código funcional da fase. Mudanças posteriores foram continuidade e política de deployment.

## Supabase remoto

Última verificação read-only conhecida:

- um projeto conectado;
- saudável;
- PostgreSQL 17;
- zero branches.

A Fase 18 não criou migration, DDL, branch/projeto, configuração remota ou write de dados. Nenhum dado real foi copiado e nenhum upgrade foi contratado.

## Gate restante

1. exigir os três workflows verdes no **head atual após a reconciliação com `main`**;
2. criar **um único Preview manual** do head atual;
3. executar somente smoke não mutável em `/health` e, se acessível, `/login`;
4. esperar `environment=preview`, `supabaseAccess=blocked` e `adminAccess=blocked` enquanto não existir backend Preview isolado;
5. se `supabaseAccess=allowed`, parar antes de qualquer operação e comprovar backend distinto de Production;
6. com smoke aprovado, atualizar PR #46, marcar ready, mergear e confirmar Issue #45 closed;
7. atualizar continuidade na `main` pós-merge.

## Não repetir

- não reimplementar Fase 18;
- não reabrir observabilidade/backup;
- não reativar deploy automático apenas para obter Preview;
- não criar commits artificiais para provocar Vercel;
- não contratar recurso pago por inferência;
- não reaplicar migrations antigas;
- não importar dados reais/cutover;
- não inferir Q-001 a Q-025.
