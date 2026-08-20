# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 31 auditou `REQ-PLAT-005 — Backup e restauração` sem refazer a Fase 16.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline de `main` no início da fase: `e68cc3f9196de532943df4a13ec77687f4e5e53d`
- Issue #75 — `Fase 31 — ativar backup automático real de Production`
- branch de documentação/auditoria: `agent/backup-automation-audit`
- nenhuma migration/DDL/DML remoto
- nenhum restore no Supabase hospedado
- nenhum plano/add-on pago ativado
- nenhum dump real criado/versionado
- nenhum deploy Vercel

## REQ-PLAT-005 — auditoria da Fase 31

O requisito é `MUST antes de produção`: definir backup automático e testar restauração.

A Fase 16 continua válida e não foi reimplementada. Já existem:

- `docs/operations/backup-restore.md`;
- `scripts/export-supabase-backup.sh`;
- `scripts/verify-backup-restore.sh`;
- `supabase/tests/backup_restore.sql`;
- drill automatizado no job `database` de `.github/workflows/ci.yml`.

O helper de exportação produz roles/schema/data por Supabase CLI, usa `umask 077`, recusa gravar dentro do Git repository e cria/verifica `SHA256SUMS`.

O drill da CI cria dump lógico de banco sintético, verifica checksum, restaura em banco isolado e testa dados, RLS, grants, RPC esperada e isolamento de Organization.

### Lacuna concreta

A auditoria confirmou que não existe hoje rotina automática comprovada produzindo backups do ambiente hospedado real.

`.github/workflows/` contém somente:

- `ci.yml`;
- `create-inventory-count-migration.yml`;
- `inventory-count-ci.yml`;
- `one-shot-inventory-wiring.yml`;
- `purchases-ci.yml`.

Nenhum deles agenda/executa `scripts/export-supabase-backup.sh` contra Production.

O PR histórico #42 da Fase 16 já registrava RPO/RTO, retenção e destino off-site como pendentes. Portanto a parte de restore é comprovada, mas a parte de **backup automático real** ainda não atende `REQ-PLAT-005`.

A matriz completa está em `docs/qa/backup-automation.md`.

## Supabase atual

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL `17.6.1.141` / engine 17;
- organização continua no plano `free`.

Documentação oficial vigente verificada em 2026-08-20:

- Free não inclui backups automáticos gerenciados;
- para Free, Supabase recomenda `supabase db dump` regular + backup off-site;
- Pro/Team/Enterprise têm backups diários gerenciados conforme retenção do plano;
- PITR permanece add-on de planos pagos e exige compute compatível;
- backup do banco não recupera objetos binários do Storage API;
- restore físico para novo projeto é recurso de plano pago;
- o fluxo de backup lógico continua separando roles, schema e data, compatível com o helper existente.

O changelog de breaking changes foi revisado e nenhum item atual invalida o mecanismo de dump lógico usado pela Fase 16.

## Bloqueio operacional de #75

Não é seguro criar cron, retenção ou storage arbitrários. Antes de ativar o backup real precisam ser definidos explicitamente:

1. RPO;
2. RTO;
3. destino off-site aprovado;
4. retenção;
5. proteção/cifragem do destino;
6. responsável e canal de alerta;
7. periodicidade de drill hospedado em destino isolado.

Enquanto essas decisões não existirem, #75 permanece aberta e não deve ser fechada com um workflow meramente manual ou um cron inventado.

## Validação técnica preservada

A Fase 30 validou novamente o mecanismo de recuperação no head final do PR #74:

- CI #308 — success;
- Business Transactions Integration #155 — success;
- Inventory Count Integration #171 — success.

O job `database` passou por aplicação integral das migrations, seed, backup lógico, restore isolado e suites SQL. A Fase 31 não alterou código de aplicação, migration ou scripts de backup/restore.

## Próxima ação

1. Integrar a documentação da auditoria da Fase 31 após CI verde, mantendo a Issue #75 aberta.
2. Se o operador registrar em #75 as decisões de RPO/RTO/destino/retenção/alerta, implementar a menor automação segura reutilizando `scripts/export-supabase-backup.sh`.
3. Se essas decisões continuarem ausentes, considerar #75 **bloqueada por decisão operacional** e avançar a auditoria independente para `REQ-PLAT-006 — Logs e erros`, reaproveitando a Fase 17 sem refazê-la.

## Não repetir

- não reimplementar o drill de backup/restore da Fase 16;
- não tratar CI sintética como backup de Production;
- não inventar RPO/RTO, cron, retenção ou destino;
- não armazenar dumps reais no GitHub;
- não executar restore destrutivo sobre Production;
- não ativar Pro/PITR ou outro serviço pago sem autorização explícita;
- não renumerar migrations;
- não reativar bootstrap/auto-deploy Vercel;
- não inferir Q-001..Q-025.
