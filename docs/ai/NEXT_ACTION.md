# Next Action — Sistema Lojasaph

## Contexto

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — foi implementada e tecnicamente validada.

Estado real da branch:

- Issue #43 — open até o merge;
- PR #44 — draft;
- branch `agent/observability` criada a partir de `main` em `00e2f3c72c22f571a86b15dd52edd8873c9e5fef`;
- SHA técnico validado: `8d52a03f778c5fa5e66773fef9fe30387a62b5eb`;
- nesse SHA passaram `CI` #213, `Inventory Count Integration` #128 e `Business Transactions Integration` #111;
- preview Vercel `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9` ficou `READY`;
- smoke sintético `/auth/callback` gerou `auth.callback.failed`, response com `x-correlation-id` e log JSON estruturado;
- nenhuma migration, DDL, configuração ou write foi executado no Supabase remoto;
- documentação nova: `ADR-007-observability-contract.md` e `docs/operations/observability.md`.

## Fazer agora

1. Conferir o head atual de `agent/observability` e o PR #44.
2. Exigir os três workflows verdes no SHA documental final:
   - `CI`;
   - `Inventory Count Integration`;
   - `Business Transactions Integration`.
3. Se algum gate falhar, corrigir apenas a causa real e revalidar.
4. Atualizar o corpo do PR #44 com o SHA final e as evidências de:
   - CI completo;
   - preview Vercel READY;
   - evento `auth.callback.failed` visível em Runtime Logs com dados sintéticos;
   - UI sem exposição de mensagens de persistência;
   - zero alteração remota no Supabase;
   - limitações atuais de telemetria client-side/retenção/vendor.
5. Marcar o PR #44 ready for review.
6. Fazer merge normal em `main`.
7. Confirmar Issue #43 como closed/completed; fechar explicitamente se necessário.
8. Somente depois do merge, revisar `requirements.md`, Issues e código real para escolher a próxima lacuna MUST executável.
9. Criar a próxima Issue somente se não existir Issue aberta equivalente.
10. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo na `main` para o estado pós-merge e a próxima ação real.

## Não refazer

- não substituir o contrato de logging por vendor específico nesta fase;
- não reimplementar correlation ID/redaction/error boundaries;
- não reabrir backup/restore da Fase 16;
- não criar migration para uma fase sem mudança estrutural;
- não tocar em RLS/RPC/transações homologadas sem requisito novo;
- não logar JWT, senha, cookie, token, connection string, payload financeiro completo ou PII desnecessária;
- não importar planilhas reais nem executar cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério de fechamento

A Fase 17 pode ser encerrada quando o SHA documental final estiver com os três workflows verdes, o PR #44 estiver atualizado/ready e mergeado, a Issue #43 estiver closed/completed e a `main` tiver handoff consistente para a próxima lacuna real.