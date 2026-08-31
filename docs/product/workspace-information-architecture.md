# Workspace — Arquitetura da informação e navegação

Status: **consolidado na Fase 51 / Issue #142; aguardando homologação UX real**  
Data: **2026-08-31**

## Objetivo

Organizar o workspace pelo modelo mental da operação sem alterar silenciosamente regras de autorização, persistência ou domínio.

O primeiro nível aprovado permanece:

1. Visão geral;
2. Estoque;
3. Compras;
4. Financeiro;
5. Caixa;
6. Cadastros;
7. Administração.

## Mapa rota → área/subárea

| Rota | Área | Responsabilidade atual |
| --- | --- | --- |
| `/workspace` | Visão geral | Painel operacional somente leitura, filtros e sinais que direcionam às jornadas específicas. |
| `/workspace/estoque` | Estoque | Posição/saldos, alertas objetivos e acesso às tarefas da área. |
| `/workspace/estoque/entradas` | Estoque | Registro dedicado de entrada de estoque. |
| `/workspace/estoque/retiradas` | Estoque | Registro dedicado de retirada para consumo por setor. |
| `/workspace/baixas` | Estoque | Baixas, perdas, quebras e vencimentos conforme motivos já configurados. |
| `/workspace/devolucoes` | Estoque | Devoluções parciais/totais relacionadas a retiradas anteriores. |
| `/workspace/transferencias` | Estoque | Expedição e recebimento de transferências entre locais. |
| `/workspace/inventarios` | Estoque | Inventários físicos, contagem, confirmação/cancelamento e histórico. |
| `/workspace/estoque/lotes` | Estoque | Consulta de lotes com saldo e validades registradas. |
| `/workspace/estoque/minimos` | Estoque | Consulta e manutenção de estoque mínimo por produto/local. |
| `/workspace/compras` | Compras | Visão da área com situação dos pedidos, recebimentos recentes e acesso às jornadas. |
| `/workspace/compras/pedidos` | Compras | Lista pesquisável/filtrável de pedidos disponíveis no escopo atual. |
| `/workspace/compras/pedidos/novo` | Compras | Criação dedicada de pedido em rascunho. |
| `/workspace/compras/pedidos/[id]` | Compras | Detalhe estável do pedido, itens, quantidades, recebimentos e ações contextuais. |
| `/workspace/compras/pedidos/[id]/receber` | Compras | Registro explícito de recebimento total/parcial do pedido. |
| `/workspace/compras/recebimentos` | Compras | Consulta dos recebimentos já registrados e incorporados ao Estoque. |
| `/workspace/compras/historico` | Compras | Consulta de pedidos recebidos ou cancelados. |
| `/workspace/financeiro` | Financeiro | Visão da área com indicadores, atenção de vencimentos e acesso às jornadas. |
| `/workspace/financeiro/contas` | Financeiro | Lista pesquisável/filtrável de documentos e contas a pagar disponíveis no escopo atual. |
| `/workspace/financeiro/contas/nova` | Financeiro | Registro dedicado de documento financeiro e suas parcelas. |
| `/workspace/financeiro/contas/[id]` | Financeiro | Detalhe estável do documento, parcelas, referências, anexos, pagamentos, estornos e cancelamento. |
| `/workspace/financeiro/contas/[id]/pagar` | Financeiro | Registro explícito de pagamento para uma parcela do documento. |
| `/workspace/financeiro/vencimentos` | Financeiro | Consulta de parcelas por situação de vencimento/pagamento. |
| `/workspace/financeiro/pagamentos` | Financeiro | Histórico de pagamentos e estornos. |
| `/workspace/caixa` | Caixa | Visão da área com situação das sessões, caixas e divergências recentes. |
| `/workspace/caixa/sessoes` | Caixa | Lista e consulta das sessões de caixa disponíveis no escopo atual. |
| `/workspace/caixa/sessoes/nova` | Caixa | Abertura dedicada de uma nova sessão. |
| `/workspace/caixa/sessoes/[id]` | Caixa | Detalhe da sessão, totais por meio, entradas/sangrias, fechamento e cancelamento conforme estado/permissão. |
| `/workspace/caixa/configuracao` | Caixa | Configuração de caixas físicos, meios de pagamento e regras de taxa conforme permissão. |
| `/workspace/produtos` | Cadastros | Lista de Produtos; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/fornecedores` | Cadastros | Lista de Fornecedores; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/funcionarios` | Cadastros | Lista de Funcionários; criação e detalhe ficam em subrotas estáveis. |
| `/workspace/administracao/estrutura` | Administração | Estrutura organizacional. |
| `/workspace/administracao/acessos` | Administração | Usuários e permissões. |
| `/workspace/backup` | Administração | Proteção dos dados. |
| `/workspace/selecionar-organizacao` | Contexto do workspace | Seleção/troca de organização; fluxo utilitário, não módulo de negócio. |

## Contrato da Visão geral

`/workspace` responde primeiro:

> O que exige atenção agora e para qual jornada devo ir?

A página é um read model operacional. Ela não cria uma segunda fronteira de escrita nem concentra ações transacionais.

Mantém:

- contexto da organização e data de negócio;
- filtros cuja semântica já é comprovada;
- `Precisa de atenção` antes dos indicadores informativos;
- resumo financeiro;
- visão de Estoque;
- visão de Compras/fornecedores;
- sinais atuais de Caixa e Compras;
- links para a jornada mais específica quando o contexto permite.

Período explícito, horizonte relativo e indicadores de estado atual não são tratados como sinônimos. Unit/Setor só filtram quando existe vínculo comprovado no contrato do dado.

## Contrato da área Estoque

A raiz `/workspace/estoque` responde primeiro:

> O que existe, onde existe e o que exige atenção?

Ela não concentra formulários de movimentação. Ações ficam em jornadas próprias.

### Posição

A visão principal oferece:

- saldos por produto e local;
- busca por produto/local;
- filtro de situação do estoque mínimo;
- posições abaixo do mínimo;
- lotes vencidos com saldo;
- transferências em trânsito;
- atalhos para as tarefas da área;
- tabela em desktop e alternativa adequada para telas menores.

O saldo permanece somente leitura na UI.

### Entradas e retiradas

`/workspace/estoque/entradas` mantém validação de quantidade/custo, lote/validade e regras existentes de saldo/custo. A tela não resolve `REQ-STK-010`.

`/workspace/estoque/retiradas` mantém setor de consumo, local de origem e seleção opcional de lote quando aplicável. Sem lote escolhido, a UI fala em **seleção automática**, sem transformar Q-019/`REQ-EXP-004` em FEFO homologado.

### Baixas, devoluções e transferências

`/workspace/baixas` preserva motivos estruturados e exigências de rastreabilidade já existentes.

`/workspace/devolucoes` permanece vinculada à retirada original; produto, local, custo e rastreabilidade não podem ser substituídos arbitrariamente.

`/workspace/transferencias` mantém duas etapas:

1. expedir reduz a origem;
2. receber credita o destino pela quantidade confirmada.

Recebimento parcial continua suportado e origem/destino iguais continuam inválidos.

### Inventários

`/workspace/inventarios` preserva início → contagem → confirmação/cancelamento. Se o estoque mudar durante a contagem, a confirmação continua protegida contra ajuste incorreto.

Cancelar inventário exige confirmação explícita e não aplica ajustes. A limitação para aumento de item rastreado sem lote explícito permanece visível; a UI não inventa lote/validade.

### Lotes e mínimos

`/workspace/estoque/lotes` é consulta dos lotes com saldo e validade registrada. Não cria alerta antecipado arbitrário porque Q-020 permanece aberta.

`/workspace/estoque/minimos` mantém a política existente:

- ausência de política não gera alerta;
- igualdade ao mínimo não gera alerta;
- apenas saldo estritamente menor é sinalizado.

## Contrato da área Compras

A raiz `/workspace/compras` responde primeiro:

> Quais pedidos estão em preparação ou aguardando recebimento e onde continuo a tarefa?

### Pedidos

`/workspace/compras/pedidos` oferece busca/filtro, itens pendentes, total e acesso a detalhe estável.

A criação em `/workspace/compras/pedidos/novo` continua gerando rascunho pela operação existente. A UI não cria política de aprovação nem condição comercial nova.

### Detalhe e recebimento

`/workspace/compras/pedidos/[id]` concentra fornecedor, local, situação, previsão, itens, quantidades, preços, recebimentos e ações contextuais.

O cancelamento usa diálogo explícito e não reverte entradas já efetivadas.

`/workspace/compras/pedidos/[id]/receber` mantém:

- recebimento apenas nos estados já permitidos;
- parcialidade por item/quantidade;
- limite pela quantidade pendente;
- lote/validade conforme comportamento atual;
- atualização de Estoque pela operação transacional existente, sem segunda contabilização na UI.

`/workspace/compras/recebimentos` e `/workspace/compras/historico` permanecem consultas dedicadas.

Nenhuma dessas páginas resolve agenda, pedido mínimo, embalagem, aprovação ou condições comerciais PENDING por inferência.

## Contrato da área Financeiro

A raiz `/workspace/financeiro` responde primeiro:

> O que está em aberto, o que já foi pago e o que exige atenção por vencimento?

### Contas a pagar

`/workspace/financeiro/contas` oferece busca/filtro, nominal, saldo/diferença, vencimento e acesso ao detalhe.

A criação em `/workspace/financeiro/contas/nova` mantém as validações existentes. A UI não decide cardinalidade final de pagamentos, redistribui parcelas nem classifica diferença monetária.

### Documento financeiro

`/workspace/financeiro/contas/[id]` concentra identificação, fornecedor, unidade/setor, resumo financeiro, parcelas, referências, anexos, pagamentos/estornos e ações contextuais.

Documento inacessível usa estado seguro sem confirmar registro fora do escopo.

Anexos permanecem subordinados ao documento e privados. A consolidação não criou cadastro paralelo nem altera a cobertura de proteção dos binários.

### Pagamento, estorno e cancelamento

`/workspace/financeiro/contas/[id]/pagar` permite escolher parcela e registrar pagamento. Diferença entre nominal e pago permanece explícita e sem classificação inferida, preservando Q-015/`REQ-FIN-004`.

Estorno não apaga o pagamento original. Cancelamento exige que as regras financeiras existentes sejam satisfeitas antes da ação.

`/workspace/financeiro/vencimentos` e `/workspace/financeiro/pagamentos` são consultas dedicadas. Não foi criada janela arbitrária de “próximos N dias”.

## Contrato da área Caixa

A raiz `/workspace/caixa` responde primeiro:

> Qual é a situação atual dos caixas e onde continuo a operação?

A consolidação do PR #161 separou visão, lista, abertura/detalhe de sessão e configuração.

### Sessões

`/workspace/caixa/sessoes` concentra a lista de sessões por caixa/unidade/situação.

`/workspace/caixa/sessoes/nova` abre uma sessão usando caixa, data operacional e fundo inicial conforme permissões/regras existentes.

`/workspace/caixa/sessoes/[id]` concentra:

- contexto da sessão;
- fundo inicial;
- totais por meio de pagamento;
- taxas e líquido;
- entradas e sangrias;
- esperado, contado e divergência;
- fechamento;
- cancelamento conforme estado/permissão.

O valor esperado continua calculado pela regra existente. A UI não redefine fórmula financeira nem mistura configuração com operação diária.

### Configuração

`/workspace/caixa/configuracao` separa:

- caixas físicos por unidade;
- meios de pagamento;
- indicação de quais meios afetam a gaveta;
- regras de taxa com vigência.

Permissões existentes continuam definindo quem pode alterar cada grupo. Vigência não é removida ou sobrescrita por conveniência visual.

`REQ-CASH-007` e `REQ-CASH-008` permanecem PENDING.

## Contrato de Cadastros

Cadastros segue o padrão `lista → detalhe → ação`:

- Produtos;
- Fornecedores;
- Funcionários.

Cadastro de funcionário não concede login. Acesso e permissões permanecem administrados separadamente.

Condições comerciais de fornecedor continuam campos operacionais existentes, sem criar automação implícita de compra.

## Contrato de Administração

Administração reúne:

- Estrutura;
- Usuários e permissões;
- Proteção dos dados.

A estrutura respeita o escopo permitido e preserva relações existentes.

Usuários e permissões gerenciam perfis técnicos e escopos. Q-022 permanece aberta: perfil do sistema não deve ser apresentado como equivalência automática a cargo real.

Proteção dos dados é consulta operacional de cópias, integridade, retenção e restauração. #75/#121 permanecem totalmente on hold; a tela não autoriza retomar trabalho de production-readiness.

## Contrato de navegação desktop

- sidebar persistente à esquerda;
- sete áreas reconhecíveis no primeiro nível;
- Estoque, Compras, Financeiro, Caixa, Cadastros e Administração apresentam destinos subordinados;
- a raiz de uma área fica destacada como página apenas quando o usuário está nela;
- em subárea, a área permanece reconhecível e somente o destino atual recebe `aria-current=page`;
- links reconhecem subrotas de detalhe sem fazer `/workspace` ficar ativo em todas as páginas.

## Contrato de navegação mobile

- drawer vertical é o mecanismo principal de navegação;
- a mesma hierarquia do desktop fica disponível;
- selecionar destino fecha o menu;
- listas/tabelas densas devem usar representação adequada ao mobile quando overflow horizontal prejudicar a tarefa;
- ações dedicadas, como recebimento e pagamento, permanecem em fluxos verticais próprios.

Esses contratos ainda precisam de **homologação real em browser** nas jornadas completas.

## Autorização e segurança

Esta arquitetura **não define autorização**.

- guards, serviços, RPCs, policies e RLS existentes continuam sendo boundaries autoritativas;
- disponibilidade de ação na UI reflete permissões conhecidas, mas não substitui enforcement;
- escopos de Unidade/Setor permanecem conforme contrato de cada módulo;
- Q-022 permanece aberta;
- nenhuma regra transacional deve ser movida para React por conveniência de UX.

## Requisitos PENDING preservados

A consolidação não resolve por inferência:

- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-FIN-004` — cardinalidade final de pagamentos por parcela;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas;
- Q-013/Q-014/Q-015/Q-016/Q-017/Q-018/Q-019/Q-020/Q-022/Q-024/Q-025 enquanto não houver decisão real correspondente.

## Próxima etapa

Após a integração da limpeza de linguagem do PR #165, a sequência aprovada da Fase 51 promove:

> **homologação real de UX em desktop/tablet/mobile por jornadas completas.**

A homologação deve validar esta arquitetura na prática e produzir achados concretos. Não saltar diretamente para reconciliação funcional final e não usar deploy manual/Production como laboratório.
