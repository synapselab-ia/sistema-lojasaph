# Handoff — Sistema Lojasaph

## Estado

A Fase 31 auditou `REQ-PLAT-005 — Backup e restauração` sem refazer a Fase 16 e encontrou uma lacuna operacional real: o restore é testado, mas **não existe rotina automática comprovada de backup do ambiente hospedado real**.

Frente atual:

- Issue #75 — `Fase 31 — ativar backup automático real de Production`;
- branch de auditoria/documentação: `agent/backup-automation-audit`;
- baseline inicial de `main`: `e68cc3f9196de532943df4a13ec77687f4e5e53d`;
- matriz nova: `docs/qa/backup-automation.md`;
- nenhum DDL/DML remoto;
- nenhum restore hospedado;
- nenhum dump real;
- nenhuma contratação/upgrade;
- nenhum deploy Vercel.

## O que a Fase 16 já resolveu — não repetir

A Issue #41 / PR #42 já entregaram:

- `docs/operations/backup-restore.md`;
- `scripts/export-supabase-backup.sh`;
- `scripts/verify-backup-restore.sh`;
- `supabase/tests/backup_restore.sql`;
- checksum SHA-256;
- temporários com permissão restrita;
- proteção contra gravação do backup dentro do Git repository;
- runbook de restore seguro;
- drill de dump/restore em PostgreSQL 17 efêmero integrado ao CI.

O CI continua sendo uma boa prova de **recuperabilidade técnica**, mas não produz backup do banco real.

## Achado da Fase 31

O requisito em `docs/product/requirements.md` diz:

`REQ-PLAT-005 — MUST antes de produção — Definir backup automático e testar restauração.`

A parte `testar restauração` está comprovada. A parte `backup automático` não está.

Auditoria de `.github/workflows/` encontrou apenas:

- `ci.yml`;
- `create-inventory-count-migration.yml`;
- `inventory-count-ci.yml`;
- `one-shot-inventory-wiring.yml`;
- `purchases-ci.yml`.

Nenhum workflow executa/agendada `scripts/export-supabase-backup.sh` contra o projeto hospedado.

O PR #42 já tinha deixado RPO/RTO, retenção e destino off-site explicitamente pendentes. Portanto não criar um cron arbitrário apenas para marcar o requisito como concluído.

## Supabase verificado em 2026-08-20

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL `17.6.1.141`;
- organização no plano `free`.

Documentação oficial atual:

- Free não inclui automatic backups gerenciados;
- Supabase recomenda `db dump` regular + cópias off-site para Free;
- backups diários gerenciados existem em Pro/Team/Enterprise;
- PITR é add-on pago e requer compute compatível;
- database backup não recupera objetos binários do Storage API;
- restore físico para um novo projeto é opção de plano pago;
- o guia CLI vigente continua usando dumps separados de roles/schema/data, compatível com o helper existente.

Referências estão registradas em `docs/qa/backup-automation.md`.

## Issue #75 — bloqueio objetivo

Para ativar a rotina real sem inventar política de negócio/operação, faltam decisões explícitas:

1. RPO máximo aceitável;
2. RTO máximo aceitável;
3. destino off-site aprovado;
4. retenção;
5. cifragem/proteção exigida no destino;
6. responsável pela rotina e canal de alerta;
7. periodicidade/destino para drill hospedado isolado.

A Issue #75 só deve ser fechada quando houver evidência de execução automática real, armazenamento protegido/off-site, integridade verificada, retenção, monitoramento e recuperação documentada/testada.

## Validação já disponível

O último head funcional antes desta auditoria passou:

- CI #308 — success;
- Business Transactions Integration #155 — success;
- Inventory Count Integration #171 — success.

O CI #308 aplicou migrations, seed, dump lógico, checksum, restore isolado e suites SQL; lint, typecheck, Vitest e build também ficaram verdes.

A Fase 31 até este handoff alterou somente documentação e Issue; não alterou scripts, código, migrations ou Supabase.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW`, `requirements.md`, `docs/operations/backup-restore.md` e `docs/qa/backup-automation.md`.
2. Conferir `main`, Issue #75, PRs, branches e CI reais.
3. Se houver decisões novas registradas em #75 sobre RPO/RTO/destino/retenção/alerta, implementar a menor automação segura reutilizando o helper existente.
4. Se #75 continuar sem essas decisões, marcar a frente como bloqueada por decisão operacional; **não inventar cron/storage**.
5. Nesse caso, avançar para a auditoria independente de `REQ-PLAT-006 — Logs e erros`, usando a Fase 17 como baseline e sem refazê-la.
6. Para PLAT-006, verificar logs estruturados, correlation ID, redaction, runbook, runtime real e lacunas de retenção/alerta; só abrir Issue nova se houver gap concreto.
7. Não executar restore destrutivo no Supabase ativo.
8. Não fazer deploy Vercel para auditoria.
9. Atualizar continuidade ao final.

## Não fazer

- não fechar #75 só porque existe helper ou drill de CI;
- não reabrir/reimplementar #41/#42;
- não armazenar dump real no GitHub;
- não versionar database URL ou secrets;
- não ativar plano pago/PITR sem autorização;
- não restaurar Production para testar;
- não renumerar migrations;
- não reativar bootstrap/auto-deploy;
- não inferir Q-001..Q-025.
