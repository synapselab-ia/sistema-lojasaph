# Next Action — Sistema Lojasaph

## Contexto

Fase 16 — backup automático, restauração testada e recuperação operacional — foi encerrada com sucesso.

Estado real:

- PR #42 — merged em `main`;
- Issue #41 — closed/completed;
- merge commit: `c1bd48e99f74687622c24a856f193bf47aa35d39`;
- SHA final pré-merge `efb4b2ca55bf650fa303c57025979f5f5c4d13f8` teve `CI` #206, `Inventory Count Integration` #125 e `Business Transactions Integration` #108 verdes;
- drill de dump/checksum/restore PostgreSQL 17 aprovado;
- nenhuma migration, DDL ou operação de restore da Fase 16 foi executada no Supabase remoto;
- runbook: `docs/operations/backup-restore.md`;
- RPO/RTO, retenção e destino off-site permanecem pendentes;
- nova Issue criada: #43 — `Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros`;
- nenhuma branch funcional da Fase 17 foi criada ainda.

## Fazer agora

1. Conferir a Issue #43 e o estado atual da `main` antes de alterar código.
2. Criar a branch `agent/observability` a partir da `main` atual.
3. Ler antes da implementação:
   - `docs/product/requirements.md`, especialmente `REQ-PLAT-006` e `REQ-SEC-004`;
   - documentação de runtime/Supabase/Vercel;
   - ADRs relacionados;
   - handlers/server actions/adapters/gateways e padrões atuais de erro/UI.
4. Verificar a documentação oficial vigente e as capacidades reais dos projetos/planos conectados:
   - Vercel runtime logs, erros, retenção e recursos de observabilidade disponíveis;
   - Supabase logs relevantes e limitações do plano atual;
   - não assumir por memória e não adotar vendor pago por padrão.
5. Definir contrato de observabilidade seguro e independente do destino:
   - log estruturado;
   - níveis;
   - timestamp;
   - event/error code estável;
   - correlation/request ID;
   - contexto técnico mínimo;
   - política explícita de redaction.
6. Implementar utilitário server-side central de logging/redaction e instrumentar somente os boundaries prioritários do runtime.
7. Padronizar mapeamento de erros para a UI:
   - mensagem segura ao usuário;
   - referência/correlation ID quando apropriado;
   - detalhe técnico somente no servidor.
8. Criar error boundary/fallback apropriado para falhas inesperadas da UI sem vazar internals.
9. Não registrar JWT, passwords, connection strings, secrets, payloads financeiros completos ou PII desnecessária.
10. Criar testes para estrutura, níveis, redaction, correlation ID, error mapping e fallbacks.
11. Validar no runtime Vercel com dados sintéticos/não sensíveis; usar Supabase apenas em checks/logs read-only quando necessário.
12. Rodar lint, typecheck, Vitest, build e workflows PostgreSQL existentes.
13. Atualizar documentação operacional, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo antes do fechamento do PR/Issue.

## Não fazer agora

- não reimplementar backup/restore da Fase 16;
- não executar restore destrutivo no Supabase ativo;
- não adotar/contratar Sentry, Datadog, Axiom ou outro vendor pago por inferência;
- não criar data warehouse/BI;
- não definir SLA/SLO, retenção paga ou on-call por inferência;
- não versionar/logar secrets, tokens ou dados sensíveis;
- não alterar fluxos transacionais homologados sem necessidade direta de observabilidade;
- não importar planilhas reais nem executar cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério para encerrar a Fase 17

Erros relevantes do runtime devem ser rastreáveis por logs estruturados/correlation IDs sem exposição de secrets ou dados sensíveis; a UI deve apresentar falhas seguras; os principais boundaries devem ter cobertura; a estratégia deve refletir as capacidades reais de Vercel/Supabase; e CI deve permanecer verde com validação usando apenas dados sintéticos/não sensíveis.
