# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A trilha PostgreSQL de disaster recovery está comprovada end-to-end e não deve ser refeita sem regressão concreta:

1. ADR-009 / arquitetura de proteção;
2. Cloudflare R2 privado + lifecycle/lock de 30 dias;
3. backup lógico PostgreSQL Production off-site;
4. hard cap de `300000000` bytes por archive;
5. primeira prova real off-site (`33006253661`);
6. persistência autoritativa `protection_runs` + Organizations + RLS;
7. UI read-only `Proteção dos dados`;
8. restore do bundle PostgreSQL Production real em Supabase/PostgreSQL 17 isolado;
9. persistência autoritativa de `restore_drill` e recuperação automática da Issue #110.

A frente técnica atual é a **Issue #121 — backup e recuperação off-site do Supabase Storage**.

## GitHub / baseline viva de entrada

- `main` antes desta slice: `9794210a9d1b4dbd8fca01dd8ef0e6318a9e278e` — `docs(backup): close PostgreSQL restore slice (#120)`;
- CI de `main` `33070390747`: verde (`database` + `validate`);
- nenhum PR estava aberto no início do inventário Storage;
- Issue #75 aberta;
- Issue #121 aberta após o inventário/desenho;
- Issue #110 fechada automaticamente pelo restore drill verde;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

## Prova PostgreSQL encerrada

`Backup Restore Drill / 33069706382` restaurou o archive Production real criado em `2026-08-26T19:40:47Z` (`53185` bytes) em destino local isolado e terminou `success`.

A evidência autoritativa em Production permanece:

- `protection_type=restore_drill`;
- `status=succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization mapeada.

As tentativas anteriores `33014974208` e `33018829402` permanecem preservadas como `failed`. Não backfillar o backup histórico `33006253661`.

## Inventário real de Supabase Storage — 2026-08-27

### Código

O uso físico de Supabase Storage está hoje restrito à vertical de anexos financeiros:

- `src/lib/finance/attachment-policy.ts`;
- `src/lib/finance/attachment-upload.ts`;
- `src/lib/finance/attachment-server.ts`;
- routes `/api/finance/attachments`;
- `public.finance_attachments` / migration `20260822195823_finance_attachments`;
- testes unitários e `supabase/tests/finance_attachments.sql`.

Contrato atual:

- bucket canônico `finance-attachments`;
- privado e provisionado idempotentemente pela Storage API no primeiro upload autorizado;
- limite de 10 MiB por objeto;
- PDF/XML/JPEG/PNG/WebP;
- key `<organization_uuid>/<payable_document_uuid>/<attachment_uuid>`;
- `upsert=false`;
- SHA-256 calculado antes do upload e persistido em `finance_attachments.checksum_sha256`;
- objeto físico é enviado antes do registro da metadata PostgreSQL;
- falha do registro tenta remover o objeto como compensação;
- upload/download físico usa admin client somente no trusted server;
- autorização do usuário é feita antes pela sessão/RPC/RLS de negócio;
- browser não recebe secret key, signed URL ou URL pública permanente;
- não existe fluxo funcional de exclusão de anexo nesta versão.

### Production

Projeto `fhbvwyttikrbeaanatlr`, introspecção somente read-only:

- Organizations: **1**;
- `storage.buckets`: **0**;
- objetos Storage ativos: **0**;
- `public.finance_attachments`: **0**;
- bytes declarados em anexos: **0**;
- policies customizadas em `storage.objects`/`storage.buckets`: **0**.

O estado vazio é legítimo: o bucket físico só nasce no primeiro upload autorizado. Não criar bucket/objeto sintético em Production para fabricar prova.

## Arquitetura da Issue #121

A #121 registra o contrato da próxima implementação:

- fonte: Supabase Storage Production;
- destino: reutilizar o R2 privado existente em namespace separado `production/storage/...`;
- preferir credencial S3 dedicada ao Supabase Storage para o workflow, server-only e separada de `SUPABASE_SECRET_KEY` da aplicação;
- allowlist inicial: somente `finance-attachments`; bucket Files inesperado deve falhar fechado até ser classificado;
- snapshot completo diário inicialmente, pois o volume real é zero e cada objeto do produto tem no máximo 10 MiB;
- prefixo imutável por run;
- manifesto `lojasaph-storage-backup-v1` com bucket/key/tamanho/SHA-256 e referências UUID necessárias à reconciliação;
- SHA-256 calculado no stream da fonte deve bater com `finance_attachments.checksum_sha256`;
- objeto R2 deve ser rebaixado/re-hasheado antes de `integrity_verified=true`;
- guardrails Storage próprios e configuráveis; não reutilizar cegamente o cap PostgreSQL de 300 MB;
- `automatic_storage` / `coverage=storage` reutilizam o boundary `protection_runs` existente;
- restore usa APIs Storage/S3 em Supabase isolado, nunca DML em `storage.*`;
- drill detecta missing/extra/corrupt e registra `restore_drill coverage=storage` somente após prova suficiente;
- UI continua declarando Storage/anexos não cobertos até haver backup real + restore real de pelo menos um objeto Production.

## Próximo trabalho

Implementar a #121 em branch/PR própria, começando por tooling de inventário/manifesto e CI local sem secrets de Production. Só armar Production depois de confirmar os gates de credencial S3 da fonte, lifecycle/lock do namespace R2 e limites Storage explícitos.

Como Production está vazia, um snapshot vazio pode validar automação/inventário, mas **não** comprova recuperação de binários. A primeira prova de cobertura completa exige ao menos um anexo Production real criado pelo fluxo normal do produto; não criar fixture sintética em Production.

## Não fazer

- não restaurar Production para teste;
- não refazer a trilha PostgreSQL concluída;
- não backfillar `33006253661`;
- não reprovisionar R2/secrets por inércia;
- não pedir/registrar secrets em chat/Issue/PR;
- não armazenar dump ou objeto Storage real em Git/GitHub Artifact;
- não manipular binários via INSERT/UPDATE/DELETE em `storage.*`;
- não declarar Storage coberto por um snapshot vazio;
- não reutilizar automaticamente o hard cap PostgreSQL de 300 MB para Storage;
- não voltar a Drive/rclone/Gmail;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel para validar esta trilha backend/operacional.
