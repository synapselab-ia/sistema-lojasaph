# Next Action — Sistema Lojasaph

## Contexto

A Fase 46 continua integrada e o núcleo funcional do MVP permanece reconciliado.

A Issue #75 agora representa `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices executadas/ativas:

1. PR #107 — ADR-009 / arquitetura revisada;
2. PR #108 — reconciliação do transporte S3-compatible provider-neutral.

O PR #108 deve ser integrado somente com CI verde. Ao iniciar uma nova sessão, verificar o estado real do PR #108 e da `main`; não presumir merge a partir deste arquivo e não criar um PR documental apenas para atualizar o SHA gerado pelo próprio merge.

## Estado que o PR #108 entrega

Quando integrado, a automação estará tecnicamente pronta para um provider S3-compatible, porém **continuará desarmada e sem infraestrutura externa real**.

Implementado:

- backup diário + `workflow_dispatch` fail-closed;
- restore drill mensal isolado;
- export roles/schema/data preservado;
- bundle com archive, checksum, manifesto v1 e checksum do manifesto;
- transporte S3-compatible;
- verificação pós-upload por `HeadObject` + re-download/rehash SHA-256;
- retenção deslocada para lifecycle/lock do provider;
- alerta GitHub-native idempotente sem Gmail App Password;
- rclone/Google Drive removidos da automação executável;
- CI valida novos helpers e proíbe regressão para dependências legadas.

Ainda não existe:

- bucket/provider real;
- credentials S3 reais;
- backup Production comprovado off-site;
- persistência PostgreSQL de runs;
- UI `Proteção dos dados`;
- backup dos objetos do Supabase Storage;
- exportação manual complementar.

## Objetivo ativo após integração verde do PR #108

**Aguardar/desbloquear o gate operacional para aprovar e provisionar um provider S3-compatible real. Não iniciar outra slice de código da #75 por inércia antes desse gate.**

Cloudflare R2 é a primeira opção preferida registrada em ADR-009, mas é reversível para B2, AWS S3 ou equivalente que cumpra os controles.

## Gate — provider off-site real

Considerar desbloqueado somente quando o operador autorizar explicitamente prosseguir com o provider concreto e, quando aplicável, com cadastro/subscription/billing/custo.

### 1. Antes de provisionar

- reler `docs/decisions/ADR-009-data-protection-architecture.md`;
- reler `docs/operations/backup-restore.md`;
- verificar documentação e preço atuais do provider;
- confirmar que o provider oferece API S3-compatible, bucket privado e retenção/lifecycle adequados;
- confirmar suporte a lock/WORM quando possível;
- não assumir que free tier elimina necessidade de subscription/billing.

### 2. Provisionar infraestrutura somente após autorização

Criar/configurar:

- bucket privado dedicado a Production;
- nenhum public access;
- nenhum CORS de navegador desnecessário;
- namespace/prefixo de Production;
- lifecycle de expiração compatível com retenção 30 dias;
- lock/WORM coerente com a janela de retenção quando suportado;
- credencial de menor privilégio suficiente para upload, listagem, head e download necessários ao backup/drill.

Não dar ao runner permissão de administração de conta/billing e evitar permissão de delete quando o desenho de lifecycle/lock permitir.

### 3. Provisionar configuração no GitHub fora do chat

Variables:

- `BACKUP_S3_ENDPOINT`;
- `BACKUP_S3_BUCKET`;
- `BACKUP_S3_REGION` quando necessário (`auto` é default atual compatível com R2);
- `BACKUP_S3_PREFIX` quando diferente de `production/postgres`.

Secrets:

- `BACKUP_S3_ACCESS_KEY_ID`;
- `BACKUP_S3_SECRET_ACCESS_KEY`;
- `BACKUP_S3_SESSION_TOKEN` somente se o provider/credencial exigir.

Já existente:

- `PRODUCTION_SUPABASE_DB_URL`.

**Nunca pedir, receber ou reproduzir os valores dos secrets no chat/Issue/PR.**

### 4. Armar somente depois da configuração completa

Após bucket, lifecycle/lock e credenciais terem sido verificados:

- definir `BACKUP_AUTOMATION_ENABLED=true`;
- executar **uma única** prova manual de `Production Database Backup` via `workflow_dispatch`.

Não restaurar Production.

### 5. Critério da primeira prova real

Exigir:

- workflow verde;
- archive off-site;
- `.sha256` do archive;
- manifesto `.manifest.json`;
- `.sha256` do manifesto;
- verificação remota do conteúdo concluída;
- nenhuma credencial/conteúdo de backup em logs;
- lifecycle/lock configurado conforme política;
- evidência não sensível registrada na #75.

Se falhar, não mascarar o erro e não fechar #75. O incidente GitHub-native deve registrar somente informação sanitizada.

## Próxima slice somente depois do primeiro backup real

Depois de um backup PostgreSQL Production real comprovado, abrir a menor slice para **persistência autoritativa de proteção no PostgreSQL**:

- modelar runs globais e Organizations cobertas;
- migration versionada;
- RLS/leitura por Organization;
- mutation restrita ao processo server-side autorizado;
- histórico sanitizado para futura UI.

Somente depois dessa persistência implementar card `Proteção dos dados` e `/workspace/backup`.

A trilha de Supabase Storage/anexos permanece separada e obrigatória antes de declarar cobertura completa.

## Se o gate externo não estiver desbloqueado

Não alterar código, Supabase, Vercel, dados ou configuração operacional para produzir atividade.

A resposta correta é preservar a baseline e informar que a próxima ação depende da aprovação/provisionamento do provider.

## Segurança / não fazer

- não voltar a rclone/Drive/Gmail;
- não pedir/receber secrets no chat;
- não criar provider com billing/custo sem autorização explícita;
- não setar `BACKUP_AUTOMATION_ENABLED=true` antes de toda a configuração estar pronta;
- não armazenar dump real no Git ou GitHub Artifact;
- não restaurar Production para teste;
- não criar migration/UI/exportação manual antes do gate real por conveniência;
- não declarar Storage protegido pelo dump PostgreSQL;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não criar deploy Vercel para esta frente de workflow/docs.

## Critério de conclusão do próximo chat

Terminar em um destes estados:

1. provider explicitamente aprovado/provisionado + primeira prova real executada e evidenciada com segurança; ou
2. gate externo ainda bloqueado, baseline preservada e nenhuma atividade artificial criada.
