# Fase 53 — decisões de negócio

Data inicial: 2026-09-03  
Última atualização: 2026-09-04  
Issue: #181

## Objetivo

Registrar somente decisões explicitamente fornecidas pelo operador e separar o que está aprovado, deferido, ainda depende de definição e exige implementação própria.

## Primeira rodada — 2026-09-03

| Requisito | Decisão | Consequência |
| --- | --- | --- |
| `REQ-STK-007` — empréstimo | **necessário** | processo distinto de transferência, com valor e restituição total/parcial por estoque e/ou valor; Issue #183 |
| `REQ-EXP-004` — FEFO | **aprovado** | priorizar o lote que vence primeiro quando não houver lote físico específico indicado |
| `REQ-FIN-004` — pagamento parcial/múltiplo | **não necessário para o primeiro go-live** | não ampliar UX específica; capacidade técnica já existente pode permanecer |
| `REQ-CASH-007` — consumo de funcionários | **necessário** | é venda atribuída ao funcionário e descontada em folha; Issue #184 |
| `REQ-CASH-008` — integração com vendas/POS | **estudo aprovado** | PDV Legal permanece como PDV; estudar importação/exportação; Issue #185 |

Na primeira rodada, produto vendável/ficha técnica foram inicialmente adiados e o método de custeio permaneceu aberto. A rodada de 2026-09-04 **substitui essas três decisões anteriores** conforme abaixo.

## Segunda rodada — 2026-09-04

### Custeio — Q-008 encerrada

Decisão explícita:

> o valor de uma saída/perda deve usar o custo da mercadoria/lote que realmente saiu ou foi perdido.

Exemplo aprovado: se a água perdida pertence ao lote adquirido por R$ 5/unidade, a perda vale R$ 5/unidade; se pertence ao lote adquirido por R$ 2/unidade, vale R$ 2/unidade.

Consequências:

- `REQ-STK-010` deixa de ser PENDING;
- custo médio deixa de ser a regra empresarial de saída física identificável;
- cada entrada precisa preservar camada/lote de custo rastreável;
- retiradas, perdas, vencimentos, transferências e empréstimos usam o custo da camada efetivamente movimentada;
- FEFO escolhe a camada quando a operação não informa um lote físico específico;
- perda/quebra de lote conhecido usa o lote real informado;
- casos sem custo rastreável exigem fallback explícito/auditável, não média silenciosa.

Fonte normativa: `docs/decisions/ADR-003-inventory-costing.md`. Implementação: Issue #187.

### Empréstimos — #183 agora possui fonte de valor definida

O empréstimo continua devendo registrar valor do que foi emprestado e manter saldo pendente. A restituição pode ocorrer total ou parcialmente por:

- devolução física ao estoque;
- restituição em valor;
- combinação de estoque e valor.

O valor físico de referência deve ser formado pelos custos das camadas/lotes efetivamente emprestados. A implementação de #183 deve ocorrer depois da reconciliação técnica de custeio em #187 para não perpetuar o default antigo de custo médio.

### Catálogo comercial e preço/margem — #188

O operador pediu que o Lojasaph registre informações suficientes de compra, venda e resultado para gerar bons relatórios.

Decisão de modelagem:

- PDV Legal continua sendo o PDV;
- Lojasaph pode e deve representar **produto vendável** para mapeamento/análise, sem virar frente de caixa;
- um produto vendido pode mapear 1:1 para item de estoque ou representar prato/preparação;
- preço de compra/fornecedor, custo real do lote, preço de venda e margem são conceitos distintos;
- preço de venda precisa de histórico/vigência;
- relatórios devem distinguir receita, custo e margem bruta;
- não chamar margem bruta de lucro líquido sem despesas/taxas/impostos suficientes.

A UI deve organizar os dados de forma progressiva e visualmente boa; não concentrar tudo em um formulário gigante. Issue #188.

### Fichas técnicas/receitas — #189

A decisão anterior de adiamento foi revertida como visão de produto: ficha técnica foi **recolocada na fila**, sem necessariamente bloquear o primeiro corte operacional.

Motivação: se vendas do PDV Legal puderem ser importadas, o sistema poderá relacionar pratos aos insumos e produzir análises mais ricas de custo/margem.

A ficha deve poder conter versão/vigência, rendimento, ingredientes, quantidades/unidades e custo teórico. Não baixar estoque automaticamente apenas porque existe uma receita cadastrada; qualquer sincronização venda → consumo físico exige regra separada para evitar dupla baixa.

Issue #189.

### Composição modular do sistema — #190

O operador pediu uma área estrutural acessível inicialmente apenas a `owner` Organization-wide para montar/desmontar capacidades do Lojasaph como peças de um quebra-cabeças.

Decisão de produto/arquitetura:

- desabilitar módulo **não apaga dados**;
- backend deve bloquear novas ações quando necessário, não apenas esconder menu;
- histórico e tabelas permanecem intactos e reativáveis;
- dependências entre módulos devem ser explícitas;
- módulos core de autenticação, autorização/RLS, Organization, auditoria e integridade não são desligáveis;
- navegação/dashboard devem refletir a composição;
- alterações precisam de audit trail;
- UX deve parecer configurador de produto, não painel técnico de feature flags.

Issue #190.

### Qualidade visual é parte do aceite

O operador reforçou que não basta uma funcionalidade ser utilizável. Novas áreas, especialmente catálogo comercial, ficha técnica, relatórios e compositor modular, precisam manter padrão visual/produtivo coerente com a consolidação UX da Fase 51.

Isso significa linguagem de negócio, hierarquia visual, progressive disclosure, feedback consistente, responsividade e acessibilidade; não transformar requisitos novos em tabelas/formulários brutos de engenharia.

## FEFO — regra consolidada

FEFO permanece aprovado. Quando houver lotes comparáveis e nenhum lote físico específico indicado, a saída deve priorizar o lote com vencimento mais próximo.

Quando a operação informar um lote real conhecido — por exemplo, uma perda/quebra — esse lote prevalece e seu custo é usado.

## Pagamento parcial/múltiplo

Continua **não necessário para o primeiro go-live**. A capacidade técnica existente pode permanecer, sem expansão por inércia.

## Consumo de funcionários

Regra aprovada:

> consumo de funcionário entra como venda, mas o valor é descontado na folha.

Consequências mínimas:

- identificar funcionário;
- compor venda/faturamento;
- não representar entrada imediata na gaveta/meio de pagamento;
- fornecer valor rastreável para o processo de desconto em folha.

Isso não transforma o Lojasaph em sistema de folha/RH. Origem do lançamento, granularidade e eventual confirmação de desconto continuam na Issue #184 e devem considerar o estudo do PDV para evitar duplicidade.

## PDV Legal — estudo #185

Pesquisa pública inicial já confirmou exportações Excel de vendas/cadastros e integrações oficiais selecionadas, sem evidência suficiente de API aberta customizada.

Direção conservadora permanece:

**PDV Legal → arquivo oficial Excel/CSV → staging/dry-run/idempotência do Lojasaph**.

O estudo deve priorizar campos úteis a catálogo/margem/fichas técnicas/consumo, como produto/código/EAN, quantidade, preço, filial/unidade, data/hora e chaves de deduplicação quando disponíveis.

Integração direta somente se mecanismo oficial for comprovado.

## Itens que permanecem para a Fase 53

1. **não perguntar novamente Q-008** — decisão de custeio está encerrada;
2. implementar #187 antes de #183, pois o runtime atual ainda pode usar custo médio em pontos relevantes;
3. implementar #183 com valuation por lote/camada;
4. avançar #185 quando houver estrutura/amostra oficial do PDV Legal;
5. desenhar/implementar #188 e #189 em coerência com #185/#187;
6. refinar #184 sem duplicar vendas;
7. mapear Q-022 — pessoas/cargos reais — antes do go-live;
8. manter #190 na fila arquitetural após mapear dependências reais;
9. não retomar #75/#121 antes do marco de production-readiness;
10. não executar migração/cutover real antes das implementações/decisões necessárias e homologação com dados representativos.
