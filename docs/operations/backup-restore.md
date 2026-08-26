# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-26  
Status: transporte S3-compatible reconciliado; Production continua desarmada  
Requisito: `REQ-PLAT-005`  
Issue: #75  
ADR: `ADR-009 — Proteção, backup e recuperação de dados`

## Objetivo

Manter uma estratégia de recuperação de Production que seja automática, independente de ação humana, verificável e armazenada fora do Supabase Production, e tornar seu estado compreensível dentro do Sistema Lojasaph.

A política possui três camadas:

1. **backup automático de recuperação** — fonte principal de disaster recovery;
2. **observabilidade “Proteção dos dados” no produto** — estado autoritativo por Organization;
3. **exportação manual complementar** — cópia adicional sob custódia do cliente, sem substituir o automático.

## Política operacional aprovada

Salvo nova decisão explícita:

- **RPO:** 24 horas;
- **cadência automática:** diária ou mais frequente;
- **RTO objetivo:** até 4 horas em condição operacional normal;
- **retenção:** 30 dias;
- **restore drill:** mensal e isolado;
- **Production nunca é restaurado para teste**;
- nenhum plano/add-on/provider pago é ativado sem autorização explícita.

Violação do RPO gera estado crítico e escalonamento. Ela **não bloqueia automaticamente** caixa, estoque, compras, financeiro ou outras mutations do negócio.

## Referências atuais verificadas

Em 2026-08-26 foram conferidas novamente:

- Supabase Changelog;
- Supabase `Backup and Restore using the CLI`;
- Supabase `Database Backups`;
- Cloudflare R2 S3 API / AWS CLI;
- AWS CLI v2 official Docker image guidance.

A sequência vigente do Supabase para backup lógico continua sendo roles + schema + data com `supabase db dump`; a documentação continua recomendando Session pooler em redes IPv4 e confirma que backups de banco não incluem os objetos binários do Storage.

## Estado técnico atual

### Supabase Production

- projeto: `fhbvwyttikrbeaanatlr`;
- região: `sa-east-1`;
- PostgreSQL 17;
- plano atual permanece Free na última auditoria;
- migrations versionadas no GitHub são fonte de verdade do schema do produto;
- `PRODUCTION_SUPABASE_DB_URL` já foi provisionado com Session pooler na porta 5432.

Nenhuma mutation de Supabase é necessária para a reconciliação do transporte.

### Exportador lógico preservado

`scripts/export-supabase-backup.sh` continua sendo a única implementação de exportação lógica.

Ele exige:

- `SUPABASE_DB_URL` por secret;
- `BACKUP_OUTPUT_DIR` fora do repositório.

Produz:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

O helper usa `umask 077`, recusa escrita dentro do Git e valida hashes antes de retornar sucesso.

### Transporte reconciliado

`.github/workflows/production-backup.yml` deixou de depender de Google Drive/rclone/Gmail e agora trabalha contra um contrato **S3-compatible** usando a imagem oficial e versionada `amazon/aws-cli:2.36.30`.

`scripts/s3-backup-storage.sh` concentra a camada de transporte e não contém detalhes específicos de Cloudflare R2.

Configuração esperada quando o provider for aprovado:

#### GitHub Actions Variables

- `BACKUP_S3_ENDPOINT` — endpoint HTTPS S3-compatible;
- `BACKUP_S3_BUCKET` — bucket privado de backup;
- `BACKUP_S3_REGION` — opcional; default `auto` para compatibilidade com R2;
- `BACKUP_S3_PREFIX` — opcional; default `production/postgres`;
- `BACKUP_AUTOMATION_ENABLED` — permanece diferente de `true` até a prova real aprovada.

#### GitHub Actions Secrets

- `PRODUCTION_SUPABASE_DB_URL` — já existente;
- `BACKUP_S3_ACCESS_KEY_ID`;
- `BACKUP_S3_SECRET_ACCESS_KEY`;
- `BACKUP_S3_SESSION_TOKEN` — opcional para providers/credenciais temporárias que o exijam.

Não colocar endpoint com credenciais embutidas. Nenhum access key, secret, connection string ou conteúdo de backup deve aparecer em Markdown, Issue, PR, log ou chat.

## Bundle off-site

Cada execução válida produz quatro objetos sob o namespace de Production:

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

### Manifesto

`scripts/backup-bundle.py` cria e verifica um manifesto não sensível, formato `lojasaph-postgres-logical-backup`, versão 1.

Ele registra:

- `backup_id`;
- environment;
- timestamp UTC;
- cobertura declarada (`postgres`);
- nome, tamanho e SHA-256 do archive;
- project ref não secreto;
- versão do Supabase CLI;
- Git SHA;
- repositório/workflow/run id/run attempt/run URL;
- contrato `s3-compatible`;
- retenção de 30 dias.

O manifesto não contém connection string, access key, secret, token, SQL ou dados operacionais.

## Verificação pós-upload

Um backup só retorna sucesso depois de:

1. validar os checksums internos do payload;
2. validar o `.sha256` do archive local;
3. validar o manifesto local;
4. enviar archive + sidecars para o storage S3-compatible;
5. confirmar a existência de cada objeto com `HeadObject`;
6. baixar novamente cada objeto em streaming e comparar o SHA-256 remoto com o arquivo local.

Essa estratégia evita tratar ETag como checksum e não depende de uma implementação provider-specific de checksum S3.

Nenhum dump real é enviado para GitHub Artifact ou versionado no repositório.

## Retenção e proteção contra exclusão

A automação **não deleta mais backups antigos**.

A retenção de 30 dias é requisito do provider aprovado:

- lifecycle de expiração no bucket;
- lock/WORM durante a janela de retenção quando suportado;
- coerência entre lock e lifecycle;
- credencial da rotina limitada ao menor conjunto de permissões necessário.

Para Cloudflare R2, ADR-009 registra bucket lock + lifecycle como desenho preferido. O bucket real ainda não foi criado nem autorizado.

## Alerta operacional GitHub-native

Gmail App Password foi removido da automação.

`scripts/sync-backup-incident.py` usa somente o `GITHUB_TOKEN` efêmero do próprio workflow com `issues: write` para manter um incidente persistente e idempotente:

- na primeira falha, abre uma Issue operacional específica do workflow;
- falhas posteriores atualizam a mesma Issue, sem abrir uma Issue por run;
- o mesmo run/attempt não é registrado duas vezes;
- uma execução posterior verde registra a recuperação e fecha automaticamente o incidente;
- corpo/comentários contêm somente workflow, run URL, horário e mensagem sanitizada.

Incidentes distintos são usados para:

- `Production Database Backup`;
- `Backup Restore Drill`.

O reporter usa `continue-on-error` para que uma falha do próprio mecanismo de alerta nunca masque nem substitua a conclusão original do backup/drill.

## Restore drill mensal

`.github/workflows/backup-restore-drill.yml` continua mensal e fail-closed por `BACKUP_AUTOMATION_ENABLED`.

Quando a automação for armada, ele:

1. lista o mesmo namespace S3-compatible;
2. seleciona o archive Production mais recente pelo naming contract;
3. baixa archive + checksum + manifesto + checksum do manifesto;
4. valida os sidecars;
5. valida o manifesto contra o archive;
6. extrai o bundle e valida `SHA256SUMS` internos;
7. executa a regressão de dump/restore em PostgreSQL 17 isolado;
8. nunca restaura nem altera Production.

O drill real continua desarmado enquanto não houver provider aprovado/provisionado e primeiro backup real comprovado.

## Fail-closed

`BACKUP_AUTOMATION_ENABLED` continua sendo o disjuntor operacional.

Enquanto seu valor não for exatamente `true`:

- o job diário não acessa Production;
- o restore drill não acessa storage externo;
- ausência de bucket/credentials não provoca tentativas parciais;
- nenhum schedule deve ser interpretado como “backup em funcionamento”.

**Não armar antes do gate de provider + secrets + lifecycle/lock.**

## Gate de provisionamento externo

A reconciliação de código não autoriza infraestrutura externa.

O próximo gate exige decisão do operador:

1. aprovar o provider concreto;
2. se houver subscription/billing/custo, autorizar explicitamente antes da ativação;
3. criar bucket privado dedicado a Production;
4. impedir public access/CORS de navegador;
5. configurar lifecycle de 30 dias e lock compatível quando suportado;
6. gerar credencial limitada ao bucket;
7. provisionar Variables/Secrets diretamente no GitHub, fora do chat;
8. somente então definir `BACKUP_AUTOMATION_ENABLED=true`;
9. executar **uma** prova via `workflow_dispatch`;
10. confirmar workflow verde e os quatro objetos off-site;
11. registrar somente evidência não sensível.

Para R2, a documentação atual exige uma conta/subscription R2 antes da geração das credenciais S3. Não iniciar checkout/billing sem autorização explícita.

## Fonte autoritativa do estado de proteção

O bundle off-site é a evidência independente de recuperação, mas a UI ainda não possui espelho operacional.

Depois do primeiro backup real comprovado, uma slice posterior criará persistência de runs sanitizados no PostgreSQL para alimentar a UI, com pelo menos:

- tipo (`automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`);
- estado (`running`, `succeeded`, `failed`);
- início/fim;
- integridade;
- destino/provider lógico sem segredo;
- tamanho/timestamps seguros;
- erro sanitizado;
- Organizations incluídas no run.

O backup PostgreSQL é global por database/environment; não duplicar fisicamente o dump por Organization.

## Experiência “Proteção dos dados”

Slice posterior:

- card no `RuntimeShell`;
- `/workspace/backup`;
- verde: proteção dentro da política;
- âmbar: aproximação de RPO/degradação;
- vermelho: RPO violado/falha;
- última cópia válida;
- próxima janela esperada;
- integridade;
- retenção;
- histórico;
- último restore drill.

A UI usa linguagem de produto e não expõe GitHub internals, connection strings ou credenciais do storage.

## Cobertura

### PostgreSQL

A trilha automática cobre o banco lógico produzido pelo exportador aprovado.

Migrations versionadas ajudam a reconstruir schema, mas não substituem dados.

### Auth

Auth usa PostgreSQL internamente, mas uma recuperação completa da plataforma também exige reconfigurar elementos externos ao dump, como providers/configurações/API keys quando utilizados.

Não descrever o SQL sozinho como clone integral do projeto Supabase.

### Supabase Storage / anexos

Backups de banco do Supabase não incluem os objetos binários armazenados pela Storage API; incluem apenas metadata de banco relacionada.

`REQ-FIN-008` já introduziu anexos financeiros. Portanto, antes de declarar “backup completo”:

1. inventariar os buckets efetivamente usados pelo Lojasaph;
2. implementar cópia off-site dos objetos;
3. preservar inventário/chaves/checksums suficientes para reconciliar metadata e objeto;
4. testar recuperação em destino isolado;
5. refletir a cobertura real na UI.

Até essa trilha estar pronta, a proteção comprovada deve ser descrita como **backup PostgreSQL**, não backup completo dos anexos.

## Exportação manual complementar

Não é o mecanismo de RPO.

Permanece para slice posterior, com autorização `owner/admin` Organization-wide, formato versionado, manifesto/checksum, audit trail e sem material reutilizável de autenticação.

## Runbook de restauração real

**Nunca restaurar sobre Production apenas para teste.**

Em incidente:

1. identificar o backup válido mais recente;
2. validar checksum externo e manifesto;
3. extrair em diretório protegido;
4. validar `SHA256SUMS` internos;
5. provisionar destino PostgreSQL/Supabase novo e isolado compatível;
6. restaurar roles/schema/data conforme documentação vigente do Supabase;
7. reconfigurar componentes externos necessários;
8. restaurar/reconciliar Storage separadamente quando coberto;
9. validar migrations, extensões, tabelas, funções, triggers, índices, RLS e grants;
10. reconciliar dados operacionais críticos;
11. executar smoke tests não destrutivos;
12. decidir cutover somente após aceite;
13. preservar o projeto original sempre que possível.

O RTO de até 4h é objetivo operacional, não garantia do provedor.

## Sequência de execução da #75

1. ADR-009 / arquitetura revisada — concluído;
2. reconciliar workflow para S3-compatible provider-neutral — implementação desta slice;
3. aprovar/provisionar destino externo fora do chat — próximo gate;
4. executar primeiro backup PostgreSQL real e comprovar integridade off-site;
5. persistir evidência autoritativa e histórico;
6. adicionar UI “Proteção dos dados”;
7. implementar trilha de Storage antes de declarar cobertura completa;
8. implementar exportação manual complementar se mantida na slice final;
9. executar restore drill isolado com a cobertura disponível;
10. fechar #75 somente com evidência completa.

## Segurança / não fazer

- não pedir nem receber secrets em chat;
- não armazenar backup real em Git/GitHub Artifact;
- não provisionar serviço com cobrança sem autorização;
- não setar `BACKUP_AUTOMATION_ENABLED=true` antes do gate;
- não restaurar Production para teste;
- não considerar confirmação humana prova de backup;
- não bloquear mutations do negócio por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não criar deploy Vercel para esta frente de workflow/docs.
