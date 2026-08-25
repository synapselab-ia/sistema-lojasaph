# Current State — Sistema Lojasaph

Última atualização: 2026-08-25

## Estado atual

Fase 44 — reconciliação pós-anexos/exportação + `REQ-SUP-003 — Condições comerciais` — **concluída e integrada na `main` pelo PR #99**.

- `main` na entrada da Fase 44: `752572abbc1f3ae64d34500c446ecc24ecfe3530` (PR documental #97);
- merge funcional Fase 44 / PR #99: `82f401bd73036d82fc5ac9418fc7f97e32adc3ba`;
- Issue #98: closed/completed;
- head final validado do PR #99: `20c472255e8bde0bf52c094bace16d7734bb2824`;
- CI #387: success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #188: success;
- Inventory Count Integration #204: success;
- nenhuma migration/DDL/DML ou mutation manual de Production na Fase 44;
- nenhum deploy Vercel;
- Issue operacional preservada: #75 — backup Production, ainda desarmada.

## Decisão da Fase 44

A matriz do MVP foi reconciliada novamente depois das Fases 42–43. Nenhum item `PENDING` ou explicitamente colocado em fase posterior foi promovido.

A única lacuna não-PENDING claramente superior encontrada foi `REQ-SUP-003`:

- `docs/source-data/field-catalog.md` registra na planilha real de fornecedores valor mínimo, dia/agenda de pedido, dia/agenda de entrega, condição de pagamento e observações;
- o runtime anterior expunha apenas fornecedor, documento fiscal, status e contatos;
- o schema já possuía `suppliers.notes` e `supplier_terms`, então a lacuna era de aplicação, não de modelagem.

Evidência completa: `docs/qa/mvp-reconciliation-fase44.md`.

## Entrega funcional

`/workspace/fornecedores` agora permite consultar condições comerciais para membros autorizados e manter os dados para `manageSuppliers = owner/admin/manager/purchases` Organization-wide.

Campos:

- observações do fornecedor;
- pedido mínimo;
- agenda de pedido;
- agenda de entrega;
- condição de pagamento.

Boundary:

- browser client autenticado normal;
- RLS existente continua sendo autoridade;
- nenhum secret/admin client;
- um termo corrente por fornecedor na UI (`valid_to IS NULL`);
- primeira gravação cria a linha corrente; edições atualizam a mesma linha;
- limpar campos não executa DELETE;
- pedido mínimo usa `Money`/decimal exato e rejeita valor negativo;
- agenda permanece texto informativo, sem cron/sugestão de compra.

Não foram incluídos `supplier_items`, comparação de fornecedores, cotações, automação de compra ou versionamento automático de termos.

## Supabase Production

Projeto: `fhbvwyttikrbeaanatlr`.

A Fase 44 apenas inspecionou Production em modo read-only e confirmou:

- `suppliers.notes` e os campos de `supplier_terms` já existiam;
- RLS habilitado em `suppliers` e `supplier_terms`;
- `authenticated`: SELECT/INSERT/UPDATE;
- `anon`: sem SELECT;
- writes exigem `owner/admin/manager/purchases` Organization-wide;
- `supplier_terms` tinha 0 linhas reais antes da feature.

Nenhuma alteração remota foi necessária. O histórico de migrations continua terminando em `20260822195823_finance_attachments`.

## Próxima ação

**Fase 45 — verificar definitivamente `REQ-SUP-004 — Produtos por fornecedor` contra o fluxo real já existente e encerrar a reconciliação funcional do MVP se não houver lacuna operacional comprovada.**

Não assumir que `supplier_items` precisa de nova UI apenas porque a tabela existe. Primeiro provar como os vínculos fornecedor/produto são criados/usados hoje no runtime e no fluxo de compras.

Ver `docs/ai/NEXT_ACTION.md`.

## Fases que não devem ser refeitas

- Fase 41: primeira reconciliação do MVP;
- Fase 42 / #92: anexos financeiros privados;
- Fase 43 / #95: contas a pagar em CSV;
- Fase 44 / #98: condições comerciais de fornecedor;
- Fase 38 / #75: automação de backup já preparada, aguardando ativação operacional.

## Backup Production / #75

Política aprovada permanece:

- RPO 24h;
- backup diário;
- RTO <= 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Pendências somente em computador pessoal/confiável:

- OAuth/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup real + archive/checksum off-site;
- fechar #75.

Não pedir nem receber esses secrets no chat.

## Não fazer

- não reabrir Fases 41–44 sem regressão concreta;
- não promover `PENDING` ou fase posterior por inferência;
- não transformar agenda comercial em automação de compras;
- não expandir automaticamente para SUP-004/SUP-005;
- não criar exportação global;
- não manipular Storage por SQL;
- não criar migration sem necessidade;
- não ativar/fechar #75 sem evidência real;
- não criar deploy Vercel intermediário;
- não importar dados reais/cutover.
