# Next Action — Sistema Lojasaph

## Contexto

A Fase 30 corrigiu o drift de versions de migrations encontrado em `REQ-PLAT-004 — Migrações de banco`.

Estado validado da integração:

- Issue #73;
- PR #74;
- head validado antes deste handoff: `ef911001be843f6a191db7918c5fafd347a06120`;
- CI #307 — success;
- Business Transactions Integration #154 — success;
- Inventory Count Integration #170 — success;
- 27 migrations efetivas alinhadas às 27 versions do histórico Supabase;
- placeholder vazio removido;
- nenhum conteúdo SQL histórico alterado;
- nenhuma mutação no Supabase remoto;
- nenhum deployment Vercel.

## O que já foi concluído — não repetir

Não repetir a auditoria/correção de `REQ-PLAT-004`.

A identidade histórica das migrations está documentada em `docs/qa/database-migrations.md`. Depois que uma migration estiver registrada em ambiente compartilhado, não renumerar seu timestamp no GitHub. Não editar `supabase_migrations.schema_migrations` diretamente e não usar `migration repair` como cosmética.

## Objetivo ativo

**Auditar `REQ-PLAT-005 — Backup e restauração`: backups automáticos devem existir e o procedimento de restauração deve ser conhecido/testado.**

A tarefa começa como auditoria do estado atual, não como reimplementação da Fase 16. Já existe uma estratégia e prova técnica; é necessário verificar se ela satisfaz hoje o requisito de automação operacional.

## Baseline já existente

Antes de criar qualquer trabalho novo, verificar e reaproveitar:

- `docs/operations/backup-restore.md`;
- `scripts/export-supabase-backup.sh`;
- `scripts/verify-backup-restore.sh`;
- `supabase/tests/backup_restore.sql`;
- job `database` do `.github/workflows/ci.yml`, que executa o drill lógico em PostgreSQL efêmero.

A Fase 30 acabou de confirmar novamente que o drill de backup/restore do CI passa após reconstrução completa das migrations.

## Fazer agora

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-005`);
   - `docs/operations/backup-restore.md`;
   - scripts/testes de backup citados acima.
2. Conferir estado real de `main`, branches, Issues, PRs e workflows.
3. Consultar a documentação oficial atual do Supabase sobre:
   - backups gerenciados por plano;
   - PITR;
   - `supabase db dump`/restore;
   - recomendações de automação/CI para backup.
4. Confirmar o estado atual do projeto/plano Supabase somente por leitura quando possível; não assumir que o status de 2026-08-18 continua igual.
5. Montar uma matriz separando:
   - backup de schema via migrations;
   - backup lógico de dados;
   - automação/cadência real;
   - storage off-site/retention;
   - integridade/checksum;
   - restore testado;
   - monitoramento/alerta;
   - RPO/RTO.
6. Não confundir o drill de CI com backup automático de Production. O CI prova restauração mecânica; `REQ-PLAT-005` também exige existência da rotina automática apropriada ao ambiente real.
7. Verificar se existe workflow/automation externa já configurada para executar `scripts/export-supabase-backup.sh`. Pesquisar o repositório e integrações disponíveis antes de concluir que não existe.
8. Se a rotina automática real já existir e estiver adequada:
   - documentar evidência;
   - considerar `REQ-PLAT-005` atendido;
   - não criar Issue artificial.
9. Se houver somente helper/runbook e nenhuma automação real:
   - registrar a lacuna concreta;
   - abrir uma única Issue;
   - propor a menor automação segura possível sem inventar RPO/RTO;
   - não armazenar dumps ou secrets no GitHub;
   - não ativar custo/plano pago sem decisão explícita do usuário.
10. Se a correção depender de RPO/RTO ou destino off-site ainda não definido pelo negócio, não inventar valores. Implementar apenas o que for reversível e independente dessa decisão, ou documentar o bloqueio objetivo.
11. Não executar restore destrutivo no projeto Supabase ativo. Qualquer drill hospedado precisa de destino isolado e decisão explícita.
12. Se houver patch, validar shell syntax, CI, restore drill e demais gates aplicáveis antes do merge.
13. Não fazer deploy Vercel durante auditoria/iteração.
14. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao encerrar.

## Critério de conclusão

`REQ-PLAT-005` só pode ser considerado atendido quando for possível apontar:

- qual mecanismo produz backups do ambiente real;
- onde e com que proteção eles são armazenados;
- como a integridade é conferida;
- como a restauração é executada e testada sem destruir Production;
- quais parâmetros operacionais estão definidos e quais permanecem explicitamente pendentes.

Uma prova de restore em CI é necessária e valiosa, mas isoladamente não comprova que backups automáticos do ambiente real estejam acontecendo.

## Segurança / operação

- não versionar dump ou connection string;
- não expor secret administrativa;
- não restaurar sobre Production para testar;
- não habilitar PITR/plano pago sem autorização explícita;
- não inferir RPO/RTO;
- não reativar bootstrap ou auto-deploy Vercel.

## Não fazer

- não reabrir REQ-PLAT-004;
- não renumerar migrations;
- não criar nova estratégia de backup ignorando a Fase 16;
- não considerar `verify-backup-restore.sh` prova suficiente de automação Production;
- não usar dados reais como fixture;
- não inferir Q-001..Q-025.
