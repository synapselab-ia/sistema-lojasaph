# Arquitetura de Persistência

Data: 2026-08-17
Status: Fase 7

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

Entradas, retiradas, transferências e inventários reais deverão usar uma camada transacional server-side/RPC para atualizar ledger, lotes e projeções atomicamente.

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

## Validação sem projeto remoto

CI sobe um PostgreSQL efêmero e:

1. cria stubs mínimos do schema `auth` usado pelo Supabase;
2. aplica as migrations em ordem;
3. aplica seed demo;
4. executa testes SQL de constraints e RLS.

Esse teste não substitui uma execução futura do Supabase CLI, mas detecta erros de SQL, FK, constraint e políticas antes de qualquer deploy.

## Aplicação remota futura

Quando houver projeto Supabase conectado:

1. validar/generar `supabase/config.toml` com CLI;
2. vincular o projeto por mecanismo seguro;
3. comparar schema remoto/local;
4. executar migrations por fluxo versionado;
5. criar usuário administrador inicial fora do seed público;
6. adicionar adapters reais na aplicação;
7. executar homologação com dados anonimizados antes da migração real.