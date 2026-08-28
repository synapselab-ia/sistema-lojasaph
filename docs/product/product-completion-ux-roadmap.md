# Product Completion & UX Consolidation Roadmap

Status: **APROVADO PARA EXECUÇÃO**  
Data da decisão: **2026-08-28**  
Issue guarda-chuva: **#142 — Fase 51: consolidação de produto, arquitetura de informação e UX**  
Autoridade da decisão: prioridade explícita do operador após auditoria de fechamento pós-Fase 50.

---

## 1. Por que este documento existe

O Sistema Lojasaph possui um núcleo técnico significativamente mais maduro do que sua experiência de produto. A reconciliação anterior avaliava principalmente se requisitos possuíam domínio, persistência, autorização, testes e alguma UI. A auditoria de fechamento mostrou que isso não é suficiente para declarar o produto funcionalmente concluído.

A partir desta decisão, **"implementado" e "pronto como produto" deixam de ser sinônimos**.

O projeto precisa agora consolidar o que já existe em jornadas operacionais coerentes, administráveis e utilizáveis por pessoas que não conhecem sua arquitetura interna.

Este documento é a fonte de verdade para essa consolidação e deve orientar as próximas Issues/PRs até a homologação funcional.

---

## 2. Conclusão executiva da auditoria

### 2.1 O que está forte

O projeto já possui uma base profissional em:

- domínio e regras de estoque;
- compras e recebimentos;
- financeiro e pagamentos;
- caixa;
- PostgreSQL/Supabase e migrations;
- RLS, papéis e escopos;
- rastreabilidade e cancelamento/estorno;
- CI, testes e documentação;
- dashboard e consultas consolidadas;
- staging/dry-run para importação;
- fundações de observabilidade e proteção de dados.

### 2.2 O que está atrás

A camada de produto/UI cresceu **feature por feature**, normalmente transformando cada requisito em página/formulário isolado. O resultado é funcional do ponto de vista técnico, mas ainda não constitui uma experiência operacional suficientemente consolidada.

Os principais sintomas são:

1. entrada do sistema com landing técnica sem valor operacional;
2. navegação principal plana e sem hierarquia de áreas;
3. operações de uma mesma área tratadas como módulos equivalentes;
4. páginas excessivamente grandes acumulando criação, edição, execução e histórico;
5. ausência de padrão consistente `lista → detalhe → ação`;
6. ausência de URLs estáveis de detalhe para entidades operacionais importantes;
7. linguagem de implementação exposta ao usuário;
8. administrabilidade incompleta para Estrutura e Usuários/Permissões;
9. design system mínimo inexistente;
10. responsividade validada mais por CSS do que por jornadas reais.

### 2.3 Regra derivada

> O próximo ciclo do projeto deve consolidar o produto antes de adicionar novas features grandes independentes.

Exceções:

- bug/regressão crítica;
- correção de segurança;
- obrigação operacional urgente;
- prioridade explícita posterior do operador.

---

## 3. O que significa "100% concluído"

Para evitar o paradoxo anterior em torno de `REQ-PLAT-005`, o projeto passa a distinguir quatro marcos.

### 3.1 Conclusão funcional do produto

O produto está funcionalmente concluído quando:

- as jornadas necessárias à operação foram implementadas e são utilizáveis;
- a arquitetura da informação é coerente;
- administração básica pode ser feita pela interface;
- não há dependência de linguagem ou IDs técnicos para tarefas normais;
- desktop, tablet e celular foram homologados nas jornadas críticas;
- requisitos MUST aplicáveis estão utilizáveis, não apenas tecnicamente presentes.

### 3.2 Conclusão de negócio

Além da conclusão funcional:

- PENDINGs necessários para a operação escolhida foram decididos e implementados, ou formalmente adiados/descartados;
- nomenclatura e processos foram homologados pelo operador/cliente;
- regras de migração necessárias estão aprovadas.

### 3.3 Go-live

Além dos dois marcos anteriores:

- fontes finais foram congeladas;
- migração/dry-run/reconciliação foram executados;
- pessoas, escopos e configurações reais foram preparados;
- a operação foi aceita para corte;
- uso das planilhas foi encerrado ou possui procedimento de transição aprovado.

### 3.4 Production-ready

Etapa final:

- `REQ-PLAT-005` retomado;
- backup automático real comprovado;
- Storage protegido quando aplicável;
- restore/drill comprovado;
- observabilidade/gates finais reconciliados;
- cutover aprovado.

**#75/#121 permanecem TOTALMENTE ON HOLD durante a consolidação funcional**, salvo nova decisão explícita do operador.

---

# 4. Diagnóstico de UI/UX comprovado

## 4.1 Entrada do sistema atual deve desaparecer

A raiz `/` atualmente atua como apresentação técnica do projeto e contém conceitos como:

- "workspace persistente";
- "demonstração";
- Supabase/PostgreSQL;
- RLS;
- CI;
- arquitetura;
- "próxima fase".

Essa tela não possui função operacional e está obsoleta inclusive em seu conteúdo.

### Contrato alvo para `/`

A raiz deve apenas encaminhar o usuário para o fluxo adequado:

- **não autenticado** → Login;
- **autenticado e apto a entrar** → Workspace/Visão geral;
- **autenticado com múltiplas organizações** → seleção de organização conforme fluxo existente;
- **primeiro acesso/bootstrap necessário** → fluxo de bootstrap/onboarding aplicável.

Não deve existir escolha entre "workspace persistente" e "demonstração" no produto normal.

### Código de demonstração

O ambiente/rotas de demonstração não precisam ser apagados na primeira slice se ainda forem úteis para engenharia/testes. Porém:

- não devem ser promovidos na home;
- não devem aparecer na navegação do produto real;
- não devem ser confundidos com uma funcionalidade destinada ao usuário final.

---

## 4.2 Navegação atual é plana demais

O workspace atual expõe no mesmo nível:

- Visão geral;
- Produtos;
- Fornecedores;
- Funcionários;
- Estoque;
- Baixas;
- Devoluções;
- Transferências;
- Inventários;
- Compras;
- Financeiro;
- Caixa;
- Proteção dos dados.

Isso mistura:

- áreas de negócio;
- operações dentro de áreas;
- cadastros;
- funções administrativas;
- infraestrutura.

### Problema conceitual

"Estoque" é uma área. "Baixa", "Transferência", "Devolução" e "Inventário" são ações/processos de estoque. Não devem competir no nível principal com Financeiro ou Compras.

---

## 4.3 Arquitetura de informação alvo inicial

A estrutura abaixo é a **baseline de produto**, sujeita a refinamento fundamentado durante a Fase 51.

### Visão geral

Home operacional com alertas, indicadores e atalhos contextuais.

### Estoque

- Visão geral / posição de estoque;
- Entradas;
- Baixas;
- Devoluções;
- Transferências;
- Inventários;
- Lotes e validades;
- Estoque mínimo/alertas.

### Compras

- Visão geral;
- Pedidos;
- Recebimentos;
- Histórico.

### Financeiro

- Visão geral;
- Contas a pagar/documentos;
- Vencimentos;
- Pagamentos;
- Anexos no contexto do documento/parcela.

### Caixa

- Situação atual;
- Sessões;
- Movimentações;
- Fechamento;
- Histórico.

### Cadastros

- Produtos;
- Fornecedores;
- Funcionários.

### Administração

- Estrutura organizacional;
- Usuários e permissões;
- organização/configurações aplicáveis;
- proteção dos dados;
- auditoria/configurações futuras quando justificadas.

### Regra de navegação

A arquitetura deve refletir o **modelo mental do operador**, não a decomposição interna de módulos, adapters, migrations ou requirements.

---

# 5. Padrão de interação alvo

## 5.1 Lista → detalhe → ação

Para entidades persistentes importantes, o padrão preferencial passa a ser:

1. **lista** pesquisável/filtrável;
2. **detalhe** com URL estável;
3. **ações** contextualizadas no registro.

Exemplos desejados:

- `/workspace/produtos` → `/workspace/produtos/[id]`;
- `/workspace/fornecedores` → `/workspace/fornecedores/[id]`;
- `/workspace/compras/pedidos` → `/workspace/compras/pedidos/[id]`;
- `/workspace/financeiro/contas` → `/workspace/financeiro/contas/[id]`.

As URLs concretas podem mudar durante o design, mas o princípio permanece.

## 5.2 Evitar "megapáginas"

Não concentrar permanentemente na mesma página:

- criação;
- lista completa;
- edição;
- detalhes;
- execução de workflow;
- histórico extenso.

Uma página pode oferecer ações rápidas, mas fluxos complexos precisam de contexto próprio.

## 5.3 Modais e confirmações

`window.prompt()`/`window.confirm()` não devem ser padrão de produto para operações relevantes.

Criar interações consistentes com:

- diálogo de confirmação;
- motivo opcional/obrigatório conforme regra já existente;
- estado de carregamento;
- retorno de sucesso/erro;
- preservação da trilha de auditoria.

---

# 6. Linguagem de produto

A UI normal deve falar a linguagem da operação.

## 6.1 Remover da experiência normal

Evitar ou eliminar rótulos destinados a desenvolvedores, como:

- Supabase;
- PostgreSQL;
- RLS;
- membership;
- `auth.users`;
- UUID;
- "workspace persistente";
- "adapter";
- "migration";
- "fase";
- "demonstração" como CTA do produto real.

## 6.2 Exemplo: Funcionários

Não pedir ao administrador:

- "ID do usuário autenticado";
- "UUID do auth.users".

A experiência futura deve ser orientada a pessoas e permissões, por exemplo:

- nome;
- e-mail;
- papel/perfil;
- unidade/setor/escopo;
- status;
- convite/acesso.

A implementação deve continuar respeitando o modelo de segurança existente por baixo da UI.

---

# 7. Administrabilidade que falta como produto

## 7.1 Estrutura

O backend/modelo suporta Organization/Business/Unit/Sector/StockLocation, mas o workspace persistente não oferece hoje uma manutenção adequada dessa estrutura.

A área administrativa deve permitir, conforme permissões:

- visualizar estrutura;
- cadastrar/editar unidades;
- cadastrar/editar setores;
- cadastrar/editar locais de estoque;
- manter relações corretas;
- inativar quando apropriado sem quebrar rastreabilidade.

Não inventar regras de exclusão/cascade: preservar constraints e histórico existentes.

## 7.2 Usuários e permissões

O sistema possui papéis/escopos/RLS, mas ainda precisa de experiência administrativa para uso real.

Objetivo de produto:

- convidar/associar pessoas sem manipular IDs técnicos;
- visualizar quem possui acesso;
- visualizar papel e escopo;
- alterar/revogar acesso conforme política aprovada;
- separar claramente identidade operacional de Employee e autorização de acesso.

Q-022 continua sendo autoridade sobre pessoas/perfis reais e pode limitar a implementação final. A UI não deve inventar política de acesso não decidida.

---

# 8. Design system mínimo

Antes de redesenhar em escala, criar um conjunto pequeno de componentes e contratos reutilizáveis.

Baseline esperada:

- `AppShell`;
- `PageHeader`;
- `Button` / `IconButton`;
- `Input` / `Textarea` / `Select`;
- `FormField` + erro/ajuda;
- `Badge/StatusBadge`;
- `Card` quando realmente necessário;
- `DataTable`/lista responsiva;
- `Tabs` quando houver subáreas adequadas;
- `Dialog`/`ConfirmDialog`;
- `Drawer` para mobile;
- `Toast`/feedback consistente;
- `EmptyState`;
- `SearchField`/filtros;
- paginação ou estratégia equivalente quando volume exigir.

O objetivo não é criar um framework visual enorme. É impedir que cada tela reconstrua do zero os mesmos padrões.

## 8.1 Diretrizes visuais

- hierarquia visual clara;
- densidade adequada a software operacional;
- ações primárias/segundárias distinguíveis;
- estados disabled/loading/error consistentes;
- foco/teclado/acessibilidade preservados;
- evitar uso indiscriminado de cards brancos apenas por convenção;
- priorizar leitura e execução rápida sobre decoração.

---

# 9. Consolidação por área

## 9.1 Cadastros

Primeiro domínio ideal para validar os novos padrões.

### Produtos

- lista pesquisável/filtrável;
- criação deliberada;
- detalhe do produto;
- edição contextual;
- identificação, fiscal e fornecedores organizados por contexto;
- estoque relacionado visível quando útil sem duplicar lógica do módulo Estoque.

### Fornecedores

- lista;
- detalhe;
- contatos;
- condições comerciais;
- produtos fornecidos;
- histórico relevante.

### Funcionários

- lista;
- detalhe;
- dados operacionais;
- vínculo de acesso apresentado sem UUID técnico;
- separação conceitual entre Employee e usuário/permissão.

## 9.2 Estoque

Deve deixar de parecer cinco módulos separados.

A área precisa responder primeiro:

> O que existe, onde existe e o que exige atenção?

Depois oferecer jornadas de:

- entrada;
- baixa/perda/retirada conforme semântica existente;
- devolução;
- transferência;
- inventário;
- lotes/validades;
- estoque mínimo.

Preservar atomicidade, ledger, escopos e auditoria existentes.

## 9.3 Compras

Modelo mental alvo:

`Compras → Pedidos → Pedido → Emitir/Receber/Cancelar`

Separar claramente:

- criação de pedido;
- pedidos em andamento;
- detalhe do pedido;
- recebimentos;
- histórico.

Recebimento deve continuar transacional com estoque conforme regra atual.

## 9.4 Financeiro

Modelo mental alvo:

`Financeiro → Contas/documentos → Documento → Parcelas → Pagamentos/Anexos/Histórico`

A área deve tornar mais evidente:

- o que vence;
- o que está vencido;
- o que foi pago;
- saldo restante;
- documento e parcelas relacionadas;
- anexos e eventos de pagamento no contexto correto.

Preservar estorno/cancelamento auditável e não inventar classificação automática de diferenças monetárias.

## 9.5 Caixa

Prioridade: velocidade operacional.

Modelo mental alvo:

`Abrir sessão → operar → conferir → fechar`

Histórico e administração devem ser separados da tarefa imediata do operador.

## 9.6 Dashboard

O Dashboard **não deve ser redesenhado em profundidade antes das áreas principais**.

Após Estoque/Compras/Financeiro/Caixa estarem consolidados, revisar a home para mostrar:

- exceções que precisam de atenção;
- indicadores úteis;
- vencimentos;
- estoque crítico;
- compras pendentes;
- situação de caixa;
- atalhos que levam ao contexto correto.

---

# 10. Desktop, tablet e mobile

Responsividade passa a ser validada por uso real, não apenas por presença de media queries.

## 10.1 Jornadas mínimas para homologação

Quando os fluxos correspondentes estiverem consolidados, testar pelo menos:

1. login → workspace;
2. cadastrar produto;
3. cadastrar/consultar fornecedor;
4. criar pedido → emitir → receber;
5. consultar posição de estoque;
6. registrar baixa;
7. executar transferência;
8. abrir/contar/reconciliar inventário;
9. registrar documento financeiro → pagamento → anexo → estorno quando aplicável;
10. abrir/operar/fechar caixa;
11. administrar estrutura;
12. administrar acesso de usuário quando a política final estiver definida.

## 10.2 Critérios

- nenhuma ação essencial depende de hover;
- controles de toque adequados;
- menu mobile descobrível e não baseado em longa faixa horizontal de destinos;
- tabelas densas possuem estratégia mobile deliberada;
- formulários longos são quebrados em seções ou passos quando necessário;
- mensagens e erros permanecem compreensíveis;
- não há overflow que esconda ação crítica;
- teclado/foco permanecem operáveis no desktop.

---

# 11. Nova régua de Definition of Done para UI

Uma Issue com impacto de UI não está concluída apenas porque renderiza e passa build.

Quando aplicável, exigir:

- jornada/objetivo do usuário identificado;
- arquitetura da informação respeitada;
- linguagem de negócio;
- estados loading/empty/error/success;
- validação de permissões e escopo;
- feedback de ação;
- confirmação apropriada para ações destrutivas/reversíveis;
- comportamento desktop/tablet/mobile validado;
- acessibilidade básica de teclado/foco/labels;
- ausência de IDs/termos técnicos desnecessários;
- uso dos componentes/padrões de design system quando existentes;
- lint, typecheck, testes e build;
- browser/jornada real validada quando a ferramenta/ambiente permitir.

"Consideramos mobile" não é evidência suficiente para fluxos críticos.

---

# 12. Ordem oficial de execução

A ordem abaixo substitui a ideia anterior de partir imediatamente para migração/backup após o núcleo técnico.

## Etapa 1 — remover a entrada técnica atual

- eliminar a landing da raiz;
- rotear por autenticação/contexto;
- remover CTAs de demonstração do produto normal;
- não apagar demo internamente ainda se não houver necessidade.

**É a primeira slice da Fase 51.**

## Etapa 2 — arquitetura da informação

- fechar mapa de áreas/subáreas;
- registrar nomenclatura;
- mapear rotas existentes → rotas alvo;
- definir o que é principal, secundário e administrativo.

## Etapa 3 — navegação

- sidebar hierárquica desktop;
- drawer/menu mobile;
- item ativo;
- troca de organização;
- usuário/perfil/sair;
- breadcrumbs somente quando úteis.

## Etapa 4 — design system mínimo

Criar os componentes e contratos necessários para evitar nova divergência entre telas.

## Etapa 5 — Administração

- Estrutura;
- Usuários/Permissões conforme política suportada;
- remover dependência de IDs técnicos.

## Etapa 6 — Cadastros

- Produtos;
- Fornecedores;
- Funcionários;
- validar padrão lista/detalhe/ação.

## Etapa 7 — Estoque

Consolidar todas as operações em uma área coerente.

## Etapa 8 — Compras

Transformar a megapágina em jornada de pedidos/recebimentos.

## Etapa 9 — Financeiro

Transformar a megapágina em jornada de contas/documentos/parcelas/pagamentos.

## Etapa 10 — Caixa

Otimizar para a rotina real de abertura/operação/fechamento.

## Etapa 11 — Dashboard

Revisar após os destinos estarem consolidados.

## Etapa 12 — limpeza de linguagem e resíduos de desenvolvimento

Varredura final por:

- persistente;
- Supabase/RLS/membership/UUID;
- demo;
- fases;
- instruções de engenharia expostas.

## Etapa 13 — homologação UX

Executar jornadas críticas em desktop/tablet/mobile e registrar gaps reais.

## Etapa 14 — reconciliação funcional final

Revisar requirements com nova pergunta:

> Uma pessoa autorizada consegue executar a necessidade operacional corretamente pela aplicação, sem conhecimento técnico externo?

Reclassificar gaps encontrados.

## Etapa 15 — PENDINGs necessários

Resolver somente os que bloqueiam operação/migração real, conforme fontes e decisão do cliente.

## Etapa 16 — homologação com dados representativos

Antes de importar tudo, executar operação de ponta a ponta com amostra controlada/representativa.

## Etapa 17 — migração/cutover real

- congelar fontes;
- implementar importadores específicos;
- dry-run;
- reconciliar;
- obter aceite;
- aplicar dados reais;
- cortar planilhas conforme procedimento aprovado.

## Etapa 18 — production-readiness / `REQ-PLAT-005`

Somente após o fechamento funcional e antes do go-live definitivo:

- retomar #75/#121;
- reconciliar schedules;
- comprovar backup real;
- comprovar Storage quando aplicável;
- executar restore drill;
- fechar critérios finais de produção.

---

# 13. Sequenciamento das Issues

A Issue #142 é **guarda-chuva** da Fase 51 e da consolidação de produto.

Para evitar PRs gigantes, a execução deve ser dividida em slices pequenas. Regra:

- manter apenas uma slice principal ativa por vez;
- cada slice deve possuir escopo e critérios de aceite claros;
- abrir Issue filha/separada quando o escopo deixar de ser pequeno ou quando a rastreabilidade justificar;
- não misturar uma refatoração visual ampla com mudança de regra de negócio;
- não criar várias branches simultâneas sem necessidade.

### Primeira slice já decidida

**Entrada/roteamento do sistema:** remover landing técnica e CTA de demo da experiência normal.

Depois de integrada e validada, a próxima slice deve ser a **arquitetura da informação + navegação**, não uma feature aleatória.

---

# 14. Requisitos PENDING continuam PENDING

A consolidação de UX **não autoriza inferir**:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — política final de custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

Se uma decisão de UX esbarrar em um PENDING real, parar naquele comportamento específico, documentar a dependência e continuar o que for independente.

---

# 15. Restrições permanentes durante a consolidação

- GitHub continua sendo fonte de verdade;
- não expor secrets;
- RLS continua autoridade de acesso;
- regras financeiras/estoque críticas não podem migrar para validação apenas client-side;
- preservar cancelamento/estorno/histórico;
- não fabricar dados Production para demonstrar UI;
- não fazer deploy Vercel manual/rotineiro sem necessidade explícita;
- não retomar `REQ-PLAT-005` durante esta fase sem nova decisão do operador;
- não resolver perguntas de negócio por conveniência visual.

---

# 16. Critério para encerrar a consolidação de produto

A consolidação só pode ser considerada encerrada quando, no mínimo:

- entrada técnica removida;
- arquitetura da informação final documentada e implementada;
- navegação desktop/mobile coerente;
- design system mínimo adotado;
- Estrutura administrável pela aplicação;
- gestão de usuários/permissões operacional dentro das decisões de negócio disponíveis;
- cadastros principais convertidos para padrões sustentáveis;
- Estoque consolidado;
- Compras consolidado;
- Financeiro consolidado;
- Caixa consolidado;
- Dashboard reconciliado aos destinos reais;
- linguagem técnica indevida removida;
- jornadas críticas homologadas em tamanhos de tela representativos;
- nova auditoria requirements × produto executada;
- gaps remanescentes classificados como bug, PENDING, migração/cutover ou production-readiness.

**Encerrar esta fase não significa automaticamente declarar o sistema 100% production-ready.** Ainda existem os marcos de negócio, migração e proteção final descritos neste documento.

---

# 17. NEXT_ACTION derivada

Após esta documentação estar integrada na `main`, a próxima ação é:

> Executar a primeira slice da Issue #142: remover a landing técnica atual de `/`, fazer a raiz encaminhar para o fluxo de autenticação/workspace existente conforme sessão/contexto e remover `Abrir demonstração` da navegação normal, sem redesenhar ainda a sidebar e sem retomar `REQ-PLAT-005`.

Antes de codificar, inspecionar o fluxo existente de `/`, `/login`, `/bootstrap`, `/workspace`, `/workspace/selecionar-organizacao` e helpers de redirect/auth para reutilizar a lógica atual e evitar criar um segundo mecanismo de roteamento.
