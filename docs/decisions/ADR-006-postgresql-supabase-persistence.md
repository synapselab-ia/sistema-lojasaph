# ADR-006 — PostgreSQL como modelo físico e Supabase como provedor inicial

Data: 2026-08-17
Status: aceito como decisão revisável

## Contexto

As Fases 0–6 estabilizaram o domínio e o ciclo principal de estoque usando repositories/adapters in-memory. O sistema agora precisa de persistência multiusuário, autenticação, isolamento por organização, transações, controle de concorrência, anexos e migrations reproduzíveis.

Continuar ampliando módulos apenas em memória passaria a gerar trabalho descartável e esconderia problemas reais de concorrência/permissão.

## Decisão

### 1. Banco físico

Adotar PostgreSQL como modelo físico relacional.

O schema deve ser versionado por migrations no GitHub. Alterações feitas posteriormente por Dashboard também precisam voltar para migrations/documentação para que o repositório continue sendo a fonte de verdade.

### 2. Provedor hospedado inicial

Adotar Supabase como provedor inicial preferido porque disponibiliza PostgreSQL, Auth, Row Level Security, Storage e fluxo de migrations/local development compatíveis com as necessidades já identificadas.

Essa escolha é de infraestrutura, não de domínio.

### 3. Desacoplamento

O domínio, casos de uso e UI não importam diretamente conceitos do Supabase.

A fronteira permanece:

```text
UI / Routes
   ↓
Use cases / Services
   ↓
Repository interfaces
   ↓
Supabase/PostgreSQL adapters
```

Adapters in-memory continuam existindo para testes rápidos e demonstrações.

### 4. Segurança por padrão

Tabelas operacionais expostas no schema `public` terão RLS habilitado.

O acesso normal será limitado por membership de `Organization` e papel do usuário.

Dados de ledger de estoque não terão políticas de escrita direta para clientes autenticados nesta fase. Mutações críticas deverão passar por operações server-side/RPC transacionais que preservem as invariantes do domínio.

### 5. Chaves e segredos

Usar a nomenclatura atual do Supabase quando o projeto remoto for conectado:

- publishable key para operações cliente permitidas por RLS;
- secret key apenas em ambiente server-side confiável.

Secret key nunca é enviada ao navegador, nunca é adicionada ao GitHub e nunca é usada como substituto de autorização de negócio.

### 6. Migrations antes do projeto remoto

A criação de schema, constraints, RLS, seeds e testes SQL não depende de um projeto remoto existir.

A ligação com o projeto Supabase será uma etapa de implantação. Isso evita fazer o Dashboard remoto virar a única fonte da estrutura do banco.

### 7. Dados reais

Nenhum dado das planilhas reais será incluído nos seeds. Seeds contêm apenas fixtures anonimizados.

## Consequências

- o projeto passa a testar invariantes no banco além do TypeScript;
- RLS entra antes de produção, não como correção posterior;
- estoque real poderá usar transações/locking em vez da fila in-memory;
- anexos poderão usar Supabase Storage no futuro sem mudar `Attachment` no domínio;
- autenticação poderá usar Supabase Auth sem transformar `auth.users` em cadastro de funcionário;
- trocar o provedor de Postgres no futuro continua possível, embora Auth/Storage/RLS possam exigir adapters/migrations específicos.

## Fontes técnicas verificadas em 2026-08-17

A decisão foi conferida contra a documentação oficial atual do Supabase sobre local development/migrations, RLS, Auth, Storage e API keys.

## Revisão

Reavaliar somente se custo, requisitos de infraestrutura, disponibilidade, compliance ou limitações técnicas concretas justificarem outro provedor. A revisão não deve alterar as regras de domínio já documentadas.