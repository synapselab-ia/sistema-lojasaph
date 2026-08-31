# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Baseline funcional para a próxima execução:

- `main=395a2cd578b47c2b98ac449f50c1d4e3a094627d` — merge do PR #163;
- PR #163 — Dashboard / Visão geral consolidado — merged;
- CI pós-merge #566 / run `33392864692`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- CI #565 / run `33392616909`: success no head final do PR;
- Business Transactions Integration #255 / run `33392616971`: success;
- Inventory Count Integration #268 / run `33392616820`: success;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Administração, Cadastros, Estoque, Compras, Financeiro, Caixa ou Dashboard sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **limpeza de linguagem/resíduos de engenharia da experiência normal**

O objetivo é remover da experiência cotidiana detalhes técnicos que ainda vazam para o operador, sem alterar domínio, queries, persistência, autorização, rotas consolidadas ou regras de negócio.

Essa slice é de **produto/linguagem/apresentação**, não uma autorização para refatoração arquitetural ampla.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/requirements.md`;
- `docs/product/open-questions.md`;
- documentação/ADRs dos módulos afetados.

## 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. fazer busca ampla no código de UI por strings e padrões técnicos potencialmente visíveis;
4. confirmar cada ocorrência em contexto antes de alterar;
5. percorrer shell/Visão geral/Administração/Cadastros/Estoque/Compras/Financeiro/Caixa, sem assumir que uma busca textual isolada prova um problema;
6. separar UI normal de testes, logs, comentários, documentação técnica, mensagens de desenvolvimento e código interno legítimo;
7. registrar uma lista concreta de resíduos antes de começar as correções.

## 2. O que procurar

Priorizar texto que chega ao usuário sem necessidade operacional, por exemplo:

- UUID ou ID interno exposto como informação principal;
- nomes de tabela, view, RPC, migration, schema ou policy;
- `RLS`, provider, adapter, gateway, read model, fixture ou outros termos de implementação;
- nomes crus de campos de banco/API como `stock_location_id`, `business_date`, `occurred_at`, `unit_price` e equivalentes quando houver linguagem operacional melhor;
- nomes internos de status/tipos quando já existe rótulo de negócio;
- referências a branch, PR, fase, seed, ambiente técnico ou artefato de engenharia na experiência normal;
- mensagens de erro que revelem detalhes de infraestrutura sem ajudar o operador;
- helper text com código/backticks apenas para explicar implementação;
- textos inconsistentes com a arquitetura de informação já aprovada;
- rótulos genéricos que ainda apontem para páginas antigas quando houver jornada consolidada específica.

Nem toda ocorrência técnica no repositório é um bug de UX. Só alterar o que realmente integra a experiência normal ou um estado de erro plausivelmente exibido ao usuário.

## 3. Escopo da correção

Pode incluir:

- títulos, labels, descrições e helper text;
- mensagens de loading, vazio, erro, sucesso e confirmação;
- labels de status e ações;
- tooltips/aria-labels quando aplicável;
- pequenos ajustes de hierarquia textual;
- links claramente antigos ou genéricos quando a rota consolidada equivalente já existe;
- documentação de arquitetura da informação que esteja objetivamente defasada em relação às rotas reais.

Débito documental já conhecido:

- `docs/product/workspace-information-architecture.md` ainda descreve no mapa de rotas o Caixa como se configuração/operação compartilhassem a página pré-PR #161. Corrigir a linha e registrar as rotas consolidadas reais sem reabrir a slice funcional de Caixa.

## 4. O que não fazer

Não usar essa slice para:

- trocar schema, migration, RPC, RLS, grant ou regra de autorização por estética;
- renomear campo persistente apenas para combinar com copy;
- mover regra crítica para React;
- reescrever journeys já consolidadas;
- criar novo KPI, threshold, janela, SLA, score, meta ou comparação;
- alterar cálculo financeiro, saldo, custo, divergência ou status;
- mudar semântica de Unit/Setor/Organization;
- resolver `REQ-CASH-007`, `REQ-CASH-008`, `REQ-FIN-004`, `REQ-EXP-004`, `REQ-STK-010` ou qualquer outro PENDING;
- reinterpretar Q-022;
- criar migrations cosméticas;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## 5. Princípios de copy

Preferir linguagem de operação:

- dizer o que ocorreu, o que falta ou o que a pessoa pode fazer;
- usar nomes canônicos das áreas e entidades do produto;
- explicar limitações reais sem narrar arquitetura interna;
- manter termos técnicos somente quando eles forem parte necessária da tarefa do usuário;
- não esconder erro real atrás de mensagem vaga, mas traduzir o detalhe técnico para contexto acionável;
- não substituir uma regra desconhecida por uma frase que pareça decisão de negócio.

## 6. Design system e acessibilidade

Se a correção tocar estados ou superfícies já consolidados:

- reutilizar `FeedbackMessage`, `EmptyState`, `StatusBadge`, `Dialog`, `PageHeader`, `Panel`, `FormField` e demais primitives existentes quando aplicável;
- preservar labels, foco e operação por teclado;
- não criar componente genérico sem repetição comprovada;
- evitar regressão mobile apenas para ajustar copy.

## 7. Testes e validação

Adicionar/ajustar testes somente quando o contrato tocado justificar, por exemplo:

- mapping de label/status puro;
- destino de navegação alterado;
- mensagem importante derivada por função reutilizável;
- regressão de UI coberta por teste já existente.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- integrações de banco somente quando realmente afetadas.

Se browser real permitido estiver disponível, validar pelo menos uma amostra representativa das áreas tocadas em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

## 8. Critérios de aceite

A slice só pode ser encerrada quando:

- os resíduos técnicos inventariados e realmente visíveis tiverem sido corrigidos ou justificados;
- nenhum ID/termo interno desnecessário permanecer nos fluxos tocados;
- mensagens de erro/empty/loading tocadas estiverem em linguagem operacional;
- nenhuma regra de negócio tiver sido alterada por copy;
- rotas e boundaries existentes permanecerem autoritativos;
- o mapa de rotas de Caixa na IA estiver reconciliado com o PR #161;
- Q-022 e PENDINGs permanecerem intactos;
- lint, typecheck, testes, build e gates aplicáveis estiverem verdes;
- ausência de browser real estiver registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` forem reconciliados.

## Depois da limpeza de linguagem

Somente após integrar essa slice, promover:

> **homologação UX em jornadas reais desktop/tablet/mobile**

A homologação deve observar as journeys consolidadas como produto, não apenas screenshots isoladas. Não saltar para reconciliação funcional final antes dela.

## Ordem macro

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. ~~Caixa~~ — PR #161;
10. ~~Dashboard~~ — PR #163;
11. **limpeza de linguagem/resíduos de engenharia** — próxima;
12. homologação UX real;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante esta slice. Execuções agendadas eventualmente presentes no histórico não revogam o hold. O hold só termina por decisão explícita ou no production-readiness final.
