# Requisitos Iniciais — Sistema Lojasaph

Data: 2026-08-17
Status: inicial, derivado das planilhas e do plano do produto. Requisitos dependentes das questões abertas permanecem marcados como condicionais.

## Convenções

- `MUST`: obrigatório para a solução alvo/MVP conforme fase definida.
- `SHOULD`: importante, pode entrar após o núcleo.
- `COULD`: evolução futura.
- `PENDING`: depende de validação do cliente.

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

# Itens

## REQ-ITEM-001 — Cadastro canônico de item de estoque
**MUST** — Itens de estoque devem possuir identificador estável, nome, categoria, unidade de medida e status.

## REQ-ITEM-002 — Aliases
**MUST para migração** — O sistema/importador deve suportar aliases de nomes históricos.

## REQ-ITEM-003 — Código de barras e dados fiscais
**SHOULD** — Permitir EAN/código de barras e atributos fiscais quando aplicáveis.

## REQ-ITEM-004 — Produto de venda separado
**PENDING** — Criar conceito separado de produto de venda/POS se Q-006 confirmar distinção em relação a itens de estoque.

## REQ-ITEM-005 — Ficha técnica/receita
**COULD/PENDING** — Relacionar produto vendido a insumos apenas se houver necessidade de consumo teórico por vendas.

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
**PENDING** — Controlar empréstimo e quantidade pendente de retorno se Q-005 confirmar processo distinto.

## REQ-STK-008 — Perdas e vencimentos
**MUST** — Registrar baixa por perda, quebra, vencimento e outros motivos configurados.

## REQ-STK-009 — Inventário físico
**MUST** — Permitir contagem física, comparação com saldo e geração auditável de ajuste.

## REQ-STK-010 — Custeio
**PENDING** — Definir método de custeio após Q-008.

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
**PENDING** — Sugerir lote que vence primeiro se Q-019 confirmar a regra.

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
**SHOULD** — Preservar histórico de preços/custos por fornecedor.

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
**PENDING** — Cardinalidade final depende de Q-014.

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
**PENDING** — Estrutura e impacto financeiro dependem de Q-009.

## REQ-CASH-008 — Integração com vendas
**PENDING** — Escopo depende de Q-007.

---

# Dashboard e relatórios

## REQ-DASH-001 — Atenção necessária
**MUST** — Dashboard inicial deve priorizar pendências acionáveis: estoque crítico, vencimentos, contas, divergências e outros alertas disponíveis.

## REQ-DASH-002 — Filtros
**MUST** — Relatórios gerenciais devem aceitar período e escopos relevantes como unidade/setor.

## REQ-DASH-003 — Financeiro
**MUST** — Exibir total pago, pendente, atrasado e a vencer.

## REQ-DASH-004 — Estoque
**SHOULD** — Exibir saldos, movimentações, perdas, inventários e validades.

## REQ-DASH-005 — Fornecedores/compras
**SHOULD** — Exibir compras, variação de preço e desempenho/histórico por fornecedor quando houver dados.

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
**MUST** — Interface deve funcionar em desktop, tablet e celular.

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

---

# Importação e exportação

## REQ-IMP-001 — Importação rastreável
**MUST para migração** — Importações devem registrar batch, origem e resultado.

## REQ-IMP-002 — Idempotência
**MUST** — Reprocessar o mesmo batch não deve duplicar registros.

## REQ-IMP-003 — Preview/dry run
**MUST** — Permitir validar transformações antes da migração definitiva.

## REQ-IMP-004 — Relatório de inconsistências
**MUST** — Informar linhas rejeitadas, warnings e mapeamentos pendentes.

## REQ-EXPOR-001 — Exportação
**SHOULD** — Dados tabulares relevantes devem poder ser exportados em CSV/Excel; PDF quando fizer sentido para relatório/documento.

---

# Fora da decisão atual

Os seguintes pontos não devem ser assumidos como aprovados sem fase específica:

- Supabase como fornecedor definitivo;
- integração com POS/PDV;
- emissão fiscal;
- folha/RH;
- contabilidade completa;
- IA dentro do produto;
- WhatsApp;
- modo offline completo;
- aplicativo Android/iOS nativo.