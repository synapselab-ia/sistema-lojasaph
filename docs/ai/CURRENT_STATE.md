# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 16 — backup automático, restauração testada e recuperação operacional — **implementada e tecnicamente validada; aguardando gate documental/merge do PR #42**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #41 — open até o merge
- PR #42 — draft
- branch: `agent/backup-restore`
- base da branch: `main` em `b3491e34558c78ce888180098c3dabb0236953c5`
- SHA técnico validado: `805274c9769323f3b6d9d3961c606d1c69ea922a`
- Fases 14 e 15 permanecem concluídas; não reaplicar migrations anteriores.

## Fase 16 — implementado

A entrega cobre `REQ-PLAT-005` no escopo executável sem operação destrutiva:

- estratégia em camadas para schema, backup de dados, recuperação gerenciada e contingência;
- runbook versionado em `docs/operations/backup-restore.md`;
- helper `scripts/export-supabase-backup.sh` para exportação lógica controlada com Supabase CLI;
- helper recusa gravar backup dentro do Git repository;
- arquivos de backup temporários usam permissões restritas e checksum SHA-256;
- `.gitignore` protege o diretório local `/backups/`;
- prova automatizada `scripts/verify-backup-restore.sh` integrada ao CI;
- dump PostgreSQL lógico em diretório efêmero;
- restore em banco limpo separado;
- `supabase/tests/backup_restore.sql` valida dados sintéticos, RLS e privilégios críticos;
- banco restaurado e artefatos temporários são destruídos ao final;
- RPO/RTO permanecem explicitamente pendentes; nenhuma meta de negócio foi inventada.

## Supabase atual — verificação não destrutiva

Projeto conectado:

- `synapselab-ia's Project`;
- região `sa-east-1`;
- PostgreSQL 17;
- status saudável durante a verificação;
- organização Supabase no plano `free`;
- nenhuma development branch Supabase existente.

A documentação oficial vigente foi conferida antes da implementação. No plano Free atual não há backup diário gerenciado/PITR disponível como nos planos pagos; a estratégia de contingência depende de exportação lógica periódica e armazenamento off-site aprovado até eventual mudança de plano.

Nenhum restore remoto, DDL ou migration nova foi executado nesta fase. O histórico remoto permanece terminando em:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

## Prova automatizada de recuperação

O CI sobe PostgreSQL 17 efêmero, aplica bootstrap + migrations + seed sintético, cria dump lógico e restaura em um segundo banco limpo.

Após restore, a suíte prova:

- fixtures centrais preservadas;
- saldo conhecido preservado;
- RLS ainda habilitada;
- `anon` sem leitura operacional indevida;
- `authenticated` sem INSERT direto no ledger;
- RPC transacional esperada continua executável;
- isolamento de Organization continua funcionando.

A primeira rodada do novo drill detectou cliente `pg_dump` 16 contra servidor 17. A segunda confirmou que o pacote 17 não existia no repositório Ubuntu padrão do runner. O CI foi então alinhado ao repositório oficial PGDG para instalar `postgresql-client-17` sem rebaixar o banco de teste.

## CI técnico da Fase 16

No SHA `805274c9769323f3b6d9d3961c606d1c69ea922a` passaram:

- `CI` #203 — success;
- `Inventory Count Integration` #122 — success;
- `Business Transactions Integration` #105 — success.

O `CI` validou:

- lint;
- typecheck;
- Vitest;
- build de produção;
- sintaxe dos helpers shell;
- migrations + seed;
- dump/checksum/restore PostgreSQL 17;
- checks pós-restore;
- todas as suítes PostgreSQL existentes.

## Limites que permanecem

- nenhum dump real foi criado/versionado;
- nenhuma planilha real foi importada;
- nenhum cutover foi executado;
- nenhum restore foi feito sobre o projeto Supabase ativo;
- Storage objects, Edge Functions, Auth settings/keys, Realtime e demais recursos de plataforma não devem ser tratados como cobertos automaticamente por um dump PostgreSQL;
- cadência real de backup, retenção, destino off-site, RPO e RTO dependem de decisão operacional antes de produção.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: exigir os três workflows verdes no SHA documental final da branch, atualizar o PR #42, marcar ready e fazer merge normal. Confirmar a Issue #41 como closed/completed e somente então escolher a próxima lacuna MUST real.