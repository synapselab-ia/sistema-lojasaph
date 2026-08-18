# Next Action — Sistema Lojasaph

## Contexto

Fase 15 — staging de importação, dry run e reconciliação rastreável — está tecnicamente concluída e homologada na branch `agent/import-staging`.

Estado real antes do fechamento:

- Issue #39 — open;
- PR #40 — draft;
- SHA técnico final verde: `8ee091875bdcc7707a7333b1d4c12acdc2a43931`;
- `CI` #187, `Inventory Count Integration` #110 e `Business Transactions Integration` #93 — success;
- migrations remotas já aplicadas:
  - `20260818180723 / import_staging`;
  - `20260818180738 / import_staging_finalize_fix`;
  - `20260818181051 / import_staging_indexes`;
- homologação remota sintética em `BEGIN/ROLLBACK` retornou `import staging tests passed`;
- checagem pós-rollback confirmou zero resíduos temporários;
- advisors executados; os dois novos avisos de FK sem índice foram corrigidos;
- nenhuma planilha real foi importada, nenhum cutover foi executado e nenhuma questão aberta foi inferida.

## Fazer agora

1. Conferir o head atual da branch e o PR #40.
2. Confirmar que os três workflows (`CI`, `Inventory Count Integration`, `Business Transactions Integration`) passam no **SHA documental final**.
3. Atualizar o corpo do PR #40 com:
   - escopo entregue;
   - SHA final validado;
   - versões das migrations remotas;
   - homologação `import staging tests passed`;
   - zero resíduos após rollback;
   - resultado dos advisors;
   - confirmação de que dados reais/cutover continuam fora do escopo.
4. Marcar o PR #40 ready for review.
5. Fazer merge normal do PR #40 em `main`, sem squash/rebase se a convenção atual continuar sendo merge commit.
6. Confirmar que a Issue #39 foi fechada como completed; se o `Closes #39` não fechar automaticamente, fechar explicitamente.
7. **Somente depois do merge e fechamento da Issue #39**, revisar `docs/product/requirements.md`, questões abertas e Issues reais para escolher a próxima lacuna MUST executável.
8. Criar/selecionar a próxima Issue sem inferir decisão de negócio.
9. Atualizar `docs/ai/CURRENT_STATE.md`, `HANDOFF.md` e este arquivo na `main` com o merge real e a próxima ação concreta.

## Não fazer agora

- não reaplicar `scoped_permissions` nem migrations da Fase 15;
- não importar as seis planilhas reais;
- não executar cutover ou aplicação do staging nas tabelas operacionais;
- não versionar arquivos/dados reais ou segredos;
- não resolver Q-001 a Q-025 por inferência;
- não iniciar outra fase antes de concluir formalmente PR #40 / Issue #39.

## Critério de encerramento

A Fase 15 só está formalmente encerrada quando o SHA documental final estiver verde, PR #40 estiver merged, Issue #39 estiver closed/completed e a continuidade pós-merge na `main` apontar para a próxima lacuna MUST real.