# Next Action — Sistema Lojasaph

## Contexto

Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos — está **implementada e tecnicamente validada, mas ainda não deve ser mergeada**.

Estado conhecido antes desta atualização documental:

- Issue #45 — open;
- PR #46 — draft/open;
- branch `agent/environment-isolation`;
- SHA técnico `ba200af6e2343b1b17fdeadfffbee1d4215bf0a0` teve `CI` #229, Inventory #139 e Business Transactions #122 verdes;
- SHA documental `ca9aece949988404f33d5ee951ad36a6228f5503` teve `CI` #235, Inventory #145 e Business Transactions #128 verdes;
- Preview `READY` `dpl_7DrbV7VjgHe7SSFPVkwkYQzPfwC2` foi gerado para `91738dc6f780c8269cdf9600fc57c64d63e6134d`, commit que já contém todo o código funcional final;
- smoke em `/health` nesse Preview confirmou `environment=preview`, `supabaseAccess=blocked`, `preview_backend_unverified` e `adminAccess=blocked`;
- o SHA documental posterior não recebeu deployment por `build-rate-limit`;
- nenhuma migration, DDL, branch/projeto Supabase, configuração remota ou write foi executado.

## Fazer agora

1. Conferir estado real da Issue #45, PR #46 e head atual de `agent/environment-isolation`.
2. Confirmar que não houve drift funcional desde o código já validado.
3. Exigir os três workflows verdes no head documental atual:
   - `CI`;
   - `Inventory Count Integration`;
   - `Business Transactions Integration`.
4. Conferir status/deployments Vercel do mesmo head.
5. Se ainda não existir Preview `READY` desse head por `build-rate-limit`:
   - não alterar código;
   - não criar commit vazio/artificial;
   - não fazer upgrade/contratação por inferência;
   - manter PR #46 draft e Issue #45 open;
   - encerrar o ciclo com o bloqueio documentado.
6. Quando existir Preview `READY` do head atual, executar somente smoke não mutável:
   - `GET /health`;
   - confirmar `environment=preview`;
   - enquanto não houver backend Preview isolado configurado, confirmar `supabaseAccess=blocked` e `adminAccess=blocked`;
   - abrir `/login` se a proteção Vercel permitir e confirmar aviso de isolamento/ausência de formulário operacional;
   - callback, se usado, somente sem credencial real;
   - não autenticar, não enviar password/token, não executar reset real e não executar mutação.
7. Se `/health` retornar `supabaseAccess=allowed`, **não executar operação alguma**. Primeiro comprovar, sem expor secrets, que o backend/ref é realmente distinto de Production. Sem essa prova, manter a fase aberta.
8. Após smoke aprovado no head atual:
   - atualizar PR #46 com SHA, workflows, deployment e evidência;
   - registrar zero alteração/write no Supabase;
   - marcar PR ready;
   - fazer merge normal em `main`;
   - confirmar Issue #45 closed/completed.
9. Somente depois do fechamento da Fase 18 revisar requisitos MUST/Issues reais para selecionar a próxima frente.
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
- runbook `docs/operations/environments.md`;
- documentação Supabase runtime;
- CI técnico e documental já verdes nos SHAs registrados acima;
- smoke funcional em Preview contendo todo o código funcional da fase.

## Não fazer agora

- não reimplementar Fase 18;
- não reabrir observabilidade/backup;
- não criar migration sem mudança estrutural;
- não ativar Supabase Pro/Branching ou outro recurso pago sem autorização;
- não copiar dados reais;
- não expor env vars/secrets;
- não alterar RLS/RPC/transações para contornar configuração;
- não importar planilhas reais/cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério de fechamento

A Fase 18 só fecha quando o head atual estiver 3/3 verde, possuir Preview `READY` homologado com smoke não mutável seguro, PR #46 estiver mergeado, Issue #45 estiver closed/completed e a `main` tiver continuidade pós-merge atualizada.
