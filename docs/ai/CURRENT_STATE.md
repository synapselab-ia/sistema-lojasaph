# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 7 — persistência PostgreSQL/Supabase e segurança base: fundação de schema/RLS implementada na branch `agent/persistence-foundation`, PR #20, com CI de aplicação e banco passando.

A Issue #19 permanece aberta porque ainda faltam conexão do projeto Supabase remoto e adapters reais na aplicação.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #19 — Fase 7 — Persistência PostgreSQL/Supabase e segurança base
- Branch atual: `agent/persistence-foundation`
- PR atual: #20 — persistência PostgreSQL/Supabase e RLS
- Projeto Supabase remoto ainda não está conectado.

## Fases concluídas

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: domínio, modelo lógico, ERD e ADRs fundamentais.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base e fornecedores.
- Fase 5: ledger de estoque, entrada, retirada, transferência e custo médio.
- Fase 6: lotes, validades, FEFO e inventário físico.

## Fase 7 — fundação implementada

### Decisão

`ADR-006` define:

- PostgreSQL como modelo físico relacional;
- Supabase como provedor hospedado inicial preferido e revisável;
- domínio/UI desacoplados por repositories/adapters;
- migrations no GitHub como fonte de verdade do schema;
- RLS antes de produção;
- segredos somente server-side.

### Schema versionado

Criado `supabase/` com migrations para:

- Organization, Business, LegalEntity, Unit, Sector e StockLocation;
- `organization_memberships` com papéis e escopos;
- categorias, unidades de medida, StockItem e aliases;
- Supplier, contatos, termos, SupplierItem e histórico de preços;
- audit log;
- StockMovement e itens;
- InventoryBalance e InventoryBatch;
- alocações de lote;
- Transfer e itens/alocações;
- InventoryCount e linhas.

### Segurança e integridade

- IDs `uuid`;
- dinheiro `numeric(18,2)`;
- quantidade `numeric(18,3)`;
- FKs compostas por Organization em relações críticas;
- checks de quantidade/custo/transferência;
- RLS habilitado nas tabelas operacionais expostas;
- leitura por membership ativa;
- escrita direta de cadastros limitada por papel;
- ledger/inventário sem política/grant de escrita direta para cliente autenticado;
- preços históricos de fornecedor append-only para clientes autenticados;
- anônimo sem acesso às tabelas operacionais.

### Seed e testes de banco

- `supabase/seed.sql` contém somente dados anonimizados de demonstração;
- `supabase/tests/bootstrap.sql` cria stubs mínimos de Auth para CI PostgreSQL genérico;
- `schema_smoke.sql` valida constraints e RLS.

## CI atual

O workflow possui dois jobs independentes:

### Aplicação

1. `npm ci`;
2. lint;
3. typecheck;
4. testes;
5. build.

### Banco

1. PostgreSQL 17 efêmero;
2. bootstrap Auth;
3. migrations em ordem;
4. seed anonimizado;
5. smoke tests SQL/RLS.

No PR #20 os dois jobs passaram. O job de banco confirmou, entre outros:

- rejeição de FK cross-Organization;
- rejeição de saldo negativo;
- rejeição de transferência origem=destino;
- membro vê somente sua Organization;
- outsider autenticado não vê outra Organization;
- anon não lê tabelas operacionais;
- usuário autenticado não grava diretamente no ledger.

## Persistência da aplicação hoje

A UI ainda usa adapters in-memory. O banco físico está definido e validado, mas a aplicação ainda não foi ligada a um projeto Supabase remoto.

Isso é proposital: o próximo passo é conectar o provedor com segurança e implementar adapters reais sem alterar o domínio.

## Próxima ação

1. integrar o PR #20 na `main`;
2. manter Issue #19 aberta;
3. conectar/criar um projeto Supabase por integração segura quando disponível;
4. adicionar o cliente Supabase e adapters reais começando por cadastros/estoque;
5. implementar as mutações críticas de estoque por operação server-side/RPC transacional, não por INSERT direto nas tabelas do ledger;
6. homologar com seed/demo antes de qualquer dado real.

Consulte `docs/ai/NEXT_ACTION.md`.