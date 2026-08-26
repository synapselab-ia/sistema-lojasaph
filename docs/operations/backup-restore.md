# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-26  
Status: **backup PostgreSQL Production off-site + persistência autoritativa + UI read-only implementados; restore end-to-end e Storage ainda pendentes**  
Requisito: `REQ-PLAT-005`  
Issue: #75  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter recuperação de Production automática, independente de ação humana, verificável e armazenada fora do Supabase Production, além de tornar o estado da proteção compreensível dentro do Sistema Lojasaph.

Camadas:

1. backup automático de recuperação;
2. persistência autoritativa + observabilidade `Proteção dos dados`;
3. restore drill isolado recorrente;
4. futura exportação manual complementar.

## Política operacional

- RPO: 24 horas;
- backup automático: diário;
- workflow: cron `17 6 * * *` + `workflow_dispatch`;
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
- PostgreSQL 17;
- Session pooler 5432 comprovado pelo backup real;
- migration `20260826201252 / protection_run_persistence`;
- `public.protection_runs = 0` rows reais na última revalidação;
- migrations versionadas continuam fonte de verdade do schema.

Zero rows é estado inicial legítimo. Não backfillar o backup histórico anterior ao boundary autoritativo.

### Storage off-site

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

## Primeira prova Production real

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
- cleanup do runner OK;
- Issue #111 fechada após recuperação.

Esse run antecede a persistência autoritativa e **não deve ser inserido manualmente** em `protection_runs`.

## Exportador e bundle

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
4. só então finalizar a evidência autoritativa como `succeeded`.

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

A sequência falha → recuperação do backup automático foi comprovada pela Issue #111.

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
- `service_role` também não possui mutation direta das tabelas;
- mutation ocorre somente por `private.begin_protection_run(...)` e `private.complete_protection_run(...)`;
- idempotência por `execution_reference`.

CI e teste hospedado com rollback comprovaram leitura autorizada, outsider bloqueado e mutation comum bloqueada.

## Integração do backup automático

`scripts/record-protection-run.sh` é o adapter server-side atual para `automatic_database`.

`.github/workflows/production-backup.yml`:

1. valida configuração/tooling;
2. abre run autoritativo;
3. exporta/package/checksums/manifesto;
4. envia e revalida off-site;
5. limpa runner;
6. finaliza `succeeded` somente após prova completa;
7. em falha, tenta persistir `failed` com resumo sanitizado;
8. mantém incidente GitHub-native.

O fluxo é fail-closed.

## UI `Proteção dos dados` — implementada no PR #115

### Acesso

- link no `RuntimeShell`;
- rota `/workspace/backup`;
- Server Component read-only;
- usa a sessão Supabase autenticada existente;
- não usa cliente admin no browser.

### Escopo

A consulta:

1. filtra `protection_run_organizations` pela Organization selecionada;
2. lê somente os runs correspondentes ainda sujeitos à RLS;
3. não seleciona `execution_reference` nem detalhes internos desnecessários.

### Estado visual

- verde: PostgreSQL `succeeded` + integridade positiva + `valid_copy_at` dentro de 24h;
- âmbar: histórico inicial vazio ou transição;
- vermelho: falha persistida ou cópia ausente/vencida além do RPO.

A página mostra política/retention separadamente da evidência de execução e declara que Storage/anexos ainda não estão cobertos.

Como Production continua com zero rows autoritativas, o estado inicial esperado é âmbar e vazio.

## Restore drill mensal — gap atual

Workflow:

`.github/workflows/backup-restore-drill.yml`

Issue operacional aberta:

#110 — `[backup-alert] Monthly restore drill failing`

### Por que o primeiro run falhou

O run `33000481649`, em `2026-08-26T18:35:37Z`, falhou na etapa de download porque ainda não existia archive Production no storage off-site.

O primeiro archive real só foi produzido depois, em `2026-08-26T19:40:47Z`.

Portanto, a causa daquele run não prova defeito de credencial nem de restore.

### Limitação arquitetural do workflow atual

O workflow hoje:

1. localiza e baixa o bundle Production real;
2. valida archive/manifesto/checksums;
3. extrai o bundle real;
4. **separadamente**, aplica migrations + seed em um banco sintético;
5. chama `scripts/verify-backup-restore.sh`;
6. esse helper faz `pg_dump` do banco sintético e restaura esse novo dump em outro banco local.

Isso comprova integridade/download do bundle real e uma regressão sintética de dump/restore, mas **não restaura roles/schema/data do bundle Production baixado**.

Não declarar restaurabilidade Production end-to-end enquanto esse gap existir.

### Próxima evolução do drill

A próxima slice deve:

1. opcionalmente executar uma única nova prova do workflow atual, porque agora existe archive, para confirmar download/checksums e reconciliar a causa histórica da #110;
2. não encerrar a slice apenas porque esse run ficar verde;
3. restaurar o bundle Production real em PostgreSQL 17/destino isolado;
4. aplicar sequência apropriada de roles/schema/data;
5. tratar extensões/ownership/roles incompatíveis explicitamente;
6. tratar os warnings de constraints circulares em `stock_movements` e `payments`;
7. executar smoke tests no banco restaurado;
8. persistir `restore_drill` na fonte autoritativa;
9. nunca tocar Production;
10. manter/fechar #110 apenas conforme resultado real.

## Warning conhecido de FK/ciclos

O primeiro dump real reportou constraints circulares em:

- `stock_movements`;
- `payments`.

A restauração real deve validar essas tabelas explicitamente e não silenciar perda/erro de FK ou trigger.

## Cobertura

### PostgreSQL

**Comprovado:** backup lógico Production, off-site, re-hash pós-upload, persistência autoritativa para runs automáticos e UI read-only.

**Ainda não comprovado:** restauração end-to-end do bundle Production real.

### Auth

O dump SQL não representa automaticamente todas as configurações externas do projeto Supabase. Providers, API keys e outros elementos podem exigir reconfiguração.

### Supabase Storage/anexos

**Binários ainda não cobertos.**

Antes de declarar cobertura completa:

1. inventariar buckets usados;
2. copiar objetos off-site via APIs apropriadas;
3. preservar keys/checksums/inventário;
4. testar recuperação isolada;
5. refletir cobertura real na UI.

Não manipular `storage.*` diretamente por SQL para copiar arquivos.

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

## Runbook de restauração real em incidente

1. identificar o backup válido mais recente;
2. validar sidecars/manifesto/checksums;
3. extrair em diretório protegido;
4. provisionar destino PostgreSQL/Supabase novo e isolado compatível;
5. restaurar roles/schema/data conforme orientação vigente;
6. tratar extensões, ownership, triggers e FKs;
7. validar `stock_movements` e `payments` explicitamente;
8. reconfigurar componentes externos necessários;
9. restaurar/reconciliar Storage separadamente quando essa trilha existir;
10. validar migrations, funções, triggers, índices, RLS e grants;
11. executar smoke tests não destrutivos;
12. decidir cutover somente após aceite;
13. preservar Production original sempre que possível.

RTO até 4h é objetivo operacional, não garantia de provedor.

## Sequência restante da Issue #75

1. arquitetura — concluída;
2. transporte S3-compatible — concluído;
3. R2/lifecycle/lock — concluídos;
4. hard cap — concluído;
5. primeiro backup PostgreSQL real — concluído;
6. persistência autoritativa — concluída;
7. UI `Proteção dos dados` — implementada/PR #115;
8. restore real isolado + `restore_drill` autoritativo — **próxima slice**;
9. backup de Supabase Storage/anexos;
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
- não remover o hard cap sem nova decisão;
- não tornar o repositório private automaticamente.
