# Handoff — Sistema Lojasaph

## Estado

Fase 15 — staging de importação, dry run e reconciliação rastreável — **implementada e homologada; PR #40 ainda deve ser fechado corretamente**.

- Issue #39 — open até o merge;
- PR #40 — draft;
- branch: `agent/import-staging`;
- SHA técnico final verde antes dos commits documentais: `8ee091875bdcc7707a7333b1d4c12acdc2a43931`;
- remoto Supabase já contém as três migrations da Fase 15;
- nenhuma planilha real foi importada e nenhum cutover foi executado.

## O que já está concluído

- batch rastreável por fonte/hash/versão;
- staging por aba/linha/payload bruto;
- idempotência determinística;
- estados aceito/duplicado/warning/rejeitado/mapeamento pendente;
- dry run sem aplicação nas tabelas operacionais;
- relatório estruturado;
- matching canônico exato/alias explícito, sem fuzzy auto-merge;
- pendências de Q-001 a Q-025 permanecem para revisão;
- RLS Organization-wide e command surface auditada;
- memberships escopados/outsider/anon bloqueados conforme desenho;
- Vitest e `supabase/tests/import_staging.sql` integrados ao CI;
- `docs/modules/imports.md` e `docs/source-data/migration-plan.md` atualizados.

## Supabase remoto

Migrations já aplicadas — **não reaplicar**:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Homologação sintética executada em uma única transação `BEGIN/ROLLBACK` retornou `import staging tests passed`.

Após rollback, zero resíduos em usuários, memberships, batches, rows, audits e itens operacionais temporários.

Security Advisor: novas RPCs aparecem no aviso genérico de `SECURITY DEFINER` executável por `authenticated`; isso é intencional nesta command surface e a autorização interna foi exercitada remotamente.

Performance Advisor: os dois FKs novos sem índice foram corrigidos por `import_staging_indexes`; após reaplicação do advisor não restaram avisos `unindexed_foreign_keys` nas tabelas novas.

## CI

No SHA `8ee091875bdcc7707a7333b1d4c12acdc2a43931`:

- `CI` #187 — success;
- `Inventory Count Integration` #110 — success;
- `Business Transactions Integration` #93 — success.

O próximo gate obrigatório é o CI do **SHA documental final** da branch.

## Próxima ação exata

1. conferir o head atual de `agent/import-staging` e o PR #40;
2. esperar/confirmar `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes no SHA documental final;
3. atualizar o corpo do PR #40 com migrations remotas, CI, homologação, zero resíduos e advisors;
4. marcar o PR #40 ready for review;
5. fazer merge normal em `main` conforme convenção do projeto;
6. confirmar que a Issue #39 fechou como completed; fechar explicitamente se necessário;
7. **somente depois do merge/fechamento**, revisar os requisitos MUST ainda incompletos e Issues reais para escolher a próxima frente;
8. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` na `main` para o estado pós-merge e a próxima Issue.

## Não fazer

- não reaplicar nenhuma migration da Fase 15;
- não importar as seis planilhas reais;
- não criar command de aplicação/cutover nesta entrega;
- não inferir respostas para Q-001 a Q-025;
- não misturar backup/restore (`REQ-PLAT-005`) antes de concluir formalmente a Fase 15;
- não alterar flows transacionais já homologados sem requisito direto.