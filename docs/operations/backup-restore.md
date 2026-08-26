# Proteção, backup, restauração e recuperação operacional

Data da revisão: 2026-08-26  
Status: arquitetura revisada na #75; automação histórica permanece desarmada  
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

## Estado técnico atual

### Supabase Production

- projeto: `fhbvwyttikrbeaanatlr`;
- região: `sa-east-1`;
- PostgreSQL 17;
- plano atual permanece Free na última auditoria;
- migrations versionadas no GitHub são fonte de verdade do schema do produto.

O Supabase recomenda exportações regulares via CLI com cópia off-site para projetos Free. Backup de banco não substitui backup dos objetos do Supabase Storage.

### Exportador lógico existente

`scripts/export-supabase-backup.sh` exige `SUPABASE_DB_URL` por secret e diretório temporário fora do repositório.

Produz:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

O helper usa `umask 077`, recusa escrita dentro do Git e valida hashes antes de retornar sucesso.

O fluxo corresponde à sequência documentada pelo Supabase CLI para backup lógico de roles/schema/data.

### Automação histórica mergeada

`.github/workflows/production-backup.yml` e `.github/workflows/backup-restore-drill.yml` foram implementados antes da revisão arquitetural.

A implementação atual:

- possui cron diário e `workflow_dispatch`;
- usa `BACKUP_AUTOMATION_ENABLED` como fail-closed;
- reutiliza o exportador lógico;
- cria archive + `.sha256`;
- envia para Google Drive via rclone;
- verifica upload;
- aplica retenção de 30 dias;
- envia alerta por Gmail App Password;
- possui drill mensal isolado.

`PRODUCTION_SUPABASE_DB_URL` já foi provisionado anteriormente com Session pooler na porta 5432.

**Não ativar essa automação em seu formato Drive/rclone/Gmail.** Ela é baseline técnica a reconciliar conforme ADR-009. Os schedules devem permanecer desarmados até a nova automação provider-neutral estar pronta e um destino off-site ter sido explicitamente aprovado/provisionado.

## Arquitetura alvo do destino off-site

A automação deve depender de contrato **S3-compatible**, e não de Google Drive/OAuth.

Provedor inicial preferido: **Cloudflare R2**, sujeito a aprovação operacional antes de qualquer criação de conta/bucket/billing/secret.

Motivos registrados no ADR-009:

- API S3-compatible;
- baixo custo/free tier documentado para Standard;
- egress sem cobrança;
- lifecycle de objetos;
- bucket lock contra exclusão/overwrite antes do prazo;
- credenciais escopáveis por bucket;
- portabilidade futura para B2/S3/equivalente.

### Controles mínimos do bucket

Quando o destino for aprovado:

- bucket privado dedicado a Production;
- sem public access e sem CORS de navegador;
- credencial limitada ao bucket;
- prefixo por environment;
- checksum SHA-256;
- verificação pós-upload;
- retenção de 30 dias;
- bucket lock/WORM compatível com a janela de retenção quando suportado;
- lifecycle de expiração configurado no storage;
- segredos somente em secret manager/GitHub Actions Secrets.

Nenhuma credencial de storage deve aparecer em Markdown, Issue, PR, log ou chat.

## Fonte autoritativa do estado de proteção

A UI não pode considerar um backup válido porque o cron “deveria ter rodado” ou porque um usuário clicou em “confirmei”.

### Evidência off-site

Cada backup válido precisa manter, junto ao archive:

- manifesto não sensível;
- identificador do backup;
- ambiente;
- timestamp UTC;
- cobertura declarada;
- versão/formato;
- SHA-256;
- tamanho;
- referência segura da execução.

Archive + manifesto/checksum são a evidência independente usada na recuperação quando o banco principal não estiver disponível.

### Espelho para a UI

Uma slice posterior criará persistência de runs sanitizados no PostgreSQL para alimentar a UI:

- tipo (`automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`);
- estado (`running`, `succeeded`, `failed`);
- início/fim;
- integridade;
- destino/provider lógico sem segredo;
- tamanho/timestamps seguros;
- erro sanitizado;
- Organizations incluídas no run.

O backup automático do PostgreSQL é global por database/environment. Ele não deve gerar uma cópia física duplicada para cada Organization. A página da Organization deriva seu estado da relação entre a Organization e o run que a incluiu.

Leitura será protegida por RLS. Usuários comuns não ganham mutation sobre a evidência de backup.

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

Todos os membros da Organization podem ver estado geral quando autorizado pela política de leitura. Ações administrativas começam restritas a `owner/admin` Organization-wide.

A UI usa linguagem de produto. Não expõe connection strings, bucket keys, GitHub internals ou detalhes de DBA.

## Alertas

`BACKUP_ALERT_GMAIL_APP_PASSWORD` não faz mais parte da arquitetura alvo.

Primeiro estágio:

- falha explícita no GitHub Actions;
- estado crítico no espelho operacional quando possível;
- Issue/registro operacional persistente no GitHub sem segredos e sem criar duplicatas a cada execução.

Um adapter externo adicional de notificação pode ser adicionado futuramente se houver necessidade e provedor aprovado.

## Cobertura

### PostgreSQL

A trilha automática cobre o banco lógico produzido pelo exportador aprovado.

Migrations versionadas ajudam a reconstruir schema, mas não substituem dados.

### Auth

Auth usa PostgreSQL internamente, mas uma recuperação completa de plataforma também exige reconfigurar elementos que não são apenas dados do banco, como providers/configurações/API keys quando utilizados.

Não descrever o dump SQL sozinho como clone integral da plataforma Supabase.

### Supabase Storage / anexos

O Supabase documenta que backups de banco **não incluem os objetos binários armazenados via Storage API**; preservam metadata, não os arquivos.

`REQ-FIN-008` já introduziu anexos financeiros. Portanto, antes de declarar “backup completo”:

1. inventariar os buckets efetivamente usados pelo Lojasaph;
2. implementar cópia off-site dos objetos;
3. preservar inventário/chaves/checksums suficientes para reconciliar metadata e objeto;
4. testar recuperação em destino isolado;
5. refletir a cobertura real na UI.

Enquanto essa trilha não estiver pronta, o produto deve dizer explicitamente que a proteção comprovada é do PostgreSQL, não dos arquivos anexados.

### Outros recursos externos

Reavaliar quando entrarem em uso material:

- Edge Functions;
- Realtime/publications;
- domains/DNS;
- secrets/config externos;
- configurações específicas de Auth.

## Exportação manual complementar

Não é o mecanismo de RPO.

Requisitos:

- somente `owner/admin` Organization-wide;
- revalidação server-side de autorização;
- uma única Organization por export;
- formato versionado;
- manifesto + checksums/fingerprint;
- IDs/relacionamentos necessários preservados;
- audit trail de geração;
- sem secrets/material reutilizável de autenticação;
- sem URL pública permanente;
- tratar o download como altamente sensível.

O formato definitivo (`JSON`, JSONL/ZIP etc.) só deve ser escolhido depois de inventário e prova de reconstrução/reconciliação.

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

## Checks pós-restore mínimos

- Organizations/Units esperadas;
- catálogo e fornecedores;
- compras;
- financeiro/parcelas/pagamentos;
- caixa;
- saldos/lotes/movimentos de estoque;
- anexos quando a cobertura de Storage estiver ativa;
- audit trail;
- Auth necessário ao login;
- RLS/grants;
- outsider/anon sem acesso operacional;
- RPCs críticas com autorização intacta.

## Sequência de execução da #75

1. ADR-009 / arquitetura revisada;
2. reconciliar workflow para S3-compatible provider-neutral, ainda fail-closed e sem provisionar storage;
3. aprovar/provisionar destino externo fora do chat;
4. executar primeiro backup PostgreSQL real e comprovar integridade off-site;
5. persistir evidência autoritativa e histórico;
6. adicionar UI “Proteção dos dados”;
7. implementar trilha de Storage antes de declarar cobertura completa;
8. implementar exportação manual complementar se mantida na slice final;
9. executar restore drill isolado com a cobertura disponível;
10. fechar #75 somente com evidência completa.

## Segurança / não fazer

- não ativar o workflow Drive/rclone/Gmail atual;
- não pedir nem receber secrets em chat;
- não armazenar backup real em Git/GitHub Artifact;
- não provisionar serviço com cobrança sem autorização;
- não restaurar Production para teste;
- não considerar confirmação humana prova de backup;
- não bloquear mutations do negócio por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não criar deploy Vercel apenas por documentação/arquitetura.
