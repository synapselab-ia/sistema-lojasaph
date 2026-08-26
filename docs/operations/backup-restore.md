# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-26  
Status: **backup automático PostgreSQL Production ativo e comprovado off-site; cobertura completa ainda em andamento**  
Requisito: `REQ-PLAT-005`  
Issue: #75  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter uma estratégia de recuperação de Production automática, independente de ação humana, verificável e armazenada fora do Supabase Production, além de tornar o estado da proteção compreensível dentro do Sistema Lojasaph.

A política possui três camadas:

1. **backup automático de recuperação** — fonte principal de disaster recovery;
2. **observabilidade `Proteção dos dados` no produto** — estado autoritativo por Organization;
3. **exportação manual complementar** — cópia adicional sob custódia do cliente, sem substituir o automático.

## Política operacional

- RPO: 24 horas;
- cadência automática: diária;
- workflow atual: cron `17 6 * * *` + `workflow_dispatch`;
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
- URL: `https://github.com/synapselab-ia/sistema-lojasaph/actions/runs/33006253661`;
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

As tentativas anteriores falharam antes do upload por configuração da connection string. Elas não são backups válidos e não produziram evidência off-site.

## Exportador lógico

`scripts/export-supabase-backup.sh` é a implementação de exportação lógica.

Produz fora do repositório:

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

`scripts/backup-bundle.py` cria e verifica manifesto v1 do formato `lojasaph-postgres-logical-backup` com metadata não sensível: backup id, ambiente, timestamp, cobertura, archive/hash/tamanho, project ref, versão do CLI/exportador, Git SHA, workflow/run e retenção.

## Hard cap de custo/segurança

Antes de checksum externo, manifesto e upload off-site, o workflow mede o `.tar.gz` comprimido.

- limite: `300000000` bytes decimais;
- se exceder: workflow falha antes do upload;
- incidente operacional é registrado;
- nenhum bundle parcial deve ser enviado ao R2.

Esse limite é por archive. Ele não é, sozinho, um teto matemático de uso total do bucket; qualquer guard futuro de uso agregado deve ser tratado em slice própria.

## Verificação pós-upload

Um backup só retorna sucesso depois de:

1. validar os checksums internos;
2. validar o `.sha256` do archive local;
3. validar o manifesto local;
4. enviar archive + sidecars para o R2 pelo contrato S3-compatible;
5. confirmar cada objeto remoto;
6. baixar novamente os objetos e comparar SHA-256 com o material local.

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

`scripts/sync-backup-incident.py` usa o `GITHUB_TOKEN` efêmero do workflow para manter incidente persistente/idempotente:

- primeira falha abre Issue operacional;
- falhas seguintes atualizam a mesma Issue;
- o mesmo run/attempt não duplica evento;
- recuperação verde registra o run e fecha o incidente;
- nenhum secret ou conteúdo de backup é incluído.

A sequência falha → recuperação foi comprovada pela Issue #111.

## Restore drill mensal

`.github/workflows/backup-restore-drill.yml` é mensal e usa o mesmo contrato S3-compatible.

Ele deve:

1. localizar o bundle Production mais recente;
2. baixar archive + sidecars;
3. validar checksums e manifesto;
4. extrair o bundle em ambiente isolado;
5. validar `SHA256SUMS` internos;
6. executar regressão/restauração em PostgreSQL 17 isolado;
7. nunca restaurar nem alterar Production.

A infraestrutura de download/validação existe, mas **restaurabilidade end-to-end do backup Production ainda não deve ser declarada como comprovada**.

### Warning conhecido para restore

No primeiro dump real, `pg_dump` avisou sobre constraints circulares em:

- `stock_movements`;
- `payments`.

A trilha de restore real isolado deve verificar explicitamente a restauração dessas tabelas e usar a sequência recomendada pelo Supabase/PostgreSQL para evitar falha por triggers/FKs. Não modificar Production para esse teste.

## Fonte autoritativa de estado — próxima slice

O bundle off-site é evidência de recuperação, mas a aplicação ainda não possui espelho autoritativo para a UI.

A próxima slice da #75 deve criar persistência sanitizada no PostgreSQL, com suporte a:

- tipo (`automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`);
- estado (`running`, `succeeded`, `failed`);
- início/fim;
- integridade;
- tamanho/timestamps seguros;
- provider/destino lógico sem secret;
- cobertura declarada;
- erro sanitizado;
- relação entre run global e Organizations cobertas.

Um backup PostgreSQL é global por database/environment. Não duplicar fisicamente o dump por Organization.

A leitura deve obedecer RLS/escopo de Organization e usuários comuns não podem forjar sucesso de backup.

## Experiência `Proteção dos dados`

Somente depois da persistência autoritativa:

- card no `RuntimeShell`;
- `/workspace/backup`;
- verde/âmbar/vermelho conforme política;
- última cópia válida;
- próxima janela esperada;
- integridade;
- retenção;
- histórico;
- último restore drill.

A UI não deve inferir sucesso apenas pelo cron e não deve expor GitHub internals ou credenciais.

## Cobertura atual

### PostgreSQL

**Comprovado:** backup lógico Production, off-site e re-hash pós-upload.

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
5. primeiro backup PostgreSQL real e integridade off-site — **concluído**;
6. persistência autoritativa e histórico — **próxima slice**;
7. UI `Proteção dos dados`;
8. backup de Supabase Storage/anexos;
9. restore real isolado com cobertura disponível;
10. exportação manual complementar, se mantida;
11. fechar #75 somente com evidência suficiente e cobertura declarada corretamente.

## Segurança / não fazer

- não pedir nem receber secrets no chat;
- não armazenar backup real em Git/GitHub Artifact;
- não reprovisionar R2 sem motivo concreto;
- não restaurar Production para teste;
- não considerar confirmação humana prova de backup;
- não bloquear mutations do negócio por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular `storage.*` diretamente por SQL para copiar binários;
- não remover o hard cap de 300 MB;
- não voltar a Drive/rclone/Gmail;
- não criar deploy Vercel para esta frente sem mudança runtime que o exija.
