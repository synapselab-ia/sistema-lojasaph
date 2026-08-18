# Next Action — Sistema Lojasaph

## Contexto

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — está **implementada e tecnicamente validada, mas ainda não deve ser mergeada**.

Estado real conhecido:

- Issue #45 — open;
- PR #46 — draft/open;
- branch `agent/environment-isolation` baseada em `main` `5c617e7f26c514139be3b6171f38e28ae5ae30af`;
- SHA técnico validado antes dos commits documentais finais: `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0`;
- nesse SHA passaram:
  - `CI` #229;
  - `Inventory Count Integration` #139;
  - `Business Transactions Integration` #122;
- política fail-closed, testes, ADR-008 e runbook já foram implementados;
- nenhuma migration, DDL, branch/projeto Supabase ou write remoto foi executado;
- Supabase verificado com um projeto saudável, PostgreSQL 17, organização Free e zero branches;
- Vercel gerou Preview apenas para o primeiro commit da fase (`7307ccf8...`), não para o head final;
- commits posteriores estão bloqueados por `build-rate-limit` da Vercel.

## Fazer agora

1. Conferir o estado real da Issue #45, PR #46 e head de `agent/environment-isolation`.
2. Confirmar que não surgiu drift ou alteração funcional nova desde este handoff.
3. Conferir `CI`, `Inventory Count Integration` e `Business Transactions Integration` no **head documental final** da branch.
4. Se algum workflow falhar, corrigir somente a causa real e revalidar.
5. Conferir o status Vercel e a lista de deployments do mesmo head.
6. Se ainda estiver bloqueado por `build-rate-limit`:
   - **não alterar código** para contornar;
   - não criar commit vazio/artificial;
   - não fazer upgrade/contratação por inferência;
   - manter PR #46 draft e Issue #45 open;
   - encerrar o ciclo deixando este bloqueio documentado.
7. Quando existir um deployment Vercel `READY` do head final, executar apenas homologação **não mutável e sem dados reais**:
   - buscar `/health`;
   - confirmar `environment=preview`;
   - enquanto não houver backend Preview isolado configurado, confirmar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` e confirmar aviso de isolamento e ausência do formulário operacional;
   - opcionalmente acessar `/auth/callback` sem credencial real e confirmar resposta/redirecionamento seguro;
   - não autenticar usuário real;
   - não enviar senha/token;
   - não executar password reset real;
   - não executar nenhuma mutação.
8. Se `/health` retornar `supabaseAccess=allowed`, **não prosseguir com qualquer ação operacional**. Primeiro comprovar, sem expor secrets, que o backend/ref é diferente de Production. Se isso não puder ser comprovado, tratar como não seguro e manter a fase aberta.
9. Após smoke aprovado:
   - atualizar o corpo do PR #46 com SHA final, workflows, deployment e evidências do smoke;
   - registrar explicitamente zero alteração/write no Supabase remoto;
   - marcar PR ready for review;
   - fazer merge normal em `main`;
   - confirmar Issue #45 closed/completed.
10. Somente depois do fechamento da Fase 18, revisar `requirements.md`, Issues e código real para selecionar a próxima lacuna MUST executável.
11. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo na `main` para o estado pós-merge.

## Já concluído — não refazer

- política em `src/lib/runtime/environment.ts`;
- facade server-only em `src/lib/runtime/server.ts`;
- validação server/browser de Supabase;
- guardrails de Auth, callback, password reset, signout, bootstrap, Proxy e workspace;
- `/health` seguro;
- UI isolada de login/recuperação;
- testes de environment policy e client/server secret boundary;
- `.env.example` atualizado;
- `ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- atualização de `docs/modules/supabase-runtime.md`;
- CI técnico 3/3 verde no SHA `ba200af6...`.

## Não fazer agora

- não reimplementar a Fase 18;
- não reabrir Fase 17 ou backup/restore;
- não criar migration para uma fase sem mudança estrutural;
- não ativar Supabase Pro/Branching ou outro recurso pago sem autorização explícita;
- não copiar dados reais para Preview/Development;
- não publicar valores de env vars/secrets;
- não alterar RLS/RPC/transações homologadas para contornar ambiente;
- não importar planilhas reais/cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério para encerrar a Fase 18

A Fase 18 só pode ser encerrada quando:

1. o head final estiver com os três workflows verdes;
2. existir Preview Vercel `READY` exatamente desse head;
3. o smoke não mutável comprovar comportamento fail-closed seguro em Preview sem backend isolado, ou comprovar isolamento real antes de qualquer operação;
4. nenhum secret/dado real tiver sido exposto ou copiado;
5. PR #46 estiver atualizado/ready e mergeado;
6. Issue #45 estiver closed/completed;
7. a `main` estiver com continuidade pós-merge atualizada.