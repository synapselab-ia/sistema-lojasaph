# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

As seguintes camadas estão concluídas e não devem ser refeitas:

1. arquitetura ADR-009;
2. backup lógico PostgreSQL Production para storage S3-compatible/Cloudflare R2;
3. hard cap de `300000000` bytes por archive;
4. primeira prova off-site real;
5. persistência autoritativa dos runs de proteção + relação com Organizations + RLS;
6. UI read-only `Proteção dos dados` implementada no PR #115.

O núcleo funcional das Fases 41–45 não foi reaberto.

## GitHub / baseline desta slice

- `main` de entrada: `e7aba67845a92a4dbafa9c202aeda01c066d55d2` — merge do PR #114;
- CI pós-merge #429 / run `33010676236` em `main`: success;
- branch da slice: `agent/data-protection-ui`;
- PR #115: `feat(protection): add read-only data protection UI`;
- CI funcional inicial #430 / run `33011319175`: `database` e `validate` verdes;
- checks adicionais do mesmo head: `inventory-database` e `business-database` verdes;
- `validate` comprovou lint, typecheck, unit tests e production build;
- a suíte `supabase/tests/protection_runs.sql` foi reexecutada com sucesso no job `database`;
- Issues abertas relevantes: #75 e #110;
- Issue #110 é um incidente operacional do restore drill, não uma regressão da UI;
- repositório continua temporariamente `public` por decisão operacional para evitar bloqueio por minutos privados do GitHub Free; não retornar para `private` automaticamente.

O head final do PR #115 deve permanecer verde antes do merge.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- estado: `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17;
- zero development branches no início desta slice;
- migration final: `20260826201252 / protection_run_persistence`;
- `public.protection_runs = 0` rows reais na revalidação desta sessão.

Esse estado vazio continua **correto**: ainda não houve execução real do workflow de backup depois da integração da persistência autoritativa. Não fazer backfill manual do backup histórico `33006253661`.

## Persistência autoritativa — concluída

### `public.protection_runs`

Mantém metadata sanitizada de `automatic_database`, `automatic_storage`, `manual_export` e `restore_drill`, com estados `running`, `succeeded` e `failed`.

### `public.protection_run_organizations`

Relaciona runs globais às Organizations cobertas sem duplicar fisicamente o dump PostgreSQL.

### Segurança

- `authenticated` lê somente por RLS;
- membership ativa é exigida;
- cross-Organization é bloqueado;
- `authenticated` não possui INSERT/UPDATE/DELETE;
- `service_role` também não recebe mutation direta das tabelas;
- escrita ocorre somente pelos comandos privados server-side;
- idempotência usa `execution_reference`;
- nenhuma connection string, token, dump ou conteúdo de backup é persistido no espelho operacional.

## UI `Proteção dos dados` — implementada no PR #115

### Navegação e rota

- link `Proteção dos dados` adicionado ao `RuntimeShell`;
- rota: `/workspace/backup` dentro do grupo operacional existente;
- página implementada como Server Component;
- não foi criada uma segunda shell, API paralela ou fluxo administrativo separado.

### Leitura

`SupabaseProtectionQuery`:

1. usa o Supabase autenticado da sessão atual, nunca cliente admin;
2. filtra `protection_run_organizations` pela Organization selecionada;
3. lê somente os `protection_runs` correspondentes, ainda sujeitos à RLS;
4. não seleciona `execution_reference`, GitHub run IDs/URLs, bucket físico, secrets ou conteúdo de backup.

### Semântica de saúde

`buildProtectionOverview(...)` centraliza a política:

- verde somente com PostgreSQL `succeeded`, `integrity_verified=true` e `valid_copy_at` dentro do RPO de 24h;
- âmbar para estado inicial vazio ou execução transitória `running` dentro da janela aplicável;
- vermelho para falha persistida ou ausência/cópia válida fora do RPO;
- o cron não é usado como fonte de verdade.

A UI mostra, quando houver evidência:

- última execução PostgreSQL;
- última cópia válida;
- integridade;
- tamanho;
- prazo derivado do RPO;
- destino em linguagem lógica;
- retenção de 30 dias;
- histórico recente;
- restore drill autoritativo quando existir.

Também declara explicitamente que **Supabase Storage/anexos ainda não estão cobertos**.

### Estado vazio em Production

Como `protection_runs` segue vazio, a primeira renderização real esperada é o estado âmbar de histórico ainda não iniciado. A tela não inventa o run histórico `33006253661`.

## Validação da UI

Testes unitários cobrem:

- estado vazio;
- sucesso válido dentro do RPO;
- `running`;
- falha persistida;
- cópia válida vencida;
- execução sem cópia válida além do RPO;
- histórico ordenado;
- restore drill separado da saúde PostgreSQL.

CI #430 passou integralmente no primeiro head funcional. Commits documentais posteriores devem manter todos os checks verdes.

## Backup PostgreSQL off-site já comprovado

Primeira prova real anterior à persistência:

- workflow run `33006253661`;
- archive criado em `2026-08-26T19:40:47Z`;
- `53185` bytes;
- checksums e manifesto válidos;
- upload off-site concluído;
- re-download + SHA-256 concluídos;
- cleanup do runner concluído;
- Issue #111 fechada após recuperação verde.

Esse run é evidência histórica válida, mas não deve ser inserido artificialmente na nova tabela.

## Restore drill: estado real e gap identificado

Issue #110 continua aberta: `[backup-alert] Monthly restore drill failing`.

O run `33000481649`, às `2026-08-26T18:35:37Z`, falhou na etapa de download porque **ainda não existia archive PostgreSQL Production no namespace off-site**. O primeiro backup real só foi criado depois, às `2026-08-26T19:40:47Z`.

Além disso, o workflow atual tem uma limitação arquitetural importante:

- baixa e valida checksums do bundle real off-site;
- depois cria um banco sintético local a partir de migrations + seed;
- `scripts/verify-backup-restore.sh` faz dump/restore desse banco sintético;
- portanto ainda **não restaura o bundle Production baixado** end-to-end.

Consequência: mesmo um próximo run verde do workflow atual não basta, sozinho, para declarar restaurabilidade Production end-to-end.

Warning conhecido do primeiro dump real a preservar:

- constraints circulares em `stock_movements`;
- constraints circulares em `payments`.

## Cobertura atual

### Comprovado

- backup lógico PostgreSQL Production;
- archive/checksums/manifesto;
- hard cap 300 MB;
- transporte off-site;
- re-download/rehash;
- retenção/lock configurados;
- incidente GitHub-native em falha/recuperação;
- persistência autoritativa + RLS;
- UI read-only de proteção implementada e validada em CI.

### Ainda pendente

- primeiro run real pós-integração gravado automaticamente em `protection_runs`;
- restore end-to-end do **bundle Production real** em destino isolado;
- persistência autoritativa de `restore_drill` no workflow mensal;
- backup dos binários do Supabase Storage/anexos;
- exportação manual complementar, se mantida;
- cobertura completa de configurações externas ao dump;
- retorno do repositório para `private` quando o operador decidir.

## Próxima ação exata após a UI

**Reconciliar o restore drill real da Issue #110 para provar a restauração do bundle Production baixado em ambiente PostgreSQL isolado e registrar o resultado autoritativamente.**

A próxima slice deve primeiro revalidar Issue #110 e o workflow atual. Como a falha anterior ocorreu antes da existência do primeiro archive, uma nova execução controlada pode confirmar que download/checksums agora avançam; porém não considerar o workflow atual prova end-to-end enquanto ele restaurar apenas o banco sintético.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não refazer persistência ou UI já concluídas;
- não backfillar manualmente `33006253661`;
- não reprovisionar R2/secrets sem regressão concreta;
- não pedir secrets no chat;
- não restaurar Production para teste;
- não declarar Storage/anexos protegidos pelo dump PostgreSQL;
- não manipular `storage.*` diretamente por SQL para copiar binários;
- não usar GitHub Actions/cron como fonte primária da UI;
- não expor erro bruto, bucket físico ou credenciais na UI;
- não voltar a Drive/rclone/Gmail;
- não remover o hard cap de 300 MB;
- não retornar o repositório para `private` automaticamente;
- não disparar deploy Vercel desnecessário nesta etapa.
