# Auditoria final de gaps — Sistema Lojasaph

Data: 2026-08-31  
Status: **fonte de verdade para o fechamento do produto após a consolidação da Fase 51**  
Issue guarda-chuva: #142

## Objetivo

Registrar o que ainda falta para o Sistema Lojasaph ser considerado:

1. funcionalmente concluído como produto;
2. concluído do ponto de vista de negócio;
3. pronto para go-live;
4. production-ready.

Esta auditoria não revoga requisitos, ADRs, RLS, regras de domínio nem o hold de #75/#121. Ela organiza a fila final de trabalho e impede que `CI verde`, `backend implementado` ou `tela existente` sejam tratados como sinônimo de produto 100% concluído.

## Conclusão executiva

O núcleo operacional está maduro e as áreas principais já existem no workspace atual:

- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

O trabalho restante é majoritariamente de fechamento de produto, homologação, decisão de negócio, dados/migração e production-readiness.

**Não criar novos módulos grandes sem gap comprovado.**

## Gap P0 — runtime legado `/cadastros/*`

Foi comprovada a permanência de uma árvore antiga de demonstração paralela ao workspace oficial:

- `/cadastros`;
- `/cadastros/estrutura`;
- `/cadastros/produtos`;
- `/cadastros/fornecedores`;
- `/cadastros/estoque`;
- `/cadastros/inventarios`;
- `/cadastros/validades`;
- demais subrotas existentes sob `src/app/cadastros`.

O layout legado usa `DemoWorkspaceProvider` e a página raiz ainda expõe linguagem como `Fase 4`, `fixtures` e alterações apenas durante a sessão.

Essas rotas **não fazem parte da arquitetura de informação aprovada** e não devem permanecer como superfície navegável de um produto final.

### Próxima slice obrigatória

Neutralizar o runtime legado antes de ampliar a homologação:

1. inventariar toda a árvore `src/app/cadastros`;
2. identificar equivalentes oficiais em `/workspace`;
3. remover as páginas legadas ou substituí-las por redirects seguros para as rotas oficiais;
4. preservar código de fixture somente se ainda houver uso legítimo em testes/engenharia, fora da experiência normal;
5. não alterar domínio, schema, RLS ou regras de negócio para essa limpeza;
6. adicionar/atualizar testes que comprovem que a experiência normal não expõe `Fase`, `fixtures`, `demonstração` ou rotas demo concorrentes;
7. manter CI verde.

## Gap P1 — telas auxiliares ainda fora do padrão consolidado

As telas principais do workspace foram consolidadas, mas alguns fluxos periféricos ainda precisam de acabamento e homologação:

### `/auth/atualizar-senha`

- migrar para primitives compartilhados quando aplicável;
- feedback de erro acessível e consistente;
- targets de toque e foco coerentes;
- homologar fluxo real com token legítimo de teste.

### `/auth/invite`

- revisar estado de carregamento/erro com os padrões compartilhados;
- homologar convite válido → sessão → definição de senha → entrada.

### `/bootstrap`

- revisar `Panel`, `FeedbackMessage`, `Button` e estados de carregamento/erro/sucesso;
- revisar targets de toque/foco/teclado;
- homologar os estados possíveis sem criar bootstrap artificial em Production.

### `/workspace/selecionar-organizacao`

- trazer feedback e ações ao padrão compartilhado quando aplicável;
- homologar 0/1/múltiplas organizações e troca de contexto;
- validar mobile/tablet e operação por teclado.

Essas mudanças devem ser pequenas e orientadas por evidência. Não reescrever autenticação/autorização apenas por estética.

## Gap P1 — homologação UX completa

A Fase 51 ainda não possui evidência suficiente para encerrar o gate de UI/UX.

É obrigatório homologar jornadas reais em:

- desktop;
- tablet;
- mobile.

A matriz deve cobrir, quando houver sessão/ambiente seguro:

### Entrada e contexto

- login;
- recuperação de senha;
- definição de nova senha;
- convite;
- bootstrap quando aplicável;
- seleção/troca de organização;
- logout;
- acesso negado/sessão expirada.

### Visão geral

- filtros;
- cards/alertas;
- links para jornadas específicas;
- estados vazios/erro/loading.

### Administração

- Estrutura;
- Usuários e permissões;
- Proteção dos dados somente leitura enquanto #75/#121 estiverem on hold.

### Cadastros

- Produtos;
- Fornecedores;
- Funcionários.

### Estoque

- posição/filtros;
- entradas;
- retiradas;
- baixas/perdas;
- devoluções;
- transferências;
- inventários;
- lotes/validades;
- estoque mínimo.

### Compras

- lista;
- novo pedido;
- detalhe;
- emissão/cancelamento quando seguro;
- recebimento parcial/total;
- histórico.

### Financeiro

- lista;
- novo documento;
- detalhe;
- vencimentos;
- pagamento;
- estorno/cancelamento quando seguro;
- anexos;
- histórico.

### Caixa

- visão;
- lista de sessões;
- abertura;
- detalhe;
- movimentos;
- contagem/fechamento;
- cancelamento quando seguro;
- configuração conforme permissão.

Cada jornada deve verificar navegação, `lista → detalhe → ação → retorno`, foco/teclado, drawer mobile, touch targets, overflow, tabelas/formulários densos, feedback, loading/empty/error/success e linguagem operacional.

## Gap P2 — reconciliação funcional final

Após a homologação UX, executar reconciliação requisito por requisito usando o gate de produto:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Classificar cada requisito como:

- utilizável e homologado;
- implementado tecnicamente, mas ainda com gap de produto;
- dependente de decisão PENDING;
- necessário apenas para migração/cutover;
- formalmente adiado/fora de escopo.

Revisar também os requisitos `SHOULD` relevantes para a implantação escolhida, incluindo cadastro fiscal/código de barras, condições comerciais, fornecedor × produto, histórico de preços, estoque mínimo, anexos, alertas e exportações.

## Gap P2 — decisões de negócio PENDING

Não implementar por inferência. Resolver somente o que for necessário para a operação/cutover escolhidos:

- `REQ-ITEM-004` — produto de venda/POS separado;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo distinto de transferência;
- `REQ-STK-010` — método de custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece especialmente importante para go-live: definir quem pode fazer cada ação e mapear perfis reais sem assumir que os papéis técnicos atuais equivalem automaticamente a cargos de negócio.

Também revisar `open-questions.md` e arquivar/migrar para regras/ADRs as perguntas que já tenham sido resolvidas por decisões posteriores, evitando carregar dívida documental falsa.

## Gap P3 — dados representativos e homologação operacional

Antes de migrar dados reais:

1. preparar ambiente seguro com dados representativos;
2. cadastrar estrutura, usuários/perfis, produtos, fornecedores, funcionários, caixas, meios de pagamento e configurações relevantes;
3. executar jornadas críticas com pessoas que conhecem a operação;
4. homologar nomenclatura, fluxos, permissões e relatórios;
5. corrigir gaps comprovados.

Production não deve receber fixtures artificiais só para produzir evidência.

## Gap P3 — migração e cutover

Executar o processo operacional completo:

1. congelar fontes finais;
2. mapear aliases/códigos e inconsistências;
3. executar preview/dry-run;
4. revisar relatório de rejeições/warnings;
5. corrigir dados/mapeamentos;
6. executar importação final idempotente e rastreável;
7. reconciliar saldos/totais/amostras contra as fontes;
8. preparar usuários, escopos e configurações reais;
9. aprovar corte;
10. encerrar ou formalizar a transição das planilhas.

Uma tela genérica de importação para usuário final só deve ser criada se existir necessidade operacional futura; migração controlada não exige automaticamente UI de produto.

## Gap P4 — production-readiness final

Somente após conclusão funcional, decisões necessárias e cutover:

- retomar #75/#121;
- comprovar backup automático real de PostgreSQL;
- proteger objetos/binários de Storage quando aplicável;
- comprovar destino off-site, integridade e retenção;
- executar restore/drill em ambiente isolado;
- reconciliar observabilidade e gates finais;
- confirmar separação de ambientes/segredos;
- aprovar go-live/production-readiness.

`REQ-PLAT-005` continua **TOTALMENTE ON HOLD** até essa etapa ou nova decisão explícita do operador.

## Ordem final de execução

1. **remover/redirectar runtime legado `/cadastros/*`**;
2. **fechar telas auxiliares de autenticação/contexto**;
3. **concluir homologação UX desktop/tablet/mobile**;
4. **executar reconciliação funcional final**;
5. **resolver/adiar formalmente PENDINGs necessários e Q-022**;
6. **homologar com dados representativos**;
7. **executar migração/cutover real**;
8. **retomar #75/#121 e fechar production-readiness**.

## Regra de encerramento

O sistema não deve ser chamado de `100%` apenas porque o CI está verde ou porque todas as áreas possuem páginas.

A conclusão só ocorre quando os quatro marcos do roadmap forem satisfeitos:

1. conclusão funcional do produto;
2. conclusão de negócio;
3. go-live;
4. production-ready.
