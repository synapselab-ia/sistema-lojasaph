# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 50 / Issue #138 — `REQ-ITEM-003` concluída e integrada pelo PR #139.**

Estado integrado confirmado:

- PR #139 `feat: expose EAN and fiscal identifiers on stock items`: merged;
- Issue #138: closed / completed;
- `main=f30137355fe1b8958cbfe36cf1cd6e515c647558`;
- CI pós-merge #500 / run `33118720928`: `success`;
- nenhum PR aberto após a integração;
- únicas Issues abertas: #75 e #121, ambas da trilha `REQ-PLAT-005` e atualmente ON HOLD.

Não refazer Fase 50/#138/#139.

## Fase 50 — entrega

`public.stock_items` já possuía `ean`, `ncm` e `cest` desde a migration foundation. A Fase 50 fechou somente o gap de aplicação, sem DDL:

- `StockItem` expõe EAN, NCM e CEST opcionais;
- criação/edição aplica apenas `trim` conservador;
- valor em branco vira ausência no domínio e `NULL` na persistência;
- update que não toca o campo preserva o valor existente; branco explícito permite limpar;
- `SupabaseStockItemRepository` lê e persiste os três campos;
- `/workspace/produtos` permite consultar, criar e editar EAN/NCM/CEST;
- a UI declara que não realiza validação fiscal, máscara ou dígito verificador;
- a unicidade de EAN por Organization continua sendo a constraint já existente no banco;
- browser continua sob sessão autenticada + RLS e permissões normais de catálogo;
- nenhuma migration, view, RPC, chave privilegiada no browser ou fixture Production foi criada.

Validação do head funcional `f638abebe844473013d043e6c1bc213878124bd2`:

- CI #499 / `33118596139`: database, lint, typecheck, Vitest e production build verdes;
- Business Transactions Integration #225 / `33118596143`: success;
- Inventory Count Integration #241 / `33118596171`: success.

Production `fhbvwyttikrbeaanatlr` foi consultada somente read-only:

- 3 `stock_items`;
- 0 com EAN;
- 0 com NCM;
- 0 com CEST;
- 3 com `internal_code` já existente.

Nenhum dado Production foi alterado para demonstração.

## Q-006 continua aberta

A existência de EAN/NCM/CEST em `stock_items` não resolve a dúvida sobre o `Gabarito` representar produto de venda/POS separado de item de estoque.

Portanto continuam proibidos sem validação de negócio:

- criar automaticamente produto de venda/POS;
- importar ou associar automaticamente EAN/NCM/CEST do `Gabarito` a `stock_items`;
- redefinir `internal_code`;
- promover `REQ-ITEM-004` por inferência.

## Reconciliação de requisitos após a Fase 50

A revisão de `docs/product/requirements.md`, Issues e código não encontrou um novo MUST/SHOULD funcional independente que justifique uma Fase 51.

A Fase 41 já havia concluído que não existia MUST funcional do núcleo sem cobertura. Depois dela foram fechadas as frentes independentes restantes, entre outras:

- `REQ-FIN-008` — anexos financeiros;
- `REQ-EXPOR-001` — exportação CSV financeira;
- `REQ-SUP-003` — condições comerciais;
- `REQ-SUP-004` — produtos por fornecedor;
- `REQ-STK-011` — estoque mínimo/alertas;
- `REQ-DASH-004` — estoque no Dashboard;
- `REQ-DASH-005` — compras/fornecedores no Dashboard;
- `REQ-ITEM-003` — EAN/dados fiscais.

Os demais SHOULDs do núcleo já possuem implementação anterior, incluindo histórico de preços, pedidos/recebimentos, alertas de vencimento e validades.

### Bloqueios reais restantes

1. **`REQ-PLAT-005`** — #75/#121: PostgreSQL já foi comprovado end-to-end; cobertura operacional completa de Supabase Storage/anexos permanece condicionada a evidência real.
2. **Cutover/importação real** — a fundação atende `REQ-IMP-001..004`, mas a escrita operacional real continua bloqueada até existirem fontes congeladas, transformações aprovadas, resolução das questões de negócio aplicáveis, reconciliação e validação do cliente.
3. **Requisitos PENDING** — não podem ser promovidos sem decisão real de negócio, incluindo `REQ-ITEM-004`, `REQ-ITEM-005`, `REQ-STK-007`, `REQ-STK-010`, `REQ-EXP-004`, `REQ-FIN-004`, `REQ-CASH-007` e `REQ-CASH-008`.

Não abrir nova Issue apenas para produzir atividade.

## #121 — ON HOLD

`REQ-PLAT-005 — Backup e recuperação off-site do Supabase Storage` não é frente ativa enquanto não existir gatilho objetivo.

Última evidência válida em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros;
- 0 runs `automatic_storage`.

Gatilhos válidos:

1. primeira execução **agendada** do `Production Storage Backup` após o armamento — janela esperada em **2026-08-28 03:47 America/Sao_Paulo**;
2. primeiro anexo Production legítimo criado pelo fluxo normal;
3. incidente/regressão real do pipeline Storage.

Até um desses eventos ocorrer:

- não fazer `workflow_dispatch` artificial;
- não criar fixture/objeto Production;
- não repetir a mesma introspecção vazia;
- não alterar tooling/guardrails já comprovados por inércia.

Um snapshot agendado vazio pode provar execução da automação sobre estado vazio, mas não comprova recuperação de binários reais e não autoriza declarar Storage completamente coberto.

## Estado de desenvolvimento

Não há frente funcional ativa após a Fase 50.

A próxima ação é **condicional**, não uma nova feature: observar um gatilho real da #121 ou receber nova prioridade/decisão de negócio/fonte de migração/regressão.

Nenhum deploy Vercel manual/rotineiro foi feito para a Fase 50 ou para esta reconciliação.
