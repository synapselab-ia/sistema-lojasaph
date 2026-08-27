# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 50 / Issue #138 — `REQ-ITEM-003` em implementação na branch `agent/item-fiscal-identifiers`.**

Baseline reconciliada antes da Fase 50:

- Fase 49 / PR #137 integrada;
- Issue #136 encerrada;
- `main=749894ad6ea013a32ede044d4d70662cd6abcd98`;
- CI pós-merge #498 / run `33117294551`: success;
- nenhum PR aberto no início da Fase 50;
- Issues #75 e #121 permanecem abertas, mas ON HOLD e fora da frente ativa.

Não refazer Fase 49/#136/#137.

## Fase 50 — #138 / REQ-ITEM-003

### Gap confirmado

O requisito pede permitir EAN/código de barras e atributos fiscais quando aplicáveis.

O schema já possui desde a foundation em `public.stock_items`:

- `ean text null`;
- `ncm text null`;
- `cest text null`;
- unicidade de EAN por Organization.

Porém o domínio `StockItem`, o adapter `SupabaseStockItemRepository` e `/workspace/produtos` não usavam esses campos.

### Production — inventário read-only

Projeto `fhbvwyttikrbeaanatlr`, em 2026-08-27:

- 3 `stock_items`;
- 0 com EAN preenchido;
- 0 com NCM preenchido;
- 0 com CEST preenchido;
- 3 com `internal_code` já existente.

Nenhum dado foi criado/alterado para fabricar evidência.

### Decisões da slice

A menor entrega coerente é somente cadastro/leitura/edição dos campos já persistidos:

- `StockItem.ean`, `ncm` e `cest` opcionais;
- normalização apenas por `trim`;
- branco vira ausência no domínio e `null` na persistência;
- EAN continua usando a unicidade já garantida pelo banco;
- sem validação de dígito verificador, comprimento, máscara ou consulta externa;
- sem validação tributária/obrigatoriedade de NCM/CEST;
- sem cálculo fiscal;
- sem migration/view/RPC;
- browser continua com sessão autenticada + RLS e permissões atuais de catálogo.

### Q-006 continua aberta

O `Gabarito` histórico contém código, EAN, NCM e CEST, mas a documentação ainda não confirma se ele representa produto de venda/POS separado do item de estoque.

A Fase 50 **não**:

- resolve Q-006;
- cria conceito de produto de venda;
- associa/importa automaticamente linhas do `Gabarito` para `stock_items`;
- redefine `internal_code`.

## #121 — ON HOLD

`REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage` continua fora da frente ativa.

Última checagem válida em 2026-08-27 encontrou:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Retomar somente com gatilho real:

1. primeira execução **agendada** do `Production Storage Backup` — janela esperada em 2026-08-28 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo pelo fluxo normal;
3. incidente/regressão real do pipeline Storage.

Sem gatilho: não fazer `workflow_dispatch` artificial, fixture Production ou repetição da mesma introspecção vazia.

A Issue #75 permanece umbrella de proteção de dados e não é frente ativa.

## Próxima transição

Antes de abrir outra frente, reconciliar #138, eventual PR da branch e `main`.

Se a Fase 50 estiver integrada e a CI pós-merge estiver verde:

1. não refazer `REQ-ITEM-003`;
2. verificar se o gatilho real da #121 já ocorreu — apenas uma vez e somente se a data/evento justificar;
3. reconciliar `docs/product/requirements.md` contra o código para identificar eventual MUST/SHOULD ainda não entregue;
4. não iniciar requisitos `PENDING` sem validação de negócio.

## Não fazer

- não reabrir Fase 49/#136 sem regressão concreta;
- não ampliar #138 com POS, tributação ou importação do Gabarito;
- não tocar #121 sem gatilho real;
- não criar dados Production para demonstração;
- não inventar regras de NCM/CEST/EAN;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente.
