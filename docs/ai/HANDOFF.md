# Handoff — Sistema Lojasaph

## Estado

Fase 44 está **concluída e integrada**.

- `main` na entrada: `752572abbc1f3ae64d34500c446ecc24ecfe3530`;
- Issue #98 — `REQ-SUP-003 — Condições comerciais`: closed/completed;
- PR #99 — `feat(suppliers): expose commercial terms`: squash-mergeado;
- merge SHA: `82f401bd73036d82fc5ac9418fc7f97e32adc3ba`;
- head final validado: `20c472255e8bde0bf52c094bace16d7734bb2824`;
- CI #387 — success;
- Business Transactions #188 — success;
- Inventory Count #204 — success;
- nenhum deploy Vercel;
- nenhuma migration/DDL/DML ou mutation manual de Production;
- #75 continua aberta/desarmada.

**Não refazer a Fase 44.** A próxima frente é a Fase 45 definida em `docs/ai/NEXT_ACTION.md`.

## O que a reconciliação decidiu

Depois de anexos (#92) e da primeira exportação (#95), a Fase 44 revisou os SHOULDs restantes sem promover `PENDING` nem fase posterior.

`REQ-SUP-003` foi a única lacuna claramente superior porque:

- existe processo real documentado na planilha de fornecedores;
- os campos ausentes no runtime eram valor mínimo, agenda de pedido/entrega, condição de pagamento e observações;
- `supplier_terms`/`suppliers.notes` já existiam desde a foundation;
- não exigia inventar semântica, novo schema ou compra avançada.

Ver `docs/qa/mvp-reconciliation-fase44.md`.

## Contrato entregue em fornecedores

`/workspace/fornecedores` possui painel de condições comerciais por fornecedor.

Leitura:

- todos os membros autorizados pela RLS podem consultar;
- usa browser client autenticado normal;
- termo corrente = `valid_to IS NULL`, com escolha determinística do mais recente por `valid_from`/criação.

Escrita:

- UX somente para `manageSuppliers`;
- RLS final exige `owner/admin/manager/purchases` Organization-wide;
- observações ficam em `suppliers.notes`;
- pedido mínimo/pagamento/agendas ficam em `supplier_terms`;
- primeiro save cria a linha corrente se houver conteúdo comercial;
- saves seguintes atualizam essa linha;
- limpar campos de uma linha já existente grava NULL, não DELETE;
- não existe versionamento temporal automático nesta slice.

Validação:

- pedido mínimo usa `Money`, preserva decimal exato e não aceita negativo;
- strings são trimadas; vazio vira ausência/NULL;
- gateway/panel não usam secret/admin client;
- agenda permanece texto livre informativo, sem automação.

## Production / Supabase

Projeto `fhbvwyttikrbeaanatlr` foi somente inspecionado read-only.

Confirmado antes da implementação:

- colunas necessárias já presentes;
- RLS habilitado;
- `authenticated` com SELECT/INSERT/UPDATE;
- `anon` sem SELECT;
- policies de write Organization-wide para `owner/admin/manager/purchases`;
- 0 linhas reais em `supplier_terms` naquele momento.

Não criar migration retrospectiva para a Fase 44. O migration history continua terminando em `20260822195823_finance_attachments`.

## Próxima ação — Fase 45

Revisar **`REQ-SUP-004 — Produtos por fornecedor`** como o próximo ponto de decisão, não como feature pré-aprovada.

A pergunta é: o fluxo real atual já mantém de forma suficiente os vínculos `supplier_items` usados pelas compras, ou existe uma lacuna operacional comprovada antes de operar com dados reais?

A Fase 45 deve:

- inspecionar schema, adapters e UI de `supplier_items`/`supplier_prices` e compras;
- confrontar com os campos reais do catálogo por fornecedor (`produto`, medida, quantidade/embalagem, preço unitário/pacote);
- separar manutenção básica de vínculo fornecedor-produto de cotações/comparação/sugestão de compra, que ficam fora;
- abrir no máximo uma Issue se a ausência estiver comprovada e for material para o MVP;
- se o fluxo atual já for suficiente, registrar SUP-004 como coberto e **encerrar a abertura automática de novas frentes funcionais do MVP**.

Não puxar SUP-005 avançado, outra exportação ou dashboards avançados por conveniência.

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

- não reabrir Fases 41–44 sem regressão;
- não versionar termos comerciais automaticamente sem nova regra;
- não transformar agenda em cron/sugestão de compra;
- não misturar SUP-004 com cotações/comparação avançada;
- não promover `PENDING`;
- não criar migration sem necessidade;
- não contornar RLS com service/admin client;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não criar deploy Vercel só para teste;
- não importar dados reais/cutover.
