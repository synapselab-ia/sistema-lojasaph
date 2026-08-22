# Handoff — Sistema Lojasaph

## Estado

Fase 42 — `REQ-FIN-008 — Anexos` — está **concluída, homologada no boundary disponível e integrada na `main`**.

- `main` pós-Fase 42: `7f38ecedb2d4e8662ef0e2e8c01dda8b20dd0a84`;
- PR #93: squash-mergeado;
- head validado: `3885c15989c3787c627c9f0c2008e20466f63abc`;
- CI #369: success;
- Business Transactions Integration #176: success;
- Inventory Count Integration #192: success;
- Issue #92: closed/completed;
- única Issue aberta: #75;
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- migration hospedada: `20260822195823_finance_attachments`;
- nenhum deploy Vercel.

Não refazer Fase 41 nem Fase 42 por rotina. Ler `docs/qa/mvp-reconciliation.md` e `docs/modules/finance.md` antes de reabrir anexos.

## O que foi entregue em anexos

Primeira vertical slice vinculada a `payable_document`:

- tabela `finance_attachments` com metadata imutável;
- FK escopada por Organization/documento;
- RLS de leitura conforme `private.can_read_payable_document(...)`;
- direct INSERT/UPDATE/DELETE negado a `authenticated`;
- `anon` sem leitura/RPC;
- `can_upload_finance_attachment` e `register_finance_attachment` revalidam sessão, papel e escopo;
- audit trail no registro;
- PDF/XML/JPEG/PNG/WebP, limite 10 MiB e SHA-256;
- server-only Storage admin;
- browser sem secret/service role;
- path físico opaco por Organization/documento/anexo UUID;
- `upsert=false`;
- compensação do objeto se metadata falhar;
- download autenticado sem URL pública permanente;
- UI de listar/anexar/baixar em `/workspace/financeiro`;
- SQL tests, unit tests e client/server boundary no CI.

## Production / Storage

A migration foi aplicada depois de CI verde e o filename foi reconciliado para a versão realmente registrada pelo Supabase: `supabase/migrations/20260822195823_finance_attachments.sql`.

Homologação sintética em `BEGIN/ROLLBACK` confirmou preflight, registro, retry idempotente e audit único; a verificação posterior mostrou zero resíduo.

RLS/grants hospedados foram verificados. Security Advisor reporta os dois RPCs novos como `SECURITY DEFINER` executáveis por `authenticated`; é intencional, pois eles revalidam `auth.uid()`, papel e resource scope. Performance Advisor retornou apenas INFO de tuning de FKs/índices; não otimizar por lint sem evidência de carga.

O conector Supabase disponível não expõe criação/upload de Storage. Portanto:

- não foi criado bucket por SQL;
- não foi manipulado `storage.objects`;
- `storage.buckets` ainda não contém `finance-attachments`;
- o código server-only cria/configura o bucket privado de forma idempotente no primeiro upload autorizado.

Se no futuro houver erro no primeiro upload, verificar a Storage API/runtime e os logs; **não** criar tabelas/policies paralelas nem escrever no schema `storage` por SQL para contornar.

## Próxima frente de MVP

A Fase 41 deixou um único SHOULD explícito ainda sem implementação aparente: `REQ-EXPOR-001 — Exportação`.

Requisito:

- dados tabulares relevantes exportáveis em CSV/Excel;
- PDF somente quando fizer sentido para relatório/documento.

Escopo MVP: `exportação onde fizer sentido`.

A Fase 43 deve primeiro descobrir **qual superfície concreta** satisfaz melhor esse requisito. A regra de escopo exige processo real, usuário beneficiado e critério de aceite identificável. Não iniciar “exportar tudo”.

Ver `docs/ai/NEXT_ACTION.md`.

## Backup Production / #75

A Fase 38 permanece intacta; não refazer automação.

Política aprovada — não perguntar novamente:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- `.github/workflows/production-backup.yml`;
- `.github/workflows/backup-restore-drill.yml`;
- `PRODUCTION_SUPABASE_DB_URL` via Session pooler 5432.

Ainda pendente, deliberadamente para computador pessoal/confiável:

- OAuth Google Drive/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro run real de `Production Database Backup`;
- archive + `.sha256` confirmado no Drive;
- fechamento da #75.

## Não fazer

- não reabrir Fases 38–42 sem regressão concreta;
- não receber/publicar DB URL, OAuth token/config ou App Password;
- não ativar backup nem fechar #75 sem run real;
- não restaurar Production para teste;
- não manipular objetos/buckets de Storage por SQL;
- não criar bucket público;
- não expor secret/service key ao client;
- não iniciar exportação genérica/global;
- não implementar item `PENDING` por inferência;
- não criar deploy Vercel sem necessidade real;
- não importar dados reais/cutover.
