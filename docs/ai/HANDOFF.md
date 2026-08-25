# Handoff — Sistema Lojasaph

## Estado

Fase 43 — `REQ-EXPOR-001 — Exportação` — está **concluída e integrada na `main` pelo PR #96** com a primeira vertical slice: contas a pagar em CSV.

- `main` pós-Fase 43: `8bf116bb05681d52e57f5f67f4a4d55c0c28e5ba`;
- PR #96: squash-mergeado;
- Issue #95: closed/completed;
- head final validado: `1de8326fa0e03b587c78d7992c25171916e43e08`;
- CI #381 — success;
- Business Transactions #185 — success;
- Inventory Count #201 — success;
- Production Supabase usada somente read-only;
- nenhuma migration/DDL/DML;
- nenhum deploy Vercel;
- única Issue aberta: #75, preservada/desarmada.

**Não refazer Fase 43.** A próxima ação é a Fase 44 em `docs/ai/NEXT_ACTION.md`.

## O que a Fase 43 decidiu

A primeira exportação foi escolhida após comparar as superfícies tabulares atuais.

Financeiro / contas a pagar foi o candidato inequívoco porque `Controle NFs Espeticho.xlsx` tinha `Lista` como base operacional principal e `payable_installment_summary` já representa documento, fornecedor, unidade/setor, parcela, vencimento, valores e status derivados.

Outros candidatos não justificaram uma frente paralela:

- Estoque: snapshot de saldo, sem ledger tabular completo na tela;
- Inventário: histórico visual limitado a 10;
- Compras: histórico visual limitado a 15;
- Caixa: shape depende de meios de pagamento dinâmicos.

Ver `docs/qa/payables-csv-export.md`.

## Contrato entregue

- `Exportar CSV` em `/workspace/financeiro` para UX `manageFinance`;
- sessão autenticada + RLS continuam sendo o boundary real;
- `payable_installment_summary` como fonte;
- filtro explícito `organization_id`;
- paginação de 500 em 500 via range inclusivo;
- ordem determinística `due_date + installment_id`;
- fornecedor/unidade/setor resolvidos pela mesma sessão;
- CSV BOM UTF-8 + CRLF;
- escaping de aspas/vírgulas/quebras de linha;
- formula-injection protection em texto;
- dinheiro por `Money.toDecimal()`;
- datas ISO;
- erros públicos genéricos, sem mensagem bruta do Supabase;
- sem access key, referência Pix/Boleto, payment notes, actor IDs ou anexos;
- sem XLSX/PDF, endpoint privilegiado, dependency nova ou migration.

## Supabase / boundary

Production `fhbvwyttikrbeaanatlr` foi apenas inspecionada:

- `payable_installment_summary`: `security_invoker=true`;
- `authenticated`: SELECT true;
- `anon`: SELECT false;
- `payable_documents_select_member`: `private.can_read_payable_document(organization_id, id)`;
- `installments_select_member`: `private.can_read_payable_document(organization_id, payable_document_id)`.

A checagem final de migration history ainda termina em `20260822195823_finance_attachments`. Não existe migration da Fase 43.

## Testes

`src/lib/finance/payables-csv.test.ts` cobre BOM/CRLF/cabeçalho, acentos, escaping, formula injection, decimais exatos, saldo negativo, filename e paginação multi-range.

`src/lib/runtime/client-boundary.test.ts` confirma ausência de secret/admin na exportação.

Head final `1de8326...` passou CI #381, Business Transactions #185 e Inventory Count #201.

## Próxima ação

**Fase 44 — reconciliar o MVP após as Fases 42–43.**

Revisar escopo/requisitos e estado real para determinar se resta alguma lacuna não-PENDING com processo, usuário, prioridade material e critério de aceite concretos.

Não assumir que `REQ-EXPOR-001` exige exportar cada tabela. Se não houver nova lacuna inequívoca, registrar o núcleo/MVP como reconciliado e manter apenas bloqueios operacionais condicionais ou novas prioridades explícitas de produto.

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
