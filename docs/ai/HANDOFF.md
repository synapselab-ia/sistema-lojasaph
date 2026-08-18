# Handoff — Sistema Lojasaph

## Estado

Fase 16 — backup automático, restauração testada e recuperação operacional — **implementada e tecnicamente validada; PR #42 deve ser fechado corretamente**.

- Issue #41 — open até o merge;
- PR #42 — draft;
- branch: `agent/backup-restore`;
- base: `main` em `b3491e34558c78ce888180098c3dabb0236953c5`;
- SHA técnico final verde antes dos commits documentais: `805274c9769323f3b6d9d3961c606d1c69ea922a`;
- nenhuma migration/DDL da Fase 16 foi necessária no Supabase;
- nenhum restore remoto foi executado.

## O que já está concluído

- capacidade atual do Supabase verificada contra documentação oficial;
- projeto remoto saudável em PostgreSQL 17;
- organização Supabase atualmente no plano Free;
- nenhuma development branch Supabase existente;
- estratégia de backup/restauração documentada em `docs/operations/backup-restore.md`;
- migrations continuam fonte de verdade do schema, separadas de backup de dados;
- `scripts/export-supabase-backup.sh` implementa exportação lógica controlada com Supabase CLI;
- helper de exportação exige connection string via secret/runtime e diretório fora do repositório;
- checksum SHA-256 e permissões restritas para artefatos temporários;
- `/backups/` ignorado pelo Git;
- `scripts/verify-backup-restore.sh` executa dump/restore efêmero;
- `supabase/tests/backup_restore.sql` valida dados, RLS, grants e isolamento após restore;
- CI usa PostgreSQL 17 e cliente 17 do repositório oficial PGDG;
- RPO/RTO continuam PENDING, sem inferência.

## Prova de recuperação

No CI, o fluxo executado é:

1. bootstrap Supabase sintético;
2. aplicação de todas as migrations;
3. seed anonimizado;
4. `pg_dump` lógico em diretório temporário;
5. geração/verificação SHA-256;
6. criação de segundo banco limpo;
7. `pg_restore`;
8. checks pós-restore de dados, RLS, privilégios e Organization isolation;
9. remoção automática do banco restaurado e arquivos temporários.

A primeira tentativa detectou incompatibilidade `pg_dump 16` → PostgreSQL 17. A tentativa seguinte mostrou ausência do pacote 17 no APT padrão do runner. A solução final usa o repositório oficial PGDG e mantém servidor/cliente na major 17.

## CI técnico verde

No SHA `805274c9769323f3b6d9d3961c606d1c69ea922a`:

- `CI` #203 — success;
- `Inventory Count Integration` #122 — success;
- `Business Transactions Integration` #105 — success.

O job de banco passou inclusive por `Verify logical backup and isolated restore` e por todas as suítes PostgreSQL existentes.

## Supabase remoto

Nenhuma alteração estrutural foi feita nesta fase. O histórico remoto permanece terminando em:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Não reaplicar migrations anteriores.

### Capacidade atual

No plano Free atual, a camada de recuperação disponível para esta estratégia é exportação lógica periódica/off-site. Backup diário gerenciado e PITR dependem de plano pago/configuração e devem ser reavaliados antes de produção se o plano mudar.

## Próxima ação exata

1. conferir o head documental atual de `agent/backup-restore` e o PR #42;
2. confirmar `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes no SHA documental final;
3. atualizar o corpo do PR #42 com:
   - SHA final validado;
   - CI final;
   - resultado do drill de restore;
   - plano Supabase atual e limitações;
   - confirmação de zero operação destrutiva/remota;
   - RPO/RTO ainda pendentes;
4. marcar o PR #42 ready for review;
5. fazer merge normal em `main`;
6. confirmar Issue #41 como closed/completed; fechar explicitamente se necessário;
7. somente depois, revisar requisitos MUST/Issues reais e escolher a próxima frente;
8. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` para o estado pós-merge.

## Não fazer

- não restaurar sobre o Supabase remoto ativo;
- não criar/versionar dump real;
- não colocar connection string/secret em workflow ou docs;
- não inventar RPO/RTO, retenção ou destino off-site;
- não misturar observabilidade completa (`REQ-PLAT-006`) nesta entrega;
- não importar dados reais/cutover;
- não reaplicar migrations das Fases 14/15.
