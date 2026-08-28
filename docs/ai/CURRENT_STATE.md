# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 50 / Issue #138 — `REQ-ITEM-003` concluída e integrada pelo PR #139.**

Estado integrado confirmado:

- PR #139 `feat: expose EAN and fiscal identifiers on stock items`: merged;
- Issue #138: closed / completed;
- PR #140 integrou a reconciliação documental pós-Fase 50;
- `main=e65d333f2410960b5201669014b062f5e1380542` antes desta atualização de hold;
- CI pós-merge #502 / run `33119305469`: `success`;
- nenhum PR funcional aberto após a integração;
- únicas Issues abertas: #75 e #121, ambas da trilha `REQ-PLAT-005` e ON HOLD.

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

1. **`REQ-PLAT-005`** — #75/#121: PostgreSQL já possui prova real anterior; cobertura automática/scheduling e Storage ainda não têm evidência final, mas toda essa trilha está agora em hold total por decisão do operador até o sistema estar 100% concluído.
2. **Cutover/importação real** — a fundação atende `REQ-IMP-001..004`, mas a escrita operacional real continua bloqueada até existirem fontes congeladas, transformações aprovadas, resolução das questões de negócio aplicáveis, reconciliação e validação do cliente.
3. **Requisitos PENDING** — não podem ser promovidos sem decisão real de negócio, incluindo `REQ-ITEM-004`, `REQ-ITEM-005`, `REQ-STK-007`, `REQ-STK-010`, `REQ-EXP-004`, `REQ-FIN-004`, `REQ-CASH-007` e `REQ-CASH-008`.

Não abrir nova Issue apenas para produzir atividade.

## #75/#121 — TOTALMENTE ON HOLD até sistema 100%

Decisão explícita do operador em 2026-08-28: **não retomar a trilha `REQ-PLAT-005` enquanto o Sistema Lojasaph não estiver 100% concluído**, salvo nova instrução explícita revogando esse hold.

A decisão cobre:

- backup PostgreSQL automático e seu scheduling;
- `Production Storage Backup`;
- Supabase Storage/anexos;
- Cloudflare R2 relacionado a essa trilha;
- restore binário e restore drills pendentes;
- observabilidade/evidência autoritativa de proteção;
- investigação de cron/armamento/configuração de GitHub Actions.

### Evidência preservada antes do hold total

A reconciliação única de 2026-08-28 ocorreu depois das janelas esperadas dos schedules e encontrou:

- nenhum novo run `automatic_storage` persistido;
- nenhum novo run `automatic_database` correspondente ao schedule daquele dia;
- último `automatic_database` autoritativo conhecido: `succeeded` em 2026-08-27, com integridade verificada;
- portanto, o schedule de 2026-08-28 não ficou comprovado como executado corretamente.

A investigação foi deliberadamente interrompida por decisão de prioridade do operador. Essa ausência de prova fica registrada para homologação/finalização, sem abrir frente técnica agora.

Enquanto o hold estiver ativo:

- não investigar schedules ausentes;
- não fazer `workflow_dispatch` para antecipar prova;
- não criar fixture/bucket/anexo sintético em Production;
- não repetir introspecção de Storage/protection runs por rotina;
- não alterar tooling, R2, S3, secrets, variables, retenção, lock/WORM ou guardrails de backup;
- não transformar cron, anexo ou alerta em gatilho automático de retomada;
- manter #75 e #121 abertas e ON HOLD.

## Estado de desenvolvimento

Não há frente funcional ativa após a Fase 50.

A próxima frente deve vir de trabalho real de produto: nova prioridade explícita, bug/regressão funcional, fonte final de migração/cutover ou decisão de negócio que destrave um requisito `PENDING`.

`REQ-PLAT-005` não deve ser escolhida como próxima ação até o marco de sistema 100% concluído, salvo revogação explícita do hold pelo operador.

Nenhum deploy Vercel manual/rotineiro deve ser feito por esta atualização documental.
