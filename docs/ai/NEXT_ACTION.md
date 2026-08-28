# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

Slices concluídas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo + padrões reutilizáveis.

Baseline integrado confirmado em 2026-08-28:

- `main=14f1e98f7e78b229b57457c44ac5a1fd512e2254`;
- PR #149 `feat(ui): establish minimal design system`: merged;
- CI do PR #518 / run `33186337616`: success;
- Inventory Count Integration #242 / run `33186337684`: success;
- Business Transactions Integration #229 / run `33186337724`: success;
- CI pós-merge #519 / run `33186464104`: success;
- Issue #142 aberta e ativa;
- #75 e #121 continuam **TOTALMENTE ON HOLD** em `REQ-PLAT-005`.

Documentos de autoridade para a próxima slice:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- ADRs e documentação de autorização/persistência relacionados ao código encontrado no inventário.

Não refazer entrada, arquitetura/navegação ou design system mínimo já integrados.

## NEXT_ACTION objetiva

### Executar a quarta slice operacional da Issue #142: Administração — Estrutura + Usuários/Permissões

O workspace já possui a área Administração, mas hoje só expõe Proteção dos dados. O modelo técnico suporta estrutura organizacional e autorização em nível mais rico do que a administrabilidade disponível na aplicação.

A próxima slice deve transformar capacidades **já comprovadas** em jornadas administrativas utilizáveis, sem inventar política de acesso ou regra de negócio.

### 1. Reconciliar e inventariar antes de editar

No início da implementação:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade acima;
3. inventariar schema/migrations/domínio/repositories/adapters/runtime para:
   - Organization;
   - Business;
   - Unit;
   - Sector;
   - StockLocation;
4. inventariar autorização e identidade existentes:
   - memberships;
   - roles;
   - escopos Organization/Business/Unit/Sector/StockLocation quando aplicável;
   - guards/helpers;
   - RPCs/policies/RLS;
   - convites/bootstrap/associação de usuário existentes;
   - relação entre Employee e identidade de autenticação;
5. localizar quais mutações administrativas já possuem boundary seguro e quais existem somente como seed/migration/backend sem jornada utilizável;
6. registrar um mapa explícito `capacidade → boundary → papel/escopo atual → UI possível → gap real` antes de implementar a interface.

Não começar pela tela. Primeiro provar o que pode ser administrado com segurança pelo sistema atual.

### 2. Tratar Q-022 corretamente

`docs/product/open-questions.md` mantém aberta:

> **Q-022 — Quem pode fazer cada ação?**

Isso significa que a slice **não pode**:

- inventar perfis reais do cliente;
- renomear roles técnicas como se fossem política homologada;
- criar nova matriz ampla de permissões apenas para completar a tela;
- ampliar acesso no backend por conveniência de UX.

A implementação deve preservar a política técnica atual enquanto ela for suficiente e representar na UI somente capacidades suportadas pelos guards/RPCs/RLS existentes.

Se uma ação administrativa depender de decisão real ainda ausente, registrar o gap e manter a ação indisponível em vez de adivinhar a regra.

### 3. Fechar a jornada de Estrutura

Depois do inventário, criar uma experiência administrativa coerente para a estrutura que realmente puder ser mantida.

Objetivo de produto:

- visualizar a hierarquia atual de forma compreensível;
- navegar entre Organization/Business/Unit/Sector/StockLocation sem expor IDs técnicos;
- cadastrar/editar as entidades cujo backend seguro já suporte manutenção;
- manter relações pai/filho corretas;
- permitir inativação quando houver contrato existente adequado;
- preservar histórico/referências e evitar exclusão física destrutiva por conveniência.

Se o backend não possuir uma mutação necessária, só criar migration/RPC/policy/adapters depois de provar que ela é indispensável à jornada aprovada. Toda nova mutação deve possuir autorização/RLS/testes e não pode depender apenas da UI.

Não inventar cascade, exclusão ou reparenting sem contrato de negócio/técnico existente.

### 4. Fechar a jornada de Usuários/Permissões dentro do que é comprovado

A experiência deve separar claramente:

- pessoa/funcionário operacional (`Employee`);
- identidade autenticada;
- membership/acesso;
- papel;
- escopo.

Como mínimo, quando os boundaries existentes permitirem:

- listar quem possui acesso à organização atual;
- mostrar papel e escopo em linguagem compreensível;
- mostrar status de acesso/associação sem UUID técnico na experiência normal;
- reutilizar fluxo seguro de convite/associação existente quando ele for aplicável;
- permitir alteração/revogação somente se houver boundary e política atuais que sustentem isso corretamente.

Não pedir ao administrador que copie `auth.users` UUID ou outro identificador interno como procedimento normal.

Se alteração/revogação ou convite geral ainda não possuírem contrato seguro/completo, documentar o gap em vez de criar bypass ou service-role no browser.

### 5. Integrar Administração à arquitetura já aprovada

- manter **Administração** como área do primeiro nível;
- adicionar subdestinos reais somente quando as páginas existirem e estiverem funcionais;
- preservar `/workspace/backup` como Proteção dos dados;
- preferir URLs estáveis e explícitas para Estrutura e Usuários/Permissões;
- atualizar `workspace-navigation` e seu contrato/testes apenas com destinos reais implementados;
- não inventar páginas placeholder para completar a taxonomia.

### 6. Reutilizar o design system integrado

A nova Administração deve usar `src/components/ui` para os padrões já existentes:

- `PageHeader`;
- `Button`;
- `FormField` + controles;
- `Panel`;
- `StatusBadge`;
- `FeedbackMessage`;
- `EmptyState`;
- `Drawer`/`Dialog`/`ConfirmDialog` quando a jornada justificar.

Criar novo componente compartilhado somente quando a jornada administrativa provar um contrato reutilizável. Não criar DataTable/Tabs/Toast/SearchField genéricos apenas porque estavam previstos no roadmap; se a necessidade concreta justificar um deles, implementar o menor contrato necessário e documentá-lo no design system.

### 7. Estados, acessibilidade e feedback

Para cada fluxo implementado:

- loading deve bloquear duplo envio e indicar processamento;
- vazio deve ser distinguido de erro e falta de permissão;
- erro deve ficar próximo da ação/campo relevante;
- sucesso deve confirmar a mudança sem expor detalhes de infraestrutura;
- ações destrutivas/revogação/inativação devem ter confirmação/contexto adequado quando aplicável;
- labels, foco, teclado e touch target devem seguir o design system;
- não expor Supabase, RLS, membership, auth UUID, migration ou detalhes de provider ao usuário normal sem necessidade operacional.

### 8. Testar regras e jornadas sem fabricar homologação

Adicionar testes adequados para:

- mapeamento de capacidade administrativa e helpers puros quando houver;
- autorização/boundaries novos ou alterados;
- Organization isolation e escopos;
- invariantes de estrutura/relações;
- navegação de Administração;
- contratos de UI relevantes sem depender de dados demo.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- workflows PostgreSQL/RLS aplicáveis;
- integrações de negócio afetadas.

Se um browser real permitido estiver disponível, validar pelo menos as jornadas administrativas implementadas em desktop e mobile. Se não estiver, registrar a limitação explicitamente e **não declarar homologação visual**.

### 9. Não extrapolar a slice

Nesta execução **não**:

- refatorar Cadastros no padrão lista/detalhe/ação;
- consolidar Estoque, Compras, Financeiro ou Caixa;
- limpar toda a linguagem técnica da aplicação fora do que a nova Administração tocar naturalmente;
- resolver `window.prompt()` em massa;
- resolver requisitos PENDING;
- redefinir roles/perfis a partir de Q-022 sem decisão real;
- criar service-role/secret em browser;
- tocar em Production para fabricar dados/evidência;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite

A slice só pode ser encerrada quando:

- existe inventário explícito das capacidades administrativas e seus boundaries;
- Estrutura deixa de ser apenas conceito/backend e possui experiência utilizável para as operações realmente suportadas;
- usuários/acessos podem ser compreendidos sem manipulação normal de UUID técnico;
- qualquer ação de membership/papel/escopo implementada respeita os guards/RPCs/RLS e não depende apenas da UI;
- Q-022 permanece sem inferência onde ainda falta decisão de negócio;
- Administração possui somente rotas reais, estáveis e navegáveis;
- o design system integrado é reutilizado;
- loading/empty/error/success e acessibilidade básica foram tratados nos fluxos implementados;
- testes relevantes e isolamento por Organization/escopo estão verdes;
- lint, typecheck, testes, build e CI aplicável estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois desta slice

Somente após a integração da Administração, promover:

> **Cadastros — refatorar Produtos, Fornecedores e Funcionários no padrão lista → detalhe → ação.**

Não saltar diretamente para Estoque/Compras antes de fechar Cadastros na ordem aprovada.

## Ordem macro

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação~~ — PR #147;
3. ~~navegação desktop/mobile~~ — PR #147;
4. ~~design system mínimo~~ — PR #149;
5. Administração;
6. Cadastros;
7. Estoque;
8. Compras;
9. Financeiro;
10. Caixa;
11. Dashboard;
12. limpeza de linguagem;
13. homologação UX;
14. reconciliação funcional;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

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

A trilha #75/#121 será retomada no fechamento funcional/homologação final, salvo revogação explícita do operador.

## Restrições permanentes

- GitHub é a fonte de continuidade;
- RLS continua boundary de acesso;
- nenhum secret em browser/Git/docs/chat;
- não fabricar evidência Production;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente;
- não misturar redesign visual com mudança silenciosa de regra de negócio/autorização.
