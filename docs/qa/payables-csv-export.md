# QA — Fase 43 / Exportação de contas a pagar em CSV

Data: 2026-08-25
Issue: #95 — `REQ-EXPOR-001 — Exportação`
PR: #96

## Decisão da vertical slice

A Fase 43 comparou as superfícies tabulares já existentes antes de implementar exportação.

| Superfície | Estado atual | Aderência a processo real | Bloqueio para primeira exportação |
| --- | --- | --- | --- |
| Estoque | saldos atuais | média | página não expõe ledger/histórico tabular |
| Inventário | operação + histórico recente | média | histórico visual truncado em 10 e sem semântica de relatório |
| Compras | pedidos + histórico recente | média | histórico visual truncado em 15 e sem filtros de relatório |
| Financeiro | documentos + parcelas + status/saldos | **alta** | nenhum bloqueio; read model já normalizado |
| Caixa | sessões + totais/movimentos | alta | shape depende de meios de pagamento dinâmicos |

Financeiro foi escolhido porque `Controle NFs Espeticho.xlsx` tinha `Lista` como base operacional principal e `payable_installment_summary` já representa essa lista de forma estruturada. Não foi aberta segunda frente de exportação.

## Contrato entregue

- CSV de contas a pagar por parcela;
- UX apenas para `manageFinance` (`owner/admin/manager/finance`);
- fonte `payable_installment_summary`;
- browser client autenticado, sem service/secret key;
- `organization_id` explícito e RLS/resource scope como autoridade;
- 500 linhas por página, range inclusivo, ordenação estável `due_date + installment_id`;
- lookup de fornecedor/unidade/setor sob a mesma sessão;
- 14 colunas fixas e sem dados extras sensíveis;
- UTF-8 BOM + CRLF;
- quoting/escaping de CSV;
- neutralização de spreadsheet formula injection em campos textuais;
- dinheiro via `Money.toDecimal()`;
- datas ISO;
- sem XLSX, PDF, endpoint privilegiado, migration ou deploy Vercel.

## Colunas

1. Fornecedor
2. Unidade
3. Setor
4. Tipo documento
5. Número documento
6. Série
7. Data emissão
8. Parcela
9. Vencimento
10. Status parcela
11. Situação documento
12. Valor nominal
13. Pago líquido
14. Saldo

Não entram nesta slice: access key, Pix/Boleto/referência, observações de pagamento, actor IDs e anexos.

## Supabase Production — somente leitura

Projeto: `fhbvwyttikrbeaanatlr`.

Introspecção em 2026-08-25 confirmou:

- `public.payable_installment_summary` com `security_invoker=true`;
- `authenticated` com SELECT na view;
- `anon` sem SELECT;
- `payable_documents_select_member` usando `private.can_read_payable_document(organization_id, id)`;
- `installments_select_member` usando `private.can_read_payable_document(organization_id, payable_document_id)`.

Nenhuma mutation, DDL, DML ou migration foi executada para a Fase 43.

## Testes

Head de código antes da documentação: `abd9f0559d231f4526c9c40add46c95465d2fc4c`.

Resultados:

- CI #374 — success;
  - database — success;
  - lint — success;
  - typecheck — success;
  - Vitest — success;
  - production build — success;
- Business Transactions Integration #178 — success;
- Inventory Count Integration #194 — success.

`src/lib/finance/payables-csv.test.ts` cobre:

- BOM UTF-8;
- cabeçalho e ordem estáveis;
- CRLF;
- acentos;
- escaping de aspas, vírgulas e quebras de linha;
- formula injection (`=`, `+`, `-`, `@` após whitespace);
- decimais exatos, inclusive saldo negativo;
- filename determinístico;
- paginação por múltiplos ranges.

`src/lib/runtime/client-boundary.test.ts` confirma que export button/gateway não contêm `SUPABASE_SECRET_KEY` nem admin client.

O head final com documentação deve ser revalidado antes do merge; registrar no PR #96 o run final correspondente.

## Conclusão

A primeira vertical slice explícita de `REQ-EXPOR-001` está implementada sem expandir o requisito para `exportar tudo`. A próxima fase deve reconciliar o MVP depois desta entrega e só abrir nova exportação se houver nova lacuna concreta com processo, usuário e critério de aceite próprios.
