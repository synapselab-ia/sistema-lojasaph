# Current State — Sistema Lojasaph

Última atualização: 2026-08-25

## Estado atual

Fase 43 — primeira vertical slice de `REQ-EXPOR-001 — Exportação` — **concluída e integrada na `main` pelo PR #96**.

- `main` pós-Fase 43: `8bf116bb05681d52e57f5f67f4a4d55c0c28e5ba`;
- PR #96: squash-mergeado;
- Issue #95: closed/completed;
- head final validado do PR #96: `1de8326fa0e03b587c78d7992c25171916e43e08`;
- CI #381: success (`database`, lint, typecheck, Vitest, production build);
- Business Transactions Integration #185: success;
- Inventory Count Integration #201: success;
- única Issue aberta restante: #75 — backup Production, ainda desarmada;
- nenhum deploy Vercel;
- nenhuma migration/DDL/DML na Fase 43.

## Entrega da Fase 43

A primeira exportação do MVP foi escolhida após comparação explícita das superfícies atuais. Financeiro / contas a pagar foi o candidato superior porque `Controle NFs Espeticho.xlsx` tinha `Lista` como base operacional principal e `payable_installment_summary` já representa os mesmos conceitos normalizados.

`/workspace/financeiro` agora oferece `Exportar CSV` para `manageFinance = owner/admin/manager/finance`.

Características:

- fonte `payable_installment_summary`;
- browser client autenticado, sem service/admin key;
- `organization_id` explícito + RLS/resource scope;
- paginação de 500 em 500 com ordem `due_date + installment_id`;
- lookup de fornecedor/unidade/setor sob a mesma sessão;
- CSV BOM UTF-8 + CRLF;
- quoting/escaping e proteção contra spreadsheet formula injection;
- dinheiro com `Money.toDecimal()` e datas ISO;
- mensagens de erro públicas genéricas;
- sem access key, Pix/Boleto, payment notes, actor IDs ou anexos;
- sem XLSX/PDF e sem infraestrutura genérica de `exportar tudo`.

Evidência: `docs/qa/payables-csv-export.md`.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr` permanece `ACTIVE_HEALTHY`.

A Fase 43 foi read-only em Production. Foi confirmado:

- `payable_installment_summary` com `security_invoker=true`;
- `authenticated` com SELECT;
- `anon` sem SELECT;
- policies de `payable_documents` e `installments` usando `private.can_read_payable_document(...)`.

O histórico final de migrations continua terminando em `20260822195823_finance_attachments`. Não existe migration da Fase 43.

## Próxima ação

**Fase 44 — reconciliar o MVP depois das Fases 42–43 e determinar se existe alguma lacuna não-PENDING restante que justifique nova frente funcional.**

Não abrir automaticamente outra exportação. Uma nova superfície só entra se houver processo real, usuário beneficiado, prioridade material e critério de aceite objetivo.

Ver `docs/ai/NEXT_ACTION.md`.

## Fases anteriores que não devem ser refeitas

- Fase 41: reconciliação do MVP;
- Fase 42 / #92: anexos financeiros privados, PR #93;
- Fase 43 / #95: contas a pagar em CSV, PR #96;
- Fase 38 / #75: automação de backup preparada, faltando somente ativação operacional em computador pessoal/confiável.

O bucket `finance-attachments` continua lazy via Storage API no primeiro upload autorizado; não manipular `storage.buckets`/`storage.objects` por SQL.

## Backup Production / #75

Pendências somente em computador pessoal/confiável:

- OAuth Google Drive/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real + archive/checksum off-site;
- fechamento da #75.

Não pedir nem receber esses secrets no chat.

## Não fazer

- não reabrir Fases 38–43 sem regressão concreta;
- não transformar `REQ-EXPOR-001` em `exportar tudo`;
- não criar XLSX/PDF por conveniência;
- não criar migration para exportação derivável do read model atual;
- não contornar RLS com service/admin client;
- não promover requisito `PENDING` por inferência;
- não ativar/fechar #75 sem evidência operacional;
- não manipular Storage por SQL;
- não criar deploy Vercel sem necessidade real;
- não importar dados reais/cutover.
