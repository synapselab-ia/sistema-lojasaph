# Next Action — Sistema Lojasaph

## Estado

Fase 51 / #142 e Fase 52 / #180 concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

A **Issue #187 / Fase 57 — custeio por lote/camada física** está concluída:

- PR #192 mergeado em `main`;
- CI do PR e CI pós-merge verdes;
- migrations `20260904101500` → `20260904103000` aplicadas em Production com `supabase db push` version-preserving;
- Production `fhbvwyttikrbeaanatlr` sem migration local pendente após o rollout;
- Q-008 / `REQ-STK-010` não deve ser reaberta.

A dependência técnica da #183 está satisfeita.

## NEXT_ACTION objetiva

### **Executar Issue #183 — empréstimos com restituição física e/ou financeira**

Empréstimo é um processo necessário e **distinto de transferência**.

O sistema deve registrar o valor histórico do que foi emprestado e permitir restituição total/parcial por:

- retorno físico ao estoque;
- restituição monetária;
- combinação das duas formas.

## Regra de valuation já decidida

Usar **o custo das camadas/lotes efetivamente emprestados**.

Exemplo: se 3 unidades saírem de camada a R$ 5 e 2 unidades de camada a R$ 2, o valor físico histórico é:

`3 × 5 + 2 × 2 = R$ 19`

Não substituir por custo médio, última compra nem custo atual futuro.

## Contrato mínimo aprovado

- empréstimo possui origem, contraparte/destino, item, quantidade e valor de referência;
- quantidade emprestada mantém rastreabilidade das camadas consumidas;
- existe saldo físico pendente de retorno;
- existe saldo monetário pendente quando aplicável;
- retorno físico pode ser parcial ou total;
- restituição monetária pode ser parcial ou total;
- ambos podem coexistir;
- toda restituição é ligada ao empréstimo original;
- empréstimo original não é apagado nem reescrito para simular restituição;
- restituição monetária não reprecifica a saída física original;
- ledger de estoque representa somente eventos físicos reais;
- over-return/over-settlement deve ser bloqueado;
- concorrência deve ser segura;
- commands devem ser transacionais e idempotentes;
- RLS/roles/escopo devem ser coerentes com Estoque;
- audit trail obrigatório.

## Boundary financeiro obrigatório

**Não inferir automaticamente lançamento em Caixa/Financeiro.**

O primeiro requisito é registrar a liquidação monetária do empréstimo de forma exata e auditável. Qualquer efeito adicional em Caixa/Financeiro exige regra explícita posterior e deve evitar dupla contabilização.

## UX mínima de produto

Implementar jornada:

`lista de empréstimos → detalhe → restituir`

A UI precisa:

- mostrar contraparte, item, quantidade/valor original e saldos pendentes;
- explicar saldo físico e monetário em linguagem de negócio;
- permitir restituição física, monetária ou combinação;
- mostrar histórico de restituições;
- sinalizar estados como aberto, parcialmente restituído e liquidado;
- manter progressive disclosure e padrão visual da Fase 51;
- não expor detalhes técnicos de ledger/cost basis ao operador comum;
- não terminar em CRUD bruto.

## Procedimento do próximo chat

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - Issue #183 e comentário vigente;
   - `docs/product/requirements.md` (`REQ-STK-007`, `REQ-STK-010`);
   - `docs/product/business-rules.md`;
   - `docs/decisions/ADR-003-inventory-costing.md`;
   - documentação do módulo Estoque;
2. Consultar GitHub real para `main`, Issues, PRs, branches e CI;
3. Confirmar que não existe outra branch/PR já executando #183;
4. Auditar primitives existentes de estoque, transferências, devoluções, audit e permissions;
5. Reaproveitar primitives somente onde preservarem semântica; **não modelar empréstimo como transferência definitiva**;
6. Definir modelo persistente e migration versionada antes de DDL compartilhado;
7. Modelar alocações de camada/custo do empréstimo e histórico de restituições;
8. Implementar commands transacionais/idempotentes;
9. Garantir lock/concorrência e bloqueio de over-return/over-settlement;
10. Garantir Organization isolation, grants, RLS/escopo e audit;
11. Implementar UI `lista → detalhe → restituir`;
12. Validar aplicação e PostgreSQL;
13. CI verde → PR → merge → CI pós-merge;
14. Se houver migration mergeada para Production, seguir `docs/qa/database-migrations.md`: dry-run, allowlist fail-closed, push version-preserving, dry-run final, verificação read-only e advisors;
15. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`.

## Testes obrigatórios de #183

Cobrir no mínimo:

1. mesmo item com duas ou mais camadas de custos diferentes;
2. empréstimo consumindo múltiplas camadas com valor histórico exato;
3. FEFO quando não houver lote explícito;
4. lote explícito quando aplicável;
5. retorno físico parcial;
6. retorno físico total;
7. restituição monetária parcial;
8. restituição monetária total;
9. combinação físico + monetário;
10. bloqueio de retorno físico acima do saldo;
11. bloqueio de liquidação monetária acima do saldo;
12. retry idempotente;
13. conflito idempotente com payload diferente;
14. concorrência sobre o mesmo empréstimo;
15. usuário sem permissão;
16. usuário fora do escopo/Organization;
17. audit trail;
18. nenhum recálculo histórico após entrada futura com custo diferente.

## Aceite

- modelo persistente + migrations versionadas;
- valor histórico formado pelas camadas efetivamente emprestadas;
- saldos físico/monetário exatos e explicáveis;
- restituições ligadas ao empréstimo original;
- histórico preservado;
- sem dupla baixa ou movimento físico fictício;
- sem regra contábil/fiscal inventada;
- RLS/permissions/Organization corretos;
- UI operacional e visualmente consistente;
- PostgreSQL + aplicação + CI verdes;
- Production só alterada por rollout versionado e verificável.

## Depois de #183

Ordem atual:

1. **#185 — PDV Legal** quando houver estrutura/amostra oficial;
2. **#188 — catálogo comercial, preços e margem**;
3. **#189 — fichas técnicas/receitas**;
4. **#184 — consumo de funcionários**;
5. **#190 — compositor modular**;
6. **Q-022 — perfis/pessoas reais**;
7. homologação com dados representativos;
8. migração/cutover;
9. production-readiness / #75/#121.

A ordem pode ser refinada por dependência real comprovada, mas não retornar ao estado antigo de custeio indefinido.

## Guardrails

- GitHub é fonte de verdade;
- Supabase/schema/RLS/grants são hard boundaries;
- nenhum secret em Git/docs/chat/log;
- não criar fixture/dado Production para evidência;
- não usar auth bypass;
- não repetir migration reconciliation sem drift;
- não disparar deploy Vercel manual rotineiro;
- não converter empréstimo em transferência por conveniência;
- não recalcular histórico por custo atual;
- não inventar regra contábil/fiscal;
- #75/#121 continuam TOTALMENTE ON HOLD.
