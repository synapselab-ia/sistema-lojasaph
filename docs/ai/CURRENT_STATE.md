# Current State — Sistema Lojasaph

Última atualização: 2026-08-25

## Estado atual

Fase 43 — primeira vertical slice de `REQ-EXPOR-001 — Exportação` — **implementada no PR #96 e em validação final antes do merge**.

- `main` na entrada da Fase 43: `751eea1b8c4a76c7f511f94d61024b22976c855a` (PR #94);
- Issue #95: `Fase 43 — exportar contas a pagar em CSV (REQ-EXPOR-001)`;
- branch: `agent/payables-csv-export`;
- PR #96: `feat(finance): export payables as CSV`;
- head de código validado antes dos docs: `abd9f0559d231f4526c9c40add46c95465d2fc4c`;
- CI #374: success;
- Business Transactions Integration #178: success;
- Inventory Count Integration #194: success;
- única Issue operacional anterior preservada: #75 — backup Production, ainda desarmada;
- nenhum deploy Vercel;
- nenhuma migration/DDL/DML da Fase 43.

## Decisão da Fase 43

A comparação das superfícies atuais encontrou um candidato claramente superior para a primeira exportação do MVP: **Financeiro / contas a pagar**.

Motivo:

- `Controle NFs Espeticho.xlsx` tinha `Lista` como principal base operacional;
- `payable_installment_summary` já normaliza documento, unidade/setor, fornecedor, parcela, vencimento, valores e status;
- Estoque atual mostra saldo vigente, não ledger tabular completo;
- Inventário e Compras exibem históricos visuais truncados;
- Caixa tem formato menos estável por meios de pagamento dinâmicos.

Evidência: `docs/qa/payables-csv-export.md`.

## Entrega funcional

O Financeiro passa a oferecer `Exportar CSV` para `manageFinance = owner/admin/manager/finance`.

A exportação:

- lê `payable_installment_summary` pelo browser client autenticado;
- filtra `organization_id` explicitamente e continua sujeita a RLS/resource scope;
- pagina em blocos de 500 com ordenação estável `due_date + installment_id`;
- não depende do `.limit(100)` da lista visual de documentos;
- resolve fornecedor/unidade/setor pela mesma sessão/RLS;
- gera CSV com BOM UTF-8, CRLF, escaping e neutralização de formula injection;
- preserva dinheiro com `Money.toDecimal()` e datas ISO;
- não exporta access key, Pix/Boleto, observações de pagamento, actor IDs ou anexos;
- não adiciona XLSX/PDF, endpoint admin ou infraestrutura genérica de exportação.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr` permanece `ACTIVE_HEALTHY`.

A Fase 43 usou Production somente para introspecção read-only e confirmou:

- `payable_installment_summary` com `security_invoker=true`;
- `authenticated` com SELECT;
- `anon` sem SELECT;
- `payable_documents` e `installments` filtrados pelas policies atuais com `private.can_read_payable_document(...)`.

Nenhuma migration ou mutation remota foi necessária. A migration mais recente continua `20260822195823_finance_attachments`.

## Fases anteriores que não devem ser refeitas

- Fase 41: reconciliação do MVP;
- Fase 42 / #92: anexos financeiros privados, mergeados no PR #93;
- Fase 38 / #75: automação de backup preparada, faltando somente ativação operacional em computador pessoal/confiável.

O bucket `finance-attachments` continua lazy via Storage API no primeiro upload autorizado; não manipular `storage.buckets`/`storage.objects` por SQL.

## Próxima ação depois do merge do PR #96

**Fase 44 — reconciliar o MVP após a primeira entrega de `REQ-EXPOR-001` e determinar se existe alguma lacuna não-PENDING restante que justifique nova frente.**

Não abrir automaticamente uma segunda exportação. O requisito diz `dados tabulares relevantes` / `exportação onde fizer sentido`; nova superfície só entra se houver processo real, usuário beneficiado e critério de aceite identificável.

Ver `docs/ai/NEXT_ACTION.md`.

## Backup Production / #75

Permanece deliberadamente pendente até computador pessoal/confiável:

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
