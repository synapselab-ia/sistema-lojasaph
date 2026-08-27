# Next Action — Sistema Lojasaph

## Frente em andamento

**Fase 50 / Issue #138 — `REQ-ITEM-003 — Código de barras e dados fiscais`.**

Branch: `agent/item-fiscal-identifiers`.

A Fase 49 / PR #137 já foi integrada e a CI pós-merge #498 (`33117294551`) está verde. Não refazer #136/#137.

## Nesta frente

O schema já possui `stock_items.ean`, `ncm` e `cest`; a tarefa é somente fechar o gap de aplicação.

Recorte obrigatório:

1. `StockItem` deve suportar EAN/NCM/CEST opcionais;
2. normalizar somente espaços externos; branco = ausência;
3. repository Supabase deve ler/persistir os campos existentes;
4. `/workspace/produtos` deve permitir criar/editar e consultar os valores;
5. manter a unicidade de EAN já existente no banco;
6. não criar migration, regra fiscal, lookup externo ou importação automática;
7. manter sessão autenticada + RLS.

Q-006 continua aberta: não inferir que o `Gabarito` é o catálogo de `stock_items` e não iniciar `REQ-ITEM-004`.

## Validação e integração

Se ainda não houver PR da branch:

1. revisar o diff contra `main`;
2. confirmar que só existem mudanças da #138 e documentação associada;
3. abrir PR fechando #138;
4. aguardar os workflows oficiais;
5. corrigir apenas falhas reais de CI/review;
6. integrar somente com o head final verde;
7. confirmar Issue fechada, novo SHA da `main` e CI pós-merge.

Não fazer deploy Vercel manual/rotineiro para provar a entrega.

## Depois do merge da Fase 50

Antes de iniciar outra implementação:

1. confirmar #138 fechada e a CI pós-merge verde;
2. **não refazer `REQ-ITEM-003`**;
3. verificar #121 somente se houver gatilho real novo;
4. reconciliar `docs/product/requirements.md` com o código/Issues para identificar eventual requisito MUST/SHOULD ainda não implementado;
5. se não houver frente independente comprovada, parar a expansão técnica e aguardar validação de negócio para requisitos PENDING.

## #121 — continua ON HOLD

Última evidência válida em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos:

- primeira execução **agendada** do Storage backup — janela esperada 2026-08-28 03:47 America/Sao_Paulo;
- primeiro anexo Production legítimo;
- incidente/regressão real.

Sem gatilho: não fazer dispatch manual, fixture ou revalidação repetitiva.

## Fora de escopo

- POS/produto de venda enquanto Q-006 estiver aberta;
- importação automática do `Gabarito`;
- validação/consulta de EAN/GTIN/NCM/CEST;
- cálculo tributário ou emissão fiscal;
- redefinição de `internal_code`;
- requisitos PENDING por inferência;
- deploy Vercel rotineiro;
- tornar o repositório private automaticamente.
