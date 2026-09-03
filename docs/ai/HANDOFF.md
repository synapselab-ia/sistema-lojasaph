# Handoff — Sistema Lojasaph

## Como ler

**Consultar GitHub para HEAD real de `main`, Issues, PRs, branches e CI.** Não usar SHAs documentais como estado permanente.

## Frente ativa

Fase 51 / #142 e Fase 52 / #180 estão concluídas. A frente ativa é **Fase 53 / #181 — decisões de negócio e perfis reais**.

Primeiro bloco de decisões recebido em 2026-09-03 e versionado em `docs/qa/fase53-business-decisions.md`.

## Decisões já tomadas

- produto de venda/POS próprio no Lojasaph: **adiado**;
- ficha técnica/receita: **adiada**;
- empréstimo: **necessário** — #183;
- custeio: **necessário, método ainda aberto** — Q-008;
- FEFO: **sim, obrigatório**;
- pagamento parcial/múltiplo: **não necessário no primeiro go-live**;
- consumo de funcionários: **é venda e desconta em folha** — #184;
- PDV atual: **PDV Legal**; estudar importação/exportação — #185.

## #183 — Empréstimos

Regra aprovada:

- processo distinto de transferência;
- registra quantidade e valor do empréstimo;
- restituição física parcial/total;
- restituição em valor parcial/total;
- combinação das duas formas;
- saldo e histórico auditáveis.

**Bloqueio:** escolher o método de custeio para definir a fonte do valor/custo de referência. Não assumir custo médio apenas porque a implementação atual o usa.

## #184 — Consumo de funcionários

Regra aprovada: consumo de funcionário é venda atribuída ao funcionário e o valor é descontado na folha.

Não transformar isso em módulo de RH/folha. Ainda definir origem do lançamento (manual/importado), granularidade e eventual confirmação de desconto. O estudo #185 pode afetar essa decisão para evitar duplicidade.

## #185 — PDV Legal

Pesquisa pública inicial confirmou:

- exportação Excel de relatórios de vendas;
- exportação Excel de cadastros/estoque/tabelas de preço;
- integrações oficiais com alguns ERPs;
- canal para discutir integrações não listadas.

Não há base suficiente para afirmar API aberta customizada. Primeira hipótese: importar arquivos Excel/CSV oficiais pelo staging/dry-run do Lojasaph. Não usar scraping como integração.

## FEFO

A regra empresarial foi aprovada e o núcleo técnico já utiliza FEFO nas saídas compatíveis. Não criar trabalho artificial sem gap concreto.

## Pagamentos parciais

Não são requisito do primeiro go-live. Capacidade técnica existente pode permanecer; não remover nem expandir por inércia.

## Perguntas prioritárias

1. **Q-008 — qual método de custeio?**
2. **Q-022 — quem pode fazer cada ação?**
3. detalhes necessários de #183/#184/#185;
4. perguntas históricas de planilha somente na preparação de migração/cutover.

## Estado infra/UX que não deve ser refeito

- UX Fase 51 já concluída dentro da limitação tablet aceita;
- desktop/mobile possuem evidência live representativa;
- tablet permanece deferido, não homologado;
- migration drift administrativo #175 já foi corrigido;
- não repetir smokes, reconciliation de migrations ou deploy Vercel sem regressão concreta.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## NEXT_ACTION

### Resolver Q-008 — método final de custeio

A próxima conversa deve apresentar as opções em linguagem de negócio e obter decisão explícita. Somente depois implementar #183.

Uma decisão de custeio deve definir, no mínimo, qual valor é usado para:

- saldo/valuation de estoque;
- retirada/perda;
- valor de empréstimo;
- relatórios gerenciais.

Depois:

1. atualizar requisito/regra/ADR se necessário;
2. implementar #183 em branch própria;
3. avançar o spike #185 com amostra/estrutura real de exportação do PDV Legal;
4. refinar #184 com base na origem real dos consumos;
5. concluir Q-022 antes do go-live.

## Guardrails

GitHub é fonte de verdade; RLS/backend continuam boundaries; nenhum secret; nenhuma fixture Production; nenhuma regra por inferência; nenhum deploy Vercel manual rotineiro; não retomar #75/#121 nesta fase.
