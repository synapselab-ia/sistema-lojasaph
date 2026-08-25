# Handoff — Sistema Lojasaph

## Estado

Fase 43 — `REQ-EXPOR-001 — Exportação` — possui uma única vertical slice implementada no PR #96: **contas a pagar em CSV**.

- `main` na entrada: `751eea1b8c4a76c7f511f94d61024b22976c855a`;
- Issue #95;
- branch `agent/payables-csv-export`;
- PR #96;
- head de código validado antes dos docs: `abd9f0559d231f4526c9c40add46c95465d2fc4c`;
- CI #374 — success;
- Business Transactions #178 — success;
- Inventory Count #194 — success;
- Production Supabase usada somente read-only;
- nenhuma migration/DDL/DML;
- nenhum deploy Vercel;
- #75 preservada/desarmada.

Ao iniciar o próximo chat, conferir primeiro o estado real do PR #96/main/Issue #95. Se #96 já estiver mergeado, **não refazer Fase 43** e executar `NEXT_ACTION` / Fase 44.

## Por que esta exportação foi escolhida

`Controle NFs Espeticho.xlsx` tinha a aba `Lista` como base operacional principal. O sistema atual já possui `payable_installment_summary` com documento, fornecedor, unidade/setor, parcela, vencimento, valores e status derivados.

Outros candidatos não eram melhores para a primeira slice:

- Estoque: página atual é snapshot de saldos, não ledger tabular completo;
- Inventário: histórico visual limitado a 10;
- Compras: histórico visual limitado a 15;
- Caixa: shape tabular depende de meios de pagamento dinâmicos.

Ver `docs/qa/payables-csv-export.md`.

## Contrato entregue

- botão `Exportar CSV` em `/workspace/financeiro` somente para UX `manageFinance`;
- autoridade de leitura continua sessão autenticada + RLS, não a UI;
- fonte `payable_installment_summary`;
- filtro explícito `organization_id`;
- paginação 500 a 500 via range inclusivo;
- ordem determinística `due_date + installment_id`;
- lookups de fornecedor/unidade/setor pela mesma sessão;
- CSV BOM UTF-8 + CRLF;
- escaping de aspas/vírgulas/quebras de linha;
- neutralização de spreadsheet formula injection em campos textuais;
- dinheiro com `Money.toDecimal()`;
- datas ISO;
- sem access key, referência Pix/Boleto, payment notes, actor IDs ou anexos;
- sem XLSX/PDF, endpoint privilegiado, dependency nova ou migration.

## Supabase / boundary

Production `fhbvwyttikrbeaanatlr` foi apenas inspecionada:

- `payable_installment_summary`: `security_invoker=true`;
- `authenticated`: SELECT true;
- `anon`: SELECT false;
- `payable_documents_select_member`: `private.can_read_payable_document(organization_id, id)`;
- `installments_select_member`: `private.can_read_payable_document(organization_id, payable_document_id)`.

A implementação usa `createBrowserSupabaseClient()`; não introduzir service/admin client na exportação.

## Testes

`src/lib/finance/payables-csv.test.ts` cobre:

- BOM/CRLF/cabeçalho;
- acentos;
- escaping;
- formula injection;
- decimais exatos e saldo negativo;
- filename;
- paginação multi-range.

`client-boundary.test.ts` cobre ausência de secret/admin na nova exportação.

O head final com documentação deve ser validado antes do merge. Depois do merge, a Issue #95 deve fechar por `Closes #95` no PR #96.

## Próxima ação

Fase 44: **reconciliar o MVP após a entrega de contas a pagar em CSV**.

Não assumir que `REQ-EXPOR-001` obriga exportar cada superfície. Revisar escopo/requisitos + estado real e identificar se resta alguma lacuna não-PENDING com processo e critério de aceite concretos. Se não houver, registrar o núcleo/MVP funcional como reconciliado e deixar apenas bloqueios operacionais condicionais, especialmente #75.

Ver `docs/ai/NEXT_ACTION.md`.

## Backup Production / #75

Não refazer a Fase 38. Política já aprovada:

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

Não pedir secrets no chat.

## Não fazer

- não reabrir Fases 41–43 sem regressão;
- não criar exportação global/genérica;
- não criar XLSX/PDF sem processo concreto;
- não contornar RLS;
- não criar migration sem necessidade;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não implementar `PENDING` por inferência;
- não criar deploy Vercel só para teste;
- não importar dados reais/cutover.
