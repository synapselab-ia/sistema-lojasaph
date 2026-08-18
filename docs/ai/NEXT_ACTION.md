# Next Action — Sistema Lojasaph

## Contexto

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — está **implementada e tecnicamente validada, mas ainda não deve ser mergeada até o gate final hospedado**.

Mudança operacional importante:

- os PRs #47 e #48 foram integrados à `main` para evitar consumo automático da quota Hobby da Vercel;
- `vercel.json` agora usa `git.deploymentEnabled=false`;
- a branch `agent/environment-isolation` foi reconciliada com essa política;
- portanto um Preview final **não surgirá automaticamente por push** e deve ser criado manualmente apenas uma vez, depois de CI verde.

Último gate completo anterior:

- `0979a33f05fefb75f554219d8552e9f7b74c3601` teve `CI` #236, Inventory #146 e Business Transactions #129 verdes;
- Preview `READY` `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` foi gerado para `91738dc6f780c8269cdf9600fc57c64d63e6134d`, commit que já contém todo o código funcional final;
- smoke em `/health` confirmou `environment=preview`, `supabaseAccess=blocked`, `preview_backend_unverified` e `adminAccess=blocked`;
- nenhuma migration, DDL, branch/projeto Supabase, configuração remota ou write foi executado.

## Fazer agora

1. Conferir estado real da Issue #45, PR #46 e head atual de `agent/environment-isolation`.
2. Confirmar que a branch está reconciliada com a `main` atual e que não houve drift funcional além de `vercel.json`/documentação.
3. Exigir os três workflows verdes no head atual:
   - `CI`;
   - `Inventory Count Integration`;
   - `Business Transactions Integration`.
4. Se qualquer workflow falhar, diagnosticar a falha antes de Vercel.
5. Com 3/3 verde, criar **um único deployment manual de Preview** do head atual. Não reativar Git deployments.
6. No Preview manual, executar somente smoke não mutável:
   - `GET /health`;
   - confirmar `environment=preview`;
   - enquanto não houver backend Preview isolado configurado, confirmar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` se a proteção Vercel permitir e confirmar aviso de isolamento/ausência de formulário operacional;
   - callback, se usado, somente sem credencial real;
   - não autenticar, não enviar password/token, não executar reset real e não executar mutação.
7. Se `/health` retornar `supabaseAccess=allowed`, **não executar operação alguma**. Primeiro comprovar, sem expor secrets, que o backend/ref é realmente distinto de Production.
8. Após smoke aprovado:
   - atualizar PR #46 com SHA, workflows, deployment e evidência;
   - registrar zero alteração/write no Supabase;
   - marcar PR ready;
   - fazer merge normal em `main`;
   - confirmar Issue #45 closed/completed.
9. Somente depois revisar requisitos MUST/Issues reais para selecionar a próxima frente.
10. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` pós-merge.

## Já concluído — não refazer

- política fail-closed de ambientes;
- runtime server-only;
- validação Supabase server/browser;
- guardrails de Proxy/Auth/callback/reset/signout/bootstrap/workspace;
- `/health` seguro;
- UI isolada de login/recuperação;
- testes de policy e client/server secret boundary;
- `.env.example`;
- ADR-008;
- runbook de ambientes;
- documentação Supabase runtime;
- smoke funcional em Preview contendo todo o código funcional da fase;
- política Vercel manual-only via PRs #47/#48.

## Não fazer agora

- não reimplementar Fase 18;
- não reabrir observabilidade/backup;
- não reativar deployment automático;
- não criar commits vazios/artificiais para provocar Vercel;
- não criar migration sem mudança estrutural;
- não ativar Supabase Pro/Branching ou outro recurso pago sem autorização;
- não copiar dados reais;
- não expor env vars/secrets;
- não alterar RLS/RPC/transações para contornar configuração;
- não importar planilhas reais/cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério de fechamento

A Fase 18 só fecha quando o head atual estiver 3/3 verde, possuir um Preview manual `READY` homologado com smoke não mutável seguro, PR #46 estiver mergeado, Issue #45 estiver closed/completed e a `main` tiver continuidade pós-merge atualizada.
