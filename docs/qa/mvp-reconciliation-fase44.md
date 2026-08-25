# QA — Fase 44 / Reconciliação pós-anexos e exportação

Data: 2026-08-25
Issue funcional selecionada: #98 — `REQ-SUP-003 — Condições comerciais`
PR funcional: #99 — squash-mergeado em `82f401bd73036d82fc5ac9418fc7f97e32adc3ba`

## Objetivo

Reconciliar novamente o MVP depois das Fases 42–43, sem abrir feature por inércia e sem promover requisito `PENDING` ou item explicitamente colocado em fase posterior.

## Estado real na entrada

- `main`: `752572abbc1f3ae64d34500c446ecc24ecfe3530` (PR documental #97);
- nenhum PR aberto;
- única Issue aberta: #75 — backup automático real de Production, desarmada por condição operacional;
- CI de `main` #384: success;
- Fase 42 / #92: anexos financeiros privados concluídos;
- Fase 43 / #95: primeira exportação operacional em CSV concluída.

## Matriz dos SHOULDs relevantes

| Requisito | Evidência atual | Decisão da Fase 44 |
| --- | --- | --- |
| `REQ-ITEM-003` código de barras/fiscal | schema possui EAN/NCM/CEST, mas leitura de barcode está em fase posterior e a fonte `Gabarito` ainda depende da distinção de item de venda | não promover |
| `REQ-STK-011` estoque mínimo | explicitamente colocado em fase posterior no `scope.md` | não promover |
| `REQ-EXP-003` alertas de validade | Dashboard já mostra lotes vencidos e vencendo em horizonte 7/15/30 dias | coberto no MVP básico |
| `REQ-SUP-003` condições comerciais | fonte real possui valor mínimo, pedido/entrega, pagamento e observações; schema já possui os campos, mas runtime não os expunha | **lacuna inequívoca selecionada e entregue** |
| `REQ-SUP-004` produtos por fornecedor | `supplier_items` existe e participa do modelo de compras; manutenção comercial completa exige recorte próprio | não co-agrupar com #98; reavaliar separadamente na Fase 45 |
| `REQ-SUP-005` histórico de preços | `supplier_prices` existe e emissão de pedido registra preço observado; análise avançada de custo permanece em fase posterior | núcleo de histórico coberto; não criar BI/comparação |
| `REQ-PUR-001/002` pedido e recebimento | fluxo create/issue/partial receive/full receive/cancel está integrado e homologado | coberto |
| `REQ-FIN-008` anexos | Fase 42 / #92 | coberto |
| `REQ-FIN-009` alertas de vencimento | Dashboard mostra vencidas, vence hoje e a vencer no horizonte configurável | coberto no MVP básico |
| `REQ-DASH-004/005` estoque/compras | Dashboard possui sinais operacionais básicos de validades, inventário, transferências e entregas | básico coberto; dashboards avançados ficam em fase posterior |
| `REQ-EXPOR-001` exportação | Fase 43 entregou contas a pagar em CSV com processo real e RLS | não expandir automaticamente para `exportar tudo` |

Itens `PENDING`, Q-001..Q-025 e funcionalidades explicitamente de fase posterior continuam fora sem decisão de produto.

## Por que `REQ-SUP-003` é diferente

`docs/source-data/field-catalog.md` registra diretamente na planilha `Fornecedores Tabatinga`:

- valor mínimo;
- pedido dia;
- entrega dia;
- forma de pagamento;
- observações.

O runtime anterior só expunha nome fantasia, documento fiscal, status e contatos. A ausência era portanto comprovada em um processo real já documentado.

Ao mesmo tempo, a migration foundation já contém:

- `suppliers.notes`;
- `supplier_terms.minimum_order_value`;
- `supplier_terms.payment_terms`;
- `supplier_terms.order_schedule`;
- `supplier_terms.delivery_schedule`;
- `supplier_terms.valid_from/valid_to`.

Não havia motivo para criar schema novo.

## Production — inspeção somente leitura

Projeto: `fhbvwyttikrbeaanatlr`.

Em 2026-08-25 foi confirmado:

- `supplier_terms` e `suppliers.notes` existem com os tipos esperados;
- RLS está habilitado em `suppliers` e `supplier_terms`;
- `authenticated` possui SELECT/INSERT/UPDATE;
- `anon` não possui SELECT;
- INSERT/UPDATE exigem `owner/admin/manager/purchases` Organization-wide;
- `supplier_terms` possuía `0` linhas reais antes da feature.

Nenhum DDL, DML, migration ou mutation manual foi executado em Production.

## Vertical slice #98 / #99

A entrega usa o schema existente e adiciona ao cadastro `/workspace/fornecedores`:

- observações;
- pedido mínimo;
- agenda de pedido;
- agenda de entrega;
- condição de pagamento.

Semântica deliberada:

- um termo corrente por fornecedor na UI;
- leitura de `valid_to IS NULL`, ordenada por `valid_from` e criação;
- primeira gravação cria a linha corrente usando `valid_from` default do banco;
- edições atualizam a mesma linha;
- limpar campos não faz DELETE;
- nenhum versionamento temporal automático é inventado;
- agenda permanece texto informativo, não cron/automação de compras.

## Validação

Primeiro head funcional `8f4c51821a8ccec36afd66f0d8229d4c5ce36036`:

- CI #385 — success;
- Business Transactions Integration #186 — success;
- Inventory Count Integration #202 — success.

Head final do PR, incluindo QA e documentação de módulo: `20c472255e8bde0bf52c094bace16d7734bb2824`:

- CI #387 — success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #188 — success;
- Inventory Count Integration #204 — success.

PR #99 foi squash-mergeado em `82f401bd73036d82fc5ac9418fc7f97e32adc3ba` e fechou a Issue #98 como `completed`.

Os testes novos cobrem:

- trim e vazio → ausência/NULL;
- decimal monetário exato;
- rejeição de valor mínimo negativo/malformado;
- ausência de secret/admin client;
- filtro de termo corrente;
- ausência de DELETE no gateway.

## Conclusão

A Fase 44 encontrou exatamente uma lacuna funcional claramente superior e a entregou em #98/#99. Nenhuma segunda frente foi aberta. A Fase 45 deve verificar `REQ-SUP-004` contra o fluxo real já existente; se não houver gap operacional comprovado, o MVP funcional deve ser registrado como reconciliado em vez de abrir novas features por inércia.
