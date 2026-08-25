# Next Action — Sistema Lojasaph

## Contexto

Fase 44 concluída:

- MVP reconciliado novamente depois de anexos (#92) e exportação (#95);
- única lacuna inequívoca selecionada: `REQ-SUP-003 — Condições comerciais`;
- Issue #98 fechada pelo PR #99;
- PR #99 squash-mergeado em `82f401bd73036d82fc5ac9418fc7f97e32adc3ba`;
- head final `20c472255e8bde0bf52c094bace16d7734bb2824` passou CI #387, Business Transactions #188 e Inventory Count #204;
- nenhuma migration ou mutation manual de Production;
- Issue #75 continua aberta/desarmada.

A reconciliação da Fase 44 deixou **um próximo ponto de decisão**, não uma feature pré-aprovada: `REQ-SUP-004 — Produtos por fornecedor`.

O schema já possui `supplier_items`/`supplier_prices` e compras já referenciam SupplierItem. A fonte histórica também possui um catálogo por fornecedor com produto, medida, quantidade/embalagem e preços. Antes de abrir nova frente, é necessário provar se o runtime atual já mantém esses vínculos de forma operacionalmente suficiente ou se existe um gap real.

## Objetivo ativo

**Fase 45 — verificar definitivamente `REQ-SUP-004 — Produtos por fornecedor`; abrir uma única vertical slice somente se a manutenção básica do vínculo fornecedor-produto estiver comprovadamente ausente e for necessária ao MVP. Caso contrário, registrar o núcleo funcional como reconciliado e parar de abrir features por inércia.**

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW`, `scope.md`, `requirements.md`, `docs/modules/master-data.md`, `docs/modules/purchases.md`, `docs/source-data/field-catalog.md` e `docs/qa/mvp-reconciliation-fase44.md`.
2. Conferir estado real de `main`, Issues, PRs, branches e CI. Confirmar #98 fechada e #75 ainda aberta/desarmada.
3. Não reabrir `REQ-SUP-003`; condições comerciais já estão entregues.
4. Inspecionar o fluxo real de `supplier_items`:
   - schema e constraints;
   - RLS/grants e escopo Organization-wide;
   - adapters/repositories que leem ou escrevem SupplierItem;
   - UI de fornecedores e compras;
   - seed/demo/import staging somente para entender origem dos vínculos, sem importar dados reais.
5. Confrontar com o catálogo real por fornecedor documentado em `field-catalog.md`:
   - Produto;
   - Medida/unidade de compra;
   - Quantidade por embalagem;
   - Valor por pacote;
   - Valor unitário.
6. Responder objetivamente:
   - existe hoje um caminho persistente normal para criar/manter o vínculo fornecedor ↔ item usado pelo pedido de compra?
   - purchase unit/pack quantity necessários ao processo podem ser mantidos sem SQL/manual seed?
   - o preço observado já é registrado pelo fluxo de pedido, sem exigir UI de comparação histórica?
7. Não confundir `REQ-SUP-004` com funcionalidades explicitamente posteriores:
   - cotação;
   - comparação de fornecedores;
   - sugestão automática de compra;
   - compras avançadas;
   - BI/histórico avançado de custo.
8. Se o fluxo atual já for operacionalmente suficiente:
   - não abrir Issue;
   - registrar SUP-004 como coberto no MVP básico;
   - declarar que não há nova frente funcional não-PENDING comprovada;
   - deixar próximos passos condicionados a #75, cutover/import real ou prioridade explícita de produto.
9. Se houver gap inequívoco:
   - abrir exatamente uma Issue ligada a `REQ-SUP-004`;
   - limitar a slice à manutenção básica fornecedor-produto e atributos de compra já existentes no schema;
   - reutilizar RLS/grants existentes;
   - não adicionar cotação/comparação/sugestão;
   - implementar somente se o boundary e acceptance estiverem claros na mesma sessão.
10. `REQ-SUP-005`: considerar o núcleo de histórico atendido quando `supplier_prices` registra preços observados; não criar análise/comparação avançada sem prioridade explícita.
11. Não abrir outra exportação nem dashboard avançado por conveniência.
12. Supabase: usar apenas read-only para verificação, salvo se uma feature realmente exigir mudança. DDL somente por migration versionada e após CI verde.
13. Não criar deploy Vercel intermediário.
14. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão da Fase 45

- `REQ-SUP-004` confrontado com schema, runtime, compras e fonte histórica;
- origem/manutenção atual de `supplier_items` comprovada;
- SUP-005 avançado não puxado por inferência;
- nenhuma feature de fase posterior promovida;
- exatamente uma lacuna básica escolhida ou conclusão explícita de que não há nova frente funcional justificada;
- #75 preservada;
- continuidade atualizada.

## Fase 44 — não refazer

Condições comerciais já usam:

- `suppliers.notes`;
- `supplier_terms`;
- browser client autenticado;
- RLS Organization-wide existente;
- um termo corrente sem DELETE/versionamento automático;
- `Money` para pedido mínimo.

Não criar migration retrospectiva nem mover essa lógica para service/admin client.

## Backup Production / #75

Somente em computador pessoal/confiável:

1. configurar OAuth Google Drive/rclone;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar `BACKUP_AUTOMATION_ENABLED=true`;
5. executar o primeiro `Production Database Backup` real;
6. confirmar archive + `.sha256` no Drive;
7. registrar evidência e fechar #75.

## Segurança / operação

- não pedir/receber secrets no chat;
- não reabrir Fases 41–44 sem regressão concreta;
- não promover `PENDING`;
- não transformar SupplierItem básico em módulo de cotação avançado;
- não criar migration sem necessidade;
- não contornar RLS;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem evidência real;
- não restaurar Production para teste;
- não criar deploy Vercel só para auditoria;
- não importar dados reais/cutover.
