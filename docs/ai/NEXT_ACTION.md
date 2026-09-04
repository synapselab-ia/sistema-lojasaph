# Next Action — Sistema Lojasaph

## Estado

Fase 51 / #142 e Fase 52 / #180 concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**, mas a decisão de custeio já foi tomada e novas frentes funcionais foram abertas.

Em 2026-09-04 o operador definiu:

- `REQ-STK-010`: custo por lote/camada física efetivamente movimentada — #187;
- `REQ-STK-007`: empréstimos usam o custo das camadas efetivamente emprestadas — #183;
- `REQ-ITEM-004`: Lojasaph pode ter catálogo de produto vendável sem virar PDV — #188;
- `REQ-ITEM-005`: ficha técnica/receita volta para a fila — #189;
- preço de compra/fornecedor, custo real do lote, preço de venda e margem devem ser conceitos separados — #188;
- compositor modular para `owner`, com dependências e sem apagar dados — #190;
- qualidade visual/UX faz parte do aceite das novas áreas.

Decisões anteriores que continuam vigentes:

- FEFO aprovado;
- pagamento parcial/múltiplo não é necessário para o primeiro go-live;
- consumo de funcionários é venda com desconto em folha — #184;
- PDV Legal permanece como PDV; estudar importação oficial — #185;
- tablet live permanece deferido;
- #75/#121 permanecem TOTALMENTE ON HOLD.

Detalhes: `docs/qa/fase53-business-decisions.md`.

## NEXT_ACTION objetiva

### **Executar Issue #187 — custeio por lote/camada física nas saídas**

Q-008 está encerrada. **Não perguntar novamente qual método de custeio usar.**

A regra é:

> o valor de uma saída/perda deve acompanhar o custo da camada/lote que realmente saiu.

Exemplo: mesmo item, lote A a R$ 5 e lote B a R$ 2. Se a perda foi do lote A, registrar R$ 5 por unidade; se foi do lote B, registrar R$ 2.

## Procedimento do próximo chat

1. ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/decisions/ADR-003-inventory-costing.md`;
   - `docs/product/requirements.md`;
   - `docs/product/business-rules.md`;
   - Issue #187;
2. consultar GitHub real para `main`, Issues, PRs, branches e CI;
3. revalidar apenas se houver evidência de drift; não repetir incidentes/smokes por inércia;
4. auditar código/migrations existentes para localizar onde custo médio ainda alimenta:
   - retirada;
   - perda/vencimento;
   - transferência;
   - devolução;
   - inventário/ajustes;
   - consultas/relatórios de valuation;
5. preservar a estrutura existente que já guarda `unit_cost` por lote e snapshots; não reescrever história sem necessidade;
6. desenhar fallback explícito para casos realmente sem camada/custo rastreável, sem média silenciosa;
7. implementar a menor mudança segura em branch própria;
8. migrations somente se necessárias e versionadas;
9. testes obrigatórios com **o mesmo item em pelo menos duas camadas/lotes de custos diferentes**, provando que a saída/perda usa o custo do lote consumido;
10. validar FEFO versus seleção explícita de lote;
11. validar transferências/devoluções sem ganho/perda artificial;
12. CI verde → PR → merge → CI pós-merge;
13. atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` para promover #183.

## Aceite de #187

- `REQ-STK-010`, `BR-STK-010` e ADR-003 refletem o runtime;
- saída física conhecida usa custo da camada consumida;
- FEFO escolhe lote quando não houver seleção explícita;
- lote explicitamente selecionado em perda/quebra usa seu próprio custo;
- transferência preserva custo de origem;
- devolução relacionada preserva rastreabilidade/custo;
- histórico não é recalculado por compras futuras;
- fallback sem custo é explícito/auditável;
- relatórios conseguem explicar quantidade, lote/camada, custo unitário e custo total;
- testes e CI verdes;
- nenhuma mutação artificial em Production.

## Depois de #187

Ordem atual de promoção:

1. **#183 — empréstimos** com restituição física e/ou monetária;
2. **#185 — PDV Legal** quando houver estrutura/amostra oficial de exportação;
3. **#188 — catálogo comercial, preços e margem**;
4. **#189 — fichas técnicas/receitas**;
5. **#184 — consumo de funcionários**, evitando duplicar vendas do PDV;
6. **#190 — compositor modular**, começando por capability registry + 1–2 módulos de baixo risco;
7. **Q-022 — perfis/pessoas reais** antes do go-live;
8. homologação com dados representativos;
9. migração/cutover;
10. production-readiness / #75/#121.

A ordem 2–6 pode ser refinada por dependência real comprovada, mas não deve haver retorno ao estado documental antigo de “custeio indefinido”, “ficha técnica definitivamente adiada” ou “produto vendável proibido”.

## Regras para #188/#189/#190

Quando essas Issues forem executadas:

- não transformar Lojasaph em POS por inferência;
- preço de compra, custo de estoque e preço de venda permanecem conceitos separados;
- margem bruta não é lucro líquido;
- ficha técnica não baixa estoque automaticamente sem regra explícita;
- módulo desabilitado não apaga dados;
- backend deve respeitar gating, não apenas a navegação;
- UX/qualidade visual é parte do aceite, não melhoria opcional posterior.

## Guardrails

- GitHub é fonte de verdade;
- Supabase/schema/RLS/grants continuam hard boundaries;
- nenhum secret em Git/docs/chat/log;
- não criar fixture/dado Production para evidência;
- não usar auth bypass;
- não repetir deploy Vercel manual rotineiro;
- não criar PR apenas para repetir blocker sem nova evidência;
- não retomar #75/#121 antes de production-readiness ou decisão explícita posterior.
