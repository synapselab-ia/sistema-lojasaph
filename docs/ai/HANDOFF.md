# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua integrada.** A frente ativa é a Issue #75 / `REQ-PLAT-005`, agora com implementação técnica de Storage separada na **Issue #121 — Backup e recuperação off-site do Supabase Storage**.

Não refazer sem regressão concreta:

- ADR-009;
- R2/lifecycle/lock do PostgreSQL;
- backup PostgreSQL Production + hard cap 300 MB;
- persistência autoritativa/RLS;
- UI read-only `Proteção dos dados`;
- restore do bundle PostgreSQL Production real;
- compatibilidade de roles/schema do restore;
- `restore_drill coverage=postgres` e reconciliação da #110.

## Baseline de entrada

- `main`: `9794210a9d1b4dbd8fca01dd8ef0e6318a9e278e` (#120) antes desta slice de design;
- CI `33070390747`: verde;
- nenhum PR aberto na entrada;
- #75 aberta;
- #121 criada após inventário real;
- repo temporariamente `public`; não alterar automaticamente.

## Inventário Storage concluído

### Código

Só existe uso físico de Storage para anexos financeiros.

- bucket: `finance-attachments`;
- privado;
- criado/configurado pela Storage API no primeiro upload autorizado;
- limite 10 MiB;
- MIME PDF/XML/JPEG/PNG/WebP;
- key `Organization/payable_document/attachment` por UUID;
- SHA-256 do conteúdo já é persistido em `public.finance_attachments`;
- upload físico ocorre via admin client server-only após preflight autenticado;
- metadata é registrada depois do objeto e falha tenta compensação física;
- download primeiro exige metadata visível sob RLS e só então usa admin Storage;
- browser não acessa o objeto diretamente e não recebe secret/signed URL;
- não existe delete funcional de anexo hoje.

### Production read-only — 2026-08-27

Projeto `fhbvwyttikrbeaanatlr`:

- 1 Organization;
- 0 buckets;
- 0 objetos Storage ativos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 policies customizadas em `storage.objects`/`storage.buckets`.

Isso é esperado porque o bucket é lazy. Nenhum bucket/objeto foi criado nesta investigação.

## Decisão registrada na #121

Implementação alvo:

1. reutilizar Cloudflare R2, namespace `production/storage/...` separado de `production/postgres`;
2. source access por credencial S3 dedicada do Supabase Storage, server-only e separada do secret admin da aplicação;
3. allowlist inicial `finance-attachments`, fail-closed para bucket Files não classificado;
4. snapshot completo diário inicialmente, em prefixo imutável por run;
5. manifesto `lojasaph-storage-backup-v1`;
6. stream SHA-256 da origem e comparação com checksum/tamanho autoritativos de `finance_attachments`;
7. upload R2 + re-download/re-hash antes de integridade positiva;
8. guardrails Storage próprios/configuráveis, nunca herdar automaticamente o cap PostgreSQL de 300 MB;
9. persistir `automatic_storage` / `coverage=storage` pelo boundary existente;
10. restore em Supabase Storage isolado via API/S3, nunca DML em `storage.*`;
11. reconciliar manifesto ↔ metadata de negócio ↔ objetos restaurados e detectar missing/extra/corrupt;
12. registrar `restore_drill coverage=storage` só depois da prova suficiente.

## Gate de UI / prova real

Production está vazia. Um snapshot vazio pode provar a execução do inventário, mas não comprova recuperação de binários reais.

A UI deve continuar dizendo que Storage/anexos não estão cobertos até existirem ambos:

- `automatic_storage` Production real íntegro; e
- `restore_drill coverage=storage` real sobre pelo menos um anexo Production criado pelo fluxo normal do produto.

Não criar fixture sintética em Production para satisfazer esse gate.

## Próxima ação

Implementar a primeira slice da #121 em branch própria:

- tooling de inventário/manifesto;
- testes unitários;
- CI usando Supabase Storage local e arquivos sintéticos pequenos;
- workflow Storage inicialmente fail-closed/desarmado para Production;
- integração com `record-protection-run.sh` sem duplicar schema.

Antes de armar Production, confirmar explicitamente:

- endpoint S3 do Supabase Storage habilitado;
- credencial S3 de origem provisionada em GitHub Secrets fora do chat;
- lifecycle + Bucket Lock de 30 dias abrangendo `production/storage`;
- caps Storage próprios de quantidade/bytes configurados;
- source bucket allowlist correta.

Se Production continuar com zero objetos ao fim da implementação, não inventar conteúdo. Deixar o gate de prova binária real pendente até existir um anexo legítimo.

## Restrições

- nunca restaurar Production;
- não manipular binários via SQL em `storage.*`;
- não armazenar objeto real em Git/GitHub Artifact;
- não pedir/registrar secrets;
- não reprovisionar R2 sem necessidade concreta;
- não reabrir a trilha PostgreSQL;
- não voltar a Drive/rclone/Gmail;
- não tornar repo private automaticamente;
- não fazer deploy Vercel para esta slice operacional.
