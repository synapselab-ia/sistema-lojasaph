# Next Action — Sistema Lojasaph

## Contexto

A Fase 32 auditou `REQ-PLAT-006 — Logs e erros` sem refazer a Fase 17.

Resultado:

- o contrato de logs estruturados, correlation ID, redaction, error boundaries e mensagens públicas continua presente e testado;
- Runtime Errors da Vercel comprovou captura real de `runtime.request.error` com correlationId e digest;
- o erro histórico observado em `/workspace` pertencia a deployment anterior e já foi corrigido pela Fase 26;
- o latest Production deployment consultado ficou sem novo error/warning na janela recente disponível;
- logs de API/Auth do Supabase continuam pesquisáveis read-only;
- retenção longa, browser telemetry, tracing cross-provider, SLA/SLO e alertas permanecem limitações/decisões não exigidas pelo requisito atual;
- nenhuma nova Issue de observabilidade foi aberta;
- nenhum deployment, DDL/DML ou configuração remota foi criado/alterado.

A evidência detalhada está em `docs/qa/observability.md` e `docs/operations/observability.md`.

## O que já foi concluído — não repetir

Não reimplementar a Fase 17 / Issue #43 / PR #44.

Reutilizar:

- `docs/decisions/ADR-007-observability-contract.md`;
- `docs/operations/observability.md`;
- `docs/qa/observability.md`;
- `src/lib/observability/core.ts`;
- `src/lib/observability/server.ts`;
- `src/lib/observability/public-error.ts`;
- `src/instrumentation.ts`;
- `src/proxy.ts`;
- `src/app/error.tsx`;
- `src/app/global-error.tsx`;
- testes de observabilidade existentes.

Não abrir Issue apenas porque retenção/SLA/alerta não foram definidos; isso exige requisito operacional concreto.

## Issue #75 — continuar bloqueada até decisão operacional

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta.

Se continuar sem essas decisões, não inventar cron/storage e não interromper a próxima auditoria independente.

## Objetivo ativo

**Auditar `REQ-PLAT-007 — Ambientes separados`: Development/Preview e Production não devem compartilhar inadvertidamente dados/segredos.**

A tarefa começa como auditoria, não como reimplementação da Fase 18.

## Baseline existente

Antes de criar trabalho novo, localizar e reaproveitar a Fase 18 / Issue #45 / PR #46 e especialmente:

- `docs/decisions/ADR-008-environment-isolation.md`;
- `docs/operations/environments.md`;
- política runtime em `src/lib/runtime/`;
- integração do Proxy/Auth/workspace com essa política;
- `/health` seguro;
- testes de isolamento;
- `vercel.json` com `git.deploymentEnabled=false`;
- evidência histórica de Preview bloqueado sem backend isolado.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW` e `REQ-PLAT-007`.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Se #75 continuar bloqueada, não editar backup.
4. Ler ADR-008, `docs/operations/environments.md`, política runtime e testes atuais; não confiar apenas no PR histórico.
5. Verificar o estado real da Vercel sem copiar valores secretos:
   - projeto/targets Production, Preview e Development;
   - nomes/escopos de environment variables quando a ferramenta permitir;
   - Git deployment policy;
   - latest Production deployment e commit;
   - existência de Preview ativo/recente que possa compartilhar backend Production.
6. Verificar o estado real do Supabase:
   - projeto Production atual;
   - branches/projetos adicionais;
   - plano/custo antes de considerar criação de ambiente;
   - não criar branch/projeto pago sem autorização explícita.
7. Revalidar os guardrails do código:
   - mismatch `LOJASAPH_APP_ENV` / `VERCEL_ENV` deve falhar fechado;
   - Preview sem backend isolado deve bloquear Supabase;
   - ref de Preview deve diferir da ref Production;
   - Development remoto deve usar ref distinta de Production;
   - admin secret deve permanecer bloqueado fora de Production salvo opt-in explícito em backend comprovadamente isolado;
   - browser não deve receber secret administrativa;
   - `/health` não deve revelar URL/ref/key/secret.
8. Distinguir configuração **comprovada** de configuração **não observável**. Ausência de acesso à listagem de env vars não prova compartilhamento nem isolamento.
9. Não executar login, convite, password reset ou mutação em Preview apontando para backend não comprovado.
10. Se a configuração/código atuais satisfizerem o requisito, documentar a evidência sem abrir Issue artificial.
11. Se houver gap concreto e reproduzível, abrir uma única Issue, criar branch dedicada e implementar o menor fix reversível.
12. Não criar Vercel deployment apenas para auditoria se o estado atual puder ser comprovado por configuração/runtime existente.
13. Não reativar auto-deploy; `git.deploymentEnabled=false` permanece política deliberada.
14. Se houver patch, validar lint, typecheck, testes, build e gates aplicáveis antes do merge.
15. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão

`REQ-PLAT-007` pode ser considerado atendido quando houver evidência suficiente de que:

- Preview/Development não recebem inadvertidamente backend/dados Production;
- secrets administrativas não estão disponíveis em cliente e não-prod sem exceção explícita;
- a identidade do backend é verificada fail-closed pelo runtime;
- configuração não comprovada resulta em bloqueio, não em acesso permissivo;
- a documentação distingue claramente o que está comprovado, bloqueado e pendente.

## Segurança / operação

- nunca copiar valores de env vars/secrets para GitHub ou chat;
- não criar backend/branch Supabase com custo sem autorização;
- não testar escrita em Preview se a identidade do backend não estiver comprovada;
- não reativar Git auto-deploy;
- não fazer deploy Vercel apenas para repetir evidência histórica;
- não fechar #75 sem backup automático real;
- não inferir Q-001..Q-025.
