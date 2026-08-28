# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua ativa.**

Slices integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo e padrões reutilizáveis;
- PR #151 — Administração: Estrutura + Usuários/Permissões.

Baseline confirmado após Administração:

- `main=a06e7c3dd96b4b010ca4c7754438b90e40720399`;
- CI do PR #523 / run `33195119453`: success;
- Inventory Count Integration #244 / run `33195119447`: success;
- Business Transactions Integration #231 / run `33195119446`: success;
- CI pós-merge #524 / run `33195244017`: success;
- Issue #142 continua aberta;
- #75/#121 continuam **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro ou prova em Production foi feito.

Não refazer as slices já integradas.

## Administração entregue

Mapa de autoridade da slice:

- `docs/product/administration-capability-map.md`.

Rotas reais:

- `/workspace/administracao/estrutura`;
- `/workspace/administracao/acessos`;
- `/workspace/backup` permanece Proteção dos dados.

### Estrutura

A UI persistente administra Negócios, Unidades, Setores e Locais de estoque somente onde os grants/RLS atuais permitem. Não há delete físico, reparenting arbitrário ou alteração de política de estoque negativo nesta jornada.

Foi adicionado invariável de banco que impede `stock_locations.sector_id` de apontar para Setor de outra Unidade.

### Acessos

Memberships continuam sem DML autenticado direto. A jornada utiliza RPCs estreitos para:

- listar acessos;
- criar/reactivar membership;
- alterar role/escopo/estado;
- proteger o último owner Organization-wide;
- registrar auditoria;
- vincular Employee à identidade autenticada.

Convite usa Supabase Auth Admin somente server-side. O callback normal exige membership ativo; convite por si só não concede acesso.

A tela de Funcionários não pede mais UUID de `auth.users`. Employee e autorização permanecem conceitos separados.

## Q-022 permanece aberta

Não interpretar a nova tela como homologação dos papéis técnicos com cargos reais.

Continuam válidos os guardrails:

- não inventar perfis reais;
- não ampliar autorização por conveniência de UI;
- não assumir que `manager`, `inventory`, `finance`, etc. correspondem automaticamente a cargos do cliente;
- preservar guards/RPCs/RLS como fronteira técnica;
- registrar gaps quando uma decisão depender de Q-022.

Q-001/Q-002 também não foram resolvidas pela UI de Estrutura.

## Limite de validação

Código e banco passaram todos os gates do PR e novamente na `main`.

**Não houve browser real disponível nesta sessão.** Administração ainda precisa ser homologada visualmente na etapa explícita desktop/tablet/mobile; build/CI não contam como essa homologação.

## Próxima slice obrigatória

A próxima slice, conforme `docs/product/product-completion-ux-roadmap.md`, é:

> **Cadastros — Produtos, Fornecedores e Funcionários no padrão lista → detalhe → ação.**

Estado atual comprovado:

### Produtos

`/workspace/produtos` ainda é uma megapágina que reúne:

- tabela horizontal com `min-width`;
- listagem completa;
- criação;
- edição;
- identificação/fiscal;
- configurações de lote/validade/status.

Não existe `/workspace/produtos/[id]` como detalhe estável.

### Fornecedores

`/workspace/fornecedores` reúne na mesma página:

- lista;
- criação/edição;
- contatos;
- condições comerciais;
- produtos fornecidos.

Não existe rota estável de detalhe por fornecedor. `SupplierCommercialTermsPanel` e `SupplierItemsPanel` já oferecem boundaries/contexto que devem ser inventariados e reaproveitados, não reimplementados cegamente.

### Funcionários

`/workspace/funcionarios` ainda reúne lista + criação + edição. O UUID técnico foi removido da UX, mas falta:

- detalhe estável;
- apresentação contextual do vínculo de acesso;
- consolidação com os padrões do design system.

O vínculo Employee ↔ identidade deve continuar sendo administrado pela boundary de Administração; não reintroduzir UUID nem fundir Employee com membership.

## Como começar Cadastros

O próximo chat deve:

1. reconciliar `main`, Issue #142, PRs/branches e CI;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system e Definition of Done;
3. inventariar domínio/repositories/adapters/runtime de Produto, Fornecedor e Funcionário;
4. mapear as relações já existentes que cabem no detalhe:
   - Produto: categoria, unidade, identificação/fiscal, flags, fornecedores relacionados e estoque relacionado quando útil;
   - Fornecedor: contatos, condições comerciais, itens/preços já existentes e histórico que realmente possuir boundary atual;
   - Funcionário: dados operacionais, escopo padrão e vínculo de acesso legível;
5. definir antes do código o contrato de rotas e o que pertence à lista versus detalhe versus ação;
6. preservar URLs principais `/workspace/produtos`, `/workspace/fornecedores`, `/workspace/funcionarios`;
7. adicionar URLs estáveis de detalhe, preferencialmente `[id]`, se o inventário confirmar que o contrato cabe nelas;
8. implementar pesquisa/filtro/lista responsiva somente com o menor componente compartilhado que as três jornadas comprovarem necessário;
9. reutilizar `src/components/ui` e migrar os controles tocados pela slice;
10. manter regras, RLS e persistência existentes; schema/RPC novo somente com gap comprovado;
11. testar URLs, estados, autorização e adapters envolvidos;
12. manter CI e integrações afetadas verdes;
13. registrar honestamente se browser real continuar indisponível.

## Fora da próxima slice

Não usar Cadastros para:

- consolidar Estoque, Compras, Financeiro ou Caixa;
- redesenhar Dashboard;
- resolver requisitos PENDING;
- mudar política de autorização/Q-022;
- mover vínculo Employee/Auth de volta para a página de Funcionários por UUID;
- criar abstrações genéricas sem uso comprovado;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Ordem oficial

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. **Cadastros** — próxima;
6. Estoque;
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

## PENDING continua PENDING

Não promover por conveniência de UI:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

## #75/#121 permanecem ON HOLD

Não retomar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. O hold só termina por decisão explícita ou no production-readiness final.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
