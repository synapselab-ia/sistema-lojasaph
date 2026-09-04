# Current State — Sistema Lojasaph

Última atualização: 2026-09-04

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais.** SHAs/runs documentados são apenas âncoras de evidência.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A reconciliação funcional final não encontrou gap P0/P1 novo no núcleo existente.

A frente ativa é **Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**, agora com uma segunda rodada de decisões explícitas do operador em 2026-09-04.

Detalhes consolidados: `docs/qa/fase53-business-decisions.md`.

## Decisões empresariais vigentes

### Custeio — Q-008 resolvida

`REQ-STK-010` está **decidido**: saídas físicas usam o custo da camada/lote efetivamente movimentada.

Exemplo empresarial aprovado: se a unidade perdida veio do lote que custou R$ 5, a perda vale R$ 5; se veio do lote que custou R$ 2, vale R$ 2. Não substituir silenciosamente por custo médio ou última compra.

- FEFO escolhe o lote quando não houver seleção física explícita;
- lote explicitamente informado numa perda/quebra conhecida prevalece;
- transferências/devoluções preservam custo de origem;
- empréstimos usam o custo das camadas efetivamente emprestadas;
- custo médio pode existir como indicador analítico, não como reprecificação das saídas conhecidas;
- fallback para legado/estoque negativo sem custo rastreável precisa ser explícito e auditável.

Fonte: `docs/decisions/ADR-003-inventory-costing.md`. Implementação necessária: **#187**.

### Empréstimos — #183

Empréstimo é obrigatório e distinto de transferência. Deve registrar quantidade e valor, manter saldo e permitir restituição total/parcial por estoque, valor ou combinação.

A fonte do valor físico já está decidida: custo das camadas/lotes efetivamente emprestados. **#183 deixa de depender de decisão empresarial, mas deve ser implementada depois de #187 para não perpetuar custo médio no runtime.**

### FEFO

`REQ-EXP-004` está aprovado. O núcleo já usa FEFO em saídas compatíveis. Refinamento de 2026-09-04: FEFO é default quando não há lote físico explicitamente indicado; perda/quebra de lote conhecido usa o lote real informado.

### Catálogo comercial, preços e margem — #188

A decisão anterior de “não criar produto de venda” foi refinada: o Lojasaph **não vira PDV**, mas deve poder representar produto vendável para mapear vendas, preço, ficha técnica e relatórios.

- PDV Legal continua sendo o sistema de venda;
- produto vendável pode mapear 1:1 para item de estoque ou representar prato/preparação;
- preço de fornecedor, custo real do lote, preço de venda e margem são conceitos distintos;
- preço de venda precisa de histórico/vigência;
- relatórios devem distinguir receita, custo e margem bruta;
- não chamar margem bruta de lucro líquido sem dados suficientes.

Issue: **#188**.

### Fichas técnicas/receitas — #189

A decisão anterior de adiamento foi revertida como visão de produto. Ficha técnica foi **recolocada na fila** para permitir prato/receita, ingredientes, rendimento, custo teórico e análise de margem, especialmente se vendas do PDV Legal forem importadas.

A existência de ficha técnica não autoriza baixa automática de estoque. Venda → consumo físico precisa de regra separada para evitar dupla baixa.

Issue: **#189**.

### Consumo de funcionários — #184

Continua aprovado: é venda atribuída ao funcionário, compõe faturamento e o valor é descontado em folha, sem entrada imediata de caixa e sem transformar o Lojasaph em sistema de RH/folha.

A origem do lançamento deve considerar #185 para evitar duplicar vendas importadas.

### PDV Legal — #185

PDV Legal continua como sistema de vendas. Pesquisa pública inicial confirmou exportações Excel e integrações oficiais selecionadas, mas não API aberta customizada comprovada.

Direção: começar por **Excel/CSV oficial → staging/dry-run/idempotência**. O estudo deve priorizar produto/código, quantidade, preço, filial/unidade, data/hora e chaves úteis a deduplicação/mapeamento.

Issue: **#185**.

### Compositor modular do sistema — #190

Visão de produto aprovada: área estrutural acessível inicialmente somente a `owner` Organization-wide para habilitar/desabilitar capacidades como peças de um quebra-cabeças.

- desabilitar não apaga dados/histórico;
- backend deve respeitar o estado do módulo;
- dependências devem ser explícitas;
- auth/RLS/Organization/auditoria/integridade permanecem core não removível;
- navegação e dashboard refletem configuração;
- reativação restaura acesso ao histórico;
- mudanças são auditadas;
- UX deve ser configurador de produto, não painel técnico de feature flags.

O código já é parcialmente modular em `src/modules/*`, mas a navegação ainda é fixa; implementar somente com registry/capability graph e rollout controlado. Issue: **#190**.

### Qualidade visual

Para as novas áreas, “funciona” não é suficiente. Catálogo comercial, ficha técnica, relatórios e compositor modular devem manter padrão de produto: linguagem operacional, hierarchy/progressive disclosure, feedback, acessibilidade e consistência com o design system da Fase 51.

## Itens ainda deferidos

- `REQ-FIN-004` — UX/regra específica de pagamento parcial/múltiplo: não necessária para o primeiro go-live; capacidade técnica existente pode permanecer.
- tablet live: deferido por decisão operacional; não reabrir sem necessidade real.

## Pergunta de negócio ainda prioritária

**Q-022 — perfis reais:** mapear pessoas/cargos reais às capacidades técnicas existentes antes de preparar usuários de go-live. Não assumir que cargos reais equivalem automaticamente a `owner/admin/manager/...`.

Q-008 **não está mais aberta** e não deve ser perguntada novamente.

## Ordem funcional ativa

1. **#187 — reconciliar runtime para custeio por lote/camada**;
2. **#183 — implementar empréstimos** com restituição física/financeira;
3. **#185 — estudar importação PDV Legal** quando houver estrutura/amostra oficial;
4. **#188 — catálogo comercial, preços e margem**;
5. **#189 — fichas técnicas/receitas**;
6. **#184 — consumo de funcionários**, refinado conforme origem real da venda;
7. **#190 — compositor modular**, após mapear dependências reais e provar gating em poucos módulos;
8. concluir **Q-022** antes da preparação dos usuários reais;
9. homologação com dados representativos → migração/cutover → production-readiness.

Itens 3–7 podem ter dependências/ordem refinadas por evidência concreta, mas nenhum chat deve voltar a tratar custo ou ficha técnica como “decisão ainda não tomada”.

## Runtime / infraestrutura

Último deployment de aplicação observado continua sendo o runtime integrado no PR #171. PRs documentais posteriores não justificam deploy manual.

Production e Git foram previamente revalidados alinhados até `20260828132500`. Não repetir o incidente #175 sem drift novo comprovado.

#75/#121 e `REQ-PLAT-005` continuam **TOTALMENTE ON HOLD** até production-readiness.

## NEXT_ACTION

**Executar Issue #187 — custeio por lote/camada física**, começando por auditoria do runtime atual para localizar onde custo médio ainda alimenta snapshots/valuation e corrigindo somente o necessário com migrations/testes/UX coerentes.

Não implementar #183 antes de #187 estar integrado e validado. Não pedir novamente ao operador que escolha método de custeio.
