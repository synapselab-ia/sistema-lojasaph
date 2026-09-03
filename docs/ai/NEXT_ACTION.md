# Next Action — Sistema Lojasaph

## Estado

Fase 51 / #142 e Fase 52 / #180 concluídas. A frente ativa é **Fase 53 / #181 — decisões de negócio e perfis reais**.

Em 2026-09-03 o operador decidiu:

- `REQ-ITEM-004` produto de venda/POS: adiar;
- `REQ-ITEM-005` ficha técnica: adiar;
- `REQ-STK-007` empréstimo: necessário, com restituição física e/ou monetária — #183;
- `REQ-STK-010` custeio: necessário, método ainda não escolhido;
- `REQ-EXP-004` FEFO: sim;
- `REQ-FIN-004` pagamento parcial/múltiplo: não necessário para o primeiro go-live;
- `REQ-CASH-007` consumo de funcionários: venda com desconto em folha — #184;
- `REQ-CASH-008`: PDV Legal continua como PDV e deve ser estudada importação/exportação — #185.

Detalhes: `docs/qa/fase53-business-decisions.md`.

## NEXT_ACTION objetiva

### **Resolver Q-008 — método final de custeio**

Não implementar #183 antes desta decisão, porque o empréstimo precisa registrar valor e a fonte desse valor depende da regra de custeio.

## Decisão necessária

Apresentar ao operador opções em linguagem operacional e obter escolha explícita entre, no mínimo:

1. **custo médio ponderado/móvel** — cada entrada recompõe o custo médio do saldo;
2. **última compra** — valor de referência passa a ser o custo mais recente;
3. **custo do lote específico** — cada saída/valuation depende do lote efetivamente movimentado;
4. outra regra real informada pelo operador/Asaph.

Explicar impactos em:

- valor do estoque;
- retiradas/perdas;
- empréstimos e restituições;
- margem/relatórios;
- complexidade operacional.

**Não inferir custo médio a partir do código existente.**

## Depois da decisão de custeio

1. atualizar `requirements.md`, `business-rules.md` e ADR se necessário;
2. executar Issue #183 em branch funcional própria;
3. manter CI/migrations/RLS/documentação consistentes;
4. avançar Issue #185 obtendo amostra ou estrutura de exportação real do PDV Legal antes de criar importador;
5. usar o resultado de #185 para definir se #184 recebe lançamentos manuais, importados ou ambos;
6. concluir Q-022 — mapeamento de pessoas/cargos reais — antes de preparar usuários do go-live.

## PDV Legal — estado do estudo

Documentação oficial pública consultada em 2026-09-03 comprova exportação Excel de vendas e listagens/cadastros e integrações oficiais com alguns ERPs. Não há evidência suficiente para declarar API aberta customizada.

Direção: começar por **Excel/CSV + staging/dry-run/idempotência**; integração direta apenas se mecanismo oficial for confirmado.

## Guardrails

- não reabrir Fase 51/tablet sem nova necessidade ou regressão;
- não remover capacidade técnica de múltiplos pagamentos apenas porque não é requisito inicial;
- não criar POS/ficha técnica enquanto estiverem deferidos;
- não transformar consumo de funcionários em módulo completo de folha/RH;
- não usar scraping do PDV como integração de produção;
- não fabricar dados Production;
- não retomar #75/#121;
- não fazer deploy Vercel manual rotineiro.
