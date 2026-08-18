# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 16 — backup automático, restauração testada e recuperação operacional — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #42 — merged
- Issue #41 — closed/completed
- merge commit: `c1bd48e99f74687622c24a856f193bf47aa35d39`
- SHA final pré-merge: `efb4b2ca55bf650fa303c57025979f5f5c4d13f8`
- próxima Issue: #43 — `Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros`
- nenhuma branch funcional da Fase 17 foi criada ainda.

## Fase 16 — concluído

A entrega cobre `REQ-PLAT-005` no escopo executável sem operação destrutiva:

- estratégia em camadas para schema, backup de dados, recuperação gerenciada e contingência;
- runbook versionado em `docs/operations/backup-restore.md`;
- `scripts/export-supabase-backup.sh` para exportação lógica controlada com Supabase CLI;
- helper recusa gravar backup dentro do Git repository;
- checksum SHA-256 e permissões restritas para artefatos temporários;
- `/backups/` ignorado pelo Git;
- `scripts/verify-backup-restore.sh` integrado ao CI;
- dump lógico e restore em segundo PostgreSQL 17 efêmero;
- `supabase/tests/backup_restore.sql` valida dados sintéticos, RLS, grants e isolamento após restore;
- banco restaurado e artefatos temporários removidos automaticamente;
- RPO/RTO, retenção e destino off-site permanecem explicitamente pendentes, sem inferência.

## CI final da Fase 16

No SHA pré-merge `efb4b2ca55bf650fa303c57025979f5f5c4d13f8` passaram:

- `CI` #206 — success;
- `Inventory Count Integration` #125 — success;
- `Business Transactions Integration` #108 — success.

O `CI` validou lint, typecheck, Vitest, build, helpers shell, migrations/seed, dump/checksum/restore PostgreSQL 17, checks pós-restore e todas as suítes PostgreSQL existentes.

O drill comprovou no banco restaurado:

- fixtures centrais e saldo conhecido preservados;
- RLS habilitada;
- `anon` sem leitura operacional indevida;
- `authenticated` sem INSERT direto no ledger;
- RPC transacional pública esperada ainda executável;
- isolamento por Organization preservado.

## Supabase remoto

A Fase 16 não criou migration nem alterou DDL no remoto.

O projeto foi verificado de forma não destrutiva como saudável, PostgreSQL 17, na organização Supabase atualmente no plano Free e sem development branches Supabase.

O histórico remoto continua terminando nas migrations já homologadas da Fase 15:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Não reaplicar.

No plano Free atual, a estratégia de contingência depende de exportação lógica periódica e armazenamento off-site aprovado. Backup diário gerenciado/PITR dependem de plano/configuração compatíveis e devem ser reavaliados se o plano mudar.

## Limites que permanecem

- nenhum dump real foi criado/versionado;
- nenhuma planilha real foi importada;
- nenhum cutover foi executado;
- nenhum restore foi feito sobre o projeto Supabase ativo;
- dump PostgreSQL não cobre automaticamente Storage objects, Edge Functions, Auth settings/keys, Realtime e demais recursos de plataforma;
- frequência real de backup, retenção, destino off-site, RPO e RTO continuam pendentes de decisão operacional antes de produção.

## Próxima frente — Issue #43

Após o fechamento formal da Fase 16, os requisitos MUST e Issues reais foram revistos. Não havia outra Issue aberta.

A próxima lacuna executável é `REQ-PLAT-006 — Logs e erros`, MUST antes de produção. Busca no repositório não encontrou infraestrutura de logger estruturado, error tracking ou correlation ID.

A Issue #43 cobre observabilidade básica e rastreabilidade de erros sem assumir fornecedor externo pago: primeiro deve verificar as capacidades reais de Vercel/Supabase, depois estabelecer logging estruturado, redaction, correlation IDs, error boundaries e cobertura dos principais boundaries do runtime.

## Não repetir

- não reimplementar backup/restore da Fase 16;
- não executar restore destrutivo no Supabase ativo;
- não reaplicar migrations das Fases 14/15;
- não importar dados reais nem executar cutover;
- não inferir Q-001 a Q-025;
- não adotar fornecedor pago de observabilidade por inferência.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: iniciar a Issue #43 em branch própria a partir da `main`, verificar primeiro runtime/planos/logs atuais de Vercel e Supabase e implementar somente a fundação de observabilidade segura prevista na Issue.