# Backup, restauração e recuperação operacional

Data da verificação: 2026-08-18
Status: Fase 16
Requisito: `REQ-PLAT-005`

## Objetivo

Definir uma estratégia reproduzível de backup/restauração para o PostgreSQL/Supabase e manter uma prova automatizada de recuperação sem depender de dados reais nem executar restore destrutivo sobre o projeto hospedado ativo.

## Estado verificado do provedor

Projeto Supabase conectado:

- projeto: `synapselab-ia's Project`;
- região: `sa-east-1`;
- PostgreSQL: 17;
- status: saudável no momento da verificação;
- organização Supabase: plano `free`;
- branches Supabase de desenvolvimento: nenhuma.

Consequências atuais:

- o plano Free não possui o backup diário gerenciado disponível nos planos Pro/Team/Enterprise;
- PITR é recurso de planos pagos e requer compute compatível;
- para Free, a documentação oficial recomenda exportações regulares com `supabase db dump` e manutenção de cópias off-site;
- nenhum restore do projeto hospedado foi executado nesta fase.

Fontes oficiais consultadas em 2026-08-18:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/deployment/ci/backups
- https://supabase.com/docs/reference/cli/supabase-db-dump

## Estratégia em camadas

### 1. Schema reproduzível

As migrations em `supabase/migrations/` continuam sendo a fonte de verdade para o schema da aplicação.

Isso **não substitui backup de dados**. Replay de migration recompõe estrutura, não o estado operacional acumulado.

### 2. Backup lógico de contingência

Enquanto o projeto permanecer no plano Free, a camada disponível é exportação lógica periódica para armazenamento off-site aprovado.

O helper versionado é:

```bash
scripts/export-supabase-backup.sh
```

Ele exige:

- `SUPABASE_DB_URL` fornecida apenas por secret do runtime;
- `BACKUP_OUTPUT_DIR` fora do repositório;
- Supabase CLI instalada em versão aprovada/pinada pelo ambiente executor.

O script produz temporariamente:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`.

Os comandos seguem a separação recomendada pelo Supabase entre roles, schema e data. O script recusa gravar dentro do Git repository e não faz commit/upload automático.

A automação operacional deve:

1. executar o helper em runner privado/confiável;
2. verificar `SHA256SUMS`;
3. cifrar o conjunto antes de persistência externa quando o destino não fornecer proteção equivalente;
4. enviar para storage off-site aprovado;
5. aplicar retenção conforme política aprovada;
6. excluir os arquivos temporários do runner.

### Cadência

`RPO` e `RTO` de negócio ainda não foram definidos pelo cliente e não são inferidos nesta fase.

Portanto:

- a rotina está pronta para ser agendada;
- a frequência de produção deve ser configurada somente após o RPO ser aprovado;
- o intervalo do job não pode exceder o RPO aprovado;
- nenhum valor de RPO/RTO é prometido por esta documentação.

### 3. Backup gerenciado do provedor

Se a organização migrar para Pro/Team/Enterprise, reavaliar esta estratégia antes de produção:

- backups diários gerenciados passam a estar disponíveis conforme a retenção do plano;
- PITR pode ser habilitado como add-on quando a necessidade de granularidade justificar custo/compute;
- quando backups físicos estiverem disponíveis, `Restore to a new project` é preferível para drills não destrutivos, pois evita sobrescrever o projeto ativo.

A ativação de plano/add-on é decisão operacional/custo e não foi executada nesta fase.

## Prova automatizada de recuperação

O CI executa:

```bash
bash scripts/verify-backup-restore.sh
```

Fluxo:

1. banco PostgreSQL 17 efêmero recebe bootstrap, todas as migrations e seed sintético;
2. `pg_dump` cria um dump lógico em diretório temporário fora do repositório;
3. SHA-256 do artefato é calculado e verificado;
4. um segundo banco limpo é criado no mesmo PostgreSQL efêmero;
5. `pg_restore` restaura o dump;
6. `supabase/tests/backup_restore.sql` valida recuperação;
7. banco restaurado e arquivos temporários são destruídos por `trap` ao final, inclusive em falha.

O teste comprova, no banco restaurado:

- fixtures sintéticos principais presentes;
- saldo de estoque esperado preservado;
- RLS habilitada em tabelas críticas;
- `anon` sem leitura operacional indevida;
- `authenticated` sem `INSERT` direto no ledger;
- RPC transacional pública ainda executável pelo papel esperado;
- isolamento de Organization funcionando após restore.

Esse drill prova a mecânica de dump/restore e invariantes da aplicação. Ele **não** simula a infraestrutura interna de restore da Supabase nem substitui um futuro drill de recuperação hospedada quando houver um ambiente/plano seguro para isso.

## Runbook — criar backup lógico

Pré-condições:

- executar fora do navegador e fora do cliente web;
- obter a connection string por mecanismo seguro;
- não gravar a credencial em arquivo versionado;
- usar diretório temporário fora do repo;
- confirmar destino off-site e retenção antes da execução de produção.

Exemplo:

```bash
export SUPABASE_DB_URL='postgresql://...'
export BACKUP_OUTPUT_DIR='/secure/ephemeral/lojasaph-backup'
bash scripts/export-supabase-backup.sh
```

Depois:

1. verificar `SHA256SUMS`;
2. cifrar/transferir para o storage aprovado;
3. registrar timestamp, origem/projeto e checksum no inventário operacional do backup;
4. remover os arquivos locais temporários;
5. nunca adicionar o dump ao Git.

## Runbook — restauração lógica segura

Regra principal: **não restaurar sobre o projeto Supabase ativo como procedimento de teste**.

Ordem recomendada:

1. declarar incidente/drill e congelar mudanças se for recuperação real;
2. identificar backup e validar checksum;
3. criar destino novo/isolado compatível;
4. confirmar extensões/configuração necessárias no destino;
5. restaurar roles, schema e dados conforme o procedimento oficial do Supabase;
6. restaurar separadamente configurações/ativos não cobertos pelo dump de banco;
7. executar os checks pós-restore abaixo;
8. somente após validação decidir cutover/retorno de tráfego;
9. preservar o projeto original até o aceite da recuperação sempre que possível.

Para um restore lógico manual em um novo projeto, seguir a documentação oficial vigente em vez de copiar comandos antigos deste arquivo. A referência principal é:

- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Checks pós-restore

Executar no mínimo:

### Estrutura

- migrations/versionamento esperados;
- tabelas, funções, triggers e índices principais;
- extensões necessárias;
- RLS habilitada nas tabelas expostas;
- grants críticos coerentes.

### Dados

- Organizations/Units principais;
- itens/fornecedores esperados;
- documentos financeiros e parcelas;
- sessões/totais de caixa;
- saldos/lotes de estoque;
- batches/rows de importação quando aplicável;
- contagens e totais de reconciliação definidos para o momento do backup.

### Segurança

- usuário sem membership não lê dados operacionais;
- escopos Unit/Sector continuam restritos;
- `anon` permanece sem acesso operacional;
- ledger/financeiro/caixa continuam sem writes diretos indevidos;
- RPCs críticas mantêm a autorização interna esperada.

### Aplicação

- login;
- carregamento do workspace;
- leituras de Estoque, Compras, Financeiro e Caixa;
- smoke tests não destrutivos;
- somente depois disso liberar mutações/cutover.

## Itens que backup de banco não resolve sozinho

Segundo a documentação atual do Supabase, restauração de banco não equivale a clonar toda a plataforma. Dependendo do caminho de restore, podem exigir reconfiguração/cópia separada:

- Storage objects;
- Edge Functions;
- Auth settings e API keys;
- Realtime settings/publications;
- extensões/configurações do projeto;
- custom domains/DNS;
- secrets externos.

O Sistema Lojasaph ainda não deve assumir que um dump PostgreSQL é backup completo de todos os serviços futuros.

## RPO/RTO pendentes

Antes de produção devem ser definidos pelo negócio/operador:

- RPO máximo aceitável;
- RTO máximo aceitável;
- retenção necessária;
- destino off-site aprovado;
- responsável pelo monitoramento da rotina;
- canal de alerta em caso de falha de backup;
- periodicidade de drill completo.

Até essa aprovação, esses valores permanecem explicitamente **PENDING**.

## Regras de segurança

- nenhum dump real no GitHub;
- nenhuma database URL/secret em Markdown, workflow ou log;
- artefatos temporários com permissões restritas;
- restore de teste somente em destino isolado;
- restore destrutivo do projeto ativo exige decisão operacional explícita fora desta fase;
- Storage e demais serviços precisam de estratégia própria quando entrarem em uso real.
