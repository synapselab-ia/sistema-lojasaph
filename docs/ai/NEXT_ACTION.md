# Next Action — Sistema Lojasaph

## Contexto

A Fase 46 continua integrada e o núcleo funcional do MVP permanece reconciliado.

Em 2026-08-26 o operador revisou explicitamente a Issue #75. Isso substituiu o gate antigo “estar em computador confiável para concluir rclone/Gmail” por uma nova prioridade de produto/arquitetura:

> `REQ-PLAT-005 — Proteção, backup e recuperação de dados`

A primeira slice da revisão é o PR #107, que formaliza `ADR-009 — Proteção, backup e recuperação de dados`.

Baseline real na entrada dessa slice:

- `main`: `109961af5f07285c6dd61376768cb26f4eb5fd6b`;
- CI #402: success;
- PRs abertos antes da slice: nenhum;
- única Issue aberta: #75;
- Supabase `fhbvwyttikrbeaanatlr`: `ACTIVE_HEALTHY`, PostgreSQL 17, zero branches e migration final `20260822195823 / finance_attachments`;
- nenhuma migration/DDL/DML, usuário real, dado real, secret ou deploy foi alterado pela slice arquitetural.

## Decisão vigente da #75

A proteção possui três camadas:

1. backup automático de recuperação;
2. observabilidade `Proteção dos dados` dentro do produto;
3. exportação manual complementar.

Regras centrais:

- backup automático continua obrigatório;
- confirmação humana não prova backup;
- não bloquear a operação inteira por atraso de backup;
- destino off-site deve ser provider-neutral S3-compatible;
- Cloudflare R2 é o primeiro provider preferido, mas **não está autorizado/provisionado**;
- Google Drive/rclone e Gmail App Password deixam de ser requisitos arquiteturais;
- PostgreSQL e Storage têm coberturas distintas;
- `BACKUP_AUTOMATION_ENABLED` permanece desarmado até nova prova real.

Consultar obrigatoriamente:

- Issue #75;
- `docs/decisions/ADR-009-data-protection-architecture.md`;
- `docs/operations/backup-restore.md`.

## Objetivo ativo

**Após a integração do PR #107, reconciliar a automação existente para um contrato S3-compatible provider-neutral, sem provisionar serviço externo e sem executar backup Production real.**

Essa é a menor slice executável antes do próximo gate externo.

## Escopo da próxima slice

### 1. Reconciliar o workflow de backup

Partir de:

- `.github/workflows/production-backup.yml`;
- `scripts/export-supabase-backup.sh`.

Preservar:

- cron + `workflow_dispatch`;
- fail-closed por `BACKUP_AUTOMATION_ENABLED`;
- export roles/schema/data;
- archive;
- `SHA256SUMS` + `.sha256` externo;
- cleanup de temporários;
- `PRODUCTION_SUPABASE_DB_URL` server-side.

Substituir o acoplamento Drive/rclone por contrato S3-compatible:

- endpoint;
- bucket;
- access key id;
- secret access key;
- region quando exigida;
- prefixo/namespace de Production.

Todos os valores sensíveis ficam em GitHub Actions Secrets. Não usar `NEXT_PUBLIC_*`.

Não hardcodar R2 no exportador de banco. Provider-specific details ficam na camada de transporte/configuração.

### 2. Manifesto e evidência off-site

Além do archive/checksum, gerar manifesto seguro contendo no mínimo:

- `backup_id`;
- environment;
- timestamp UTC;
- versão/formato;
- cobertura (`postgres` nesta slice);
- SHA-256;
- tamanho;
- referência não sensível da execução/exportador.

Verificar o objeto remoto após upload antes de considerar sucesso.

Não criar persistência de status PostgreSQL nesta mesma slice; isso virá depois da automação reconciliada.

### 3. Retenção

A política continua 30 dias.

A arquitetura alvo prefere lifecycle + lock no bucket em vez de dar ao runner responsabilidade de deletar backups antigos.

Nesta slice:

- remover dependência da deleção via rclone;
- documentar a configuração de lifecycle/lock exigida para o provider;
- não configurar bucket real ainda.

### 4. Alertas

Remover `BACKUP_ALERT_GMAIL_APP_PASSWORD` da dependência obrigatória.

Implementar um sinal GitHub-native persistente e sem secret adicional, com comportamento idempotente para não abrir uma nova Issue a cada falha.

Não incluir connection string, bucket secret ou conteúdo de dump no alerta.

### 5. Restore drill

Adaptar `.github/workflows/backup-restore-drill.yml` para baixar/validar o archive mais recente pelo mesmo contrato S3-compatible.

Preservar:

- execução mensal;
- fail-closed;
- checksum externo/interno;
- PostgreSQL 17 isolado;
- nunca restaurar Production.

### 6. Testes e documentação

- atualizar testes/scripts afetados;
- validar YAML/scripts sem secrets reais;
- rodar CI completa;
- atualizar `docs/operations/backup-restore.md` somente se a implementação divergir do ADR;
- atualizar continuidade.

## Fora de escopo da próxima slice

Não fazer ainda:

- criar conta/bucket R2;
- habilitar billing/purchase de provider;
- criar secrets reais de object storage;
- setar `BACKUP_AUTOMATION_ENABLED=true`;
- executar backup Production real;
- migration/tabela de `data_protection_runs`;
- card `Proteção dos dados`;
- `/workspace/backup`;
- exportação manual;
- backup de Storage;
- restore hospedado de Production;
- deploy Vercel.

## Gate externo após a reconciliação

Quando o workflow provider-neutral estiver integrado e verde, o próximo gate será:

1. operador aprovar o provider concreto;
2. se houver billing/custo, obter autorização explícita antes de ativar;
3. criar bucket privado e configurar lifecycle/lock;
4. provisionar secrets fora do chat;
5. somente então armar e executar uma única prova real;
6. validar archive + manifesto/checksum off-site.

Depois do primeiro backup real comprovado, seguir para persistência autoritativa de status + UI.

## Segurança

- nunca pedir/receber secrets no chat;
- não ativar rclone/Gmail por inércia;
- não armazenar dump real em Git/GitHub Artifact;
- não restaurar Production para teste;
- não criar provider pago sem autorização;
- não declarar Storage protegido pelo dump PostgreSQL;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não misturar a reconciliação do transporte com UI/migration/exportação manual na mesma slice.

## Critério de conclusão do próximo chat

Terminar com:

- automação provider-neutral implementada e testada em CI sem secrets reais;
- restore drill reconciliado;
- Gmail/rclone removidos como dependências obrigatórias;
- `BACKUP_AUTOMATION_ENABLED` ainda desarmado;
- nenhum provider real provisionado;
- documentação/handoff apontando para o gate de aprovação/provisionamento externo.
