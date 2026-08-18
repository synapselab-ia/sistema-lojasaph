# Next Action — Sistema Lojasaph

## Contexto

Fase 16 — backup automático, restauração testada e recuperação operacional — está tecnicamente concluída e validada na branch `agent/backup-restore`.

Estado real antes do fechamento:

- Issue #41 — open;
- PR #42 — draft;
- base da branch: `main` em `b3491e34558c78ce888180098c3dabb0236953c5`;
- SHA técnico verde: `805274c9769323f3b6d9d3961c606d1c69ea922a`;
- `CI` #203, `Inventory Count Integration` #122 e `Business Transactions Integration` #105 — success;
- `CI` provou dump/checksum/restore em PostgreSQL 17 efêmero e executou os checks pós-restore;
- projeto Supabase remoto permaneceu sem DDL/migration/restore da Fase 16;
- organização Supabase atual está no plano Free;
- RPO/RTO, retenção e destino off-site permanecem pendentes, sem inferência;
- nenhum dump/dado real foi versionado.

## Fazer agora

1. Conferir o head atual da branch `agent/backup-restore` e o PR #42.
2. Confirmar que os três workflows (`CI`, `Inventory Count Integration`, `Business Transactions Integration`) passam no **SHA documental final**.
3. Atualizar o corpo do PR #42 com:
   - escopo entregue;
   - SHA final validado;
   - `CI` final e resultado do drill de restore;
   - estado/capacidade atual do Supabase Free;
   - confirmação de que nenhuma operação destrutiva/DDL remota ocorreu;
   - RPO/RTO e cadência real ainda pendentes.
4. Marcar o PR #42 ready for review.
5. Fazer merge normal do PR #42 em `main` conforme a convenção atual do projeto.
6. Confirmar que a Issue #41 foi fechada como completed; fechar explicitamente se o `Closes #41` não atuar.
7. **Somente depois do merge e fechamento da Issue #41**, revisar `docs/product/requirements.md`, Issues reais e questões abertas para selecionar a próxima lacuna MUST executável.
8. Criar/selecionar a próxima Issue sem inferir decisão de negócio.
9. Atualizar `docs/ai/CURRENT_STATE.md`, `HANDOFF.md` e este arquivo na `main` com o merge real e a próxima ação concreta.

## Não fazer agora

- não executar restore no Supabase remoto ativo;
- não criar/versionar dump real;
- não aplicar migration inexistente para a Fase 16;
- não reaplicar `scoped_permissions` ou migrations da Fase 15;
- não importar planilhas reais nem executar cutover;
- não versionar secrets/connection strings;
- não inventar RPO/RTO, retenção ou destino off-site;
- não iniciar observabilidade (`REQ-PLAT-006`) antes do fechamento formal desta fase.

## Critério de encerramento

A Fase 16 só está formalmente encerrada quando o SHA documental final estiver verde, PR #42 estiver merged, Issue #41 estiver closed/completed e a continuidade pós-merge na `main` apontar para a próxima lacuna MUST real.
