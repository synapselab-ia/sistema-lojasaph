# Handoff — Sistema Lojasaph

## Estado

Fase 41 — reconciliação do MVP restante — foi concluída com **uma única próxima lacuna funcional comprovada**.

Ler `docs/qa/mvp-reconciliation.md` antes de escolher outra frente.

- `main` real na entrada da Fase 41: `cbcedfbcc65287d79b3f7b77feead60906981222` (PR #91);
- CI de referência na entrada: #357 — success;
- PRs abertos ao iniciar: nenhum;
- Issue aberta ao iniciar: #75;
- nova Issue: #92 — `Fase 42 — anexos financeiros privados (REQ-FIN-008)`;
- branch usada para registrar a Fase 41: `agent/finance-attachments`;
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17;
- nenhum deploy Vercel;
- nenhuma mutation/DDL de negócio em Production na Fase 41.

A referência antiga `765776a...` era o merge intermediário do PR #90. A `main` já havia avançado para `cbcedfb...` pelo PR #91; não tratar isso como regressão.

## O que a Fase 41 decidiu

Não apareceu novo MUST funcional do núcleo sem cobertura.

O núcleo profissional atual já cobre Organização/Cadastros, Estoque, lotes/validades, Inventário, Compras, Financeiro transacional, Caixa, Auth/permissões/auditoria, Dashboard básico e foundation de importação.

Não promover por inferência itens `PENDING`/Q-001..Q-025 ou fase posterior. Cutover de planilhas reais e ativação do backup #75 são bloqueios operacionais explícitos, não features genéricas a reimplementar.

Dois SHOULDs sem implementação aparente foram confirmados:

1. `REQ-FIN-008 — Anexos`;
2. `REQ-EXPOR-001 — Exportação`.

A próxima frente escolhida é **#92 / Anexos**, porque possui boundary e critério de aceite mais específicos. Exportação continua na fila, mas não deve virar segunda frente paralela.

## Issue #92 — contrato já fechado

Primeira vertical slice: arquivos privados vinculados a `payable_document`.

Escopo:

- bucket privado para anexos financeiros;
- PDF/XML/imagens comuns de comprovante;
- metadata com Organization, documento, storage key, nome original, MIME, tamanho, SHA-256, ator e timestamps;
- upload somente por `owner/admin/manager/finance` quando `private.has_payable_document_role(...)` autorizar o escopo;
- leitura/listagem conforme `private.can_read_payable_document(...)`;
- browser nunca recebe `SUPABASE_SECRET_KEY`/service role;
- arquivo sem URL pública permanente;
- `upsert=false` / sem overwrite;
- sem exclusão física nesta primeira entrega;
- registro de metadata auditável;
- nova tabela pública com RLS + grants explícitos;
- direct INSERT/UPDATE/DELETE da metadata negado a `authenticated`;
- upload físico seguido de falha na metadata deve tentar compensação/remover o objeto;
- UI mínima de listar/anexar/baixar no Financeiro.

Não expandir já para vínculo com parcela/pagamento/recebimento; o domínio suporta evolução posterior, mas #92 começa por documento.

## Baseline Supabase / Storage

Inspeção read-only da Fase 41:

- nenhum bucket atual em `storage.buckets`;
- nenhuma policy atual em `storage.objects`;
- nenhuma relação pública de anexos/files;
- nenhum arquivo/bucket/schema foi criado nesta fase.

Documentação Supabase atual revisada:

- bucket privado para documentos sensíveis;
- operações de objetos via Storage API, não manipulação SQL de `storage.objects`;
- restrição por MIME/tamanho pode ficar no bucket e também no server boundary;
- secret/service key apenas em trusted server;
- nova tabela pública deve ter grants explícitos alinhados ao RLS.

## Como executar a Fase 42

1. Ler continuidade padrão, Issue #92, `docs/modules/finance.md`, `docs/architecture/domain-model.md`, `docs/architecture/data-model.md` e documentação Supabase Storage atual.
2. Conferir `main`, #75, #92, PRs/branches/CI reais.
3. Trabalhar em branch funcional nova para #92; não continuar commits funcionais na branch documental já mergeada se ela já tiver sido integrada.
4. Em checkout com a Supabase CLI pinada, executar primeiro:
   - `supabase migration new --help`;
   - `supabase migration new finance_attachments`.
   Nunca inventar timestamp/nome de arquivo da migration.
5. Na migration, criar somente a camada relacional:
   - `public.finance_attachments` vinculada por `(payable_document_id, organization_id)`;
   - constraints de metadata/tamanho/MIME/checksum/storage key;
   - RLS de leitura por documento;
   - SELECT explícito para `authenticated`; nenhum direct write;
   - RPC read-only de preflight de upload por role/scope;
   - RPC de registro de metadata com auth + role/scope revalidados e audit log na mesma transação.
6. Não escrever/inserir objetos em `storage.objects` por SQL. Provisionar/configurar bucket privado pela Storage API em trusted server, com configuração idempotente.
7. Usar server boundary para upload/download:
   - autenticar usuário normal;
   - preflight de autorização antes de transferir bytes;
   - secret/admin client somente no servidor para Storage;
   - caminho opaco/canônico por Organization/document/attachment UUID, sem usar filename do usuário como path;
   - `upsert=false`;
   - SHA-256 calculado no server;
   - se upload ocorrer e registro RPC falhar, tentar `storage.remove` como compensação.
8. Download deve primeiro resolver metadata usando client autenticado/RLS; só então o server usa Storage para retornar o arquivo. Não emitir public URL permanente.
9. Estender o gateway/read model Financeiro para listar metadata e a UI para anexar/baixar por documento.
10. Reutilizar `workspace.permissions.manageFinance` apenas para UX; autoridade final continua no RPC/RLS.
11. Cobrir ao menos:
    - finance pode registrar;
    - viewer pode ler/listar mas não registrar;
    - cross-Organization/fora do escopo não registra/lê;
    - `anon` sem acesso;
    - direct metadata write negado;
    - MIME/tamanho/checksum/storage key inválidos rejeitados;
    - client bundle não recebe secret;
    - política de arquivo e compensação testadas sem dado real.
12. Integrar a suíte SQL no CI principal e em `Business Transactions Integration` se criar arquivo de teste separado.
13. Só após PR/CI verdes, aplicar a migration no Supabase Production e homologar de forma não destrutiva. Não usar dado real como fixture.
14. Rodar advisors de segurança/performance após DDL e investigar apenas warnings novos causados pela mudança.
15. Não fazer Vercel deploy intermediário só para esta feature; preservar a política atual de deploy limitado.
16. Atualizar `docs/modules/finance.md`, QA e continuidade no final.

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

Se não estiver em máquina confiável, manter #75 aberta/desarmada e executar #92.

## Não fazer

- não receber/publicar DB URL, OAuth token/config ou App Password;
- não ativar backup antes dos secrets restantes;
- não fechar #75 sem run real;
- não restaurar Production para teste;
- não reabrir requisitos fechados sem regressão;
- não implementar item `PENDING` por inferência;
- não iniciar `REQ-EXPOR-001` em paralelo com #92;
- não criar bucket público;
- não expor secret/service key ao client;
- não manipular `storage.objects` por SQL;
- não inventar migration filename;
- não criar deploy Vercel só para auditoria/feature intermediária;
- não importar dados reais/cutover.
