# Auditoria final de gaps — Sistema Lojasaph

Data inicial: 2026-08-31  
Última atualização: 2026-09-03  
Status: **fonte de verdade para a fila de fechamento pós-conclusão funcional**

## Estado executivo

A Fase 51 concluiu a consolidação/UX e a Fase 52 concluiu a reconciliação funcional do núcleo sem novo gap P0/P1 inequívoco.

O sistema **ainda não é 100%, go-live nem production-ready**: restam conclusão de negócio, implementações aprovadas, homologação com dados representativos, migração/cutover e proteção final de Production.

Tablet live permanece deferido por decisão explícita do operador; não registrar como homologado nem reabrir por inércia.

## Marco 2 — conclusão de negócio / Fase 53

Issue guarda-chuva: **#181**.

Decisões de 2026-09-03:

### Adiados para o primeiro go-live

- `REQ-ITEM-004` — produto de venda/POS próprio;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-FIN-004` — UX/regra específica de pagamento parcial/múltiplo.

Capacidades técnicas existentes não precisam ser removidas; apenas não devem gerar expansão por inércia.

### FEFO aprovado

`REQ-EXP-004` deixa de ser PENDING. Quando houver lotes comparáveis, a saída deve priorizar o lote que vence primeiro. O núcleo atual já usa FEFO nas saídas compatíveis; não há gap novo comprovado apenas por essa decisão.

### Empréstimo obrigatório — #183

`REQ-STK-007` passa a ser obrigatório.

O empréstimo é processo distinto de transferência e deve registrar quantidade e valor, permitindo restituição total/parcial por:

- retorno físico ao estoque;
- restituição em valor;
- combinação das duas formas.

**Bloqueio atual:** escolher o método de custeio que define a fonte do valor/custo de referência.

### Custeio obrigatório, método ainda aberto

`REQ-STK-010` é necessário, mas Q-008 ainda deve escolher explicitamente o método. Não inferir entre custo médio, última compra, lote específico ou outro método.

Essa decisão afeta valuation, retiradas, perdas, empréstimos e relatórios.

### Consumo de funcionários — #184

`REQ-CASH-007` passa a ter regra empresarial:

- é venda atribuída ao funcionário;
- compõe faturamento;
- não é entrada imediata na gaveta;
- valor é descontado na folha.

O Lojasaph não vira sistema de folha/RH. Ainda é preciso definir origem do lançamento, granularidade e eventual confirmação de desconto, preferencialmente após o estudo do PDV para evitar duplicidade.

### PDV Legal / importação — #185

O PDV Legal permanece como sistema de vendas. Pesquisa pública inicial comprova exportações Excel de vendas/cadastros e integrações oficiais com alguns ERPs, mas não comprova API aberta customizada.

Direção inicial: **arquivo Excel/CSV → staging/dry-run/idempotência do Lojasaph**. Integração direta só com mecanismo oficial confirmado.

## Q-022 — perfis reais

Permanece necessária antes do go-live. Mapear pessoas/cargos reais às capacidades técnicas existentes sem assumir equivalência automática com `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier` e `viewer`.

## Perguntas históricas/migração

`docs/product/open-questions.md` foi triado em 2026-09-03.

Q-005, Q-007, Q-009, Q-014 e Q-019 foram resolvidas/decididas. Q-006 foi formalmente deferida para o primeiro go-live. Q-008 permanece aberta apenas quanto ao método. Q-001/Q-004 e outras ambiguidades históricas devem ser resolvidas somente no nível necessário ao cutover.

## Marco 3 — homologação com dados representativos e cutover

Depois das implementações/decisões necessárias:

1. preparar ambiente seguro com dados representativos;
2. configurar estrutura, usuários/perfis e parâmetros reais;
3. percorrer jornadas críticas com quem conhece a operação;
4. validar nomenclatura, permissões e relatórios;
5. corrigir somente gaps comprovados;
6. congelar fontes finais;
7. executar dry-run de migração;
8. corrigir mappings/inconsistências;
9. importar de forma idempotente/rastreável;
10. reconciliar saldos/totais/amostras e aprovar corte.

Production não deve receber fixtures artificiais apenas para produzir evidência.

## Marco 4 — production-readiness

Somente após conclusão de negócio e cutover:

- retomar #75/#121;
- fechar `REQ-PLAT-005`;
- comprovar backup automático PostgreSQL e Storage quando aplicável;
- destino off-site, integridade e retenção;
- restore/drill isolado;
- observabilidade/gates finais;
- separação de ambientes/segredos;
- aprovação de go-live/production-readiness.

#75/#121 continuam **TOTALMENTE ON HOLD** até esse marco ou nova decisão explícita.

## Ordem atual

1. **decidir Q-008 — método de custeio**;
2. **implementar #183 — empréstimos**;
3. **avançar #185 — PDV Legal** com amostra/estrutura real de exportação;
4. **refinar/implementar #184 — consumo de funcionários** sem duplicar vendas;
5. **concluir Q-022**;
6. homologação com dados representativos;
7. migração/cutover;
8. production-readiness / #75/#121.

## Regra de encerramento

O Lojasaph pode ser descrito como **núcleo funcionalmente concluído dentro das limitações declaradas**, mas não como `100%`, `go-live` ou `production-ready` até os marcos restantes serem satisfeitos ou formalmente aceitos/deferidos no nível correto.
