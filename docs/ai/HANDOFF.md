# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua concluída e integrada.**  
A frente ativa continua sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Os PRs #107, #108 e #109 já estão integrados. A arquitetura S3-compatible foi implementada, Cloudflare R2 foi provisionado/configurado pelo operador e o primeiro backup PostgreSQL Production real foi executado com sucesso e validado off-site.

## Estado vivo no encerramento desta sessão

### GitHub

- `main` antes deste handoff documental: `1f9e6b8a26640d2ac5f7ead31a6c9a11962017b6`;
- PR #108 integrado: transporte S3-compatible provider-neutral;
- PR #109 integrado: hard stop pré-upload em `300000000` bytes;
- CI #416: success após o repositório ser tornado temporariamente público;
- repositório atualmente `public` por decisão temporária para evitar bloqueio de minutos privados do GitHub Free;
- Issue #75: aberta;
- Issue #111: incidente automático de backup, resolvido e fechado automaticamente após a recuperação verde.

Ao iniciar o próximo chat, conferir `main`, Issues, PRs e CI reais. Não refazer provider/configuração de backup já concluídos.

### Supabase

Production `fhbvwyttikrbeaanatlr`:

- região `sa-east-1`;
- PostgreSQL 17;
- migration final conhecida: `20260822195823 / finance_attachments`;
- nenhuma migration/DDL/DML nesta etapa de ativação;
- Session pooler 5432 comprovado funcionando pelo backup real.

### R2 / GitHub Actions

Operador concluiu manualmente:

- bucket `lojasaph-production-backups`;
- acesso privado;
- prefixo `production/postgres`;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- token R2 `Object Read & Write` limitado ao bucket;
- Secrets `BACKUP_S3_ACCESS_KEY_ID` e `BACKUP_S3_SECRET_ACCESS_KEY`;
- Variables `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION=auto`, `BACKUP_S3_PREFIX=production/postgres`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- `PRODUCTION_SUPABASE_DB_URL` atualizado e comprovado funcional.

Nunca pedir ao usuário para colar secrets/connection string no chat.

## Primeira prova real — concluída

Workflow `Production Database Backup`:

- run: `33006253661`;
- URL: `https://github.com/synapselab-ia/sistema-lojasaph/actions/runs/33006253661`;
- conclusão: `success`;
- archive: `lojasaph-production-20260826T194047Z-33006253661.tar.gz`;
- tamanho: `53185` bytes;
- hard cap: `300000000` bytes;
- roles/schema/data: exportados;
- checksums internos: OK;
- manifesto: OK;
- upload R2: OK;
- `HeadObject`/download/rehash remoto: OK;
- cleanup do runner: OK;
- Issue #111 fechada automaticamente por recuperação.

As tentativas anteriores falharam antes do upload por connection string e não são backups válidos.

## Warning para a futura restauração

Durante `data.sql`, `pg_dump` reportou constraints circulares em:

- `stock_movements`;
- `payments`.

O backup é válido como artefato/export off-site, mas o restore real isolado precisa tratar/validar esse ponto. Não declarar restaurabilidade end-to-end completa ainda.

## O que está comprovado

- backup automático diário + dispatch manual;
- PostgreSQL logical backup;
- checksums + manifesto;
- hard cap pré-upload de 300 MB decimal;
- Cloudflare R2 off-site;
- verificação remota por re-download/rehash;
- lifecycle/lock configurados pelo operador;
- incidente GitHub-native persistente e auto-resolve;
- credenciais fora do repositório.

## O que ainda falta na #75

1. persistência autoritativa de runs de proteção no PostgreSQL;
2. relação run global ↔ Organizations cobertas + RLS;
3. mutation server-side autorizada para registrar estado sanitizado;
4. UI `Proteção dos dados` (`RuntimeShell` + `/workspace/backup`);
5. backup dos binários do Supabase Storage/anexos;
6. restore real do backup Production em ambiente isolado compatível;
7. exportação manual complementar por Organization, se mantida;
8. evidência final suficiente para fechar #75;
9. retorno do repositório a `private` quando o operador decidir encerrar a fase temporária de CI público.

## Próxima slice exata

**Persistência autoritativa de proteção no PostgreSQL.**

Não pular direto para UI.

O próximo chat deve:

1. ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, Issue #75, ADR-009 e runbook;
2. conferir GitHub/CI/Supabase reais;
3. usar o workflow Issue → branch → PR;
4. pesquisar documentação Supabase atual antes de qualquer migration/RLS;
5. modelar a menor estrutura capaz de registrar run global e Organizations cobertas;
6. manter dados sensíveis fora da tabela e de logs;
7. implementar migration + RLS + testes;
8. provar acesso cross-Organization negado e leitura autorizada permitida;
9. integrar somente com CI verde;
10. atualizar este handoff ao encerrar.

A UI vem na slice seguinte, consumindo essa fonte autoritativa.

## Restrições importantes

- não reprovisionar R2 nem recriar tokens/secrets sem motivo concreto;
- não pedir secrets no chat;
- não manipular `storage.*` por SQL para resolver backup de arquivos;
- não declarar Storage/anexos cobertos pelo dump PostgreSQL;
- não restaurar Production para teste;
- não voltar a Drive/rclone/Gmail;
- não remover/reduzir o hard cap de 300 MB;
- não criar deploy Vercel desnecessário;
- não reabrir Fases 41–45 sem regressão concreta;
- não criar dashboards/BI especulativos fora da prioridade ativa.
