# Arquitetura de Persistência

Data: 2026-08-20
Status: Fase 30

## Direção

- PostgreSQL é o modelo físico.
- Supabase é o provedor hospedado inicial preferido.
- GitHub é a fonte de verdade de schema/migrations.
- O domínio continua independente do provedor.

## Estrutura versionada

```text
supabase/
├── migrations/
├── seed.sql
└── tests/
    ├── bootstrap.sql
    └── schema_smoke.sql
```

Um `config.toml` gerado/validado pelo Supabase CLI será adicionado quando o ambiente CLI/projeto remoto estiver conectado. Não inventar configurações específicas do projeto antes disso.

## Identidade e linhagem das migrations

A partir da Fase 30, o timestamp no filename de cada migration histórica é tratado como parte da identidade operacional da migration, não apenas como ordenação estética.

O Supabase CLI compara as versions locais com `supabase_migrations.schema_migrations` para decidir quais migrations já foram aplicadas. Portanto:

- migrations já aplicadas no ambiente hospedado preservam a mesma version/timestamp no GitHub;
- não renumerar migrations históricas depois que entrarem no histórico remoto;
- migrations novas devem ser criadas pelo fluxo do Supabase CLI ou por processo que preserve a version gerada/aplicada;
- não editar `supabase_migrations.schema_migrations` diretamente;
- `migration repair` só pode ser usado quando existir divergência compreendida entre histórico e schema, com plano explícito;
- um arquivo vazio gerado por tentativa anterior não deve permanecer como migration local se nunca foi aplicado e foi substituído por uma migration efetiva.

A Fase 30 reconciliou os filenames históricos do repositório com as 27 versions já registradas no projeto Supabase, preservando byte a byte os blobs SQL versionados e sem alterar o histórico remoto.

## Tipos físicos

### IDs

`uuid` com `gen_random_uuid()`.

### Dinheiro

`numeric(18,2)` nesta primeira versão, coerente com o value object `Money` atual.

### Quantidades

`numeric(18,3)`, coerente com `Quantity` e as três casas decimais do domínio.

### Datas e timestamps

- validade: `date`;
- data/hora operacional: `timestamptz`;
- datas de negócio puras permanecem `date` quando aplicável.

## Isolamento organizacional

Entidades operacionais carregam `organization_id` mesmo quando a relação poderia ser inferida por joins. Isso simplifica:

- RLS;
- índices;
- checagem de escopo;
- auditoria;
- prevenção de cruzamento acidental entre organizações.

Relações importantes usam FKs compostas `(id, organization_id)` para garantir que filhos não apontem para entidade de outra Organization.

## Membership

`organization_memberships` vincula `auth.users.id` a uma Organization e um papel.

Papéis iniciais:

- owner
- admin
- manager
- finance
- purchases
- inventory
- cashier
- viewer

Escopos mais finos por Business/Unit/Sector podem ser adicionados sem substituir a membership organizacional.

## RLS

### Leitura

Usuário autenticado pode ler dados da Organization quando possuir membership ativa.

### Cadastros

Escrita direta por Data API é permitida apenas para papéis compatíveis com o módulo e continua protegida por RLS.

### Ledger de estoque

Tabelas transacionais de estoque ficam disponíveis para leitura por membros, mas não recebem políticas de escrita direta nesta fase.

Entradas, retiradas, transferências e inventários reais usam camada transacional server-side/RPC para atualizar ledger, lotes e projeções atomicamente.

## Secret key

A secret key do Supabase bypassa RLS e portanto é tratada como credencial administrativa/server-side.

Ela não pode:

- aparecer em `NEXT_PUBLIC_*`;
- ir para o navegador;
- ser versionada;
- ser usada em código cliente.

## Seeds

Seeds são anonimizados e servem apenas para desenvolvimento/testes.

Dados das seis planilhas originais não entram em `seed.sql`.

## Validação reproduzível

CI sobe um PostgreSQL 17 efêmero e:

1. cria stubs mínimos do schema `auth` usado pelo Supabase;
2. aplica todos os arquivos `supabase/migrations/*.sql` em ordem lexicográfica;
3. aplica seed demo;
4. executa testes SQL de constraints, RLS e fluxos transacionais;
5. no workflow principal, verifica também backup lógico e restore isolado.

Esse gate prova que um banco limpo é reconstruível somente a partir do repositório. A identidade das versions também deve permanecer sincronizada com o histórico hospedado para que `migration list`/`db push` não interpretem migrations históricas como pendentes.

## Aplicação remota

Para mudanças futuras:

1. criar migration versionada antes da mudança estrutural;
2. testar a reconstrução limpa em CI;
3. vincular o projeto por mecanismo seguro quando usar Supabase CLI;
4. executar `supabase migration list`/`db push --dry-run` antes de qualquer push remoto quando esse fluxo estiver configurado;
5. aplicar migrations por fluxo versionado;
6. nunca usar Dashboard/SQL manual como fonte definitiva sem capturar a mudança em migration;
7. manter usuário administrador e dados reais fora do seed público;
8. homologar com dados anonimizados antes de migração real.