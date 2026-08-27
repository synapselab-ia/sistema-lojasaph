# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua integrada.** A frente ativa é a Issue #75 / `REQ-PLAT-005`, com Storage separado na **Issue #121 — Backup e recuperação off-site do Supabase Storage**.

Não refazer sem regressão concreta:

- ADR-009;
- backup/restore PostgreSQL Production já comprovado;
- persistência autoritativa/RLS e UI read-only `Proteção dos dados`;
- tooling/manifesto/restore Storage integrado no PR #126;
- guardrails Production Storage integrados no PR #128;
- baseline S3 Production versionada no PR #130.

## Baseline viva

Antes desta atualização operacional:

- `main=96ffbf6553dfd7cb3889531387995f35035a8d15` (#130);
- #75 aberta;
- #121 aberta;
- nenhum PR aberto;
- repo temporariamente `public`; não alterar automaticamente.

CI pós-merge #130:

- CI `33089679869`: `database` + `validate` success;
- Storage Protection CI `33089679857`: `storage-contract` + `isolated-storage-binary-restore` success.

## Production read-only revalidada — 2026-08-27

Projeto `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- 1 Organization;
- 0 buckets;
- 0 objetos Storage ativos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 runs `automatic_storage`.

Nenhum bucket/objeto foi criado nesta atualização.

## Storage Production — estado técnico

Tooling já implementado:

- snapshot completo diário;
- manifesto `lojasaph-storage-backup-v1`;
- reconciliação metadata↔objeto;
- source SHA-256 contra checksum de negócio;
- cópia Supabase S3 → R2;
- verificação remota por re-download/re-hash;
- persistência `automatic_storage`;
- restore isolado pela Storage API/S3;
- CI local com fixtures sintéticas;
- guardrails `1000 objetos / 1 GiB total / 10 MiB por objeto`;
- allowlist `finance-attachments`.

Identidade não secreta Production versionada:

- project ref `fhbvwyttikrbeaanatlr`;
- endpoint `https://fhbvwyttikrbeaanatlr.storage.supabase.co/storage/v1/s3`;
- region `sa-east-1`.

## Gates privados externos — concluídos em 2026-08-27

O operador confirmou diretamente, sem expor valores secretos:

### Supabase / GitHub Secrets

- S3 protocol do Supabase Storage Production habilitado;
- access key S3 dedicada server-only criada;
- `STORAGE_SOURCE_S3_ACCESS_KEY_ID` provisionado em GitHub Actions Secrets;
- `STORAGE_SOURCE_S3_SECRET_ACCESS_KEY` provisionado em GitHub Actions Secrets.

### Cloudflare R2

No bucket privado `lojasaph-production-backups`:

- lifecycle 30d cobre `production/storage`;
- Bucket Lock/WORM 30d cobre `production/storage`;
- public access ausente;
- CORS de navegador ausente;
- `STORAGE_BACKUP_R2_RETENTION_VERIFIED=true` configurado no GitHub Actions.

### Armamento

O operador confirmou `STORAGE_BACKUP_AUTOMATION_ENABLED=true`.

Esse estado agora é correto porque os gates privados estão concluídos. Não voltar a desarmar por inércia. O job continua fail-closed se qualquer credencial/configuração obrigatória estiver ausente ou divergente.

## Limitações das integrações

O conector GitHub desta sessão não expõe Actions Secrets/Variables e não existe conector Cloudflare/R2. Portanto a conclusão dos gates privados acima é registrada como **confirmação explícita do operador**, sem valores de credenciais.

## Gate de UI / prova real

Storage/anexos ainda não deve ser declarado como recuperação binária comprovada.

A execução agendada pode ocorrer normalmente mesmo com inventário vazio. Nesse caso ela prova operação do pipeline sobre estado vazio, mas não prova recuperação de binário real.

Cobertura Storage completa exige, quando existir anexo legítimo:

- `automatic_storage Production=succeeded` com integridade positiva e objeto real;
- restore isolado do mesmo snapshot;
- `restore_drill coverage=storage=succeeded`.

## Próxima ação

1. não usar `workflow_dispatch` apenas para adiantar a prova;
2. após a próxima execução agendada, inspecionar o run e a evidência autoritativa;
3. se o inventário continuar vazio, manter automação armada e não alterar a UI para “recuperação comprovada”;
4. quando surgir primeiro anexo legítimo, validar o primeiro run que o inclua e executar restore isolado do mesmo snapshot;
5. persistir `restore_drill coverage=storage=succeeded` somente após reconciliação/hashes verdes;
6. então avaliar fechamento da #121 e atualização da cobertura na UI.

## Restrições

- nunca restaurar Production;
- não manipular binários via SQL em `storage.*`;
- não armazenar objeto real em Git/GitHub Artifact;
- não pedir/registrar secrets;
- não reprovisionar R2 sem necessidade concreta;
- não reabrir PostgreSQL;
- não criar fixture Production;
- não voltar a Drive/rclone/Gmail;
- não tornar repo private automaticamente;
- não fazer deploy Vercel para esta slice operacional;
- não abrir PR apenas para perseguir SHA documental.
