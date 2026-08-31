# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

A slice de limpeza de linguagem/resíduos de engenharia foi concluída pelo PR #165.

Baseline funcional para a próxima execução:

- PR #165 — merged;
- merge funcional `602c840788026ce6b520d0c441b672b48063476e`;
- CI do PR #165 #569: success;
- Business Transactions Integration #256: success;
- Inventory Count Integration #269: success;
- CI pós-merge #570 / run `33398505368`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Administração, Cadastros, Estoque, Compras, Financeiro, Caixa, Dashboard ou limpeza de linguagem sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **homologação real de UX em desktop/tablet/mobile por jornadas completas**

O objetivo é validar o produto existente em browser, identificar problemas concretos de usabilidade/responsividade/navegação e corrigir somente o que for comprovado.

Esta etapa é de **homologação e correção orientada por evidência**, não de redesign preventivo.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/requirements.md`;
- `docs/product/open-questions.md`;
- documentação/ADRs dos módulos afetados.

## 1. Reconciliar estado real antes de testar

No início da execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. identificar qual ambiente seguro existente será usado para browser testing;
4. verificar se esse ambiente representa o código atual de forma suficiente para a homologação;
5. **não disparar deploy Vercel manual/rotineiro** apenas para gerar ambiente de teste;
6. **não usar Production como laboratório** e não criar fixtures/dados artificiais em Production;
7. confirmar se existe sessão/credencial de teste aprovada para jornadas autenticadas;
8. se não houver acesso autenticado seguro, registrar o bloqueio e não inventar credenciais nem contornar autenticação.

Pode ser usado ambiente já publicado, preview existente ou execução local isolada, desde que não viole os guardrails e seja possível saber qual código/dados estão sendo observados.

## 2. Matriz mínima de viewports

Validar no mínimo três classes:

- **desktop** — largura típica de notebook/desktop;
- **tablet** — largura intermediária que force adaptação real de layout;
- **mobile** — largura de telefone com navegação por drawer.

Registrar dimensões efetivamente usadas na evidência.

## 3. Jornadas prioritárias

A homologação deve percorrer tarefas completas, não apenas abrir páginas.

### Entrada e contexto

- `/` → roteamento correto por estado de sessão;
- login;
- recuperação de senha;
- seleção/troca de organização quando aplicável;
- logout;
- estados de acesso indisponível plausíveis.

### Navegação e Visão geral

- sidebar desktop;
- drawer mobile, abertura/fechamento/foco;
- estado ativo de área/subárea;
- Visão geral;
- filtros de Unidade, Setor, horizonte e período quando disponíveis;
- links de alertas/cards para jornadas específicas.

### Administração

- Estrutura: leitura, adicionar/editar onde permitido e comportamento responsivo dos formulários;
- Usuários e permissões: leitura, convite/alteração/vínculo quando houver ambiente seguro para isso;
- Proteção dos dados: leitura e responsividade, sem retomar #75/#121.

### Cadastros

- Produtos: lista → novo/detalhe/edição;
- Fornecedores: lista → novo/detalhe/edição e condições comerciais;
- Funcionários: lista → novo/detalhe/edição.

### Estoque

- posição e filtros;
- entradas;
- retiradas;
- baixas/perdas;
- devoluções;
- transferências;
- inventários;
- lotes/validades;
- estoque mínimo.

### Compras

- visão/lista;
- novo pedido;
- detalhe;
- emissão/cancelamento quando seguro;
- recebimento parcial/total quando seguro;
- recebimentos e histórico.

### Financeiro

- visão/lista;
- novo documento;
- detalhe;
- anexos quando seguro;
- pagamento;
- estorno/cancelamento quando seguro;
- vencimentos e histórico de pagamentos.

### Caixa

- visão do Caixa;
- lista de sessões;
- abertura de sessão quando seguro;
- detalhe da sessão;
- totais por meio, entrada/sangria e fechamento quando seguro;
- configuração de caixas, meios e regras conforme permissão.

## 4. O que observar em cada jornada

Registrar evidência objetiva para:

- hierarquia visual e clareza da tarefa principal;
- navegação `lista → detalhe → ação → retorno`;
- links quebrados ou rota antiga;
- estado ativo incorreto na navegação;
- overflow horizontal inesperado;
- texto truncado sem alternativa;
- tabelas inadequadas em mobile;
- formulários que não cabem ou perdem contexto;
- drawer/dialog com problema de foco, fechamento ou teclado;
- labels, helper text e mensagens ambíguas;
- botões inacessíveis/encobertos;
- loading, empty, erro e sucesso inconsistentes;
- ações exibidas em estado/permissão inadequados;
- inconsistência relevante entre desktop, tablet e mobile;
- qualquer resíduo técnico ainda exposto ao operador.

## 5. Evidência e classificação dos achados

Para cada problema real registrar:

- jornada/rota;
- viewport;
- passos para reproduzir;
- resultado observado;
- resultado esperado segundo IA/design system/requirements;
- evidência visual ou descrição verificável;
- classificação: `bug`, `gap de UX`, `acessibilidade`, `responsividade` ou `bloqueio de ambiente`;
- impacto/prioridade suficiente para decidir se corrige nesta slice.

Não abrir correção com base apenas em preferência estética.

## 6. Correções permitidas

Pode corrigir, quando comprovado pela homologação:

- CSS/layout/responsividade;
- uso incorreto de primitives do design system;
- navegação/link/estado ativo;
- hierarquia, copy e feedback;
- foco/teclado/aria;
- disposição de tabela/card/formulário;
- bug de UI que não altere regra de negócio;
- regressão funcional real encontrada durante a jornada, desde que a correção preserve o contrato documentado.

Se um achado indicar problema de domínio, autorização, banco ou regra crítica, parar a correção local e reconciliar requirements/ADRs antes de mudar comportamento.

## 7. O que não fazer

Não usar homologação para:

- redesign amplo sem evidência;
- criar KPI, threshold, SLA, score, meta ou janela nova;
- redefinir semântica de Organization/Unit/Setor;
- alterar custeio, FEFO, cardinalidade de pagamentos, consumo de funcionário ou integração de vendas;
- reinterpretar Q-022;
- resolver requisitos PENDING por conveniência;
- criar migrations cosméticas;
- afrouxar RLS/permissões para conseguir testar;
- criar usuário/dado artificial em Production;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## 8. Validação técnica após correções

Se a homologação gerar mudanças de código, manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- integrações de banco quando realmente afetadas.

Para mudança somente documental de evidência, não inventar gates funcionais desnecessários, mas manter PR/CI conforme o workflow do repositório.

## 9. Critérios de aceite

A slice só pode ser encerrada quando:

- uma matriz representativa de jornadas tiver sido executada em desktop/tablet/mobile ou cada bloqueio estiver explicitamente documentado;
- achados reais estiverem registrados com evidência;
- problemas relevantes e corrigíveis desta slice tiverem sido tratados e validados novamente;
- nenhuma regra de negócio tiver sido inventada para “resolver UX”;
- Q-022 e PENDINGs permanecerem intactos;
- #75/#121 permanecerem on hold;
- gates aplicáveis estiverem verdes;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` forem reconciliados.

## Depois da homologação UX

Somente após encerrar esta slice, promover:

> **reconciliação funcional final usando critério de usabilidade, não apenas existência técnica.**

A reconciliação deve confrontar requirements, jornadas homologadas e comportamento real antes de decidir quais PENDINGs são necessários para operação/cutover.

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
11. ~~limpeza de linguagem/resíduos de engenharia~~ — PR #165;
12. **homologação UX real** — próxima;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante esta slice. Execuções agendadas eventualmente presentes no histórico não revogam o hold. O hold só termina por decisão explícita ou no production-readiness final.
