# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI.** Não usar SHAs documentais como estado permanente.

Leitura mínima de qualquer chat novo:

1. `AGENTS.md`;
2. `docs/00-START-HERE.md`;
3. `docs/ai/CURRENT_STATE.md`;
4. este `HANDOFF.md`;
5. `docs/ai/NEXT_ACTION.md`;
6. `docs/ai/WORKFLOW.md`;
7. documentos/ADRs da área afetada.

## Frente ativa

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente guarda-chuva é **Fase 53 / #181 — conclusão de negócio**, com decisões de 2026-09-03 e 2026-09-04 consolidadas em `docs/qa/fase53-business-decisions.md`.

## Decisões que NÃO devem ser perguntadas novamente

### Custeio — Q-008 encerrada

A regra final é **custo por lote/camada física efetivamente movimentada**.

- perdeu/retirou a unidade do lote que custou R$ 5 → custo da saída R$ 5;
- perdeu/retirou a unidade do lote que custou R$ 2 → custo da saída R$ 2;
- FEFO escolhe lote apenas quando não há seleção física explícita;
- perda/quebra de lote conhecido usa o lote real;
- transferência e devolução preservam custo de origem;
- empréstimo usa o custo das camadas efetivamente emprestadas;
- custo médio pode ser exibido como indicador derivado, mas não reprecifica saída física conhecida;
- caso sem custo rastreável precisa de fallback explícito/auditável.

Autoridade: `REQ-STK-010`, `BR-STK-010`, `ADR-003-inventory-costing.md`. Issue técnica: **#187**.

### FEFO

Aprovado. Prioriza vencimento mais próximo quando a operação não indicar lote físico específico.

### Pagamento parcial/múltiplo

Não é requisito do primeiro go-live. Não remover a capacidade técnica existente e não expandi-la por inércia.

### Consumo de funcionários

É **venda atribuída ao funcionário**, compõe faturamento e o valor é descontado na folha. Não é recebimento imediato na gaveta e não transforma o Lojasaph em folha/RH. Issue **#184**.

### PDV

O sistema utilizado é **PDV Legal** e continua sendo o PDV. Não criar frente de caixa própria por inferência.

Estudar importação por mecanismo oficial, preferencialmente Excel/CSV com staging/dry-run/idempotência enquanto não houver API/integrador oficial comprovado. Issue **#185**.

## Decisões revisadas em 2026-09-04

### Produto vendável / catálogo comercial — #188

A antiga decisão de “adiar produto de venda” não deve ser lida como proibição de catálogo comercial.

O Lojasaph **não vende no caixa**, mas deve poder representar o produto vendido para:

- mapear dados do PDV Legal;
- guardar preço de venda/histórico;
- relacionar item vendido diretamente ao estoque;
- relacionar prato a ficha técnica;
- calcular receita/custo/margem.

Preço de fornecedor, custo real do lote e preço de venda são conceitos separados. Margem bruta não deve ser chamada de lucro líquido sem dados suficientes. Issue **#188**.

### Ficha técnica/receita — #189

A decisão anterior de adiamento foi revertida como roadmap: ficha técnica foi **recolocada na fila**.

Deve suportar prato/produto preparado, versão, rendimento, ingredientes, quantidades/unidades e custo teórico. Não baixar estoque automaticamente apenas por existir receita; venda → consumo físico precisa de regra explícita para evitar dupla baixa. Issue **#189**.

### Compositor modular — #190

Visão aprovada: área estrutural inicialmente só para `owner` Organization-wide, permitindo montar/desmontar capacidades como peças.

- desligar não apaga histórico/dados;
- backend deve bloquear operações desabilitadas quando necessário;
- dependências precisam ser explícitas;
- auth/RLS/Organization/auditoria/integridade são core não removível;
- navegação/dashboard refletem configuração;
- alterações são auditadas;
- UI deve ser configurador de produto bonito/compreensível, não feature flags técnicas.

Issue **#190**.

## #183 — Empréstimos

Regra aprovada:

- processo distinto de transferência;
- registra quantidade e valor;
- restituição física parcial/total;
- restituição em valor parcial/total;
- combinação das duas formas;
- saldo e histórico auditáveis;
- valuation físico usa custo das camadas/lotes emprestados.

A decisão empresarial de custeio já existe. O bloqueio agora é **técnico**: integrar #187 primeiro para garantir que o runtime use a mesma regra antes de construir empréstimos.

## Qualidade visual

O operador explicitou que “funciona” não basta. Para #188/#189/#190 e relatórios derivados, o aceite inclui:

- linguagem operacional;
- hierarquia visual clara;
- progressive disclosure em vez de formulário gigante;
- feedback/estados consistentes;
- responsividade e acessibilidade;
- consistência com design system/IA da Fase 51.

Não entregar tabela CRUD bruta e declarar produto concluído.

## Ordem de execução vigente

1. **#187 — custeio por lote/camada física**;
2. **#183 — empréstimos**;
3. **#185 — estudo/importação PDV Legal** quando houver estrutura/amostra oficial;
4. **#188 — catálogo comercial, preços e margem**;
5. **#189 — fichas técnicas/receitas**;
6. **#184 — consumo de funcionários**, refinado pela origem real das vendas;
7. **#190 — compositor modular**, depois de mapear dependências e fazer rollout inicial de baixo risco;
8. **Q-022 — perfis/pessoas reais** antes de preparar usuários de go-live;
9. homologação com dados representativos → migração/cutover → production-readiness.

A ordem pode ser refinada quando dependências reais forem comprovadas, mas não voltar a tratar Q-008 ou ficha técnica como perguntas não respondidas.

## Perguntas ainda abertas

- **Q-022** continua prioritária para go-live: quem pode fazer cada ação.
- Q-001/Q-002/Q-003/Q-004 e outras perguntas históricas devem ser respondidas apenas no nível necessário à migração/cutover.
- detalhes específicos de #184/#185/#188/#189 podem surgir durante desenho, mas não invalidam as decisões acima.

## Estado infra/UX que não deve ser refeito

- Fase 51 UX concluída dentro da limitação tablet aceita;
- desktop/mobile possuem evidência live representativa;
- tablet permanece deferido, não homologado;
- migration drift administrativo #175 já foi corrigido;
- Git/Production foram previamente alinhados até `20260828132500`;
- não repetir smokes, reconciliation de migrations ou deploy Vercel sem regressão concreta.

#75/#121 permanecem **TOTALMENTE ON HOLD** até production-readiness.

## NEXT_ACTION

### Executar #187 — reconciliar o runtime com custeio por lote/camada

O próximo chat deve:

1. ler governança e estado real GitHub;
2. abrir Issue #187 e `ADR-003`;
3. auditar onde o runtime atual ainda usa custo médio para snapshots/valuation de saída;
4. desenhar a menor alteração segura que preserve camada/lote, FEFO, transferências, devoluções e legado;
5. implementar em branch funcional com migrations somente se necessárias;
6. cobrir com testes PostgreSQL/aplicação, incluindo mesmo item com lotes de custos diferentes;
7. CI verde → PR → merge → CI pós-merge;
8. atualizar handoff sem fazer deploy Vercel manual por rotina.

Depois promover #183.

## Guardrails

GitHub é fonte de verdade; RLS/backend continuam boundaries; nenhum secret; nenhuma fixture Production; nenhuma regra por inferência; nenhum deploy Vercel manual rotineiro; não retomar #75/#121 nesta fase.
