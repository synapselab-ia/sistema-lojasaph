# Auditoria de backup automático — REQ-PLAT-005

Data da auditoria: 2026-08-20
Status: **parcialmente atendido / bloqueado para Production**
Issue ativa: #75

## Conclusão

`REQ-PLAT-005 — Backup e restauração` exige, antes de produção, **backup automático definido e restauração testada**.

A Fase 16 entregou corretamente a segunda metade e os componentes técnicos reutilizáveis:

- exportação lógica segura por `scripts/export-supabase-backup.sh`;
- checksum SHA-256 dos artefatos;
- proibição de gravar o dump dentro do repositório;
- runbook de recuperação em `docs/operations/backup-restore.md`;
- drill automatizado de dump/restore em PostgreSQL 17 efêmero por `scripts/verify-backup-restore.sh`;
- checks pós-restore em `supabase/tests/backup_restore.sql`;
- execução do drill no job `database` do CI.

A auditoria da Fase 31 confirmou que **não existe hoje rotina automática comprovada produzindo backups do banco hospedado real**. Portanto o requisito permanece incompleto para Production.

## Estado do provedor em 2026-08-20

Projeto Supabase:

- ref: `fhbvwyttikrbeaanatlr`;
- status: `ACTIVE_HEALTHY`;
- região: `sa-east-1`;
- PostgreSQL: `17.6.1.141` / engine 17;
- organização: plano `free`.

A documentação oficial vigente confirma:

- projetos Free não incluem backups automáticos gerenciados;
- Supabase recomenda que projetos Free façam exportações regulares por `supabase db dump` e mantenham cópias off-site;
- backups diários gerenciados estão disponíveis em Pro/Team/Enterprise;
- PITR é add-on para planos pagos e exige compute compatível;
- backup de banco não inclui os objetos binários do Storage API;
- restore para um novo projeto usando backups físicos é recurso de plano pago;
- o guia oficial de backup lógico continua separando roles, schema e data e usa o mesmo padrão já adotado por `scripts/export-supabase-backup.sh`.

Referências verificadas:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/deployment/ci/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/pricing
- https://supabase.com/changelog?types=breaking-change

Nenhum breaking change atual identificado no changelog invalida o mecanismo de dump lógico usado pela Fase 16.

## Matriz de atendimento

| Dimensão | Estado | Evidência / lacuna |
| --- | --- | --- |
| Schema reconstruível | Atendido | migrations versionadas no GitHub e CI aplica todas em PostgreSQL limpo |
| Backup lógico de dados | Mecanismo pronto | `scripts/export-supabase-backup.sh` gera roles/schema/data |
| Integridade | Atendido no mecanismo | `SHA256SUMS` é criado e verificado |
| Proteção temporária | Atendido no mecanismo | `umask 077`; helper recusa diretório dentro do Git repo |
| Restore técnico | Atendido | `scripts/verify-backup-restore.sh` restaura em DB isolado |
| Checks pós-restore | Atendido | `supabase/tests/backup_restore.sql` verifica dados, RLS, grants e isolamento |
| CI de recuperação | Atendido | job `database` executa o drill em cada PR/push relevante ao CI principal |
| Backup automático do ambiente real | **Não atendido** | nenhum workflow/agendador de Production foi encontrado |
| Backup gerenciado do provedor | **Não disponível no plano atual** | organização permanece Free |
| Cadência | **PENDING** | RPO ainda não aprovado; não é seguro inventar cron |
| Destino off-site | **PENDING** | nenhum destino aprovado/documentado |
| Retenção | **PENDING** | política ainda não aprovada |
| Cifragem/proteção no destino | **PENDING** | depende do destino aprovado |
| Monitoramento/alerta da rotina real | **PENDING** | responsável/canal ainda não definidos |
| RPO | **PENDING** | decisão de negócio/operação |
| RTO | **PENDING** | decisão de negócio/operação |
| Drill hospedado | **PENDING** | não executar restore destrutivo; destino isolado/plano apropriado ainda não definido |

## Auditoria do repositório

`.github/workflows/` contém atualmente:

- `ci.yml`;
- `create-inventory-count-migration.yml`;
- `inventory-count-ci.yml`;
- `one-shot-inventory-wiring.yml`;
- `purchases-ci.yml`.

Nenhum desses workflows agenda ou executa `scripts/export-supabase-backup.sh` contra o banco hospedado.

O `CI` apenas:

1. reconstrói um PostgreSQL 17 efêmero;
2. executa migrations e seed sintético;
3. roda `scripts/verify-backup-restore.sh`;
4. valida a restauração isolada.

Isso é uma prova importante de recuperação, mas **não é backup automático de Production**.

## Por que não foi criado um cron nesta fase

A agenda não pode ser escolhida de forma responsável sem RPO. O destino e a retenção também não podem ser inferidos porque afetam segurança, custo, proteção de dados e recuperação.

Criar agora um workflow com frequência ou storage arbitrários poderia produzir uma falsa sensação de conformidade e ainda introduzir exposição de dados reais.

Assim, a Fase 31 limita-se a registrar o gap e preservar os componentes já corretos até que as decisões operacionais sejam explícitas.

## Decisões necessárias para #75

Antes de ativar o backup automático real, registrar:

1. RPO máximo aceitável;
2. RTO máximo aceitável;
3. destino off-site aprovado;
4. retenção mínima/máxima;
5. proteção/cifragem exigida no destino;
6. responsável pela rotina;
7. canal e expectativa de alerta em falha;
8. periodicidade e destino seguro para drill hospedado, quando aplicável.

## Implementação mínima futura

Depois dessas decisões, a menor implementação segura deve:

- reutilizar `scripts/export-supabase-backup.sh`;
- fornecer `SUPABASE_DB_URL` somente por secret do runtime;
- usar Supabase CLI pinada/aprovada;
- executar em intervalo que não exceda o RPO aprovado;
- validar `SHA256SUMS` antes de persistir o conjunto;
- enviar o conjunto ao destino off-site aprovado;
- aplicar retenção aprovada;
- limpar temporários mesmo em falha;
- emitir sinal de sucesso/falha sem logar credenciais ou conteúdo do backup;
- manter o drill de restore da CI;
- testar recuperação hospedada somente em destino isolado, nunca sobre Production como exercício.

## Segurança

Durante esta auditoria:

- nenhum dump real foi criado;
- nenhuma database URL ou secret foi lida/copiada para documentação;
- nenhum DDL/DML foi executado no Supabase;
- nenhum restore foi executado no projeto hospedado;
- nenhum plano/add-on pago foi ativado;
- nenhum deploy Vercel foi realizado.
