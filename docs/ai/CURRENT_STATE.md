# Current State — Sistema Lojasaph

Última atualização: 2026-08-22

## Estado atual

Fase 42 — `REQ-FIN-008 — Anexos` — **concluída e integrada na `main` pelo PR #93**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main` pós-Fase 42: `7f38ecedb2d4e8662ef0e2e8c01dda8b20dd0a84`
- PR #93: squash-mergeado
- head final validado do PR #93: `3885c15989c3787c627c9f0c2008e20466f63abc`
- CI #369: success (`database` + `validate`)
- Business Transactions Integration #176: success
- Inventory Count Integration #192: success
- Issue #92: fechada como completed pelo merge
- Issue aberta restante: #75 — backup Production, ainda desarmada
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17
- migration hospedada: `20260822195823_finance_attachments`
- arquivo versionado: `supabase/migrations/20260822195823_finance_attachments.sql`
- nenhum deployment Vercel criado

## Resultado das Fases 41–42

A Fase 41 reconciliou o MVP e confirmou que não havia novo MUST funcional do núcleo sem cobertura. Entre os SHOULDs ainda aparentes, `REQ-FIN-008 — Anexos` e `REQ-EXPOR-001 — Exportação` eram os gaps explícitos; anexos foi priorizado por possuir processo e critério de aceite concretos.

A Fase 42 entregou a primeira vertical slice de anexos financeiros privados vinculados a `payable_document`:

- `finance_attachments` com Organization/documento, storage key, nome original, MIME, tamanho, SHA-256, ator e timestamp;
- RLS de leitura por visibilidade do documento;
- `authenticated` com SELECT direto e sem INSERT/UPDATE/DELETE direto;
- `anon` sem leitura/EXECUTE;
- preflight e registro via RPC com sessão, papel e escopo revalidados;
- audit trail no registro da metadata;
- upload/download em boundary server-only;
- browser sem `SUPABASE_SECRET_KEY`/service role;
- bucket privado, MIME/tamanho configurados pela Storage API, `upsert=false` e path opaco;
- compensação do objeto se o upload físico ocorrer e a metadata falhar;
- download sem public URL permanente;
- painel no Financeiro para listar/anexar/baixar;
- testes SQL + Vitest + boundary de secret integrados ao CI.

Ver `docs/modules/finance.md` e `docs/qa/mvp-reconciliation.md`.

## Production / homologação

A migration foi aplicada somente depois de um head verde. O timestamp local foi reconciliado com a versão realmente registrada pelo Supabase, sem alteração do SQL.

Homologação sintética em `BEGIN/ROLLBACK` confirmou:

- preflight de Finance no escopo;
- registro de metadata;
- retry idempotente;
- audit único.

A verificação após rollback retornou zero usuário/Organization/documento/anexo/audit de teste.

Inspeção hospedada confirmou:

- RLS habilitado;
- SELECT de `authenticated` habilitado;
- INSERT/UPDATE/DELETE de `authenticated` negados;
- `anon` sem SELECT;
- policy `finance_attachments_member_select` usando `private.can_read_payable_document(...)`;
- RPCs executáveis por `authenticated` e não por `anon`.

Security Advisor passou a listar os dois RPCs novos como `SECURITY DEFINER` executáveis por `authenticated`. É intencional: eles revalidam `auth.uid()`, papel e resource scope e seguem o boundary dos commands críticos existentes. Performance Advisor trouxe somente INFO de FKs/índices, inclusive na tabela nova; não foi criado índice especulativo apenas para zerar INFO.

O conector Supabase usado na homologação não expõe mutações de Storage. O bucket `finance-attachments` ainda não foi materializado remotamente; por segurança ele **não** foi criado por SQL. O código server-only o garante de forma idempotente e privada no primeiro upload autorizado. Não tratar isso como migration faltante nem manipular `storage.objects`/`storage.buckets` por SQL.

## MVP restante

`REQ-EXPOR-001 — Exportação` permanece o SHOULD explícito ainda sem implementação aparente confirmado pela Fase 41:

> Dados tabulares relevantes devem poder ser exportados em CSV/Excel; PDF quando fizer sentido para relatório/documento.

O escopo do MVP diz apenas `exportação onde fizer sentido`. Portanto a próxima fase não deve implementar uma exportação genérica por conveniência. Primeiro precisa escolher uma superfície real, com usuário/processo beneficiado e critério de aceite objetivo.

Itens `PENDING`, Q-001..Q-025 e fase posterior continuam fora sem decisão explícita.

## Backup Production / Issue #75

A Fase 38 permanece válida e não deve ser refeita.

Política aprovada:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- workflows de backup/drill mergeados;
- `PRODUCTION_SUPABASE_DB_URL` provisionado via Session pooler 5432.

Ainda pendente, deliberadamente até computador pessoal/confiável:

- OAuth Google Drive/rclone;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real + archive/checksum off-site;
- fechamento da #75.

## Próxima ação

Fase 43 — delimitar `REQ-EXPOR-001 — Exportação` a **uma** vertical slice explícita do MVP e, somente se houver candidato inequívoco, abrir uma frente funcional.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não reabrir Fases 38–42 sem regressão concreta;
- não recriar/reaplicar `finance_attachments`;
- não criar bucket/objeto de Storage por SQL;
- não expor secret/service key no browser;
- não inventar uma exportação global sem processo real;
- não promover requisito `PENDING` por inferência;
- não pedir/receber secrets de backup no chat;
- não ativar backup nem fechar #75 antes da evidência operacional restante;
- não restaurar Production para teste;
- não criar deployment Vercel sem necessidade real;
- não importar dados reais/cutover.
