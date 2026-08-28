# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

Slices concluídas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile.

Baseline integrado confirmado em 2026-08-28:

- `main=3bc28e28a3a6e0d4b4b4543724942d308317d0f4`;
- PR #147 `feat: group workspace navigation by product area`: merged;
- CI final do PR #514 / run `33184629115`: success;
- Business Transactions Integration #228 / run `33184629114`: success;
- CI pós-merge #515 / run `33184891544`: success;
- Issue #142 aberta e ativa;
- #75 e #121 continuam **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- documentos de autoridade:
  - `docs/product/product-completion-ux-roadmap.md`;
  - `docs/product/workspace-information-architecture.md`;
  - `docs/qa/definition-of-done.md`.

Não refazer a landing/entrada técnica nem a arquitetura/navegação já integradas.

## NEXT_ACTION objetiva

### Executar a terceira slice da Issue #142: criar design system mínimo e padrões reutilizáveis de página

A arquitetura do produto já está fechada o suficiente para parar de criar estilos e interações página a página. A próxima slice deve estabelecer uma fundação visual/comportamental pequena **antes** das refatorações de Administração, Cadastros, Estoque, Compras, Financeiro e Caixa.

O objetivo não é redesenhar a aplicação inteira. É criar contratos reutilizáveis que eliminem repetição e permitam que as próximas slices evoluam com consistência.

### 1. Reconciliar e inventariar antes de editar

No início da implementação:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. ler os três documentos de autoridade listados acima;
3. inspecionar `src/app/globals.css`;
4. inspecionar `src/components/runtime-shell.tsx` e a navegação integrada;
5. inventariar padrões repetidos em páginas representativas de leitura, formulário e tabela — sem refatorá-las ainda;
6. registrar quais padrões são realmente comuns e quais ainda dependem da jornada específica do módulo.

Não importar uma biblioteca visual grande por conveniência sem necessidade comprovada. O projeto atual usa Tailwind e componentes próprios; preferir uma fundação pequena e controlada.

### 2. Definir o núcleo mínimo de componentes

Criar uma camada reutilizável coerente, preferencialmente em `src/components/ui` ou estrutura equivalente, cobrindo o que já é recorrente e necessário para as próximas slices.

Como baseline desta primeira fundação, considerar e implementar os contratos realmente necessários entre:

- `PageHeader` — eyebrow/contexto, título, descrição e ações;
- `Button` — hierarquia consistente para ação primária, secundária e destrutiva/atenção quando aplicável;
- `Input`, `Select`, `Textarea` + `FormField` — label, ajuda, erro e disabled de modo consistente;
- `StatusBadge` — estados semânticos reutilizáveis;
- `Panel`/`Card` — superfície e seção padrão;
- `EmptyState` — ausência de dados com linguagem e ação opcionais;
- `Drawer` — extrair/consolidar o padrão mobile já provado no shell se isso reduzir duplicação sem mudar o contrato de navegação;
- `Dialog`/`ConfirmDialog` — fundação acessível para ações futuras que hoje dependem de interações ad hoc.

Não é obrigatório criar `DataTable`, `Tabs`, `Toast` e `SearchField` nesta mesma slice se o inventário mostrar que uma implementação genérica agora seria prematura. Esses componentes entram quando houver contrato real suficiente.

### 3. Definir tokens e regras de uso mínimas

Sem criar um tema complexo, consolidar decisões básicas já repetidas:

- tipografia e hierarquia de títulos/textos auxiliares;
- espaçamento de página/seções;
- radius/border/surface;
- estados semânticos de sucesso, atenção, erro e neutro;
- alturas mínimas e foco para controles clicáveis/toque;
- largura/densidade de formulários e painéis;
- comportamento de disabled/loading onde aplicável.

Evitar cores, tamanhos e classes divergentes para a mesma intenção sem justificativa.

### 4. Provar a fundação sem refatoração massiva

Aplicar os componentes novos em **pontos de baixo risco suficientes para provar a API**, por exemplo:

- `RuntimeShell` para reutilizar o Drawer/Button quando natural;
- uma página predominantemente read-only ou administrativa já existente, como `Proteção dos dados`, para PageHeader/Panel/StatusBadge/EmptyState;
- no máximo um formulário simples/representativo para provar FormField/controles, se necessário.

Não converter todas as páginas nesta slice. A migração ampla deve ocorrer junto das próximas etapas funcionais, quando a jornada de cada área for consolidada.

### 5. Documentar o contrato do design system

Criar documentação de produto/UI, por exemplo `docs/product/design-system.md`, contendo:

- componentes disponíveis e finalidade;
- variantes permitidas;
- regras de hierarquia de ação;
- padrões de loading/empty/error/success;
- regras mínimas de teclado, foco e touch target;
- exemplos de quando reutilizar versus quando criar padrão específico;
- lista explícita do que ainda não faz parte do design system.

O documento deve orientar as slices seguintes e evitar que cada módulo invente sua própria convenção.

### 6. Testar sem fabricar homologação visual

Adicionar testes para contratos puros/variantes/helpers quando aplicável e manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- workflows PostgreSQL/RLS aplicáveis.

Quando houver ambiente browser disponível sem violar a política de deploy, verificar foco, drawer/dialog, controles e responsividade dos pontos migrados.

Se browser real continuar indisponível, registrar essa limitação explicitamente. **Não declarar homologação visual real apenas porque build/CI passaram.**

### 7. Não extrapolar a slice

Nesta execução **não**:

- refatorar todas as páginas para o novo design system;
- alterar a arquitetura da informação/URLs já fechadas;
- criar Administração de Estrutura ou Usuários/Permissões ainda;
- refatorar jornadas internas de Cadastros/Estoque/Compras/Financeiro/Caixa;
- substituir todos os `window.prompt()`/confirms da aplicação de uma vez;
- alterar regras de negócio, queries ou autorização;
- tocar em migrations/RLS/Supabase sem prova concreta de necessidade;
- resolver requisitos PENDING por conveniência visual;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite

A slice só pode ser encerrada quando:

- existe uma camada mínima de componentes reutilizáveis, não apenas classes copiadas;
- hierarquia de ação, campos, superfícies e estados semânticos possuem contratos consistentes;
- pelo menos pontos de baixo risco usam a fundação e provam que ela funciona no código real;
- o shell/navegação não regrediu;
- acessibilidade básica de controles interativos foi considerada — labels, foco, teclado e touch target conforme aplicável;
- nenhum componente novo introduz decisão de autorização ou regra de negócio;
- documentação do design system existe e delimita o que está ou não suportado;
- testes relevantes foram criados/ajustados;
- lint, typecheck, testes, build e CI aplicável estão verdes;
- qualquer ausência de browser/homologação visual foi registrada honestamente;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` foram reconciliados.

## Depois desta slice

Somente após a integração do design system mínimo, promover a próxima etapa:

> **Administração — Estrutura + Usuários/Permissões**, respeitando Q-022, escopos e RLS existentes.

Não saltar diretamente para Cadastros/Estoque/Compras antes de fechar a administrabilidade básica prevista na ordem da Fase 51.

## Ordem macro que não deve ser perdida

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação~~ — PR #147;
3. ~~navegação desktop/mobile~~ — PR #147;
4. design system mínimo;
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
- não misturar redesign visual amplo com mudança silenciosa de regra de negócio.
