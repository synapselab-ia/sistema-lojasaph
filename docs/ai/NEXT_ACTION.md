# Next Action — Sistema Lojasaph

## Contexto

Fase 41 — reconciliação do MVP restante — foi concluída.

Evidência: `docs/qa/mvp-reconciliation.md`.

Resultado:

- nenhum novo MUST funcional do núcleo apareceu sem cobertura;
- itens `PENDING`/Q-001..Q-025 e fase posterior continuam excluídos;
- cutover de importação real permanece dependente de fonte/mapeamento/backup/reconciliação;
- `REQ-EXPOR-001 — Exportação` continua sem implementação aparente, mas é um SHOULD amplo e não deve competir em paralelo;
- a única nova frente funcional aberta é a Issue #92 — `Fase 42 — anexos financeiros privados (REQ-FIN-008)`.

A Issue #75 continua aberta/desarmada. OAuth/rclone/App Password + primeiro run real permanecem adiados até computador pessoal/confiável e não bloqueiam #92.

## Objetivo ativo

**Fase 42 — Implementar Issue #92 / `REQ-FIN-008 — Anexos` como uma vertical slice privada de anexos em `payable_document`.**

O objetivo é permitir listar, anexar e baixar documentos financeiros sem tornar arquivo público, sem expor secret/service key no browser e sem inventar classificação fiscal ou lifecycle de exclusão que o requisito não definiu.

## Contrato funcional já aprovado pela Fase 41

Primeiro vínculo suportado: `payable_document`.

Metadata mínima:

- `id`;
- `organization_id`;
- `payable_document_id`;
- bucket/storage key;
- nome original;
- MIME;
- tamanho em bytes;
- checksum SHA-256;
- usuário criador;
- timestamp.

Tipos iniciais: PDF, XML e imagens comuns de comprovante.

Não expandir já para vínculo com parcela, pagamento, recebimento, OCR, SEFAZ, classificação automática ou exclusão.

## Boundaries de segurança

- bucket privado;
- browser usa apenas sessão normal e nunca recebe `SUPABASE_SECRET_KEY`/service role;
- trusted server pode usar admin client somente para a operação física de Storage;
- autorização de negócio deve ser revalidada usando usuário normal/RPC, não presumida porque o server possui secret;
- upload permitido somente para `owner/admin/manager/finance` no escopo do documento, reutilizando `private.has_payable_document_role(...)`;
- leitura/listagem conforme `private.can_read_payable_document(...)`;
- `viewer` autorizado pode ler/baixar, mas não registrar novo anexo;
- cross-Organization/fora do escopo e `anon` devem falhar;
- `authenticated` recebe somente SELECT direto na metadata; INSERT/UPDATE/DELETE diretos permanecem negados;
- sem URL pública permanente;
- `upsert=false` / sem overwrite;
- sem DELETE físico exposto nesta versão;
- registro de metadata + audit event no mesmo boundary PostgreSQL;
- se Storage upload ocorrer e o registro relacional falhar, o server deve tentar remover o objeto recém-enviado.

## Baseline Supabase

Production `fhbvwyttikrbeaanatlr` foi inspecionada somente read-only na Fase 41:

- `ACTIVE_HEALTHY`, PostgreSQL 17;
- nenhum bucket atual;
- nenhuma policy em `storage.objects`;
- nenhuma tabela pública de attachments/files.

A documentação Supabase atual foi revisada:

- documentos sensíveis devem ficar em bucket privado;
- objetos devem ser manipulados pela Storage API, não por SQL direto em `storage.objects`;
- bucket pode restringir MIME/tamanho;
- service/secret key é server-only;
- tabelas públicas novas exigem grants explícitos coerentes com RLS.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW`, Issue #92, `docs/modules/finance.md`, `docs/architecture/domain-model.md` e `docs/architecture/data-model.md`.
2. Conferir estado real de `main`, Issues/PRs/branches/CI e confirmar #75/#92 antes de agir.
3. Criar branch funcional nova para #92 se a branch documental da Fase 41 já estiver mergeada; não acumular trabalho novo em branch histórica integrada.
4. Revalidar a documentação/changelog Supabase Storage atual antes da implementação.
5. Em checkout com a Supabase CLI pinada, executar primeiro:
   - `supabase migration new --help`;
   - `supabase migration new finance_attachments`.
   **Nunca inventar timestamp/nome de migration.**
6. Na migration relacional:
   - criar `public.finance_attachments`;
   - FK composta `(payable_document_id, organization_id)` → `payable_documents(id, organization_id)`;
   - constraints para nome/MIME/tamanho/checksum/storage key;
   - RLS habilitado;
   - policy SELECT usando `private.can_read_payable_document(...)`;
   - revoke padrão de `anon`/`authenticated` + GRANT SELECT explícito a `authenticated`;
   - nenhum direct INSERT/UPDATE/DELETE de `authenticated`;
   - RPC de preflight de upload com auth + `private.has_payable_document_role(...)`;
   - RPC de registro de metadata que repete auth/role/scope, valida payload/path e grava `audit_logs` na mesma transação.
7. Não modificar `storage.objects` por SQL. Provisionar/configurar o bucket pela Storage API em código server-only, de forma idempotente, privado, com MIME/tamanho limitados.
8. Usar storage key canônica e opaca baseada em Organization/document/attachment UUID. Não incorporar filename do usuário ao path físico.
9. Implementar upload em server boundary:
   - validar auth, arquivo, tamanho e MIME antes dos bytes;
   - executar preflight de role/scope;
   - garantir bucket privado pela API;
   - calcular SHA-256 no servidor;
   - upload com `upsert=false`;
   - registrar metadata por RPC usando a sessão autenticada;
   - se RPC falhar após upload, tentar `storage.remove` e logar erro de compensação sem expor segredo.
10. Implementar download em server boundary:
    - carregar metadata via client autenticado + RLS;
    - se invisível, não revelar existência do arquivo;
    - somente depois usar Storage server-side para devolver o conteúdo;
    - `Content-Disposition` deve usar o nome original de forma segura;
    - não criar public URL permanente.
11. Estender `SupabaseFinanceGateway`/read model para listar metadata da Organization e a tela `/workspace/financeiro` para:
    - mostrar anexos por documento;
    - anexar arquivo quando `workspace.permissions.manageFinance` permitir como UX;
    - baixar anexo visível;
    - mostrar erro/sucesso sem vazar mensagem interna.
12. Não tratar a permissão da UI como autoridade final; RPC/RLS continuam autoritativos.
13. Adicionar testes mínimos sem dado real:
    - finance permitido registra;
    - viewer lê/lista e não registra;
    - cross-org/fora do escopo não registra/lê;
    - `anon` negado;
    - direct write da metadata negado;
    - MIME/tamanho/checksum/path inválidos rejeitados;
    - função de política de arquivo/testes unitários no client/server boundary;
    - nenhum secret entra no client bundle;
    - compensação de upload é exercitada com doubles/unit test, sem Storage Production.
14. Se criar `supabase/tests/finance_attachments.sql`, incluí-lo no CI principal e `Business Transactions Integration`.
15. Rodar lint, typecheck, Vitest, production build e suítes SQL completas; abrir PR draft cedo e mergear só com CI verde.
16. Só depois do head verde, aplicar a migration em Production com ferramenta de migration — nunca `execute_sql` para DDL — e fazer homologação não destrutiva.
17. Após DDL, rodar Security + Performance Advisors e investigar warnings novos causados pela migration.
18. Bucket/arquivo de homologação, se necessário, deve ser sintético e removido ao final; não usar documento real.
19. Não criar deploy Vercel intermediário apenas para esta frente; preservar a limitação atual de deploys.
20. Atualizar `docs/modules/finance.md`, evidência QA, `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão da Issue #92

- usuário financeiro autorizado consegue anexar arquivo suportado no documento;
- viewer autorizado consegue listar/baixar, mas não anexar;
- cross-org/fora do escopo e anon não acessam;
- metadata guarda nome/MIME/tamanho/SHA-256/vínculo/ator;
- bucket é privado e não existe URL pública permanente;
- browser não recebe secret/service key;
- invalid MIME/tamanho/path/checksum falham;
- direct mutation da metadata por Data API continua fechada;
- falha de metadata após upload dispara tentativa de compensação;
- audit trail registra criação da metadata;
- CI e homologação comprovam o fluxo sem dados reais.

## Backup Production / #75

Somente quando o operador estiver em computador pessoal/confiável:

1. configurar OAuth Google Drive/rclone;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar `BACKUP_AUTOMATION_ENABLED=true`;
5. executar `Production Database Backup` manualmente;
6. comprovar archive + `.sha256` no Drive;
7. registrar evidência e fechar #75.

## Segurança / operação

- não pedir/receber secrets no chat;
- não versionar dump/config/token;
- não ativar backup antes dos secrets restantes;
- não fechar #75 sem run real;
- não restaurar Production para teste;
- não iniciar exportação em paralelo com #92;
- não implementar requisito `PENDING` por inferência;
- não manipular objetos de Storage por SQL;
- não criar bucket público;
- não expor secret/service key no browser;
- não inventar migration filename;
- não reaplicar migrations existentes;
- não criar deployment Vercel apenas para auditoria/feature intermediária;
- não importar dados reais/cutover.
