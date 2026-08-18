# Importação — staging e dry run

Status: **Fase 15 implementada e homologada**.

## Escopo atual

A fundação de importação atende a infraestrutura necessária para `REQ-IMP-001` a `REQ-IMP-004` e ao uso explícito de aliases previsto em `REQ-ITEM-002`, sem executar migração definitiva de dados.

Esta fase entrega somente staging, validação, idempotência, preview/dry run e relatório. As seis planilhas reais, cutover e escrita dos dados importados nas tabelas operacionais permanecem fora do escopo.

## Persistência

### `import_batches`

Registra um lote rastreável por Organization com:

- tipo e nome da fonte;
- SHA-256 do arquivo;
- versão da transformação;
- chave determinística do lote;
- modo fixo `dry_run` nesta fase;
- status `staged`, `review_required` ou `ready`;
- usuário solicitante, metadata e timestamps.

A repetição da mesma combinação de Organization, fonte, hash e versão de transformação reutiliza o lote existente em vez de criar duplicata.

### `import_rows`

Preserva a linhagem da linha de origem:

- batch;
- arquivo por referência ao batch;
- aba;
- número da linha;
- identificador bruto opcional;
- payload bruto;
- hash do payload;
- chave determinística de idempotência;
- payload normalizado;
- entidade/alvo resolvido quando seguro;
- resolução aplicada;
- warnings e erros.

Estados de preview:

- `accepted`;
- `duplicate`;
- `warning`;
- `rejected`;
- `pending_mapping`.

Um batch finalizado não recebe novas linhas pela command surface.

## Idempotência

A identidade da origem considera Organization, hash da fonte, aba, linha e hash do payload bruto.

- reprocessar a mesma posição/conteúdo no mesmo batch não duplica staging;
- reprocessar a mesma origem em outra versão de transformação preserva o novo batch, mas a linha já vista é classificada como `duplicate` quando aplicável;
- conflito da mesma posição com payload diferente é rejeitado explicitamente.

## Dry run e relatório

`finalize_import_preview` apenas consolida o staging. Nesta fase não existe command que aplique as linhas nas tabelas operacionais.

O relatório informa:

- total de linhas;
- aceitas;
- duplicadas;
- warnings;
- rejeitadas;
- mapeamentos pendentes.

Batch com rejeição ou mapeamento pendente fica `review_required`; caso contrário pode ficar `ready`. `ready` significa apenas que o preview foi validado — não autoriza cutover nem importação real.

## Matching de itens e aliases

A camada de aplicação normaliza somente Unicode, espaços e caixa para comparação.

São aceitos:

1. nome canônico exato após normalização;
2. alias explicitamente cadastrado.

Não existe fuzzy matching nem auto-merge por similaridade. Referência inexistente ou ambígua fica `pending_mapping` para revisão humana. Qualquer transformação dependente de Q-001 a Q-025 também deve resultar em pendência/revisão, não em regra inferida.

## Segurança e auditoria

O staging é Organization-wide.

- owner/admin/manager com membership Organization-wide podem consultar e operar os RPCs de importação;
- memberships restritos a Business/Unit/Sector não ganham acesso ao staging global;
- outsider não enxerga os registros;
- `anon` não executa os RPCs;
- `authenticated` não recebe INSERT/UPDATE/DELETE direto nas tabelas de staging;
- criação de batch e finalização de preview registram `audit_logs`;
- os RPCs `SECURITY DEFINER` revalidam identidade e escopo internamente, seguindo o padrão de command surface do projeto.

## Implementação

Migrations versionadas:

- `20260818174500_import_staging.sql`;
- `20260818180500_import_staging_finalize_fix.sql`;
- `20260818182000_import_staging_indexes.sql`.

No Supabase remoto elas foram registradas como:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Código de preview:

- `src/modules/imports/application/import-preview.ts`;
- `src/modules/imports/application/import-preview.test.ts`.

Teste PostgreSQL:

- `supabase/tests/import_staging.sql`.

O CI principal executa essa suíte junto das validações de schema, RLS e estoque já existentes.

## Homologação remota

Após CI verde, a suíte sintética foi executada no Supabase hospedado em uma única transação `BEGIN/ROLLBACK`.

Resultado: `import staging tests passed`.

Foi comprovado:

- idempotência de batch e linha;
- relatório estruturado;
- imutabilidade após finalização;
- detecção de duplicata entre versões;
- ausência de escrita operacional no dry run;
- bloqueio de escrita direta;
- isolamento de membership escopado e outsider;
- bloqueio de `anon`;
- auditoria única dos comandos relevantes.

Checagem posterior ao rollback confirmou zero usuários, memberships, batches, rows, audits e itens operacionais temporários.

Os advisors foram executados após as DDLs. Os dois avisos novos de foreign keys sem índice foram corrigidos pela migration de índices. Os avisos restantes são históricos do projeto ou correspondem ao padrão intencional de RPC autenticada `SECURITY DEFINER` já protegido por validação interna.

## Fora do escopo / próximos passos futuros

Esta fundação **não** autoriza automaticamente a migração real. Continuam necessários, conforme `docs/source-data/migration-plan.md`:

- fontes reais congeladas e armazenadas com segurança;
- regras de transformação aprovadas;
- resolução das questões de negócio necessárias;
- importadores específicos por fonte;
- estratégia de backup;
- reconciliação;
- validação com o cliente;
- definição de cutover.
