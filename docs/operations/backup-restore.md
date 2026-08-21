# Backup, restauração e recuperação operacional

Data da verificação: 2026-08-21
Status: Fase 38 — automação implementada; ativação real pendente de secrets/OAuth e primeiro run comprovado
Requisito: `REQ-PLAT-005`
Issue: #75

## Objetivo

Manter backup lógico automático do PostgreSQL/Supabase Production, cópia off-site privada, verificação de integridade, retenção definida e prova recorrente de recuperação sem restaurar destrutivamente sobre o projeto ativo.

## Estado do provedor

Projeto Supabase conectado:

- project ref: `fhbvwyttikrbeaanatlr`;
- região: `sa-east-1`;
- PostgreSQL: 17;
- organização no plano Free;
- migrations versionadas no GitHub continuam sendo a fonte de verdade do schema.

O plano Free não fornece a camada de backup automático gerenciado usada nos planos pagos. Enquanto esse plano for mantido, o Lojasaph usa exportação lógica periódica e cópia off-site. Uma futura migração de plano deve provocar nova avaliação antes de contratar PITR ou duplicar mecanismos.

## Política operacional aprovada

Decisões registradas na Issue #75 em 2026-08-21:

- **RPO máximo:** 24 horas;
- **cadência:** uma execução por dia;
- **RTO objetivo:** até 4 horas em condição operacional normal, sem infraestrutura paga dedicada a recuperação em minutos;
- **destino off-site:** Google Drive privado da conta operacional;
- **retenção:** 30 dias;
- **proteção:** credenciais fora do Git, acesso OAuth de menor privilégio, arquivos temporários com permissão restrita e SHA-256 verificado antes/depois da transferência;
- **owner/canal de alerta:** `synapselab.ia@gmail.com` por e-mail;
- **restore drill:** mensal e isolado.

Esses valores são defaults de custo/benefício aprovados pelo operador. Alterá-los exige atualizar esta documentação e a Issue correspondente.

## Componentes versionados

### Exportador lógico

`scripts/export-supabase-backup.sh`

Exige:

- `SUPABASE_DB_URL` por secret do runtime;
- `BACKUP_OUTPUT_DIR` fora do repositório;
- Supabase CLI instalada em versão aprovada.

Produz:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

O helper usa `umask 077`, recusa gravar dentro do repositório e verifica os hashes antes de retornar sucesso.

### Backup automático de Production

`.github/workflows/production-backup.yml`

- schedule: `17 6 * * *` — diariamente às 06:17 UTC;
- `workflow_dispatch` para execução manual controlada;
- Supabase CLI pinada;
- rclone pinado em container;
- reutiliza o exportador existente;
- adiciona metadata não sensível de origem/data/RPO/retenção;
- empacota o conjunto em `lojasaph-production-<UTC>.tar.gz`;
- cria e verifica SHA-256 do archive;
- envia archive + checksum para `lojasaph-drive:Lojasaph Backups`;
- executa `rclone check` após upload;
- remove apenas archives do padrão Lojasaph com idade superior a 30 dias;
- elimina temporários e a configuração OAuth do runner no final;
- em falha, tenta enviar alerta por e-mail sem incluir credencial/conteúdo do dump.

O job possui um **arming switch**:

`BACKUP_AUTOMATION_ENABLED=true`

Enquanto essa repository variable não existir ou não estiver exatamente como `true`, o job permanece skipped. Isso permite merge seguro do código antes do provisionamento das credenciais.

### Restore drill mensal

`.github/workflows/backup-restore-drill.yml`

- schedule: primeiro dia do mês às 06:43 UTC;
- baixa do Drive o archive Production mais recente;
- verifica SHA-256 do archive após download;
- extrai e verifica `SHA256SUMS` dos SQLs/metadata;
- confirma que os componentes esperados existem e não estão vazios;
- executa também `scripts/verify-backup-restore.sh` em PostgreSQL 17 efêmero, reconstruído com migrations + seed anonimizado;
- nunca executa DDL/DML no Production;
- em falha, envia alerta ao owner.

### Limite atual do drill

No plano/infraestrutura atuais não existe um projeto Supabase hospedado isolado aprovado para receber periodicamente uma cópia de Production. Portanto o drill mensal comprova duas coisas separadas:

1. o **backup real off-site** mais recente existe no Google Drive e mantém integridade de archive + arquivos internos;
2. a **mecânica de restauração** do schema/dados e as invariantes principais continuam funcionando em PostgreSQL 17 isolado usando fixtures anonimizadas.

Isso não deve ser descrito como “restore do banco real em Supabase hospedado”. Se for aprovado um ambiente seguro para isso no futuro, adicionar um drill hospedado sem restaurar sobre o Production ativo.

## Secrets e variável necessários

Nenhum valor abaixo pode aparecer em Markdown, Issue, PR, workflow, log ou chat.

### GitHub Actions Secrets

`PRODUCTION_SUPABASE_DB_URL`

- connection string do PostgreSQL Production;
- usada somente pelo exportador lógico;
- nunca prefixar com `NEXT_PUBLIC_`.

`BACKUP_RCLONE_CONFIG_B64`

- conteúdo completo da configuração rclone, codificado em base64;
- deve conter um remote chamado exatamente `[lojasaph-drive]`;
- inclui material OAuth e, portanto, é secret.

`BACKUP_ALERT_GMAIL_APP_PASSWORD`

- App Password exclusivo para o notifier de backup;
- só pode ser criado se a Conta Google tiver verificação em duas etapas habilitada;
- não usar a senha normal da conta.

### GitHub Actions Variable

`BACKUP_AUTOMATION_ENABLED=true`

Criar **somente depois** que os três secrets estiverem provisionados e o OAuth tiver sido validado.

## Provisionar Google Drive com rclone

O destino é uma conta pessoal `@gmail.com`. O default escolhido é OAuth da própria conta, não service account.

### 1. Criar um OAuth client próprio

No Google Cloud:

1. criar/usar um projeto exclusivo para a automação do Lojasaph;
2. habilitar Google Drive API;
3. configurar a tela/consentimento OAuth para a conta operacional;
4. criar OAuth Client ID do tipo Desktop App;
5. não deixar a aplicação indefinidamente em estado `Testing` se o token precisar durar mais de 7 dias; tokens emitidos para apps em Testing podem expirar em 7 dias;
6. não solicitar escopo amplo se o fluxo funcionar com acesso por arquivo.

A documentação atual do rclone informa que seu client ID compartilhado está sendo retirado durante 2026. Portanto **usar client ID/secret próprios**, não o shared client do rclone.

### 2. Criar remote `lojasaph-drive`

Em uma máquina confiável com navegador:

```bash
rclone config
```

Criar remote:

- name: `lojasaph-drive`;
- storage: Google Drive;
- client ID/secret: os do OAuth client criado acima;
- scope: `drive.file` sempre que compatível com o destino criado pelo próprio app;
- autenticar especificamente como `synapselab.ia@gmail.com`;
- não configurar Shared Drive para este caso pessoal.

O escopo `drive.file` limita o app aos arquivos que ele cria/usa e é classificado pelo Google como não sensível. Se uma necessidade concreta futura exigir acesso a arquivos externos preexistentes, revisar o escopo explicitamente antes de ampliar privilégios.

### 3. Guardar a config como GitHub Secret

Localizar o arquivo `rclone.conf` gerado e, em máquina confiável, produzir uma representação base64 em uma única linha. O resultado inteiro deve ser salvo somente como GitHub Actions Secret `BACKUP_RCLONE_CONFIG_B64`.

Não colar esse conteúdo em Issue/PR/docs/chat.

## Provisionar alerta por Gmail

O e-mail padrão do Supabase Auth não é tratado como mecanismo genérico de alerta operacional. O projeto não possui Edge Function dedicada a envio de alertas.

Para manter custo/complexidade baixos, o notifier usa SMTP Gmail:

1. ativar/verificar 2-Step Verification na conta `synapselab.ia@gmail.com`;
2. criar uma App Password exclusiva para “Sistema Lojasaph Backup”;
3. salvar somente em GitHub Actions Secret `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. nunca reutilizar a senha principal da conta.

Se App Password não estiver disponível para a conta, o próximo passo é substituir o notifier por um provedor/integração explicitamente aprovado; não enfraquecer a conta para contornar a restrição.

## Ativação segura

Depois de mergear a implementação:

1. criar os três Actions Secrets;
2. validar que o remote OAuth possui nome `[lojasaph-drive]`;
3. criar repository variable `BACKUP_AUTOMATION_ENABLED=true`;
4. abrir **Actions → Production Database Backup → Run workflow**;
5. aguardar sucesso;
6. no Google Drive, confirmar a pasta `Lojasaph Backups` e a presença de:
   - `lojasaph-production-<UTC>.tar.gz`;
   - `lojasaph-production-<UTC>.tar.gz.sha256`;
7. confirmar no summary do workflow que upload e checksums passaram;
8. não abrir/compartilhar o conteúdo do dump para “testar”;
9. somente após essa evidência registrar o primeiro backup real e avaliar o fechamento da Issue #75.

O primeiro run real é obrigatório. Merge de workflow sem credenciais não equivale a backup implementado em Production.

## Operação diária

Em sucesso:

- não enviar dump por e-mail;
- manter somente o archive + checksum no Drive privado;
- retenção é aplicada automaticamente;
- não criar GitHub Artifact com o dump.

Em falha:

- consultar o run do GitHub Actions;
- o alerta informa apenas repositório/workflow/run URL;
- corrigir credencial/OAuth/conectividade sem publicar valores;
- executar manualmente novamente após a correção;
- se o último backup válido tiver mais de 24h, tratar como violação do RPO e prioridade operacional.

## Runbook de restauração real

Regra principal: **nunca restaurar sobre o Supabase Production ativo apenas para teste**.

Em incidente real:

1. declarar a recuperação e congelar mudanças quando aplicável;
2. selecionar o archive aprovado mais recente dentro do RPO;
3. verificar o `.sha256` externo;
4. extrair em diretório protegido e verificar `SHA256SUMS`;
5. criar destino PostgreSQL/Supabase novo e isolado compatível;
6. seguir a documentação vigente do Supabase para restaurar roles/schema/data;
7. validar extensões, migrations, tabelas, funções, triggers e índices;
8. validar RLS/grants e isolamento de Organization;
9. validar dados operacionais e totais de reconciliação;
10. fazer smoke tests não destrutivos da aplicação;
11. somente então decidir cutover;
12. preservar o projeto original até aceite sempre que possível.

O objetivo de RTO ≤4h é operacional; ele não é uma garantia do provedor e depende de disponibilidade do destino, tamanho do banco, credenciais e intervenção do operador.

## Checks pós-restore mínimos

### Estrutura

- migrations/versionamento esperados;
- tabelas, funções, triggers e índices principais;
- extensões necessárias;
- RLS em tabelas expostas;
- grants críticos coerentes.

### Dados

- Organizations/Units principais;
- itens e fornecedores;
- documentos financeiros/parcelas/pagamentos;
- sessões/totais de caixa;
- saldos/lotes/movimentos de estoque;
- audit trail;
- batches/rows de importação quando aplicável.

### Segurança

- usuário sem membership não lê operação;
- escopos Unit/Sector permanecem restritos;
- `anon` sem acesso operacional;
- clientes autenticados sem DELETE direto/ledger write indevido;
- RPCs críticas preservam autorização interna.

## O que o dump PostgreSQL não cobre sozinho

Backup de banco não equivale a clone completo da plataforma. Conforme novos recursos forem usados, estratégias separadas podem ser necessárias para:

- Storage objects;
- Edge Functions;
- Auth settings/API keys;
- Realtime/publications;
- configurações do projeto;
- domains/DNS;
- secrets externos.

Atualmente a Issue #75 trata o banco Production. Não assumir cobertura futura desses serviços sem auditoria específica.

## Critério de fechamento da Issue #75

A Issue pode ser fechada somente quando houver evidência de que:

- os três secrets foram provisionados;
- `BACKUP_AUTOMATION_ENABLED=true` está ativo;
- um run real de `Production Database Backup` terminou com sucesso;
- o archive e checksum existem no Google Drive privado;
- o workflow verificou integridade pós-upload;
- retenção está configurada em 30 dias;
- alerta possui credencial operacional configurada;
- o procedimento/drill mensal está versionado e habilitado.

Enquanto o primeiro run real não existir, manter #75 aberta.

## Regras de segurança

- nenhum dump real no GitHub;
- nenhum GitHub Artifact contendo backup Production;
- nenhuma database URL/OAuth token/App Password em documentação ou logs;
- temporários fora do repo e removidos mesmo em falha;
- menor privilégio para Drive;
- restore de teste somente isolado;
- nenhum deploy Vercel é necessário para esta rotina;
- plano pago/PITR somente com autorização explícita.
