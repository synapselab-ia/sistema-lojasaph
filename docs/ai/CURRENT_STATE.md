# Current State — Sistema Lojasaph

Última atualização: 2026-08-25

## Estado atual

Fase 45 — `REQ-SUP-004 — Produtos por fornecedor` — **concluída e integrada funcionalmente na `main` pelo PR #102**.

- base da Fase 45: `d774f5ea96d28bffb6fcf377427b0ff6845e458f`;
- Issue #101: closed/completed;
- PR #102: squash-mergeado;
- merge funcional: `6a86922ef705af25a4897068e223b0e26c1b670a`;
- head final validado do PR #102: `c9898f7dd90fd453e14775c89a336fc49636463f`;
- CI #393: success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #191: success;
- Inventory Count Integration #207: success;
- nenhuma migration/DDL/DML ou mutation manual de Production na Fase 45;
- nenhum deploy Vercel;
- Issue operacional preservada: #75 — backup Production, ainda desarmada.

A continuidade documental desta fase pode gerar um commit posterior ao merge funcional acima; o SHA `6a86922e...` identifica a entrega funcional, não precisa ser o HEAD final de `main` ao ler este arquivo.

## Decisão da Fase 45

A investigação provou uma lacuna operacional real em `REQ-SUP-004`:

- compras já dependiam de `supplier_items` ativos;
- sem vínculo, o pedido não oferecia produto para aquele fornecedor;
- o runtime não possuía caminho persistente para criar/manter `supplier_items`;
- os vínculos existentes em Production eram apenas demo/seed;
- import staging é dry-run e deliberadamente não escreve tabelas operacionais.

A Fase 45 fechou somente a manutenção básica necessária, sem transformar SupplierItem em módulo de cotação/comparação.

Evidência: `docs/qa/supplier-items-maintenance.md`.

## Entrega funcional

`/workspace/fornecedores` agora permite consultar e manter os produtos compráveis de cada fornecedor.

Campos/ações da slice:

- vínculo fornecedor ↔ produto do catálogo;
- unidade de compra opcional (`purchase_unit`);
- quantidade por embalagem opcional (`units_per_package`);
- ativar/inativar vínculo;
- reativar/reutilizar vínculo default existente em vez de criar duplicata acidental;
- `supplier_sku` e múltiplas variantes permanecem fora desta primeira slice.

Boundary:

- browser client autenticado normal;
- filtros explícitos de Organization e fornecedor;
- RLS existente continua sendo autoridade;
- UX de escrita espelha `manageSuppliers = owner/admin/manager/purchases` Organization-wide;
- `authenticated` não possui DELETE em `supplier_items`;
- inativação usa `active=false`;
- nenhum secret/admin client;
- `units_per_package` usa `Quantity`, aceita apenas valor positivo com até três casas decimais.

Compras continuam usando quantidade na unidade-base do estoque. Não foi criada conversão automática de embalagem.

## SUP-005 / preços

O núcleo de `REQ-SUP-005 — Histórico de preços` continua sendo considerado atendido pelo fluxo já existente:

- o preço efetivo é informado no pedido;
- ao emitir o pedido, `issue_purchase_order` registra o preço observado em `supplier_prices`;
- a leitura de compras usa o preço observado mais recente quando disponível.

Não abrir por inércia:

- cotação;
- comparação de fornecedores;
- package price manual no cadastro;
- BI/histórico avançado de custo;
- sugestão automática de compra.

Esses itens exigem prioridade explícita de produto e/ou regras ainda PENDING.

## Supabase Production

Projeto: `fhbvwyttikrbeaanatlr`.

A Fase 45 apenas inspecionou Production em modo read-only e confirmou:

- `supplier_items` já possuía todos os campos necessários;
- RLS habilitado;
- `authenticated`: SELECT/INSERT/UPDATE e sem DELETE;
- `anon`: sem SELECT;
- writes exigem `owner/admin/manager/purchases` Organization-wide;
- havia 2 vínculos ativos, coerentes com o seed/demo.

Após o merge, o histórico hospedado de migrations continuou terminando em `20260822195823_finance_attachments`. Não existe migration da Fase 45.

## Estado do MVP funcional

Depois das reconciliações e slices das Fases 41–45, o núcleo funcional não possui outra lacuna não-PENDING comprovada que justifique abrir automaticamente uma nova feature.

Isso **não significa que o sistema esteja liberado para cutover real**. Restam condições operacionais e decisões de negócio, especialmente:

- questões `PENDING`/Q-001..Q-025 necessárias para dados reais e refinamentos;
- importadores específicos por fonte e regras de transformação aprovadas;
- dry run real, reconciliação e aceite da data de corte;
- bootstrap/mapeamento das pessoas, memberships, roles e escopos reais;
- backup automático real de Production (#75);
- homologação operacional com dados e usuários aprovados.

## Próxima ação

**Fase 46 — reconciliar a prontidão operacional para homologação e cutover, sem importar dados reais, sem ativar backup automaticamente e sem abrir outra feature funcional por inércia.**

A Fase 46 deve produzir uma visão objetiva do que já está pronto, do que depende de decisão/credencial/dado real e do que pode ser preparado com segurança antes do cutover.

Ver `docs/ai/NEXT_ACTION.md`.

## Fases que não devem ser refeitas

- Fase 41: primeira reconciliação do MVP;
- Fase 42 / #92: anexos financeiros privados;
- Fase 43 / #95: contas a pagar em CSV;
- Fase 44 / #98: condições comerciais de fornecedor;
- Fase 45 / #101: manutenção básica de produtos por fornecedor;
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

- não reabrir Fases 41–45 sem regressão concreta;
- não promover `PENDING` ou fase posterior por inferência;
- não transformar SupplierItem em cotação/comparação avançada;
- não abrir nova exportação/dashboard por conveniência;
- não criar migration sem necessidade;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem evidência real;
- não criar deploy Vercel intermediário;
- não importar dados reais nem executar cutover sem critérios/aceite.