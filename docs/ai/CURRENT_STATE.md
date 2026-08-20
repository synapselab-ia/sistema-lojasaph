# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 29 — auditoria de `REQ-PLAT-003 — Validação de dados` — foi concluída sem lacuna reproduzível.

`REQ-PLAT-003` é considerado **atendido/verificado**: regras essenciais amostradas possuem barreira autoritativa em domínio/value objects, RPCs/server e/ou PostgreSQL conforme a natureza da regra. Nenhuma regra crítica auditada depende exclusivamente da UI.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline antes da documentação da Fase 29: `6c9ec5d9efb527f1df4fe7eff183444527442a4b`
- matriz de auditoria: `docs/qa/data-validation.md`
- commit da matriz: `370b37161150bcf2eac3afb4afb9d8bb80d96e10`
- Issues abertas ao iniciar a auditoria: 0
- PRs abertos ao iniciar a auditoria: 0
- nenhuma Issue criada, porque não houve lacuna concreta
- nenhum patch funcional
- nenhuma migration/DDL
- nenhuma alteração de RLS, grants, roles, Auth ou dados remotos
- nenhum deployment Vercel

A última validação funcional permanece a Fase 28:

- CI #301 — success (`database`, lint, typecheck, Vitest e production build)
- Business Transactions Integration #153 — success
- Inventory Count Integration #169 — success

## REQ-PLAT-003 — verificado

A auditoria separou validação de UI, domínio, RPC/server e banco.

### Domínio/value objects

- `Money` normaliza valores monetários para até 2 casas decimais e rejeita formato/overflow inválido;
- `Quantity` normaliza quantidades para até 3 casas e rejeita formato/overflow inválido;
- serviços de Estoque aplicam positividade/não negatividade e invariantes de transferência/inventário;
- cadastro de item exige categoria, nome e unidade normalizados;
- fornecedor exige nome e impede múltiplos contatos primários no domínio.

### RPC/server

As implementações `private.*` hospedadas foram inspecionadas somente em leitura. Elas revalidam, entre outros:

- quantidade/custo, item/local ativo, estoque/lote e relações de devolução;
- origem/destino e lifecycle de transferências;
- completude/stale/custo/lote de inventário;
- itens/quantidade/preço/fornecedor/local/lifecycle de compras;
- tipo, parcelas, datas, unidade/setor/fornecedor, pagamentos/estornos/cancelamento em Financeiro;
- identidade de configuração, enums, valores, datas e sessão aberta em Caixa.

### PostgreSQL

A inspeção remota confirmou:

- `numeric(18,2)` para dinheiro crítico e `numeric(18,3)` para quantidades críticas;
- `CHECK`s de positividade/não negatividade, enums e lifecycle;
- FKs compostas com `organization_id` nas relações críticas;
- `UNIQUE`s e índices parciais para invariantes de identidade/cardinalidade;
- intervalos de taxa e sequenciamento de transferência protegidos;
- política de saldo negativo implementada por trigger por local, não por check global rígido.

O aparente desaparecimento de `inventory_balances_quantity_on_hand_check` não é drift: a migration transacional de retirada removeu intencionalmente o check global e instalou `private.enforce_inventory_balance_negative_policy()`. O trigger remoto `inventory_balances_negative_policy` está presente e só permite saldo negativo em local com `allow_negative_stock=true`.

### Testes reaproveitados

Não foi criada suíte duplicada. A matriz referencia as suites existentes de schema, Estoque, Transferências, Inventário, Compras, Financeiro, Caixa, permissões e hardening.

Detalhes: `docs/qa/data-validation.md`.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17, foi usado apenas para introspecção SQL read-only nesta auditoria.

Nenhuma função, constraint, trigger, migration history, tabela, dado, policy, grant ou configuração foi modificada.

## Vercel Production

`git.deploymentEnabled=false` permanece deliberadamente preservado.

Último Production intencional permanece no deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`, commit hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

Nenhum deployment foi criado na Fase 29.

## Próxima ação

Auditar `REQ-PLAT-004 — Migrações de banco`.

Há um ponto concreto para esclarecer antes de declarar o requisito fechado: a história hospedada em `supabase_migrations.schema_migrations` possui versões/timestamps históricos que não coincidem literalmente com alguns filenames atuais em `supabase/migrations/` — por exemplo, o conteúdo de `inventory` aparece no remoto sob versão `20260817214649`, enquanto o arquivo versionado atual é `20260817191000_inventory.sql`.

Isso **não foi classificado como defeito nesta sessão**. A próxima auditoria deve comparar a linhagem completa, distinguir renumeração/histórico de um drift real e comprovar que um ambiente novo pode ser reconstruído apenas pelas migrations versionadas do repositório.

## Não repetir

- não reabrir `REQ-PLAT-002` ou `REQ-PLAT-003` sem nova regressão concreta;
- não criar Issue de validação só para aumentar cobertura;
- não alterar o trigger de saldo negativo: a diferença em relação ao check original é intencional;
- não editar `supabase_migrations.schema_migrations` manualmente;
- não aplicar DDL remoto durante a auditoria de migrations sem evidência e plano explícitos;
- não reativar bootstrap ou auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
