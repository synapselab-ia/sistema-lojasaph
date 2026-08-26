# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua concluída e integrada.**  
A frente ativa agora é a revisão explícita de `REQ-PLAT-005` na Issue #75.

Em 2026-08-26 o operador mudou a prioridade da #75: não executar mais por inércia o plano “Google Drive/rclone + Gmail App Password + arming”. A Issue foi reescrita como **Proteção, backup e recuperação de dados**.

Isso desbloqueou o Gate 4 do `NEXT_ACTION` e justificou a slice arquitetural atual.

## Estado real na entrada

### GitHub

- `main`: `109961af5f07285c6dd61376768cb26f4eb5fd6b`;
- CI #402: success;
- PRs abertos na entrada: nenhum;
- única Issue aberta: #75;
- branches antigas sem PR aberto são históricas.

### Supabase

Production `fhbvwyttikrbeaanatlr` foi inspecionado read-only:

- `ACTIVE_HEALTHY`;
- `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration final `20260822195823 / finance_attachments`.

Nenhuma mutation foi feita.

## Slice atual

Branch:

- `agent/data-protection-architecture`

PR:

- #107 — `docs: formalize revised data protection architecture`

Arquivos centrais:

- `docs/decisions/ADR-009-data-protection-architecture.md`;
- `docs/operations/backup-restore.md`;
- docs de continuidade.

### Decisão consolidada

A proteção passa a ter três camadas:

1. **backup automático de recuperação** — obrigatório e independente de usuário;
2. **observabilidade no produto** — card/página `Proteção dos dados`, por Organization e baseado em evidência real;
3. **exportação manual complementar** — opcional, autorizada e auditada, nunca substituta do automático.

### Destino off-site

A arquitetura deixa de ser Drive-specific e passa a usar contrato **S3-compatible**.

Primeiro provider preferido: **Cloudflare R2**, por API S3-compatible, lifecycle, bucket lock e custo baixo/free tier documentado. A escolha é reversível para B2/S3/equivalente.

**Importante:** a decisão arquitetural não autoriza criar conta, habilitar billing/purchase, bucket ou secrets. A própria documentação atual da Cloudflare indica que R2 precisa ser habilitado/comprado antes de gerar API token. O provisionamento é gate do operador.

### Alertas

Gmail App Password deixa de ser dependência obrigatória.

Primeiro estágio alvo:

- GitHub Actions falha explicitamente;
- registro/Issue operacional persistente sem segredo;
- estado crítico dentro do produto quando o banco estiver disponível.

Um notifier externo pode ser plugado depois se houver necessidade e provider aprovado.

### Evidência de backup

Dois planos:

- **off-site:** archive + manifesto/checksum, independente do banco principal;
- **produto:** espelho sanitizado de runs no PostgreSQL para a UI.

Backup PostgreSQL é global por database/environment; não duplicar dump por Organization. Cada run deve registrar quais Organizations estavam cobertas.

### Storage/anexos

Supabase documenta que backup de banco não inclui objetos binários do Storage. Portanto os anexos de `REQ-FIN-008` precisam de trilha própria antes de qualquer afirmação de “backup completo”.

O status da UI deve declarar cobertura real.

### Política preservada

- RPO 24h;
- automático diário ou mais frequente;
- RTO objetivo <=4h;
- retenção 30 dias;
- restore drill mensal isolado;
- nunca restaurar Production para teste;
- não bloquear automaticamente operação do negócio por atraso de backup.

## Automação antiga

Já existem:

- `scripts/export-supabase-backup.sh`;
- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- archive/checksum;
- rclone/Drive;
- Gmail notifier;
- `PRODUCTION_SUPABASE_DB_URL` provisionado.

Essa implementação é **baseline técnica**, não a arquitetura final.

`BACKUP_AUTOMATION_ENABLED` deve permanecer false/desarmado. Não provisionar OAuth/rclone/Gmail para satisfazer o fluxo antigo.

## Próxima ação exata após #107

Abrir/usar uma única slice de engenharia para:

> Reconciliar o workflow de backup e restore drill para um contrato S3-compatible provider-neutral, removendo rclone/Gmail da dependência obrigatória, sem provisionar provider externo e mantendo a automação fail-closed.

Escopo esperado:

- preservar `scripts/export-supabase-backup.sh` e SHA-256;
- trocar configuração Drive-specific por variáveis S3-compatible (`endpoint`, bucket, access key/secret/region quando aplicável), todas server-side/secrets;
- manter archive + manifesto/checksum;
- verificação pós-upload;
- preparar lifecycle/lock como configuração operacional do provider, não deleção arbitrária do runner;
- substituir Gmail por sinal persistente GitHub-native sem segredo adicional;
- adaptar restore drill para baixar do mesmo contrato S3-compatible;
- testes/CI;
- manter `BACKUP_AUTOMATION_ENABLED=false`;
- não executar backup Production real nesta slice.

Depois dessa reconciliação, o próximo gate externo será aprovar/provisionar o provider real e então provar o primeiro backup off-site.

## Não fazer

- não voltar ao checklist antigo de rclone/Gmail;
- não ativar o workflow legado;
- não provisionar serviço com cobrança/billing sem autorização;
- não pedir secrets no chat;
- não criar migration de status/UI nesta mesma slice de reconciliação;
- não criar UI antes da persistência autoritativa;
- não declarar Storage protegido pelo dump;
- não restaurar Production para teste;
- não criar deploy Vercel para docs/workflow de backup sem necessidade de runtime web.
