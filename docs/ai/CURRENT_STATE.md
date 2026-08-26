# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

O backup automático off-site do PostgreSQL Production está agora **operacional e comprovado por execução real**. A infraestrutura usa Cloudflare R2 por um contrato S3-compatible provider-neutral e continua protegida pelo limite rígido de 300.000.000 bytes por archive antes do upload.

O núcleo funcional das Fases 41–45 não foi reaberto.

## GitHub / baseline real

- `main` antes deste handoff documental: `1f9e6b8a26640d2ac5f7ead31a6c9a11962017b6`;
- PR #108 foi integrado em `30000d3780d06d1df83bc673268b324df95861d4`;
- PR #109 foi integrado em `1f9e6b8a26640d2ac5f7ead31a6c9a11962017b6` e adicionou o limite rígido de 300 MB decimal;
- CI #416 voltou a concluir com sucesso depois que o repositório foi tornado temporariamente público;
- repositório está **public** por decisão operacional temporária para evitar bloqueio por minutos de Actions da conta Free; voltar para `private` quando esta fase intensiva de CI terminar;
- Issue #75 continua aberta porque Storage, persistência autoritativa, UI e restore real ainda não estão concluídos;
- Issue operacional #111 foi aberta automaticamente após falhas de backup e fechada automaticamente após a recuperação verde.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- região `sa-east-1`;
- PostgreSQL 17;
- migration history continua terminando em `20260822195823 / finance_attachments`;
- nenhuma migration/DDL/DML foi executada nesta etapa de ativação;
- `PRODUCTION_SUPABASE_DB_URL` usa o Session pooler na porta 5432 e foi revalidado por uma execução real de backup.

## R2 / configuração operacional

Cloudflare R2 foi explicitamente autorizado e provisionado pelo operador.

Configuração atual declarada pelo operador e comprovada pelo workflow:

- bucket privado: `lojasaph-production-backups`;
- prefixo: `production/postgres`;
- region: `auto`;
- endpoint S3-compatible configurado em GitHub Actions Variable;
- lifecycle de 30 dias configurado;
- Bucket Lock de 30 dias configurado para o prefixo de Production;
- token R2 com `Object Read & Write` limitado ao bucket;
- `BACKUP_S3_ACCESS_KEY_ID` e `BACKUP_S3_SECRET_ACCESS_KEY` salvos em GitHub Actions Secrets;
- `BACKUP_AUTOMATION_ENABLED=true`;
- nenhum secret deve ser reproduzido em documentação, Issue ou chat.

## Primeiro backup PostgreSQL real comprovado

Execução manual aprovada e concluída em 2026-08-26:

- workflow: `Production Database Backup`;
- run id: `33006253661`;
- run URL: `https://github.com/synapselab-ia/sistema-lojasaph/actions/runs/33006253661`;
- conclusão: `success`;
- exportou `roles.sql`, `schema.sql` e `data.sql`;
- checksums internos: OK;
- archive: `lojasaph-production-20260826T194047Z-33006253661.tar.gz`;
- tamanho do archive: `53185` bytes;
- limite rígido: `300000000` bytes;
- manifesto local: verificado;
- upload off-site: concluído;
- objetos remotos: confirmados e baixados novamente;
- SHA-256 pós-upload: revalidado com sucesso;
- material temporário local do runner: removido;
- incidente #111: resolvido/fechado automaticamente após a execução verde.

As duas tentativas anteriores falharam antes do upload por configuração da connection string e não produziram backup off-site válido. Não tratá-las como regressão da implementação.

## Warning relevante para restore

O `pg_dump` avisou sobre constraints circulares nas tabelas:

- `stock_movements`;
- `payments`.

O backup foi concluído e validado, mas esse warning deve ser explicitamente considerado quando a trilha de restore real isolado for executada. Não assumir restaurabilidade completa apenas porque o dump/upload passou.

## Cobertura atual

### Comprovado

- backup automático lógico do PostgreSQL Production;
- archive + sidecars/manifest;
- limite pré-upload de 300 MB;
- transporte off-site para R2;
- re-download/rehash remoto;
- retenção/lock configurados pelo operador;
- incidente persistente GitHub-native em falha e resolução automática em recuperação.

### Ainda não comprovado/concluído

- persistência autoritativa dos runs de proteção no PostgreSQL;
- card/página `Proteção dos dados`;
- backup dos binários do Supabase Storage/anexos;
- restore real do bundle Production em ambiente isolado Supabase/PostgreSQL compatível;
- exportação manual complementar por Organization;
- cobertura completa de plataforma/configurações externas ao dump;
- retorno do repositório para `private`.

## Próxima ação exata

**Abrir a menor slice de engenharia para persistência autoritativa de proteção no PostgreSQL, antes da UI.**

A slice deve:

1. reler Issue #75, ADR-009, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md` e `docs/operations/backup-restore.md`;
2. conferir estado real de GitHub/CI/Supabase;
3. abrir Issue/branch/PR conforme o workflow do projeto se necessário dentro da #75;
4. modelar runs globais de proteção + Organizations cobertas;
5. criar migration versionada;
6. aplicar RLS/leitura por Organization;
7. restringir mutation ao processo server-side autorizado;
8. manter erro/status sanitizados e sem secrets;
9. validar migrations, RLS, testes, lint, typecheck e build;
10. só depois iniciar a UI `Proteção dos dados`.

Ver `docs/ai/NEXT_ACTION.md` para o escopo detalhado.

## Não fazer

- não reprovisionar R2, bucket, lifecycle, lock, token ou GitHub Secrets já concluídos sem evidência de problema;
- não pedir/receber secrets no chat;
- não declarar Storage/anexos cobertos pelo backup PostgreSQL;
- não restaurar Production para teste;
- não pular direto para a UI antes da fonte autoritativa no banco;
- não criar deploy Vercel para mudanças apenas de workflow/docs/backend sem necessidade real;
- não voltar ao fluxo Drive/rclone/Gmail;
- não desfazer o limite rígido de 300 MB;
- não retornar o repositório para private até o operador decidir encerrar a fase temporária de CI público.
