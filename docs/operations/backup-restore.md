# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-26  
Status: **backup automático PostgreSQL Production ativo e comprovado off-site; persistência autoritativa implementada; cobertura completa ainda em andamento**  
Requisito: `REQ-PLAT-005`  
Issue: #75  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter uma estratégia de recuperação de Production automática, independente de ação humana, verificável e armazenada fora do Supabase Production, além de tornar o estado da proteção compreensível dentro do Sistema Lojasaph.

A política possui três camadas:

1. **backup automático de recuperação** — fonte principal de disaster recovery;
2. **persistência + observabilidade `Proteção dos dados`** — fonte autoritativa por Organization;
3. **exportação manual complementar** — cópia adicional sob custódia do cliente, sem substituir o automático.

## Política operacional

- RPO: 24 horas;
- cadência automática: diária;
- workflow: cron `17 6 * * *` + `workflow_dispatch`;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- Production nunca é restaurado para teste;
- atraso de backup não bloqueia automaticamente mutations do negócio;
- provider/custo externo exige autorização do operador antes do provisionamento.

## Estado operacional atual

### Supabase Production

- projeto: `fhbvwyttikrbeaanatlr`;
- região: `sa-east-1`;
- PostgreSQL 17;
- `PRODUCTION_SUPABASE_DB_URL` usa Session pooler porta 5432;
- conexão foi comprovada pelo backup real de 2026-08-26;
- migration atual de proteção: `20260826201252 / protection_run_persistence`;
- migrations versionadas no GitHub continuam fonte de verdade do schema do produto.

### Cloudflare R2

Cloudflare R2 foi autorizado e provisionado pelo operador em 2026-08-26.

Configuração operacional:

- bucket privado `lojasaph-production-backups`;
- prefixo `production/postgres`;
- region `auto`;
- sem public access/CORS de navegador;
- lifecycle 30 dias;
- Bucket Lock 30 dias no namespace de Production;
- token `Object Read & Write` limitado ao bucket;
- credenciais armazenadas somente em GitHub Actions Secrets;
- `BACKUP_AUTOMATION_ENABLED=true`.

Nunca registrar os valores de Secrets, connection strings ou conteúdo do dump em documentação, Issue, PR ou chat.

## Primeira prova Production real

Primeiro backup real comprovado:

- workflow: `Production Database Backup`;
- run id: `33006253661`;
- timestamp de criação do archive: `2026-08-26T19:40:47Z`;
- conclusão: `success`;
- archive: `lojasaph-production-20260826T194047Z-33006253661.tar.gz`;
- tamanho: `53185` bytes;
- hard cap pré-upload: `300000000` bytes;
- checksums internos: OK;
- manifesto: OK;
- upload R2: OK;
- existência remota: OK;
- download pós-upload + SHA-256: OK;
- cleanup local do runner: OK;
- incidente #111: fechado automaticamente após a recuperação verde.

Esse run antecede a persistência autoritativa. Ele permanece evidência histórica válida do backup off-site, mas **não deve ser inserido manualmente** em `protection_runs` como se tivesse sido produzido pelo novo processo.

As tentativas anteriores falharam antes do upload por configuração da connection string. Elas não são backups válidos.

## Exportador lógico

`scripts/export-supabase-backup.sh` produz fora do repositório:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

O helper usa diretório temporário protegido, recusa escrita dentro do Git e valida hashes antes de retornar sucesso.

## Bundle off-site

Cada execução válida produz quatro objetos:

1. `lojasaph-production-<timestamp>-<run-id>.tar.gz`;
2. `<archive>.sha256`;
3. `<archive>.manifest.json`;
4. `<archive>.manifest.json.sha256`.

O archive contém:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`;
- `BACKUP_METADATA.txt`.

`scripts/backup-bundle.py` cria e verifica manifesto v1 do formato `lojasaph-postgres-logical-backup` com metadata não sensível.

## Hard cap de custo/segurança

Antes de checksum externo, manifesto e upload off-site, o workflow mede o `.tar.gz` comprimido.

- limite: `300000000` bytes decimais;
- se exceder: workflow falha antes do upload;
- incidente operacional é registrado;
- nenhum bundle parcial deve ser enviado ao R2.

O limite é por archive; não é teto matemático de uso agregado do bucket.

## Verificação pós-upload

Um backup só pode avançar para sucesso depois de:

1. validar checksums internos;
2. validar `.sha256` do archive local;
3. validar o manifesto local;
4. enviar archive + sidecars ao R2 pelo contrato S3-compatible;
5. confirmar os objetos remotos;
6. baixar novamente os objetos e comparar SHA-256;
7. remover o material temporário local;
8. finalizar o run autoritativo como `succeeded`.

Não confiar em ETag como prova de conteúdo.

Nenhum dump real é enviado para GitHub Artifact ou versionado no repositório.

## Retenção e exclusão

A automação não apaga backups antigos por idade.

A retenção de 30 dias é aplicada pelo provider:

- lifecycle de expiração;
- Bucket Lock durante a janela de retenção;
- credencial do runner limitada ao bucket.

Lock prevalece enquanto ativo; lifecycle remove objetos somente quando a política permitir.

## Alertas GitHub-native

`scripts/sync-backup-incident.py` usa o `GITHUB_TOKEN` efêmero para manter incidente persistente/idempotente:

- primeira falha abre Issue operacional;
- falhas seguintes atualizam a mesma Issue;
- o mesmo run/attempt não duplica evento;
- recuperação verde registra o run e fecha o incidente;
- nenhum secret ou conteúdo de backup é incluído.

A sequência falha → recuperação foi comprovada pela Issue #111.

## Fonte autoritativa de estado — implementada

Migration Production:

`20260826201252 / protection_run_persistence`

### `public.protection_runs`

Registra metadata operacional sanitizada:

- tipo: `automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`;
- status: `running`, `succeeded`, `failed`;
- início/fim;
- `valid_copy_at`;
- `integrity_verified`;
- `size_bytes` quando aplicável;
- provider/destino lógico;
- cobertura;
- referência não sensível de execução;
- `error_summary` sanitizado;
- `created_at`/`updated_at`.

Constraints impedem sucesso inconsistente: `succeeded` exige cópia válida, integridade positiva e tamanho conhecido; `failed` exige erro sanitizado.

### `public.protection_run_organizations`

Relaciona o run às Organizations cobertas.

O backup PostgreSQL Production é global por database/environment. Não criar dump físico separado por Organization apenas para alimentar a UI.

### RLS e boundary de mutation

- `authenticated` possui SELECT sujeito à RLS;
- um run só é legível quando cobre Organization da qual o usuário é membro ativo;
- a relação run↔Organization também é filtrada por membership;
- `authenticated` não possui INSERT/UPDATE/DELETE nas tabelas;
- `authenticated` não executa os comandos privilegiados;
- `service_role` também não possui mutation direta das tabelas;
- mutation ocorre somente por:
  - `private.begin_protection_run(...)`;
  - `private.complete_protection_run(...)`;
- ambos usam `execution_reference` para idempotência e rejeitam replay divergente.

A validação em CI cobriu leitura permitida, cross-Organization negado, outsider/anon negados, mutation negada e idempotência.

Também foi executado teste hospedado em Production dentro de transação com `ROLLBACK`; leitura autorizada, bloqueio de INSERT autenticado e bloqueio de outsider passaram sem deixar dados de teste.

Security advisors não reportaram warning novo associado a essa persistência. Performance advisor marcou `protection_runs_recent_idx` como ainda não utilizado, esperado enquanto a tabela estava recém-criada e vazia.

## Integração do workflow com a fonte autoritativa

`scripts/record-protection-run.sh` é o adapter server-side.

`.github/workflows/production-backup.yml` agora:

1. valida configuração e tooling;
2. chama `begin_protection_run` antes do dump;
3. executa export/package/checksums/manifesto;
4. faz upload e revalidação remota;
5. limpa o runner;
6. em sucesso, chama `complete_protection_run(..., 'succeeded', ...)` com timestamp/tamanho/integridade;
7. em falha, tenta persistir `failed` com resumo fixo/sanitizado;
8. mantém o incidente GitHub-native em paralelo.

O desenho é fail-closed: falha ao abrir/finalizar a evidência autoritativa impede um sucesso enganoso do workflow.

No fim da implementação, `protection_runs` ainda possuía `0` rows reais porque nenhuma execução do workflow integrado tinha ocorrido. Não fabricar histórico; a primeira execução real pós-integração deve inaugurar a tabela automaticamente.

## Experiência `Proteção dos dados` — próxima slice

A próxima slice deve criar:

- link `Proteção dos dados` no `RuntimeShell`;
- rota `/workspace/backup`;
- leitura exclusivamente da fonte autoritativa sob RLS;
- estado vazio legítimo;
- última cópia válida;
- status/integridade/cobertura;
- histórico recente;
- restore drill quando existir;
- semântica verde/âmbar/vermelho baseada nos dados persistidos + RPO 24h;
- retenção/política claramente separadas da evidência de execução.

A UI não deve inferir sucesso pelo cron, não deve fazer backfill do run antigo e não deve expor GitHub internals ou credenciais.

Esta primeira UI deve ser read-only; iniciar/repetir backup pelo browser fica fora de escopo.

## Restore drill mensal

`.github/workflows/backup-restore-drill.yml` é mensal e usa o mesmo contrato S3-compatible.

Ele deve:

1. localizar o bundle Production mais recente;
2. baixar archive + sidecars;
3. validar checksums e manifesto;
4. extrair em ambiente isolado;
5. validar `SHA256SUMS` internos;
6. executar regressão/restauração em PostgreSQL 17 isolado;
7. nunca restaurar nem alterar Production.

A infraestrutura de download/validação existe, mas **restaurabilidade end-to-end do backup Production ainda não deve ser declarada como comprovada**.

### Warning conhecido para restore

No primeiro dump real, `pg_dump` avisou sobre constraints circulares em:

- `stock_movements`;
- `payments`.

A trilha de restore real isolado deve verificar explicitamente essas tabelas e usar sequência compatível com Supabase/PostgreSQL para triggers/FKs. Não modificar Production para esse teste.

## Cobertura atual

### PostgreSQL

**Comprovado:** backup lógico Production, off-site, re-hash pós-upload e persistência autoritativa para runs futuros.

Migrations ajudam a reconstruir schema, mas não substituem os dados.

### Auth

Auth utiliza PostgreSQL internamente, mas recuperação completa do projeto Supabase também pode exigir reconfiguração de providers, API keys e outros elementos externos. Não descrever o dump SQL como clone integral da plataforma.

### Supabase Storage / anexos

**Ainda não coberto pelos binários.**

Backups do banco não incluem os objetos binários armazenados pela Storage API. `REQ-FIN-008` já usa anexos financeiros.

Antes de declarar cobertura completa:

1. inventariar buckets usados pelo Lojasaph;
2. copiar objetos off-site sem manipular `storage.*` diretamente por SQL;
3. preservar keys/checksums/inventário para reconciliar metadata e objeto;
4. testar recuperação em destino isolado;
5. refletir a cobertura real na UI.

Até lá, usar a expressão **backup PostgreSQL**, não “backup completo dos anexos”.

## Exportação manual complementar

Permanece para slice posterior e não entra no RPO automático.

Se implementada:

- `owner/admin` Organization-wide;
- autorização server-side;
- formato versionado;
- manifesto/checksum;
- audit trail;
- sem secrets/material de autenticação;
- sem cross-Organization.

## Runbook de restauração real

Em incidente real:

1. identificar o backup válido mais recente;
2. validar sidecars/manifesto/checksums;
3. extrair em diretório protegido;
4. provisionar destino PostgreSQL/Supabase novo e isolado compatível;
5. restaurar roles/schema/data conforme documentação vigente do Supabase;
6. tratar explicitamente constraints/triggers/FKs e validar `stock_movements`/`payments`;
7. reconfigurar componentes externos necessários;
8. restaurar/reconciliar Storage separadamente quando essa trilha existir;
9. validar migrations, extensões, funções, triggers, índices, RLS e grants;
10. reconciliar dados operacionais críticos;
11. executar smoke tests não destrutivos;
12. decidir cutover somente após aceite;
13. preservar Production original sempre que possível.

O RTO de até 4h é objetivo operacional, não garantia do provedor.

## Sequência restante da Issue #75

1. ADR-009 / arquitetura — concluído;
2. transporte S3-compatible — concluído;
3. Cloudflare R2 / lifecycle / lock / credentials — concluído;
4. hard cap 300 MB — concluído;
5. primeiro backup PostgreSQL real e integridade off-site — concluído;
6. persistência autoritativa e histórico — **concluído**;
7. UI `Proteção dos dados` — **próxima slice**;
8. backup de Supabase Storage/anexos;
9. restore real isolado com cobertura disponível;
10. exportação manual complementar, se mantida;
11. fechar #75 somente com evidência suficiente e cobertura declarada corretamente.

## Segurança / não fazer

- não pedir nem receber secrets no chat;
- não armazenar backup real em Git/GitHub Artifact;
- não reprovisionar R2 sem motivo concreto;
- não backfillar manualmente o run `33006253661` em `protection_runs`;
- não restaurar Production para teste;
- não considerar confirmação humana prova de backup;
- não bloquear mutations do negócio por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular `storage.*` diretamente por SQL para copiar binários;
- não permitir mutation direta de `protection_runs` pelo cliente;
- não usar o cron como fonte de verdade da UI;
- não remover o hard cap de 300 MB;
- não voltar a Drive/rclone/Gmail.
