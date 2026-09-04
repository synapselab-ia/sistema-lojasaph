# Auditoria final de gaps — Sistema Lojasaph

Data inicial: 2026-08-31  
Última atualização: 2026-09-04  
Status: **fonte de verdade para a fila de fechamento pós-conclusão funcional**

## Estado executivo

A Fase 51 concluiu a consolidação/UX e a Fase 52 concluiu a reconciliação funcional do núcleo sem novo gap P0/P1 inequívoco.

O sistema **ainda não é 100%, go-live nem production-ready**: restam implementações empresariais aprovadas, perfis reais, homologação com dados representativos, migração/cutover e proteção final de Production.

Tablet live permanece deferido por decisão explícita do operador; não registrar como homologado nem reabrir por inércia.

## Marco 2 — conclusão de negócio / Fase 53

Issue guarda-chuva: **#181**.

As decisões de 2026-09-03 foram refinadas por uma segunda rodada em 2026-09-04. A documentação vigente está em `docs/qa/fase53-business-decisions.md`.

### Custeio decidido — #187

`REQ-STK-010` deixa de ser PENDING.

Regra empresarial:

- o custo da saída/perda acompanha o **lote/camada física efetivamente movimentada**;
- se a unidade perdida pertence a lote de R$ 5, a perda vale R$ 5; se pertence a lote de R$ 2, vale R$ 2;
- custo médio/última compra não substituem silenciosamente custo real conhecido;
- FEFO escolhe lote quando não houver seleção física explícita;
- lote explicitamente identificado numa perda/quebra prevalece;
- transferências/devoluções preservam custo de origem;
- custo médio pode existir apenas como indicador gerencial derivado;
- legado/estoque negativo sem custo rastreável exige fallback explícito/auditável.

O ADR-003 foi revisado. O runtime ainda precisa ser reconciliado na **Issue #187** antes de novas features que dependam do valuation.

### Empréstimo obrigatório — #183

`REQ-STK-007` permanece obrigatório.

O empréstimo é processo distinto de transferência e deve registrar quantidade e valor, permitindo restituição total/parcial por:

- retorno físico ao estoque;
- restituição em valor;
- combinação das duas formas.

A fonte de valor físico já está decidida: custos das camadas/lotes efetivamente emprestados. #183 não depende mais de uma decisão empresarial, mas deve vir **depois de #187** para usar a regra correta no runtime.

### FEFO aprovado

`REQ-EXP-004` é obrigatório. Quando não houver lote físico explicitamente indicado, a saída deve priorizar o lote com vencimento mais próximo. Perda/quebra de lote conhecido usa o lote real informado.

### Catálogo comercial, preço e margem — #188

A decisão inicial de adiar produto de venda foi refinada em 2026-09-04.

O **PDV Legal continua sendo o PDV**, mas o Lojasaph deve poder representar um **produto vendável** para mapeamento e análise:

- relação 1:1 com item de estoque quando aplicável;
- prato/preparação separado quando composto por insumos;
- preço de venda vigente/histórico;
- relação com vendas importadas;
- relação com ficha técnica;
- custo e margem gerencial.

Preço de fornecedor, custo real do lote e preço de venda são conceitos distintos. Relatórios devem distinguir receita, custo e margem bruta. Não chamar margem bruta de lucro líquido sem despesas/taxas/impostos suficientes.

Issue: **#188**.

### Fichas técnicas/receitas — #189

A decisão de adiamento foi revertida como roadmap de produto: ficha técnica/receita foi **recolocada na fila**.

A feature deve suportar produto/prato, versão/vigência, rendimento, ingredientes, quantidades/unidades, custo teórico e histórico.

Não autoriza baixa automática de estoque apenas pela existência da receita. Venda → consumo físico precisa de regra explícita e proteção contra dupla baixa.

Issue: **#189**.

### Consumo de funcionários — #184

`REQ-CASH-007` continua com regra empresarial aprovada:

- é venda atribuída ao funcionário;
- compõe faturamento;
- não é entrada imediata na gaveta;
- valor é descontado na folha;
- Lojasaph não vira sistema de folha/RH.

A origem do lançamento deve considerar o estudo do PDV para evitar duplicidade.

### PDV Legal / importação — #185

O PDV Legal permanece como sistema de vendas. Pesquisa pública inicial comprova exportações Excel de vendas/cadastros e integrações oficiais selecionadas, mas não comprova API aberta customizada.

Direção inicial: **arquivo Excel/CSV oficial → staging/dry-run/idempotência do Lojasaph**.

O spike deve priorizar campos que permitam mapear produto/código/EAN, quantidade, preço/valor, filial/unidade, data/hora, meio de pagamento quando disponível e chaves de deduplicação.

Integração direta somente com mecanismo oficial comprovado.

### Compositor modular — #190

Visão aprovada: `owner` Organization-wide poderá futuramente habilitar/desabilitar capacidades do Lojasaph como peças de um quebra-cabeças.

Regras obrigatórias:

- desabilitar módulo não apaga dados/histórico;
- backend respeita gating, não apenas menu;
- dependências são explícitas;
- autenticação, autorização/RLS, Organization, auditoria e integridade são core não removível;
- navegação/dashboard refletem configuração;
- reativação recupera acesso ao histórico intacto;
- mudanças são auditáveis;
- UX é configurador de produto, não feature flags técnicas.

A base atual em `src/modules/*` ajuda, mas navegação ainda é fixa. Implementar depois de mapear dependências reais e começar com poucos módulos de baixo risco. Issue: **#190**.

### Qualidade visual como critério de produto

Para #188/#189/#190 e relatórios derivados, “funcional” não basta. O aceite deve incluir linguagem operacional, hierarquia visual, progressive disclosure, feedback, acessibilidade, responsividade e consistência com a consolidação UX da Fase 51.

### Pagamento parcial/múltiplo — deferido

`REQ-FIN-004` continua não necessário para o primeiro go-live. Capacidade técnica existente pode permanecer; não expandir por inércia.

## Q-022 — perfis reais

Permanece necessária antes do go-live. Mapear pessoas/cargos reais às capacidades técnicas existentes sem assumir equivalência automática com `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier` e `viewer`.

A configuração modular de #190 deve começar restrita a `owner` Organization-wide, sem hardcode de pessoa/e-mail/ID.

## Perguntas históricas/migração

`docs/product/open-questions.md` foi triado em 2026-09-04.

Q-005, Q-007, Q-008, Q-009, Q-014 e Q-019 estão resolvidas/decididas. Q-006 permanece somente como ambiguidade histórica da fonte `Gabarito`, sem bloquear catálogo/ficha técnica. Q-001/Q-004 e demais ambiguidades históricas devem ser resolvidas apenas no nível necessário ao cutover.

## Ordem funcional atual

1. **#187 — custeio por lote/camada física**;
2. **#183 — empréstimos**;
3. **#185 — estudo/importação do PDV Legal** quando houver estrutura/amostra oficial;
4. **#188 — catálogo comercial, preços e margem**;
5. **#189 — fichas técnicas/receitas**;
6. **#184 — consumo de funcionários**, refinado conforme origem real da venda;
7. **#190 — compositor modular**, após mapa de dependências e rollout inicial controlado;
8. **Q-022 — perfis/pessoas reais** antes do go-live;
9. homologação com dados representativos;
10. migração/cutover;
11. production-readiness / #75/#121.

A ordem 3–7 pode ser refinada por dependências concretas. Não reabrir como perguntas já decididas: método de custeio, uso do PDV Legal como PDV, necessidade de empréstimos, FEFO, semântica de consumo de funcionários, existência futura de catálogo comercial/ficha técnica ou visão modular.

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

## Regra de encerramento

O Lojasaph pode ser descrito como **núcleo funcionalmente concluído dentro das limitações declaradas**, mas não como `100%`, `go-live` ou `production-ready` até as novas implementações empresariais aprovadas, perfis, dados/cutover e production-readiness serem satisfeitos ou formalmente deferidos no nível correto.
