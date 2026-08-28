# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Slices concluídas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo + padrões reutilizáveis;
- PR #151 — Administração: Estrutura + Usuários/Permissões.

Baseline integrado confirmado em 2026-08-28:

- `main=a06e7c3dd96b4b010ca4c7754438b90e40720399`;
- CI do PR #523 / run `33195119453`: success;
- Inventory Count Integration #244 / run `33195119447`: success;
- Business Transactions Integration #231 / run `33195119446`: success;
- CI pós-merge #524 / run `33195244017`: success;
- Issue #142 aberta e ativa;
- #75/#121 continuam **TOTALMENTE ON HOLD**.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/product/administration-capability-map.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`.

Não refazer as slices já integradas.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: Cadastros — Produtos, Fornecedores e Funcionários no padrão lista → detalhe → ação

O objetivo não é redesenhar visualmente três páginas isoladas. É validar um padrão de produto reutilizável para entidades persistentes importantes, separando descoberta/listagem, contexto de detalhe e ações de manutenção sem mudar silenciosamente domínio, RLS ou regras de negócio.

### 1. Reconciliar e inventariar antes de editar

No início:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade acima;
3. inventariar domínio, repositories, adapters, services, runtime provider e queries para Produto, Fornecedor e Funcionário;
4. localizar `findById`/listagens e relações já suportadas;
5. identificar quais dados hoje são carregados globalmente pelo `RuntimeWorkspaceProvider` e quais podem/devem ser buscados no detalhe sem duplicar regra;
6. mapear permissões/RLS atuais de leitura/manutenção para cada cadastro;
7. definir um contrato explícito `lista → detalhe → ação` para cada entidade antes de começar a implementação.

Não criar schema/RPC novo apenas para viabilizar layout. Primeiro reaproveitar os boundaries existentes.

### 2. Fechar o contrato de rotas

Preservar como entradas de lista:

- `/workspace/produtos`;
- `/workspace/fornecedores`;
- `/workspace/funcionarios`.

Preferir detalhes estáveis:

- `/workspace/produtos/[id]`;
- `/workspace/fornecedores/[id]`;
- `/workspace/funcionarios/[id]`.

Só escolher outra forma se o inventário provar necessidade concreta. Links, active state e navegação devem continuar coerentes com a área Cadastros.

Detalhe inexistente/inacessível deve produzir estado seguro e compreensível, sem vazar IDs ou erro de persistência.

### 3. Produtos

Estado atual: `/workspace/produtos` reúne tabela horizontal, listagem, criação e edição em uma única página.

Transformar em:

**Lista**

- leitura rápida de nome, categoria, unidade, tipo e status;
- pesquisa e filtros que tenham utilidade comprovada com os campos existentes;
- estratégia responsiva deliberada, sem depender de tabela larga com overflow como única solução;
- CTA de criação somente quando autorizado.

**Detalhe**

- identificação principal;
- categoria/unidade/tipo;
- EAN e dados fiscais já armazenados;
- flags de lote, validade e retornável;
- status;
- fornecedores relacionados quando o vínculo existente permitir consulta útil;
- estoque relacionado somente como contexto útil, sem copiar lógica da futura consolidação de Estoque.

**Ações**

- criação e edição contextualizadas;
- manter a autorização existente de catálogo;
- não resolver `REQ-ITEM-004`, `REQ-ITEM-005`, FEFO ou custeio nesta slice.

### 4. Fornecedores

Estado atual: `/workspace/fornecedores` mistura lista, criação/edição, contatos, condições comerciais e produtos fornecidos na mesma página.

Transformar em:

**Lista**

- nome, documento quando existir, contato principal e status;
- pesquisa/filtro com contrato comum às listas de Cadastros quando fizer sentido;
- CTA de criação conforme autorização.

**Detalhe**

- identificação do fornecedor;
- contatos;
- condições comerciais já persistidas;
- produtos fornecidos e preços/embalagens já suportados;
- histórico apenas se existir boundary real e valor de produto nesta slice.

Reaproveitar `SupplierCommercialTermsPanel`, `SupplierItemsPanel` e seus adapters/boundaries quando adequados, refatorando-os para o detalhe em vez de reimplementar persistência.

**Ações**

- criação/edição do fornecedor e contatos em contexto claro;
- manutenção das relações já suportadas;
- não inventar agenda automática, conversão de embalagem ou regra de compras.

### 5. Funcionários

Estado atual: `/workspace/funcionarios` mistura lista, criação e edição. O UUID técnico já foi removido na slice de Administração.

Transformar em:

**Lista**

- nome, código, escopo operacional padrão, status e indicação legível de vínculo de acesso;
- pesquisa/filtros apenas quando úteis;
- criação conforme autorização.

**Detalhe**

- dados operacionais do Employee;
- Unidade/Setor padrão;
- status;
- vínculo de identidade apresentado por informação legível quando o boundary atual permitir.

**Ações**

- criação/edição dos dados operacionais;
- não reintroduzir `auth.users` UUID;
- não transformar Employee em membership;
- a concessão/alteração de autorização continua em Administração → Usuários e permissões.

Se for útil oferecer atalho para administrar acesso, ele deve navegar para a jornada administrativa existente, não duplicar sua mutação.

### 6. Validar o padrão compartilhado sem criar framework antecipado

As três jornadas devem provar quais primitivas realmente se repetem.

Pode ser justificável criar o menor contrato compartilhado para:

- lista responsiva de registros;
- campo de pesquisa/filtros;
- cabeçalho de detalhe/ações;
- estado vazio;
- feedback de ação.

Não criar DataTable/Tabs/SearchField/paginação genéricos apenas por estarem previstos no roadmap. Criá-los somente se duas ou mais jornadas desta slice demonstrarem um contrato estável e documentável.

Reutilizar `src/components/ui` para Button, PageHeader, FormField, Panel, StatusBadge, FeedbackMessage, EmptyState, Dialog/ConfirmDialog e demais componentes já integrados.

### 7. Estados e UX

Para as três jornadas:

- diferenciar loading, vazio, erro, somente leitura e registro inexistente/inacessível;
- impedir duplo envio;
- usar linguagem de operação, não Supabase/RLS/adapter/migration;
- manter foco/labels/teclado/touch target do design system;
- evitar `window.prompt()`/`window.confirm()` como novo padrão;
- preservar URLs de detalhe ao editar/confirmar sempre que possível;
- não esconder ação crítica por overflow horizontal no mobile.

### 8. Testes e validação

Adicionar/ajustar testes para:

- resolução segura de detalhe por ID/Organization;
- autorização de leitura/manutenção;
- contratos de lista/pesquisa/filtro puros quando houver;
- navegação para detalhes;
- relações exibidas no detalhe sem quebra de escopo;
- estados not-found/forbidden sem vazamento técnico;
- componentes compartilhados novos somente se realmente criados.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- integrações afetadas.

Se browser real permitido estiver disponível, validar as três jornadas em desktop e mobile. Se não estiver, registrar explicitamente a limitação e não declarar homologação visual.

### 9. Guardrails

Nesta execução **não**:

- consolidar Estoque, Compras, Financeiro ou Caixa;
- redesenhar Dashboard;
- mudar política de autorização/Q-022;
- reintroduzir UUID técnico de usuário;
- resolver requisitos PENDING;
- criar lógica de venda/POS, ficha técnica, FEFO ou custeio;
- fazer migração cosmética em massa fora das três jornadas;
- tocar em Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite

A slice só pode ser encerrada quando:

- Produtos, Fornecedores e Funcionários possuem listas focadas e detalhes com URL estável;
- criação/edição deixaram de competir permanentemente com a listagem completa na mesma megapágina;
- relações existentes aparecem no contexto correto sem duplicar lógica de outros módulos;
- Funcionários continua sem UUID técnico e sem confundir Employee com autorização;
- permissões/RLS atuais continuam sendo a fronteira real;
- o padrão compartilhado de Cadastros é pequeno, comprovado e reutilizado;
- estados loading/empty/error/read-only/not-found e feedback foram tratados;
- estratégia mobile não depende apenas de tabela larga/overflow;
- lint, typecheck, testes, build e CI aplicável estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois desta slice

Somente após a integração de Cadastros, promover:

> **Estoque — consolidar posição, entradas, baixas/perdas, devoluções, transferências, inventários, lotes/validades e estoque mínimo como uma área coerente.**

Não saltar diretamente para Compras/Financeiro.

## Ordem macro

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. **Cadastros**;
6. Estoque;
7. Compras;
8. Financeiro;
9. Caixa;
10. Dashboard;
11. limpeza de linguagem;
12. homologação UX;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## PENDING — não promover por conveniência de UI

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

## REQ-PLAT-005 continua ON HOLD

Não investigar cron/scheduling, não disparar workflows para prova, não mexer em Storage/R2/S3/restore/secrets/variables e não fabricar evidência Production enquanto o hold estiver ativo.

## Restrições permanentes

- GitHub é a fonte de continuidade;
- RLS continua boundary de acesso;
- nenhum secret em browser/Git/docs/chat;
- não fabricar evidência Production;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente;
- não misturar redesign visual com mudança silenciosa de regra de negócio/autorização.
