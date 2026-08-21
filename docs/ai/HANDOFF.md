# Handoff — Sistema Lojasaph

## Estado

Fase 40 — revalidação de `REQ-PLAT-003 — Validação de dados` — foi concluída **sem finding funcional**.

`REQ-PLAT-003` já estava atendido desde a Fase 29. A continuidade pós-Fase 39 voltou a apontar para esse requisito, então esta sessão fez somente uma revalidação diferencial, sem repetir implementação/testes por rotina.

- `main` de entrada: `ff65c09d14b3468eb119e083f67e63d70aaa81ce`;
- baseline original da auditoria: `370b37161150bcf2eac3afb4afb9d8bb80d96e10`;
- branch: `agent/data-validation-revalidation`;
- Issue corretiva: nenhuma;
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- Issue #75: continua aberta/desarmada;
- nenhum deployment Vercel nesta fase;
- Production foi usada somente para introspecção read-only.

## Evidência de REQ-PLAT-003

Ler `docs/qa/data-validation.md` antes de reabrir essa frente.

Resumo da Fase 40:

- comparação `370b371…` → `ff65c09…`: 14 commits, sem alteração em `src/**`;
- migrations antigas foram apenas reconciliadas/renomeadas sem mudança SQL;
- mudança `membership_rls_initplan` preserva semântica e pertence a autorização/RLS;
- mudança `critical_config_audit` só adiciona audit trail de configuração crítica;
- schema hospedado mantém `CHECK`s, FKs compostas, precisões e triggers de validação relevantes;
- `inventory_balances_negative_policy` continua protegendo saldo negativo conforme configuração do local;
- os novos triggers de auditoria coexistem com os boundaries anteriores;
- nenhum DDL/DML/command de negócio foi executado em Production;
- não existe evidência de regra essencial que tenha passado a depender somente da UI.

Não criar teste, constraint ou validação nova apenas para “fechar” novamente `REQ-PLAT-003` sem regressão concreta.

## Backup Production / #75

A Fase 38 permanece como estava; não refazer automação.

Política já aprovada — não perguntar novamente:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- `PRODUCTION_SUPABASE_DB_URL` via Session pooler 5432.

Ainda pendente, deliberadamente para computador pessoal/confiável:

- OAuth Google Drive/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real de `Production Database Backup`;
- confirmação de archive + `.sha256` no Drive;
- fechamento da #75.

Se o operador não estiver em máquina pessoal/confiável, mantenha #75 aberta/desarmada e prossiga com a frente independente.

## Próximo chat

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION` e `WORKFLOW`.
2. Conferir estado real de `main`, Issues/PRs/branches/CI antes de agir.
3. Não refazer Fases 38, 39 ou 40.
4. Se #75 ainda estiver aguardando máquina confiável, executar a `NEXT_ACTION`: **Fase 41 — reconciliar o escopo MVP restante e selecionar a próxima vertical slice explícita**.
5. Confrontar `docs/product/scope.md` + `docs/product/requirements.md` com código, migrations, módulos e histórico de PRs.
6. Começar verificando, sem presumir prioridade, os gaps aparentes `REQ-FIN-008 — Anexos` e `REQ-EXPOR-001 — Exportação`.
7. Excluir itens `PENDING`, fase posterior e requisitos já fechados sem regressão.
8. Selecionar uma única lacuna de MVP com processo real e critério de aceite claro; abrir Issue e implementar somente quando a lacuna estiver comprovada.
9. Se a reconciliação mostrar que o candidato já existe ou depende de decisão do usuário, documentar e escolher o próximo candidato explícito, sem inventar requisito.
10. Ao final, atualizar continuidade novamente.

## Não fazer

- não receber/publicar DB URL, OAuth token/config ou App Password;
- não ativar backup antes dos secrets restantes;
- não fechar #75 sem run real;
- não restaurar Production para teste;
- não reabrir `REQ-PLAT-003`/`REQ-SEC-005` sem evidência de regressão;
- não implementar item `PENDING` por inferência;
- não contratar plano/add-on sem autorização;
- não criar deploy Vercel só para auditoria;
- não reaplicar migrations;
- não importar dados reais/cutover.
