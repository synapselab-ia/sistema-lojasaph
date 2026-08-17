# ADR-001 — Hierarquia organizacional e defaults P0

Data: 2026-08-17
Status: aceito como decisão de projeto revisável

## Contexto

A engenharia reversa das planilhas identificou conceitos suficientes para construir o modelo inicial, mas algumas regras não podem ser confirmadas apenas pelos arquivos legados. O usuário autorizou adotar a interpretação mais provável quando a decisão puder permanecer configurável/reversível, evitando bloquear o projeto por detalhes ainda não confirmados com o cliente final.

O sistema também deve permitir expansão futura para outros negócios do mesmo proprietário sem reescrever a arquitetura.

## Decisão 1 — Hierarquia organizacional

Adotar a seguinte hierarquia conceitual:

```text
Organization / Grupo
  └── Business / Negócio ou marca
      └── Unit / Unidade física ou operacional
          ├── Sector / Setor ou área operacional
          └── StockLocation / Local de estoque
```

### Organization

Representa o grupo/proprietário que reúne um ou mais negócios.

### Business

Representa um negócio, operação ou marca que pode possuir uma ou mais unidades. Essa camada permite que o sistema futuramente atenda outros restaurantes, quiosques, lojas ou operações do mesmo proprietário sem misturar configurações e relatórios indevidamente.

### Unit

Representa uma unidade física ou operacional. Como default de modelagem, Tabatinga, Capricórnio e Barba Negra serão tratados como unidades sob a mesma Organization até evidência em contrário.

A associação exata de cada unidade a uma marca/negócio e a eventual entidade jurídica poderá ser configurada posteriormente sem mudança estrutural.

### Sector

Cozinha, Quiosque e Empório serão tratados inicialmente como setores/áreas operacionais de uma unidade, e não como empresas independentes.

### StockLocation

Continua separado de Sector. Um setor pode consumir de um estoque compartilhado e uma unidade pode possuir vários locais físicos/lógicos de estoque.

### LegalEntity — futuro/configurável

CNPJ, razão social e entidade jurídica não serão inferidos dos nomes das unidades. Se necessário, o domínio poderá relacionar Business/Unit a uma ou mais entidades jurídicas sem confundir estrutura operacional com estrutura fiscal.

## Decisão 2 — Campo checkbox legado sem significado

O checkbox sem título existente na planilha Tabatinga ↔ Capricórnio não participará de nenhuma regra central até seu significado ser conhecido.

Na migração, quando tecnicamente viável, seu valor original será preservado em metadados de origem/importação para evitar perda de informação.

## Decisão 3 — `Valor total em haver`

Tratar inicialmente como indicador de conciliação/acerto interno entre unidades, derivado do valor retirado menos valor devolvido.

Esse indicador não altera diretamente o saldo físico de estoque. Caso o cliente confirme que existe cobrança financeira real entre unidades, será criado fluxo explícito de settlement/conciliação financeira em vez de misturar dinheiro com movimentação física.

## Decisão 4 — Transferência e empréstimo

Modelar como processos semanticamente distintos:

- **Transferência:** mudança de posse/local de estoque sem expectativa obrigatória de retorno;
- **Empréstimo:** saída temporária com quantidade pendente de retorno, podendo ter devolução parcial e data prevista.

Ambos podem reutilizar a infraestrutura de movimentações de estoque, mas suas regras de negócio não serão idênticas.

## Decisão 5 — Catálogo de vendas versus estoque

Adotar conceitos separados:

- `StockItem`: insumo, mercadoria ou bem controlado fisicamente;
- `SalesItem`: item vendido/cardápio/POS.

Um SalesItem poderá futuramente consumir um ou mais StockItems por receita/ficha técnica/BOM. Não exigir essa relação no MVP.

## Decisão 6 — Escopo inicial de vendas/PDV

O MVP não será um PDV completo.

O módulo de caixa receberá/registrará totais consolidados por forma de pagamento e demais informações de fechamento. A arquitetura deverá permitir importação ou integração futura com POS/PDV sem exigir reescrita do caixa.

## Decisão 7 — Custeio inicial de estoque

Adotar **custo médio ponderado** como default para valorização gerencial do estoque.

Preservar também custo de compra/lote e snapshots de custo relevantes para auditoria, histórico de fornecedores, perdas e análises futuras.

A estratégia física de saída por validade (ex.: FEFO) é independente do método contábil/gerencial de valorização e será decidida separadamente.

## Consequências

1. O sistema nasce multi-negócio, não apenas multi-loja.
2. Novos negócios do mesmo proprietário podem ser adicionados sem novo produto ou novo banco.
3. Relatórios poderão ser filtrados por grupo, negócio, unidade, setor e local.
4. Permissões poderão usar os mesmos níveis de escopo.
5. Estrutura fiscal não fica hardcoded na estrutura operacional.
6. Dados legados ambíguos não contaminam as regras novas.
7. O MVP permanece enxuto, mas pronto para integração futura com vendas/PDV.

## Regra de revisão

Esses defaults podem ser revisados se o cliente fornecer informação mais precisa. A revisão deve ser registrada em novo ADR ou atualização explícita desta decisão, preservando o histórico da mudança.