# Requisitos Iniciais — Sistema Lojasaph

Data: 2026-08-17  
Última reconciliação de negócio: 2026-09-04

## Convenções

- `MUST`: obrigatório para a solução alvo/MVP conforme fase definida.
- `SHOULD`: importante e aprovado para evolução do produto, sem necessariamente bloquear o primeiro corte operacional.
- `COULD`: evolução futura.
- `PENDING`: depende de validação do cliente.
- `DEFERRED`: decisão explícita de não bloquear o primeiro go-live; pode ser retomado depois.

---

# Organização e cadastros

## REQ-ORG-001 — Múltiplas unidades
**MUST** — O sistema deve suportar múltiplas unidades/lojas sem hardcode de nomes.

## REQ-ORG-002 — Setores
**MUST** — Cada unidade deve poder possuir setores operacionais.

## REQ-ORG-003 — Locais de estoque
**MUST** — O sistema deve distinguir setor de local físico/lógico de estoque.

## REQ-ORG-004 — Funcionários e usuários
**MUST** — O sistema deve distinguir funcionário operacional de usuário autenticado.

---

# Itens e catálogo comercial

## REQ-ITEM-001 — Cadastro canônico de item de estoque
**MUST** — Itens de estoque devem possuir identificador estável, nome, categoria, unidade de medida e status.

## REQ-ITEM-002 — Aliases
**MUST para migração** — O sistema/importador deve suportar aliases de nomes históricos.

## REQ-ITEM-003 — Código de barras e dados fiscais
**SHOULD** — Permitir EAN/código de barras e atributos fiscais quando aplicáveis.

## REQ-ITEM-004 — Produto de venda separado do item de estoque
**MUST para a solução comercial alvo; sem transformar o Lojasaph em POS** — O sistema deve suportar um conceito de produto vendável separado do item de estoque quando necessário. Um produto vendido pode mapear 1:1 para um item de estoque (ex.: água) ou representar um prato/preparação composto por vários insumos.

O **PDV Legal permanece como sistema de venda/PDV**. O Lojasaph deve usar esse catálogo para mapeamento, análise, ficha técnica, preço/margem e importação de vendas, não para assumir emissão de venda no caixa sem requisito separado. Implementação/desenho: Issues #188 e #185.

## REQ-ITEM-005 — Ficha técnica/receita
**SHOULD — aprovada e recolocada na fila em 2026-09-04** — Permitir cadastrar ficha técnica de pratos/produtos preparados, com versão/vigência, rendimento, ingredientes, quantidades/unidades, custo teórico derivado e histórico.

A existência de uma ficha técnica não autoriza baixa automática de estoque por venda sem regra explícita de sincronização. Implementação: Issue #189.

## REQ-ITEM-006 — Preços comerciais e margem
**MUST para relatórios comerciais úteis** — O sistema deve distinguir e preservar historicamente:

- preço/custo observado na compra;
- custo real da camada/lote recebido;
- preço de venda vigente e histórico;
- receita de venda;
- custo aplicável dos itens/insumos;
- margem bruta em valor e percentual.

Não chamar margem bruta de lucro líquido sem despesas, taxas, impostos e demais componentes suficientes. Implementação/desenho: Issue #188.

---

# Estoque e movimentações

## REQ-STK-001 — Ledger de movimentações
**MUST** — Toda alteração relevante de estoque deve ser explicada por movimentação rastreável.

## REQ-STK-002 — Origem e destino
**MUST** — Transferências devem identificar origem e destino.

## REQ-STK-003 — Tipos/motivos
**MUST** — Movimentações devem possuir tipo/motivo estruturado, sem depender apenas de observação.

## REQ-STK-004 — Retirada para setor
**MUST** — Permitir retirada de item para consumo/operação de setor, com data, quantidade e responsável.

## REQ-STK-005 — Transferência entre unidades/locais
**MUST** — Permitir transferências e histórico de envio/recebimento.

## REQ-STK-006 — Devolução/retorno relacionado
**MUST** — Permitir relacionar devolução a movimento anterior quando aplicável.

## REQ-STK-007 — Empréstimo
**MUST** — Empréstimo é processo distinto de transferência. Deve registrar quantidade e valor do que foi emprestado e permitir restituição total ou parcial por retorno físico ao estoque, por valor, ou por combinação das duas formas, preservando saldo pendente e histórico auditável.

O valor físico de referência deve usar o custo das camadas/lotes efetivamente emprestados conforme `REQ-STK-010`. Implementação: Issue #183.

## REQ-STK-008 — Perdas e vencimentos
**MUST** — Registrar baixa por perda, quebra, vencimento e outros motivos configurados.

## REQ-STK-009 — Inventário físico
**MUST** — Permitir contagem física, comparação com saldo e geração auditável de ajuste.

## REQ-STK-010 — Custeio por lote/camada física
**MUST — decisão aprovada em 2026-09-04** — O custo econômico de uma saída física deve acompanhar a camada/lote efetivamente movimentado.

Se uma unidade perdida pertence a um lote adquirido por R$ 5, a perda deve registrar R$ 5; se pertence a um lote adquirido por R$ 2, deve registrar R$ 2. Não substituir silenciosamente o custo real conhecido por custo médio ou última compra.

Regras mínimas:

- entradas preservam custo unitário de origem por lote/camada de recebimento;
- saídas preservam snapshots de custo da camada consumida;
- FEFO escolhe a camada quando não houver seleção física explícita;
- seleção explícita de lote válido prevalece quando representa a realidade da operação;
- transferências preservam custo da origem;
- devoluções relacionadas preservam vínculo econômico;
- valor de estoque deve ser explicável pelas camadas remanescentes;
- casos legados/negativos sem custo rastreável exigem fallback explícito e auditável, nunca média silenciosa.

Arquitetura: `ADR-003-inventory-costing.md`. Implementação: Issue #187.

## REQ-STK-011 — Estoque mínimo
**SHOULD** — Permitir estoque mínimo e alertas de reposição.

---

# Lotes e validades

## REQ-EXP-001 — Múltiplas validades por item
**MUST** — O mesmo item pode possuir várias quantidades/lotes com validades diferentes.

## REQ-EXP-002 — Validade por local
**MUST** — Validade deve estar associada ao estoque/local correspondente.

## REQ-EXP-003 — Alertas
**SHOULD** — Alertar lotes vencidos e próximos do vencimento em janelas configuráveis.

## REQ-EXP-004 — FEFO
**MUST** — Quando houver lotes comparáveis e nenhuma seleção física explícita da operação, a saída deve priorizar o lote que vence primeiro. Se a operação identificar um lote específico — por exemplo, uma perda conhecida — o lote real informado prevalece e seu custo deve ser usado.

---

# Fornecedores e compras

## REQ-SUP-001 — Cadastro único de fornecedor
**MUST** — Fornecedor deve possuir cadastro canônico reutilizado por compras e financeiro.

## REQ-SUP-002 — Múltiplos contatos
**MUST** — Um fornecedor deve aceitar múltiplos vendedores/contatos.

## REQ-SUP-003 — Condições comerciais
**SHOULD** — Registrar pedido mínimo, agenda de pedido/entrega, condição de pagamento e observações.

## REQ-SUP-004 — Produtos por fornecedor
**SHOULD** — Relacionar fornecedor e item com unidade/embalagem de compra.

## REQ-SUP-005 — Histórico de preços
**SHOULD** — Preservar histórico de preços/custos por fornecedor e período sem sobrescrever o passado.

## REQ-PUR-001 — Pedido de compra
**SHOULD** — Permitir pedido de compra, itens, fornecedor, status e recebimento.

## REQ-PUR-002 — Recebimento parcial
**SHOULD** — Permitir quantidade recebida diferente da pedida e registrar diferenças.

---

# Financeiro / Contas a pagar

## REQ-FIN-001 — Documento financeiro
**MUST** — Registrar obrigação/documento do fornecedor com emissão, unidade/setor e informações identificadoras disponíveis.

## REQ-FIN-002 — Parcelas
**MUST** — Um documento deve suportar múltiplas parcelas, cada uma com número, total, valor e vencimento.

## REQ-FIN-003 — Pagamentos
**MUST** — Pagamento deve ser evento explícito, com data e valor.

## REQ-FIN-004 — Pagamento parcial/múltiplo
**DEFERRED / não necessário para o primeiro go-live** — O operador informou em 2026-09-03 que pagamento parcial/múltiplo não é necessidade da operação inicial. A capacidade técnica existente de múltiplos eventos não precisa ser removida, mas não deve gerar expansão funcional por inércia.

## REQ-FIN-005 — Diferenças financeiras
**MUST** — Permitir preservar diferença entre valor nominal e valor pago; classificação como juros/multa/desconto/ajuste será refinada após Q-015.

## REQ-FIN-006 — Referência de pagamento
**MUST** — Permitir guardar linha/código/chave/instrução separadamente do pagamento efetuado.

## REQ-FIN-007 — Status derivado
**MUST** — Pago, vencido e a vencer devem ser derivados dos dados, com regras centrais.

## REQ-FIN-008 — Anexos
**SHOULD** — Permitir anexar NF/PDF/XML/boleto/comprovante quando aplicável.

## REQ-FIN-009 — Alertas de vencimento
**SHOULD** — Exibir obrigações vencidas, vencendo hoje e em janela configurável.

---

# Caixa

## REQ-CASH-001 — Fechamento por data/unidade
**MUST** — Cada fechamento deve possuir data e unidade, sem estrutura mensal fixa.

## REQ-CASH-002 — Totais por meio de pagamento
**MUST** — Registrar totais de crédito, débito, Pix, dinheiro e demais métodos habilitados.

## REQ-CASH-003 — Taxas configuráveis
**MUST** — Taxas não podem ficar hardcoded; devem ser parametrizadas/versionadas.

## REQ-CASH-004 — Fundo de caixa
**MUST** — Registrar fundo inicial.

## REQ-CASH-005 — Entradas e sangrias
**MUST** — Registrar movimentos com valor, motivo e responsável.

## REQ-CASH-006 — Esperado x contado
**MUST** — Registrar valor esperado, contado e divergência.

## REQ-CASH-007 — Consumo de funcionários
**MUST** — Consumo de funcionário é venda atribuída ao funcionário, cujo valor é descontado na folha. Deve compor faturamento sem ser tratado como entrada imediata na gaveta/meio de pagamento e deve fornecer informação rastreável para o processo externo de folha. O Lojasaph não se torna sistema de folha/RH por essa regra. Implementação: Issue #184.

## REQ-CASH-008 — Integração com vendas
**SHOULD / estudo aprovado** — O PDV Legal permanece como sistema de vendas. O Lojasaph deve estudar importação/exportação de dados, preferencialmente por arquivos oficiais (Excel/CSV) enquanto não houver integração/API oficialmente comprovada.

O estudo deve priorizar campos que permitam mapear produto vendido, quantidade, preço, filial/unidade, data/hora e demais chaves necessárias a relatórios, consumo de funcionários e eventual ficha técnica. Estudo: Issue #185.

---

# Dashboard e relatórios

## REQ-DASH-001 — Atenção necessária
**MUST** — Dashboard inicial deve priorizar pendências acionáveis: estoque crítico, vencimentos, contas, divergências e outros alertas disponíveis.

## REQ-DASH-002 — Filtros
**MUST** — Relatórios gerenciais devem aceitar período e escopos relevantes como unidade/setor.

## REQ-DASH-003 — Financeiro
**MUST** — Exibir total pago, pendente, atrasado e a vencer.

## REQ-DASH-004 — Estoque
**SHOULD** — Exibir saldos, movimentações, perdas, inventários, validades e valor de estoque explicável por camada de custo.

## REQ-DASH-005 — Fornecedores/compras
**SHOULD** — Exibir compras, variação de preço e desempenho/histórico por fornecedor quando houver dados.

## REQ-DASH-006 — Vendas, custo e margem
**SHOULD — aprovado para evolução** — Quando houver fonte confiável de vendas e mapeamento comercial, exibir receita, custo, margem bruta, variação de custo, itens/pratos relevantes e demais indicadores derivados sem duplicar vendas nem prometer lucro líquido sem componentes suficientes.

---

# Segurança, permissões e auditoria

## REQ-SEC-001 — Autenticação
**MUST antes de produção** — Acesso ao sistema deve exigir autenticação apropriada.

## REQ-SEC-002 — Permissões por função e escopo
**MUST** — Permissões devem considerar papel e unidade/setor, aplicadas também no backend/banco.

## REQ-SEC-003 — Auditoria
**MUST** — Alterações críticas em estoque, caixa, financeiro e configurações devem ser auditáveis.

## REQ-SEC-004 — Segredos
**MUST** — Tokens, chaves e senhas não podem ser versionados no GitHub.

## REQ-SEC-005 — Cancelamento/estorno
**MUST** — Registros críticos não devem ser simplesmente excluídos sem trilha de auditoria.

---

# Plataforma e confiabilidade

## REQ-PLAT-001 — Responsivo
**MUST** — Interface deve funcionar em desktop, tablet e celular. Tablet live permanece deferido por decisão operacional até surgir necessidade real.

## REQ-PLAT-002 — Proteção contra duplicidade
**MUST** — Operações críticas devem tolerar retry e evitar submissão duplicada.

## REQ-PLAT-003 — Validação de dados
**MUST** — Regras essenciais devem ser validadas no servidor/domínio e, quando aplicável, no banco.

## REQ-PLAT-004 — Migrações de banco
**MUST quando banco for adotado** — Toda mudança estrutural deve ser versionada.

## REQ-PLAT-005 — Proteção, backup e recuperação de dados
**MUST antes de produção** — Manter backup automático real de Production, independente de ação humana, em destino off-site protegido, com integridade e retenção verificáveis e restauração testada em ambiente isolado. O produto deve evoluir para expor estado autoritativo da proteção sem transformar confirmação humana em prova de backup. Coberturas distintas, como PostgreSQL e Storage, devem ser declaradas explicitamente; exportações manuais são complementares e não substituem o backup automático.

## REQ-PLAT-006 — Logs e erros
**MUST antes de produção** — Erros relevantes devem ser rastreáveis por logs/observabilidade.

## REQ-PLAT-007 — Ambientes separados
**MUST** — Development/preview e produção não devem compartilhar inadvertidamente dados/segredos.

## REQ-PLAT-008 — Composição modular por Organization
**SHOULD — visão aprovada para evolução** — O sistema deve evoluir para permitir que um `owner` Organization-wide habilite/desabilite capacidades de negócio como peças modulares, sem apagar histórico nem romper dependências.

A composição deve:

- operar por capability/module registry versionado;
- respeitar dependências entre módulos;
- preservar módulos core de autenticação, autorização, organização, auditoria e integridade;
- bloquear ações no backend quando uma capacidade estiver desabilitada, não apenas esconder menu;
- adaptar navegação e dashboard;
- preservar dados e permitir reativação;
- auditar alterações;
- oferecer UX de produto compreensível, não painel de feature flags técnicas.

Implementação/desenho: Issue #190.

---

# Importação e exportação

## REQ-IMP-001 — Importação rastreável
**MUST para migração e integrações por arquivo** — Importações devem registrar batch, origem e resultado.

## REQ-IMP-002 — Idempotência
**MUST** — Reprocessar o mesmo batch não deve duplicar registros.

## REQ-IMP-003 — Preview/dry run
**MUST** — Permitir validar transformações antes da migração/importação definitiva.
