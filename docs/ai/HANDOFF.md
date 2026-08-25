# Handoff — Sistema Lojasaph

## Estado

Fase 45 — `REQ-SUP-004 — Produtos por fornecedor` — está **concluída e integrada funcionalmente na `main`**.

- base da Fase 45: `d774f5ea96d28bffb6fcf377427b0ff6845e458f`;
- Issue #101: closed/completed;
- PR #102 — `feat(suppliers): maintain supplier items`: squash-mergeado;
- merge funcional: `6a86922ef705af25a4897068e223b0e26c1b670a`;
- head final validado: `c9898f7dd90fd453e14775c89a336fc49636463f`;
- CI #393 — success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #191 — success;
- Inventory Count Integration #207 — success;
- nenhuma migration/DDL/DML ou mutation manual de Production;
- nenhum deploy Vercel;
- #75 continua aberta/desarmada.

A continuidade documental pode fazer o HEAD final de `main` ficar posterior ao merge funcional acima. O SHA `6a86922e...` identifica a entrega da Fase 45 e não deve ser confundido com eventual commit documental posterior.

**Não refazer a Fase 45.** O próximo ciclo é a Fase 46 definida em `docs/ai/NEXT_ACTION.md`.

## O que a Fase 45 comprovou

A manutenção básica de `supplier_items` era uma lacuna real, não uma feature escolhida por conveniência:

- `/workspace/compras` já dependia de `supplier_items` ativos para permitir itens no pedido;
- sem vínculo, a UI informava `Fornecedor sem itens de compra ativos`;
- o gateway de compras apenas lia esses registros;
- não existia adapter Supabase/UI persistente para criar ou editar o vínculo;
- o repository antigo de SupplierItem era apenas in-memory e não cobria `purchase_unit`/`units_per_package`;
- os dois vínculos existentes em Production eram coerentes com seed/demo;
- import staging continua dry-run e não escreve tabelas operacionais.

A fonte histórica `Fornecedores Tabatinga` também possui Produto, Medida e Quantidade por embalagem, portanto o recorte tinha processo e dados de origem concretos.

Ver `docs/qa/supplier-items-maintenance.md`.

## Contrato entregue

`/workspace/fornecedores` agora possui painel `Produtos do fornecedor`.

Leitura:

- usa browser client autenticado normal;
- filtra explicitamente `organization_id` e `supplier_id`;
- a primeira slice trabalha somente com vínculo default `supplier_sku IS NULL`;
- membros autorizados pela RLS podem consultar os vínculos.

Escrita:

- UX somente para `manageSuppliers`;
- RLS final exige `owner/admin/manager/purchases` Organization-wide;
- pode criar vínculo para produto ativo do catálogo;
- pode manter `purchase_unit` opcional;
- pode manter `units_per_package` opcional e positivo, com até três casas decimais via `Quantity`;
- pode ativar/inativar;
- criação procura primeiro vínculo default existente do mesmo fornecedor/produto e o reutiliza/reativa;
- edição não troca silenciosamente o produto do vínculo;
- não existe DELETE nesta slice e `authenticated` também não possui privilégio DELETE em `supplier_items`.

A unidade/embalagem permanece informação comercial. O pedido continua recebendo quantidade na unidade-base do estoque; não foi criada conversão automática de caixa/pacote.

## SUP-005 / preço observado

Não abrir automaticamente uma nova frente para `REQ-SUP-005`.

O núcleo de histórico já existe:

- o preço efetivo é informado no pedido;
- `issue_purchase_order` registra o preço observado em `supplier_prices`;
- compras consegue consultar o preço observado mais recente.

A Fase 45 deliberadamente não adicionou:

- preço/package price manual no cadastro do fornecedor;
- cotação;
- comparação entre fornecedores;
- sugestão automática de compra;
- BI/histórico avançado de custo.

Esses itens precisam de prioridade explícita e/ou regras de negócio ainda PENDING.

## Production / Supabase

Projeto `fhbvwyttikrbeaanatlr` foi somente inspecionado read-only.

Confirmado:

- `supplier_items` já contém os campos necessários;
- RLS habilitado;
- `authenticated`: SELECT/INSERT/UPDATE e sem DELETE;
- `anon`: sem SELECT;
- SELECT exige membership da Organization;
- INSERT/UPDATE exigem `owner/admin/manager/purchases` Organization-wide;
- havia 2 vínculos ativos antes da feature, coerentes com os dados demo/seed.

Nenhuma alteração remota foi necessária. A checagem pós-merge confirmou que o histórico hospedado continua terminando em `20260822195823_finance_attachments`. Não criar migration retrospectiva para a Fase 45.

## Estado do MVP após Fase 45

O núcleo funcional passa a ser tratado como **reconciliado**. Não há outra lacuna não-PENDING comprovada que justifique abrir automaticamente uma feature.

Isso não equivale a dizer que o sistema está pronto para migração/cutover real.

A fundação de importação já possui staging, idempotência, validação, preview/dry run e relatório, mas `ready` significa apenas preview validado. Não existe hoje command que aplique o lote às tabelas operacionais.

Antes de dados reais ainda existem condições como:

- fontes reais finais congeladas e armazenadas com segurança;
- importadores específicos por fonte;
- regras de transformação aprovadas;
- resolução das questões de negócio necessárias em `open-questions.md`;
- reconciliação e validação de amostras;
- estratégia/execução de backup real antes do cutover;
- definição e aceite da data/hora de corte;
- mapeamento das pessoas reais, memberships, roles e escopos;
- procedimento para interromper ou controlar uso paralelo das planilhas.

## Próxima ação — Fase 46

**Reconciliar a prontidão operacional para homologação e cutover sem executar importação real, sem criar/invitar usuários reais, sem manipular secrets e sem abrir nova feature funcional por inércia.**

A Fase 46 deve produzir uma matriz/checklist objetiva separando:

1. fundações já prontas e comprovadas;
2. decisões de negócio/PENDING que realmente bloqueiam etapas futuras;
3. pré-condições operacionais, credenciais e fontes reais que dependem do usuário/ambiente confiável;
4. funcionalidades futuras que não bloqueiam o MVP básico.

Inspecionar especialmente:

- `docs/modules/imports.md`;
- `docs/source-data/migration-plan.md`;
- `docs/product/open-questions.md`;
- `docs/operations/bootstrap-owner.md`;
- `docs/operations/environments.md`;
- `docs/operations/backup-restore.md`;
- QA de importação, validação e isolamento.

Se houver uma preparação operacional totalmente independente de secrets, dados reais e decisões ainda abertas, ela pode ser delimitada de forma explícita. Caso contrário, documentar os bloqueios e parar — não criar Issue para parecer que existe trabalho funcional pendente.

## Backup Production / #75

Não refazer a automação. Política já aprovada:

- RPO 24h;
- diário;
- RTO <= 4h;
- Drive privado;
- retenção 30 dias;
- alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR.

Pendências somente em computador pessoal/confiável:

- OAuth/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup real + archive/checksum;
- fechar #75.

Nunca pedir secrets no chat.

## Não fazer

- não reabrir Fases 41–45 sem regressão concreta;
- não criar SUP-005 avançado, cotação, comparação ou sugestão por inércia;
- não promover item `PENDING` por inferência;
- não criar outra exportação/dashboard por conveniência;
- não criar migration sem necessidade;
- não contornar RLS com service/admin client;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não importar planilhas reais nem executar cutover sem critérios/aceite;
- não criar/invitar pessoas reais sem aprovação e mapeamento de roles/escopos;
- não criar deploy Vercel só para auditoria.