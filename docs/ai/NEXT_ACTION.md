# Next Action — Sistema Lojasaph

## Contexto

A frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices concluídas e que não devem ser refeitas sem regressão concreta:

1. ADR-009 / arquitetura;
2. transporte S3-compatible + Cloudflare R2/lifecycle/lock;
3. hard cap `300000000` bytes;
4. primeiro backup PostgreSQL Production real — `33006253661`;
5. persistência autoritativa/RLS;
6. UI read-only `Proteção dos dados`;
7. restore do bundle PostgreSQL Production real em destino Supabase/PostgreSQL 17 isolado;
8. persistência autoritativa de `restore_drill`;
9. auto-reconciliação da Issue #110.

## Evidência que encerrou a slice PostgreSQL

Main:

`25f3cac1cff1dedee2baf0a4712f99a15d6653e7`

Run real:

`Backup Restore Drill / 33069706382` — **success**.

O run comprovou download/checksums, roles/schema/data do archive Production real, smoke tests, RLS/grants, revalidação de FKs, cleanup e persistência autoritativa.

Latest `restore_drill` em Production:

- `succeeded`;
- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization relacionada.

Issue #110 foi fechada automaticamente. CI pós-merge e Restore Compatibility CI também estão verdes.

## NEXT_ACTION imediata

**Inventariar e desenhar a trilha de proteção dos objetos binários Supabase Storage/anexos antes de implementar qualquer backup Storage.**

O dump PostgreSQL protege metadata/tabelas, mas não carrega o conteúdo binário armazenado pelo Supabase Storage. Não declarar cobertura completa enquanto essa trilha não tiver backup e recuperação real comprovados.

### 1. Inventário no código

Localizar, sem alterar comportamento ainda:

- todos os usos do Supabase Storage;
- nomes de buckets e finalidade;
- pontos de upload, download, delete e signed URL;
- tabelas/colunas que guardam bucket/key/path/metadata;
- regras de autorização Organization/Unit/Sector relacionadas;
- testes existentes de anexos.

### 2. Inventário no Supabase Production

Consultar somente metadata segura:

- buckets existentes;
- público/privado;
- quantidade de objetos por bucket;
- soma aproximada de tamanho por bucket;
- políticas/RLS relevantes;
- relação entre objetos e metadata de negócio.

Não ler/expor conteúdo de arquivos nem URLs assinadas/segredos.

### 3. Definir contrato de backup Storage

Antes de codificar, registrar proposta reversível para:

- inventário versionado por execução;
- `bucket` + `object key` + tamanho + checksum/fingerprint apropriado;
- timestamps/metadata mínima necessária;
- destino off-site privado;
- namespace separado de `production/postgres`;
- integridade antes/depois da transferência;
- retenção/lock coerentes com a política de 30 dias;
- comportamento incremental ou full coerente com o volume real;
- hard cap/guardrails adequados para objetos, sem reaproveitar cegamente o limite de archive PostgreSQL.

Reutilizar Cloudflare R2 e o contrato S3-compatible existente quando isso for tecnicamente seguro; não reprovisionar provider por inércia.

### 4. Definir restore/reconciliação isolada

A prova suficiente deve:

1. escolher um conjunto de objetos do backup real sem expor conteúdo em logs;
2. restaurá-los em bucket/destino Storage isolado;
3. usar APIs suportadas de Storage para binários;
4. **não** copiar binários por INSERT/UPDATE em `storage.objects`;
5. recalcular/verificar integridade;
6. reconciliar metadata de banco ↔ bucket/key/objeto;
7. detectar objeto ausente, extra ou corrompido;
8. limpar o destino isolado;
9. nunca tocar nos objetos Production como target.

### 5. Persistência e UI

Planejar `automatic_storage` usando a boundary autoritativa já existente:

- `coverage=storage` quando a execução realmente proteger Storage;
- Organizations cobertas derivadas da metadata real;
- `integrity_verified=true` somente após prova suficiente;
- erro sanitizado em falha;
- UI deve continuar mostrando Storage como não coberto até existir evidência autoritativa real.

## Saída esperada desta NEXT_ACTION

Criar a próxima Issue/slice técnica com:

- inventário real do Storage usado;
- riscos e dependências;
- contrato de bundle/inventário;
- estratégia de transporte;
- estratégia de restore/reconciliação isolada;
- testes/CI necessários;
- plano de persistência `automatic_storage`;
- critérios inequívocos para primeira prova Production real.

Só depois implementar em branch/PR.

## Fora do escopo imediato

- cutover/restauração de Production;
- exportação manual por Organization;
- trocar provider off-site sem necessidade;
- alterar RPO/retenção;
- backfill do backup PostgreSQL histórico;
- deploy Vercel;
- retornar repo para private automaticamente.

## Regras de segurança

- não pedir/registrar secrets;
- não baixar conteúdo binário para Git/GitHub Artifact;
- não manipular binários via SQL em `storage.*`;
- não assumir que metadata SQL equivale ao objeto físico;
- não considerar apenas listagem de objetos como prova de integridade;
- não declarar Storage protegido antes de backup + revalidação + restore/reconciliação real.
