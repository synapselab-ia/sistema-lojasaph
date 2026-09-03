# Current State — Sistema Lojasaph

Última atualização: 2026-09-03

## Regra de baseline

**Sempre consultar GitHub para HEAD, Issues, PRs, branches e CI reais.** SHAs/runs documentados são apenas âncoras de evidência.

## Estado do produto

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A reconciliação funcional final não encontrou gap P0/P1 novo no núcleo existente.

A frente ativa é **Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**.

Em 2026-09-03 o operador respondeu o primeiro bloco de decisões. Isso revelou requisitos funcionais novos/aprovados e reduziu PENDINGs.

## Decisões Fase 53 — 2026-09-03

- `REQ-ITEM-004` produto de venda/POS separado: **adiado para o primeiro go-live**;
- `REQ-ITEM-005` ficha técnica/receita: **adiada para o primeiro go-live**;
- `REQ-STK-007` empréstimo: **obrigatório** e distinto de transferência, com valor e restituição total/parcial por estoque e/ou valor — Issue #183;
- `REQ-STK-010` custeio: **obrigatório, método ainda não escolhido**;
- `REQ-EXP-004` FEFO: **aprovado**;
- `REQ-FIN-004` pagamento parcial/múltiplo: **não necessário para o primeiro go-live**;
- `REQ-CASH-007` consumo de funcionários: **é venda atribuída ao funcionário e descontada em folha** — Issue #184;
- `REQ-CASH-008`: PDV Legal continua como sistema de vendas; **estudar importação/exportação** — Issue #185.

Detalhes: `docs/qa/fase53-business-decisions.md`.

## Implicações técnicas

### Empréstimo — #183

Necessita implementação nova. O fluxo deve manter saldo físico e monetário pendente e aceitar restituição parcial/total física, financeira ou combinada. A origem do valor unitário depende da decisão final de custeio; portanto **não implementar valuation por suposição**.

### Custeio — Q-008

O runtime atual usa custo médio em operações existentes, mas isso não equivale a aprovação empresarial. O próximo passo de negócio é escolher explicitamente o método final.

### FEFO

A regra empresarial agora está aprovada. O núcleo atual já usa FEFO nas saídas compatíveis; não abrir migration/schema apenas para registrar a decisão sem gap concreto.

### Consumo de funcionários — #184

A implementação atual registra `employee_consumption` como movimento separado e não possui toda a semântica agora aprovada. A nova regra exige venda/faturamento + atribuição ao funcionário + informação para desconto em folha, sem transformar o Lojasaph em folha/RH.

### PDV Legal — #185

Pesquisa pública inicial confirmou exportações Excel de vendas e cadastros e integrações oficiais com alguns ERPs. Não há evidência pública suficiente para afirmar API aberta customizada. Direção conservadora: estudar importação por Excel/CSV usando staging/dry-run/idempotência já existentes.

## Perguntas abertas prioritárias

1. **Q-008:** escolher método de custeio;
2. **Q-022:** mapear pessoas/cargos reais às capacidades técnicas;
3. detalhes necessários de #183/#184/#185;
4. questões históricas/migração somente quando necessárias ao cutover.

`docs/product/open-questions.md` foi triado sem inventar respostas.

## Runtime / infraestrutura

Último deployment de aplicação observado continua sendo o runtime integrado no PR #171. PRs documentais posteriores não justificam deploy manual.

Production e Git foram previamente revalidados alinhados até `20260828132500`. Não repetir o incidente #175 sem drift novo comprovado.

#75/#121 e `REQ-PLAT-005` continuam **TOTALMENTE ON HOLD** até production-readiness.

Tablet live permanece deferido por decisão explícita do operador; não pedir novamente sem nova necessidade real.

## NEXT_ACTION

**Concluir Q-008 (método de custeio) sem inferência.** Depois da decisão, #183 deixa de estar bloqueada e pode ser implementada em branch funcional própria.

Em paralelo lógico, #185 deve obter estrutura/amostra de exportação do PDV Legal antes de definir importador, e #184 deve usar essa decisão para evitar duplicar vendas. Q-022 deve ser concluída antes da preparação dos usuários reais de go-live.
