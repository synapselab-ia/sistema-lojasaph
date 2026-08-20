# Next Action — Sistema Lojasaph

## Contexto

A Fase 31 auditou `REQ-PLAT-005 — Backup e restauração` sem refazer a Fase 16.

Resultado:

- a mecânica de dump, checksum, restore isolado e runbook já estava correta;
- o projeto Supabase continua `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.141 e plano Free;
- Free continua sem automatic backups gerenciados;
- não existe workflow/agendador comprovado produzindo backup do ambiente real;
- Issue #75 registra essa lacuna;
- matriz: `docs/qa/backup-automation.md`;
- nenhuma mutação remota, restore hospedado, dump real, contratação ou deploy Vercel ocorreu na auditoria.

## O que já foi concluído — não repetir

Não reimplementar a Fase 16 / Issue #41 / PR #42.

Reutilizar:

- `docs/operations/backup-restore.md`;
- `scripts/export-supabase-backup.sh`;
- `scripts/verify-backup-restore.sh`;
- `supabase/tests/backup_restore.sql`;
- gate de backup/restore no `CI`.

Não confundir o drill de CI com backup de Production.

## Issue #75 — estado bloqueado até decisão operacional

A automação real depende de decisões que não podem ser inferidas:

- RPO;
- RTO;
- destino off-site;
- retenção;
- proteção/cifragem no destino;
- responsável e canal de alerta;
- periodicidade/destino de drill hospedado isolado.

### Se houver decisões novas em #75

1. Confirmar o estado real de `main`, Issue, PRs, branches e CI.
2. Ler os comentários/decisões registradas na Issue #75.
3. Criar/usar branch dedicada a #75.
4. Implementar a menor rotina segura reutilizando `scripts/export-supabase-backup.sh`.
5. A cadência não pode exceder o RPO aprovado.
6. `SUPABASE_DB_URL` deve vir somente de secret do runtime.
7. Usar Supabase CLI pinada/aprovada.
8. Validar `SHA256SUMS` antes do upload.
9. Persistir somente no destino off-site aprovado com a retenção definida.
10. Limpar temporários mesmo em falha e emitir sinal de sucesso/falha sem expor secrets/dump.
11. Manter o drill de restore da CI.
12. Não executar restore destrutivo sobre Production.
13. Validar shell/CI e a automação aplicável antes do merge.
14. Só fechar #75 após evidência de execução automática real + storage protegido + monitoramento + recuperação documentada/testada.

### Se #75 continuar sem essas decisões

Não criar cron/storage arbitrários. Tratar #75 como **bloqueada por decisão operacional** e avançar para a auditoria independente abaixo.

## Objetivo autônomo seguinte

**Auditar `REQ-PLAT-006 — Logs e erros`: erros relevantes devem ser rastreáveis por logs/observabilidade.**

A tarefa começa como auditoria, não como reimplementação da Fase 17.

### Baseline existente

Antes de criar trabalho novo, localizar e reaproveitar a Fase 17 / Issue #43 / PR #44 e a documentação associada, especialmente:

- contrato de logs estruturados server-side;
- correlation ID;
- redaction de tokens/credenciais/PII;
- `src/instrumentation.ts` / `onRequestError`;
- `error.tsx` / `global-error.tsx`;
- runbook `docs/operations/observability.md`;
- ADR de observabilidade;
- testes existentes.

### Fazer

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo e `WORKFLOW`.
2. Conferir primeiro Issue #75. Se não houver decisões novas, não editar a frente de backup.
3. Ler `REQ-PLAT-006` e toda a documentação da Fase 17.
4. Conferir estado real de `main`, Issues/PRs/branches e CI.
5. Inspecionar o código/runtime de observabilidade existente; não confiar apenas no PR histórico.
6. Verificar:
   - cobertura de erros server-side relevantes;
   - correlation ID end-to-end onde tecnicamente aplicável;
   - redaction/fail-safe de secrets e PII;
   - mensagens públicas sem internals;
   - logs de Auth e comandos críticos quando aplicável;
   - retenção/destino atual dos logs;
   - capacidade real de pesquisa/diagnóstico no ambiente hospedado;
   - monitoramento/alerta e limites atuais do provedor/plano.
7. Consultar documentação atual do Supabase/Vercel somente para pontos que dependam do comportamento vigente.
8. Se a observabilidade atual satisfizer o requisito, documentar evidência sem criar Issue artificial.
9. Se houver gap concreto e reproduzível, abrir uma única Issue, criar branch dedicada e implementar o menor fix reversível.
10. Não contratar vendor pago ou Log Drain por inferência.
11. Não fazer deploy Vercel salvo se um gap só puder ser validado em runtime hospedado e houver justificativa concreta; evitar consumo de quota.
12. Se houver patch, validar lint, typecheck, testes, build e gates PostgreSQL aplicáveis.
13. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Segurança / operação

- não versionar secrets, tokens, connection strings ou dumps;
- não logar cookies/headers completos;
- não restaurar Production para testar backup;
- não ativar PITR/plano pago/serviço externo sem autorização;
- não inventar RPO/RTO;
- não reativar bootstrap/auto-deploy Vercel.

## Não fazer

- não fechar #75 sem rotina automática real;
- não reimplementar a Fase 16;
- não tratar CI sintética como backup Production;
- não reabrir REQ-PLAT-004;
- não renumerar migrations;
- não inferir Q-001..Q-025.
