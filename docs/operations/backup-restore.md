# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-27  
Status: **PostgreSQL Production off-site + persistência + UI + restore end-to-end comprovados; Supabase Storage/anexos ainda pendentes**  
Requisito: `REQ-PLAT-005`  
Issue: #75  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter recuperação de Production automática, independente de ação humana, verificável e armazenada fora do Supabase Production, além de tornar o estado da proteção compreensível dentro do Sistema Lojasaph.

Camadas:

1. backup automático de recuperação PostgreSQL;
2. persistência autoritativa + observabilidade `Proteção dos dados`;
3. restore drill isolado recorrente;
4. próxima trilha: Supabase Storage/anexos;
5. futura exportação manual complementar.

## Política operacional

- RPO: 24 horas;
- backup automático: diário;
- workflow PostgreSQL: cron `17 6 * * *` + `workflow_dispatch`;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- Production nunca é restaurado para teste;
- atraso de backup não bloqueia automaticamente mutations do negócio;
- provider/custo externo exige autorização do operador.

## Estado operacional atual

### Supabase Production

- projeto `fhbvwyttikrbeaanatlr`;
- região `sa-east-1`;
- PostgreSQL 17 / platform Postgres `17.6.1.141`;
- Session pooler 5432 comprovado;
- migration `20260826201252 / protection_run_persistence`;
- migrations versionadas continuam fonte de verdade do schema.

### Storage off-site PostgreSQL

Cloudflare R2 foi autorizado/provisionado pelo operador.

Controles ativos:

- bucket privado dedicado a Production;
- namespace `production/postgres`;
- sem public access/CORS de navegador;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- token limitado ao bucket;
- credenciais somente em GitHub Actions Secrets;
- `BACKUP_AUTOMATION_ENABLED=true`.

Não registrar secrets, connection strings, endpoints sensíveis ou conteúdo do dump em documentação, Issue, PR ou chat.

## Primeira prova Production real de backup

Backup real comprovado em 2026-08-26:

- workflow `Production Database Backup`;
- run `33006253661`;
- archive criado em `2026-08-26T19:40:47Z`;
- tamanho `53185` bytes;
- hard cap `300000000` bytes;
- checksums internos OK;
- manifesto OK;
- upload off-site OK;
- existência remota OK;
- re-download + SHA-256 OK;
- cleanup do runner OK.

Esse run antecede a persistência autoritativa de `automatic_database` e **não deve ser inserido manualmente** em `protection_runs`.

## Exportador e bundle PostgreSQL

`scripts/export-supabase-backup.sh` produz fora do Git:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`;
- metadata não sensível.

Cada execução válida gera archive + checksum + manifesto + checksum do manifesto.

Antes do upload:

- validar hashes internos;
- medir archive;
- falhar se exceder `300000000` bytes.

Após upload:

1. confirmar objetos remotos;
2. rebaixar/re-hashear;
3. remover material temporário;
4. só então finalizar evidência autoritativa como `succeeded`.

Não usar ETag como prova de conteúdo e não enviar dump real para GitHub Artifact.

## Retenção

A automação não apaga backups antigos por idade.

Retenção ocorre no provider por lifecycle + lock. A credencial do runner não deve assumir responsabilidade por deleção periódica.

## Incidentes GitHub-native

`scripts/sync-backup-incident.py` mantém incidente persistente/idempotente:

- primeira falha abre Issue;
- falhas seguintes atualizam a mesma Issue;
- recuperação registra o run e fecha o incidente;
- nenhum secret/conteúdo de backup é incluído.

A sequência de falha→recuperação está comprovada para backup automático e restore drill.

Issue #110 foi fechada automaticamente após o restore verde `33069706382`.

## Fonte autoritativa

Migration:

`20260826201252 / protection_run_persistence`

### Tabelas

- `public.protection_runs`;
- `public.protection_run_organizations`.

Tipos de run:

- `automatic_database`;
- `automatic_storage`;
- `manual_export`;
- `restore_drill`.

Estados:

- `running`;
- `succeeded`;
- `failed`.

### Segurança

- `authenticated` possui SELECT sujeito à RLS;
- membership ativa é obrigatória;
- cross-Organization é bloqueado;
- `authenticated` não possui INSERT/UPDATE/DELETE;
- `authenticated` não executa comandos privados;
- mutation ocorre somente por `private.begin_protection_run(...)` e `private.complete_protection_run(...)`;
- idempotência por `execution_reference`.

## UI `Proteção dos dados`

Implementada no PR #115.

### Acesso

- link no `RuntimeShell`;
- rota `/workspace/backup`;
- Server Component read-only;
- usa sessão Supabase autenticada existente;
- não usa cliente admin no browser.

### Escopo

A consulta filtra `protection_run_organizations` pela Organization selecionada e continua sujeita à RLS. Não seleciona/exibe `execution_reference` nem detalhes internos desnecessários.

### Estado visual

- verde: PostgreSQL `succeeded` + integridade positiva + `valid_copy_at` dentro de 24h;
- âmbar: histórico inicial vazio ou transição;
- vermelho: falha persistida ou cópia ausente/vencida além do RPO.

Storage/anexos continua explicitamente fora da cobertura até existir `automatic_storage` real suficientemente comprovado.

## Restore drill PostgreSQL — operacional e comprovado

Workflow:

`.github/workflows/backup-restore-drill.yml`

O fluxo atual:

1. valida configuração/tooling;
2. abre `restore_drill` autoritativo;
3. localiza e baixa o latest archive Production real do R2;
4. valida sidecars, manifesto e checksums internos;
5. inicializa Supabase local temporário com Postgres `17.6.1.141`;
6. pin/preflight do schema gerenciado necessário ao bundle;
7. restaura o bundle real;
8. executa smoke tests + FK revalidation;
9. remove destino/material temporário;
10. finaliza `succeeded` ou `failed` sanitizado;
11. mantém/resolve incidente GitHub-native conforme o resultado.

### Guards obrigatórios

`scripts/restore-production-backup.sh`:

- exige `BACKUP_RESTORE_ISOLATED=true`;
- target deve ser loopback (`127.0.0.1`, `localhost`, `::1`);
- valida `SHA256SUMS` e metadata;
- aplica transação única + `ON_ERROR_STOP`;
- sequência: roles → schema → replica-mode → data;
- revalida FKs após o import;
- nunca recebe Production como target.

Não enfraquecer esses guards para obter run verde.

### Roles gerenciadas Supabase

O primeiro restore real `33014974208` falhou porque o bundle histórico continha operação sobre `supabase_admin`, reservada no target local.

PR #117 introduziu preparação fail-closed do SQL de restore:

- checksum é validado antes da preparação;
- somente operações classificadas sobre roles gerenciadas são neutralizadas/normalizadas;
- roles customizadas permanecem preservadas;
- erro inesperado continua abortando o restore.

### Compatibilidade do schema Storage no target PostgreSQL

O segundo run real `33018829402` passou roles/schema e falhou em `data.sql` porque o target local tinha `storage.buckets` antigo, sem `versioning_status`.

Production estava em `storage.migrations=64`.

PR #119:

- pinou `storage-api:v1.70.7` no target isolado;
- exige `storage.migrations >= 64` antes do import;
- exige `storage.buckets.versioning_status`;
- corrigiu o exclude obsoleto `inbucket` para `mailpit`;
- adicionou CI `isolated-storage-schema`, sem Production/R2 secrets, para provar o target antes do merge.

### Prova real verde

Run `33069706382` — **success**.

Comprovou:

- archive Production real baixado/verificado;
- roles/schema/data restaurados;
- smoke tests concluídos;
- RLS/grants preservados;
- todas as FKs públicas revalidadas após replica-mode;
- ciclos conhecidos de `stock_movements` e `payments` tratados sem perda silenciosa;
- cleanup concluído;
- `restore_drill` finalizado `succeeded`;
- #110 auto-fechada.

Evidência autoritativa:

- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization mapeada;
- `error_summary=null`.

CI pós-merge `33069706327` e Restore Compatibility CI `33069706452` também ficaram verdes.

## Cobertura

### PostgreSQL

**Comprovado end-to-end:** backup lógico Production, transporte off-site, re-hash pós-upload, persistência autoritativa, UI e restore real isolado.

### Auth/configuração externa

O dump SQL não representa automaticamente todas as configurações externas do projeto Supabase. Providers, API keys e outros elementos podem exigir reconfiguração em disaster recovery real.

### Supabase Storage/anexos

**Binários ainda não cobertos.**

Antes de declarar cobertura completa:

1. inventariar buckets usados;
2. localizar metadata de negócio que referencia bucket/key/path;
3. medir quantidade/volume sem ler conteúdo;
4. definir inventário versionado e integridade por objeto;
5. copiar objetos off-site via APIs apropriadas;
6. aplicar retenção/lock coerentes;
7. testar recuperação isolada de objetos;
8. reconciliar metadata ↔ objeto;
9. detectar ausência/corrupção;
10. persistir `automatic_storage` somente após prova suficiente;
11. refletir cobertura real na UI.

**Não manipular `storage.objects` diretamente por SQL para copiar arquivos.**

O hard cap de archive PostgreSQL não é automaticamente política correta para Storage; definir guardrails após inventário real.

## Exportação manual complementar

Permanece posterior/opcional e não entra no RPO automático.

Se implementada:

- `owner/admin` Organization-wide;
- autorização server-side;
- formato versionado;
- manifesto/checksum;
- audit trail;
- sem secrets;
- sem cross-Organization.

## Runbook de restauração PostgreSQL em incidente real

1. identificar o backup válido mais recente;
2. validar sidecars/manifesto/checksums;
3. extrair em diretório protegido;
4. provisionar destino PostgreSQL/Supabase novo e isolado compatível;
5. garantir versão/schema gerenciado compatível com o bundle;
6. preparar operações de roles gerenciadas de forma fail-closed;
7. restaurar roles/schema/data com `ON_ERROR_STOP`;
8. tratar extensões, ownership, triggers e FKs;
9. revalidar `stock_movements`, `payments` e todas as FKs públicas;
10. validar migrations, funções, triggers, índices, RLS e grants;
11. executar smoke tests não destrutivos;
12. reconfigurar componentes externos necessários;
13. restaurar/reconciliar Storage separadamente quando essa trilha existir;
14. decidir cutover somente após aceite;
15. preservar Production original sempre que possível.

RTO até 4h é objetivo operacional, não garantia de provedor.

## Sequência restante da Issue #75

1. arquitetura — concluída;
2. transporte S3-compatible — concluído;
3. R2/lifecycle/lock — concluídos;
4. hard cap PostgreSQL — concluído;
5. primeiro backup PostgreSQL real — concluído;
6. persistência autoritativa — concluída;
7. UI `Proteção dos dados` — concluída;
8. restore PostgreSQL real isolado + `restore_drill` — **concluído**;
9. backup + restore/reconciliação de Supabase Storage/anexos — **próxima frente**;
10. exportação manual complementar, se mantida;
11. fechar #75 somente com evidência suficiente e cobertura correta.

## Segurança / não fazer

- não pedir/receber secrets no chat;
- não armazenar backup real em Git/GitHub Artifact;
- não reprovisionar R2 sem regressão concreta;
- não backfillar `33006253661`;
- não restaurar Production para teste;
- não declarar Storage protegido pelo dump PostgreSQL;
- não mutar `protection_runs` pelo cliente;
- não usar cron como fonte de verdade da UI;
- não voltar a Drive/rclone/Gmail;
- não remover o hard cap PostgreSQL sem nova decisão;
- não tornar o repositório private automaticamente;
- não copiar objetos Storage por DML em `storage.*`;
- não fazer deploy Vercel para validar esta frente operacional sem necessidade concreta.
