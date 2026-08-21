# Backup, restauração e recuperação operacional

Data da verificação: 2026-08-21
Status: Fase 38 — automação implementada; ativação real pendente de secrets/OAuth e primeiro run comprovado
Requisito: `REQ-PLAT-005`
Issue: #75

## Objetivo

Manter backup lógico automático do PostgreSQL/Supabase Production, cópia off-site privada, verificação de integridade, retenção definida e prova recorrente de recuperação sem restaurar destrutivamente sobre o projeto ativo.

## Estado do provedor

- Supabase Production: `fhbvwyttikrbeaanatlr`;
- região: `sa-east-1`;
- PostgreSQL 17;
- organização no plano Free;
- migrations em `supabase/migrations/` continuam sendo a fonte de verdade do schema.

Schema versionado não substitui backup de dados. Enquanto o projeto permanecer no plano Free, a estratégia aprovada é exportação lógica periódica + cópia off-site. Pro/PITR só devem ser reavaliados mediante autorização de custo.

## Política aprovada na Issue #75

Decisões de 2026-08-21:

- **RPO:** 24 horas;
- **cadência:** diária;
- **RTO objetivo:** até 4 horas em condição operacional normal;
- **destino off-site:** Google Drive privado da conta operacional;
- **retenção:** 30 dias;
- **proteção:** credenciais fora do Git, OAuth de menor privilégio, SHA-256 e cleanup de temporários;
- **owner/alerta:** `synapselab.ia@gmail.com`;
- **restore drill:** mensal e isolado.

Não voltar a tratar esses itens como `PENDING` salvo nova decisão do operador.

## Exportador lógico existente

`scripts/export-supabase-backup.sh` exige:

- `SUPABASE_DB_URL` por ambiente/secret;
- `BACKUP_OUTPUT_DIR` fora do repositório;
- Supabase CLI disponível.

Produz temporariamente:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

O helper usa `umask 077`, recusa diretório dentro do Git e verifica os hashes antes de retornar sucesso.

## Backup automático de Production

Workflow: `.github/workflows/production-backup.yml`.

- cron diário `17 6 * * *`;
- `workflow_dispatch` para primeira execução/controlada;
- guard `vars.BACKUP_AUTOMATION_ENABLED == 'true'`;
- Supabase CLI pinada em `2.111.0`;
- rclone pinado em `1.75.0`;
- reutiliza o exportador existente;
- adiciona metadata não sensível;
- cria `lojasaph-production-<UTC>.tar.gz` + `.sha256`;
- verifica hashes internos e do archive;
- envia para `lojasaph-drive:Lojasaph Backups`;
- executa `rclone check` pós-upload;
- remove apenas archives Lojasaph com mais de 30 dias;
- remove temporários/config OAuth do runner;
- envia e-mail em falha sem conteúdo do dump ou credenciais.

### Conexão Supabase obrigatória no GitHub Actions

GitHub Actions é um ambiente IPv4-only e a conexão direta do Supabase Free usa IPv6. Portanto `PRODUCTION_SUPABASE_DB_URL` deve ser a **Session pooler connection string na porta 5432**, obtida em **Supabase Dashboard → Connect → Session pooler**.

Formato conceitual, sem valor real:

`postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<REGION>.pooler.supabase.com:5432/postgres`

O workflow falha antes do dump se o secret não apontar para `*.pooler.supabase.com:5432`. Não usar a direct URL `db.<ref>.supabase.co:5432` nesse runner.

## Restore drill mensal

Workflow: `.github/workflows/backup-restore-drill.yml`.

- cron `43 6 1 * *`;
- mesmo arming switch;
- baixa o archive Production real mais recente do Drive;
- verifica `.sha256` externo;
- extrai e verifica `SHA256SUMS` internos;
- confirma `roles.sql`, `schema.sql`, `data.sql` e metadata;
- executa também `scripts/verify-backup-restore.sh` em PostgreSQL 17 efêmero reconstruído com migrations + seed anonimizado;
- nunca executa restore no Production;
- alerta por e-mail em falha.

### Limite atual do drill

Ainda não existe projeto Supabase hospedado isolado aprovado para receber periodicamente uma cópia real de Production. Assim, o drill comprova separadamente:

1. integridade e recuperabilidade dos arquivos do **backup Production real off-site**;
2. mecânica de dump/restore e invariantes da aplicação em PostgreSQL 17 isolado.

Não descrever isso como “restore hospedado do banco real”. Um futuro ambiente isolado pode ampliar o drill sem alterar Production.

## Alerta operacional

`scripts/send-backup-alert.py` usa SMTP Gmail via TLS.

O e-mail padrão do Supabase Auth não é tratado como mecanismo genérico de alerta operacional; o projeto também não possui Edge Function de alerta. Para custo/complexidade baixos, a rotina usa uma App Password dedicada da conta `synapselab.ia@gmail.com`.

Se a conta não oferecer App Password, substituir o notifier por integração explicitamente aprovada; não enfraquecer a conta para contornar a restrição.

## Secrets e variável necessários

Nenhum valor deve aparecer em Markdown, Issue, PR, workflow, logs ou chat.

### Actions Secrets

`PRODUCTION_SUPABASE_DB_URL`

- **Session pooler**, porta 5432;
- nunca `NEXT_PUBLIC_*`;
- nunca colar o valor no chat.

`BACKUP_RCLONE_CONFIG_B64`

- base64 do `rclone.conf` completo;
- deve conter remote exatamente `[lojasaph-drive]`;
- contém OAuth token/client material e é secret.

`BACKUP_ALERT_GMAIL_APP_PASSWORD`

- App Password exclusiva para o notifier;
- requer Google 2-Step Verification;
- nunca usar a senha normal da conta.

### Repository Variable

`BACKUP_AUTOMATION_ENABLED=true`

Criar somente depois dos três secrets.

## Google Drive / OAuth

O destino aprovado é uma conta pessoal `synapselab.ia@gmail.com`; o default é OAuth da própria conta, não service account.

### Criar OAuth client próprio

1. criar/usar projeto Google Cloud dedicado;
2. habilitar Google Drive API;
3. configurar OAuth consent para a conta operacional;
4. criar OAuth Client ID do tipo Desktop App;
5. usar client ID/secret próprios — o shared client ID do rclone está sendo retirado durante 2026;
6. não deixar o app indefinidamente em `Testing` para automação longa, pois refresh tokens emitidos nesse estado podem expirar em 7 dias;
7. preferir acesso por arquivo, não escopo amplo.

### Criar o remote

Em máquina confiável com navegador:

```bash
rclone config
```

Configuração esperada:

- name: `lojasaph-drive`;
- storage: Google Drive;
- client ID/secret: próprios;
- scope: `drive.file` sempre que compatível;
- login: `synapselab.ia@gmail.com`;
- Shared Drive: não.

`drive.file` limita o app aos arquivos que ele cria/usa. Se futuramente houver necessidade concreta de arquivos externos preexistentes, revisar o escopo antes de ampliar acesso.

Depois, codificar o `rclone.conf` em base64 numa máquina confiável e salvar somente em `BACKUP_RCLONE_CONFIG_B64`. Nunca versionar o arquivo ou o base64.

## Gmail App Password

1. ativar/verificar 2-Step Verification em `synapselab.ia@gmail.com`;
2. criar App Password exclusiva, por exemplo “Sistema Lojasaph Backup”;
3. salvar somente como `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. não reutilizar a senha principal da conta.

## Ativação segura

Depois do merge do PR da Fase 38:

1. criar `PRODUCTION_SUPABASE_DB_URL` com a **Session pooler URL**;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar repository variable `BACKUP_AUTOMATION_ENABLED=true`;
5. executar **Actions → Production Database Backup → Run workflow**;
6. aguardar sucesso completo;
7. no Google Drive, confirmar sem abrir o dump:
   - `Lojasaph Backups/lojasaph-production-<UTC>.tar.gz`;
   - arquivo `.sha256` correspondente;
8. conferir no summary que export, hashes, upload, `rclone check`, retenção e cleanup passaram;
9. registrar somente evidência não sensível na #75.

Merge do workflow sem esse primeiro run não equivale a backup Production comprovado.

## Operação diária

Em sucesso:

- nenhum dump vai para GitHub Artifact ou commit;
- Drive privado guarda somente archive/checksum;
- retenção é automática.

Em falha:

- e-mail aponta para o run do Actions;
- corrigir credencial/OAuth/rede sem publicar valores;
- reexecutar manualmente;
- se o último backup válido tiver mais de 24h, tratar como violação do RPO.

## Runbook de restauração real

**Nunca restaurar sobre o projeto Production ativo apenas para teste.**

Em incidente:

1. selecionar o archive válido mais recente;
2. validar `.sha256`;
3. extrair em diretório protegido e validar `SHA256SUMS`;
4. criar destino PostgreSQL/Supabase novo e isolado compatível;
5. seguir a documentação vigente do Supabase para roles/schema/data;
6. validar migrations, extensões, tabelas, funções, triggers e índices;
7. validar RLS/grants e isolamento por Organization;
8. reconciliar dados operacionais críticos;
9. executar smoke tests não destrutivos;
10. decidir cutover somente após aceite;
11. preservar o projeto original sempre que possível.

O RTO de até 4h é objetivo operacional, não garantia do provedor; depende de tamanho do banco, destino e intervenção do operador.

## Checks pós-restore mínimos

- Organizations/Units esperadas;
- itens, fornecedores e compras;
- financeiro/parcelas/pagamentos;
- caixa;
- saldos/lotes/movimentos de estoque;
- audit trail;
- RLS/grants;
- outsider/anon sem acesso operacional;
- authenticated sem DELETE/ledger writes indevidos;
- RPCs críticas com autorização intacta.

## O que o dump PostgreSQL não cobre sozinho

Quando entrarem em uso, podem exigir estratégia própria:

- Storage objects;
- Edge Functions;
- Auth settings/API keys;
- Realtime/publications;
- domains/DNS;
- secrets externos.

A #75 trata o banco Production atual; não assumir cobertura automática de serviços futuros.

## Critério de fechamento da Issue #75

Fechar somente quando houver evidência de:

- três secrets provisionados;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro `Production Database Backup` real verde;
- archive + checksum no Drive privado;
- integridade pós-upload verificada;
- retenção 30 dias ativa;
- canal de alerta provisionado;
- workflow mensal de drill habilitado.

Enquanto o primeiro run real não existir, manter #75 aberta.

## Segurança

- nenhum dump Production no Git/Artifacts;
- nenhuma DB URL/OAuth/App Password em docs/logs/chat;
- temporários sempre removidos;
- Drive em menor privilégio;
- restore de teste somente isolado;
- nenhum deploy Vercel necessário;
- nenhum plano/add-on pago sem autorização.
