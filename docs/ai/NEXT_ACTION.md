# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Estado real de partida para a próxima execução:

- `main=97a5975ace5f8e011b27a4e8175d13dcee464253` — merge do PR #153;
- PR #153 — Cadastros: Produtos, Fornecedores e Funcionários — merged;
- CI pós-merge #539 / run `33197347690`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Cadastros sem bug ou gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **Estoque**

O objetivo é consolidar a área operacional de Estoque como uma experiência coerente, sem alterar silenciosamente regras transacionais, escopo, RLS ou requisitos PENDING.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- ADRs e requisitos de inventory já existentes.

### 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. inventariar rotas, páginas, domínio, repositories, gateways, services, RPCs e queries de Estoque;
4. localizar transações atômicas já existentes para entrada, retirada, perda, devolução, transferência, inventário e demais movimentos;
5. mapear permissões/RLS atuais por organização, unidade, local e setor;
6. identificar telas que funcionam como megapáginas, duplicam informação ou expõem linguagem técnica;
7. definir o contrato de navegação e responsabilidade das páginas antes do código.

Não criar schema/RPC novo para resolver layout. Reaproveitar primeiro os boundaries existentes.

### 2. Escopo funcional da consolidação de Estoque

Inventariar e organizar, conforme o que já existe no produto:

- posição/saldos de estoque;
- entradas;
- retiradas/baixas;
- perdas;
- devoluções já suportadas;
- transferências entre locais;
- inventários/contagens;
- lotes;
- validades;
- estoque mínimo.

A área deve favorecer tarefas operacionais reais, reduzindo páginas isoladas e duplicação de contexto.

### 3. Preservar invariantes de domínio

Não mover regra crítica para componentes React.

Preservar nos boundaries atuais, entre outras regras já existentes:

- transações atômicas de movimentação;
- escopo correto de organização/unidade/local/setor;
- restrições de saldo negativo conforme política existente;
- validações de lote/validade já implementadas;
- recebimento/transferência/retirada sem dupla contabilização;
- RLS/grants como fronteira real de autorização.

Se surgir gap, provar com código/teste antes de criar migration/RPC.

### 4. Arquitetura de informação e UX

Usar linguagem operacional, não nomes de tabela/RPC/RLS.

Preferir:

- visão de posição para descoberta e acompanhamento;
- detalhe contextual quando uma entidade persistente justificar URL estável;
- ações dedicadas para movimentos críticos;
- filtros/pesquisa quando úteis;
- feedback explícito de sucesso/erro;
- empty/loading/read-only/not-found seguros;
- estratégia mobile deliberada, sem depender apenas de tabelas largas.

Reutilizar `src/components/ui` e os padrões já provados em Cadastros. Não criar DataTable/Tabs/SearchField/paginação genéricos sem uso repetido comprovado.

### 5. Relação com Cadastros

Produtos já possuem detalhe próprio. Estoque pode apontar para o produto ou usar seu contexto, mas não deve reabrir manutenção de cadastro dentro da área de Estoque.

Não duplicar:

- formulário de Produto;
- dados fiscais;
- manutenção de Fornecedor;
- Employee/login.

### 6. Requisitos que continuam PENDING

Não resolver nesta slice por conveniência:

- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita.

Se uma tela depender de decisão PENDING, apresentar somente o comportamento já suportado e registrar o gap.

### 7. Autorização

Q-022 continua aberta.

Portanto:

- não renomear papéis técnicos como cargos de negócio;
- não ampliar ações por conveniência de UI;
- manter checks no server/domain/banco quando já existirem;
- UI apenas reflete disponibilidade, não se torna fronteira de segurança.

### 8. Testes e validação

Adicionar/ajustar testes nos contratos efetivamente tocados, especialmente para:

- invariantes transacionais;
- escopo organization/unit/location/sector;
- seleção de lote quando aplicável;
- estado de inventário/contagem;
- autorização e isolamento;
- filtros/visões puras quando houver;
- estados seguros de registro inexistente/inacessível.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- Inventory Count Integration;
- Business Transactions Integration quando afetada.

Se browser real permitido estiver disponível, validar jornadas críticas em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

### 9. Guardrails desta execução

Não:

- reabrir Cadastros sem evidência concreta;
- consolidar Compras, Financeiro ou Caixa;
- redesenhar Dashboard;
- mudar Q-022/política de autorização;
- resolver PENDINGs;
- fazer migração cosmética em massa;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite para Estoque

A slice só pode ser encerrada quando:

- as principais tarefas de Estoque formam uma arquitetura coerente e navegável;
- regras transacionais permanecem fora da UI;
- saldos/movimentos não são duplicados por novas telas;
- URLs/ações críticas têm contexto operacional claro;
- mobile não depende apenas de overflow horizontal;
- estados loading/empty/error/read-only/not-found e feedback são tratados;
- permissões/RLS continuam a fronteira real;
- requisitos PENDING permanecem sem inferência;
- lint, typecheck, testes, build, banco/RLS e integrações aplicáveis estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois de Estoque

Somente após a integração da consolidação de Estoque, promover:

> **Compras**

Não saltar diretamente para Financeiro/Caixa/Dashboard.

## Ordem macro

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. **Estoque** — próxima;
7. Compras;
8. Financeiro;
9. Caixa;
10. Dashboard;
11. limpeza de linguagem;
12. homologação UX real;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. O hold só termina por decisão explícita ou no production-readiness final.