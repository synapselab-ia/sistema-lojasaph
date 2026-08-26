# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 — prontidão operacional — continua integrada.**  
**Frente ativa pós-Fase 46: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

O núcleo funcional do MVP das Fases 41–45 continua reconciliado. A nova frente não surgiu por inércia: em 2026-08-26 o operador revisou explicitamente a filosofia da #75, desbloqueando o Gate 4 de `NEXT_ACTION`.

A Issue #75 deixou de significar “provisionar rclone/Gmail e ativar o workflow existente”. Ela agora exige três camadas complementares:

1. backup automático real de recuperação;
2. observabilidade “Proteção dos dados” dentro do Lojasaph;
3. exportação manual complementar, sem substituir o automático.

## Entrada real desta slice

### GitHub

- `main` na entrada: `109961af5f07285c6dd61376768cb26f4eb5fd6b`;
- CI da `main`: #402 — success;
- PRs abertos na entrada: nenhum;
- única Issue aberta: #75, já com requisito revisado;
- branches `agent/*` antigas sem PR continuam históricas.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr` inspecionado read-only:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history continua terminando em `20260822195823 / finance_attachments`.

Nenhuma migration, DDL ou DML foi executada nesta slice.

### CI/infra

A arquitetura desta slice não exige deploy Vercel nem mutação de Production. `BACKUP_AUTOMATION_ENABLED` deve permanecer desarmado.

## Slice atual — arquitetura revisada da proteção

Branch:

- `agent/data-protection-architecture`

PR:

- #107 — `docs: formalize revised data protection architecture`

Documentos principais:

- `docs/decisions/ADR-009-data-protection-architecture.md`;
- `docs/operations/backup-restore.md`.

### Decisões formalizadas

#### Backup automático permanece obrigatório

O backup automático continua sendo a linha principal de disaster recovery:

- sem clique diário;
- dentro de RPO 24h;
- off-site;
- checksum/integridade;
- retenção 30 dias;
- restore drill mensal isolado.

A confirmação humana nunca equivale a backup válido.

#### Destino provider-neutral

A arquitetura alvo deixa de depender de Google Drive/rclone e passa a usar contrato **S3-compatible**.

Cloudflare R2 é a primeira implementação preferida porque a documentação atual oferece API S3-compatible, lifecycle, bucket locks e free tier em Standard. Entretanto esta decisão **não autoriza** cadastro financeiro, purchase/billing, bucket ou secrets. Se R2 não for aprovado, B2/S3/outro destino compatível pode substituí-lo sem alterar o contrato.

#### Gmail deixa de ser requisito estrutural

`BACKUP_ALERT_GMAIL_APP_PASSWORD` não faz parte da arquitetura alvo. O primeiro mecanismo de escalonamento deve usar sinais persistentes do GitHub + estado crítico do produto; adapters externos de notificação podem ser adicionados depois.

#### Evidência autoritativa em dois planos

- archive + manifesto/checksum no storage off-site = evidência independente de recuperação;
- espelho sanitizado de runs no PostgreSQL = fonte da UI por Organization.

O backup PostgreSQL é global por database/environment. Não duplicar fisicamente o mesmo dump para cada Organization. A UI associa Organizations incluídas a cada run.

#### UI futura

Planejada para slice posterior:

- card global `Proteção dos dados` no `RuntimeShell`;
- `/workspace/backup`;
- verde/âmbar/vermelho;
- última cópia válida, integridade, retenção, histórico e restore drill.

Não bloquear automaticamente caixa/estoque/compras/financeiro porque o RPO foi violado.

#### Storage/anexos

Foi confirmado na documentação atual do Supabase que backup de banco não inclui objetos binários do Storage. `REQ-FIN-008` já possui anexos; portanto PostgreSQL protegido não pode ser descrito como “backup completo” dos arquivos.

Antes de declarar cobertura completa será necessária uma trilha própria de cópia/reconciliação/restore de Storage.

## O que não foi feito

- nenhum código runtime alterado;
- nenhum workflow reconciliado ainda;
- nenhum provider externo provisionado;
- nenhum secret novo;
- nenhum OAuth/rclone/Gmail configurado;
- nenhum backup Production real executado;
- nenhuma migration/DDL/DML;
- nenhum usuário/dado real alterado;
- nenhum deploy Vercel.

## Próxima ação

Depois da integração do PR #107, a menor slice técnica da #75 é:

**reconciliar a automação existente para um contrato S3-compatible provider-neutral, removendo rclone/Gmail da dependência obrigatória, mantendo fail-closed e sem provisionar storage externo.**

Essa slice deve reutilizar o exportador lógico e os checksums existentes, preservar RPO/RTO/retenção e adaptar testes/CI. Não ativar `BACKUP_AUTOMATION_ENABLED`.

A aprovação/provisionamento do destino externo continua um gate separado porque pode exigir cadastro/billing e secrets fora do chat.

## Não fazer

- não voltar ao plano antigo de “só configurar rclone/Gmail”;
- não armar o workflow Drive/rclone atual;
- não provisionar R2/B2/S3 ou qualquer serviço com custo/billing sem autorização;
- não pedir/receber secrets no chat;
- não declarar Storage coberto pelo dump PostgreSQL;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não implementar UI/status/export manual antes da reconciliação da automação salvo regressão/prioridade explícita;
- não criar deploy Vercel apenas por documentação/arquitetura.
