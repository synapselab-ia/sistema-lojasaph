# Handoff — Sistema Lojasaph

## Frente atual

**Fase 50 / Issue #138 — EAN e dados fiscais opcionais no cadastro de itens (`REQ-ITEM-003`).**

Branch: `agent/item-fiscal-identifiers`.

Baseline confirmada:

- PR #137 mergeado;
- Issue #136 fechada;
- `main=749894ad6ea013a32ede044d4d70662cd6abcd98`;
- CI pós-merge #498 / `33117294551`: success.

Não refazer Fase 49.

## Inventário da Fase 50

`public.stock_items` já contém `ean`, `ncm` e `cest` desde a migration foundation. Não há gap de schema e não é necessária migration.

Production read-only (`fhbvwyttikrbeaanatlr`) em 2026-08-27:

- 3 itens;
- 0 EAN preenchidos;
- 0 NCM preenchidos;
- 0 CEST preenchidos;
- 3 `internal_code` preenchidos.

O gap está apenas na aplicação: domínio, repository Supabase e `/workspace/produtos` não expunham os campos existentes.

## Recorte aprovado na #138

- EAN, NCM e CEST opcionais em `StockItem`;
- `trim` conservador; branco = ausência;
- persistência vazia como `null`;
- EAN mantém unicidade por Organization já existente no banco;
- tela de Produtos permite criar/editar e consultar os três campos;
- nenhuma regra fiscal automática;
- nenhuma validação de dígito/GTIN, máscara ou comprimento;
- nenhuma consulta externa;
- sessão autenticada + RLS; sem chave privilegiada;
- sem migration/view/RPC/fixture Production.

## Q-006 / Gabarito

Q-006 continua aberta: o `Gabarito` pode representar catálogo de venda/POS separado do item de estoque.

Por isso esta fase não deve:

- importar EAN/NCM/CEST do `Gabarito` automaticamente;
- assumir equivalência entre produto vendido e `stock_item`;
- criar `REQ-ITEM-004`;
- redefinir `internal_code`.

## Arquivos centrais

- `src/modules/catalog/domain/stock-item.ts`;
- `src/modules/catalog/domain/stock-item.test.ts`;
- `src/modules/catalog/adapters/supabase-stock-item-repository.ts`;
- `src/app/workspace/(operacao)/produtos/page.tsx`;
- `docs/modules/master-data.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`.

## Validação esperada

Antes de integrar:

- revisão do diff;
- lint;
- typecheck;
- Vitest;
- production build;
- CI/database/RLS;
- workflows aplicáveis.

Production permanece read-only nesta fase.

## #121 — ON HOLD

Não tocar sem gatilho real. Última checagem válida: 0 buckets, 0 anexos financeiros e 0 runs `automatic_storage`.

Próximo gatilho temporal esperado: primeira execução agendada do Storage backup em 2026-08-28 03:47 America/Sao_Paulo. Também valem primeiro anexo legítimo ou incidente/regressão real.

Sem gatilho: nada de dispatch manual ou fixture.

## Depois da Fase 50

Se #138 estiver concluída e a CI pós-merge estiver verde:

1. não refazer a fase;
2. verificar #121 somente se seu gatilho já tiver ocorrido;
3. fazer reconciliação de requisitos para localizar eventual MUST/SHOULD ainda não entregue;
4. não resolver PENDING por inferência.

Restrições permanentes: RLS é boundary de acesso; nenhum secret no browser/GitHub/docs; sem deploy Vercel rotineiro; repo permanece public por decisão operacional até instrução explícita em contrário.
