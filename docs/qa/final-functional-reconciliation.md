# Reconciliação funcional final — Fase 52

Data: 2026-09-01  
Issue: #180  
Fase anterior: #142 / Fase 51

## Objetivo

Aplicar, requisito por requisito, o gate de produto definido após a consolidação de UX:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Esta reconciliação não declara o Sistema Lojasaph `100%` concluído. Ela separa **conclusão funcional do produto** de decisões de negócio, migração/cutover e production-readiness.

## Fontes de evidência

A classificação abaixo reconcilia:

- `docs/product/requirements.md`;
- `docs/product/business-rules.md`;
- `docs/product/open-questions.md`;
- `docs/product/final-product-gap-audit.md`;
- `docs/qa/mvp-reconciliation.md`;
- `docs/qa/mvp-reconciliation-fase44.md`;
- documentação atual de Cadastros, Estoque, Estoque mínimo, Compras, Financeiro, Caixa, Dashboard e Importação;
- `docs/product/administration-capability-map.md`;
- evidência UX acumulada em `docs/qa/fase51-ux-homologation.md`;
- rotas atuais do workspace quando necessário para confirmar o padrão lista → detalhe.

A Fase 51 produziu evidência live autenticada em desktop e mobile. Em 2026-09-01 o operador confirmou como normais também os fluxos profundos representativos solicitados:

- Produtos: lista → detalhe → retorno;
- Compras: Pedidos → detalhe → retorno;
- Financeiro: Contas → detalhe → retorno;
- Caixa: Sessões → detalhe → retorno;
- mobile: menu → Compras ou Financeiro → detalhe quando disponível → retorno.

Essa evidência é representativa, não uma alegação de que toda mutação e todo estado possível foram executados em Production. Tablet permanece **deferido por decisão explícita do operador**, não homologado live.

## Legenda

- **Utilizável** — necessidade operacional possui cobertura de produto coerente e não há gap funcional inequívoco conhecido.
- **PENDING negócio** — requisito permanece condicionado a decisão do cliente; não pode ser fechado por inferência mesmo se existir infraestrutura técnica compatível.
- **Migração/cutover** — fundação existe, mas a necessidade só se completa durante preparação/importação/corte de dados reais.
- **Production-readiness** — requisito pertence ao marco final de proteção/operação de Production, não à conclusão funcional do produto.
- **Limitação aceita** — ausência de evidência ou capacidade foi explicitamente aceita/deferida pelo operador nesta etapa; não equivale a homologação positiva.

---

# Matriz completa

## Organização e cadastros

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-ORG-001 — Múltiplas unidades | **Utilizável** | Estrutura Organization → Business → Unit, Administração → Estrutura e RLS por escopo. |
| REQ-ORG-002 — Setores | **Utilizável** | Setores persistentes, administráveis pela UI conforme permissão e usados nas jornadas operacionais. |
| REQ-ORG-003 — Locais de estoque | **Utilizável** | StockLocation separado de Sector, manutenção administrativa e validação de hierarquia no banco. |
| REQ-ORG-004 — Funcionários e usuários | **Utilizável** | Employee operacional separado de identidade Auth/membership; UI não exige UUID técnico. |

## Itens

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-ITEM-001 — Cadastro canônico | **Utilizável** | Produto/StockItem possui ID estável, categoria obrigatória, unidade, status e manutenção lista/detalhe. |
| REQ-ITEM-002 — Aliases | **Migração/cutover** | Fundação de importação suporta aliases explícitos e preserva origem; aplicação definitiva depende das fontes congeladas. |
| REQ-ITEM-003 — Código de barras e fiscal | **Utilizável** | EAN, NCM e CEST opcionais estão expostos no cadastro; sem inventar validação tributária ou leitura física de barcode. |
| REQ-ITEM-004 — Produto de venda separado | **PENDING negócio** | Q-006 continua autoridade. Não criar catálogo POS separado por inferência. |
| REQ-ITEM-005 — Ficha técnica/receita | **PENDING negócio** | Depende da necessidade de consumo teórico por vendas. |

## Estoque e movimentações

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-STK-001 — Ledger | **Utilizável** | Entradas/saídas/transferências/devoluções/perdas/inventário geram movimentos rastreáveis; saldo é projeção. |
| REQ-STK-002 — Origem e destino | **Utilizável** | Transferência registra origem, destino, dispatch e recebimento real. |
| REQ-STK-003 — Tipos/motivos | **Utilizável** | Tipos estruturados e catálogo de motivos para baixas; observação não é a única semântica. |
| REQ-STK-004 — Retirada para setor | **Utilizável** | Setor é obrigatório na retirada persistente e validado por escopo. |
| REQ-STK-005 — Transferência | **Utilizável** | Transferência parcial/total e histórico são transacionais, auditáveis e idempotentes. |
| REQ-STK-006 — Devolução relacionada | **Utilizável** | Retorno referencia movimento original e suporta retornos parciais múltiplos sem apagar histórico. |
| REQ-STK-007 — Empréstimo | **PENDING negócio** | Q-005 não foi resolvida; transferência/devolução existentes não devem ser renomeadas como empréstimo. |
| REQ-STK-008 — Perdas e vencimentos | **Utilizável** | Baixas por perda/quebra/vencimento/outro possuem motivo estruturado, lote quando necessário e auditoria. |
| REQ-STK-009 — Inventário físico | **Utilizável** | Sessão de contagem, snapshot, confirmação/cancelamento e ajuste auditável persistentes. |
| REQ-STK-010 — Custeio | **PENDING negócio** | O runtime possui baseline transacional de custo médio, mas a escolha empresarial final de Q-008 permanece aberta. |
| REQ-STK-011 — Estoque mínimo | **Utilizável** | Política por item/local, alerta derivado e manutenção protegida por RLS. |

## Lotes e validades

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-EXP-001 — Múltiplas validades | **Utilizável** | Lotes/quantidades distintos por item suportam datas de validade diferentes. |
| REQ-EXP-002 — Validade por local | **Utilizável** | Batch é associado ao estoque/local correspondente. |
| REQ-EXP-003 — Alertas | **Utilizável** | Dashboard cobre vencidos e próximos do vencimento com horizonte 7/15/30 dias. |
| REQ-EXP-004 — FEFO | **PENDING negócio** | Há alocação técnica FEFO em fluxos atuais, mas Q-019 continua sem decisão de produto final; não declarar regra empresarial aprovada. |

## Fornecedores e compras

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-SUP-001 — Cadastro único | **Utilizável** | Supplier canônico é reutilizado por Compras e Financeiro. |
| REQ-SUP-002 — Múltiplos contatos | **Utilizável** | Contatos são coleção persistente do fornecedor. |
| REQ-SUP-003 — Condições comerciais | **Utilizável** | Pedido mínimo, agenda, pagamento e observações estão expostos no produto. |
| REQ-SUP-004 — Produtos por fornecedor | **Utilizável** | SupplierItem mantém vínculo, unidade/embalagem e estado ativo/inativo; Compras reutiliza os vínculos. |
| REQ-SUP-005 — Histórico de preços | **Utilizável** | Emissão de pedido registra preço observado e Dashboard expõe histórico/variação factual quando há dados comparáveis. |
| REQ-PUR-001 — Pedido de compra | **Utilizável** | Lista, criação, detalhe, emissão, cancelamento permitido, recebimentos e histórico. |
| REQ-PUR-002 — Recebimento parcial | **Utilizável** | Quantidade recebida pode divergir da pedida até o pendente; parcial/total é persistente e transacional. |

## Financeiro

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-FIN-001 — Documento financeiro | **Utilizável** | Documento por fornecedor/Unit/Setor com identificadores disponíveis e jornada lista/detalhe. |
| REQ-FIN-002 — Parcelas | **Utilizável** | Documento aceita múltiplas parcelas com número/total/valor/vencimento. |
| REQ-FIN-003 — Pagamentos | **Utilizável** | Pagamento é evento explícito, auditável e estornável. |
| REQ-FIN-004 — Pagamento parcial/múltiplo | **PENDING negócio** | O modelo aceita múltiplos eventos e evita cardinalidade irreversível, mas Q-014 continua sem fechamento empresarial. |
| REQ-FIN-005 — Diferenças financeiras | **Utilizável** | Nominal, pago líquido e saldo/diferença são preservados sem classificar causa não aprovada. |
| REQ-FIN-006 — Referência de pagamento | **Utilizável** | Referência bruta fica separada do evento de pagamento. |
| REQ-FIN-007 — Status derivado | **Utilizável** | paid/overdue/due_today/upcoming/cancelled são derivados no boundary de dados. |
| REQ-FIN-008 — Anexos | **Utilizável** | Anexos privados por documento, upload/download sob autorização e sem URL pública permanente. |
| REQ-FIN-009 — Alertas | **Utilizável** | Dashboard expõe vencidas, hoje e a vencer no horizonte configurável. |

## Caixa

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-CASH-001 — Fechamento por data/unidade | **Utilizável** | CashSession por caixa/Unit/data/sequence, sem estrutura mensal fixa. |
| REQ-CASH-002 — Totais por meio | **Utilizável** | Meios configuráveis e totais bruto/taxa/líquido por sessão. |
| REQ-CASH-003 — Taxas configuráveis | **Utilizável** | FeeRule versionada por vigência; taxa não fica hardcoded. |
| REQ-CASH-004 — Fundo de caixa | **Utilizável** | Opening float é registrado na abertura da sessão. |
| REQ-CASH-005 — Entradas e sangrias | **Utilizável** | Movimentos append-only com valor, motivo/contexto e responsável auditável. |
| REQ-CASH-006 — Esperado x contado | **Utilizável** | Fechamento calcula esperado e registra contado/divergência. |
| REQ-CASH-007 — Consumo de funcionários | **PENDING negócio** | Existe categoria operacional separada, mas Q-009 ainda define impacto financeiro/empresarial. |
| REQ-CASH-008 — Integração com vendas | **PENDING negócio** | Q-007 continua aberta; Caixa atual trabalha com totais consolidados. |

## Dashboard e relatórios

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-DASH-001 — Atenção necessária | **Utilizável** | `/workspace` prioriza sinais acionáveis de estoque, validade, financeiro, compras e caixa. |
| REQ-DASH-002 — Filtros | **Utilizável** | Unit, Sector, horizonte e período são aplicados somente onde o modelo possui vínculo/evento canônico. |
| REQ-DASH-003 — Financeiro | **Utilizável** | KPIs de pago, pendente, atrasado e a vencer derivados das obrigações. |
| REQ-DASH-004 — Estoque | **Utilizável** | Posições, movimentos, perdas, inventários, transferências, validades e mínimo possuem sinais gerenciais básicos. |
| REQ-DASH-005 — Fornecedores/compras | **Utilizável** | Pedidos/recebimentos, histórico factual por fornecedor e variação de preços aparecem quando há dados; score/SLA não é inventado. |

## Segurança, permissões e auditoria

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-SEC-001 — Autenticação | **Utilizável** | Workspace exige sessão real; fluxos auxiliares de auth/contexto foram consolidados. |
| REQ-SEC-002 — Permissões por função/escopo | **Utilizável tecnicamente; Q-022 pendente para perfis reais** | RLS/RPCs aplicam role + Organization/Unit/Sector/StockLocation. A política técnica existe; cargos reais ainda precisam ser mapeados. |
| REQ-SEC-003 — Auditoria | **Utilizável** | Operações críticas de Estoque, Financeiro, Caixa, Administração e configurações geram audit trail. |
| REQ-SEC-004 — Segredos | **Utilizável** | Secrets permanecem server-only/fora do Git; browser não recebe service/admin keys. |
| REQ-SEC-005 — Cancelamento/estorno | **Utilizável** | Pedidos, documentos/pagamentos, sessões e inventários preservam trilha em vez de exclusão silenciosa. |

## Plataforma e confiabilidade

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-PLAT-001 — Responsivo | **Utilizável com limitação aceita** | Desktop e mobile têm evidência live representativa; snapshots touch cobrem 768×1024. Tablet autenticado live foi explicitamente deferido pelo operador, portanto não é marcado como homologado. |
| REQ-PLAT-002 — Duplicidade/retry | **Utilizável** | Commands críticos usam command IDs/idempotência e rejeitam reuso semântico divergente. |
| REQ-PLAT-003 — Validação | **Utilizável** | Domínio/server/PostgreSQL validam regras essenciais; UI não é boundary único. |
| REQ-PLAT-004 — Migrações | **Utilizável** | Schema é versionado por migrations e paridade Git ↔ Production possui procedimento explícito. |
| REQ-PLAT-005 — Backup/recuperação | **Production-readiness — ON HOLD** | #75/#121 permanecem TOTALMENTE ON HOLD até o marco final; não bloquear conclusão funcional com esse gate operacional posterior. |
| REQ-PLAT-006 — Logs e erros | **Utilizável no estado atual** | CI + telemetria runtime permitiram detectar e diagnosticar UX-51-004; manter observabilidade como gate final antes do corte. |
| REQ-PLAT-007 — Ambientes separados | **Utilizável/auditado** | Fluxos de CI/preview/Production e secrets seguem separação documentada; não criar dado Production como fixture. |

## Importação e exportação

| Requisito | Classificação | Evidência / limite |
| --- | --- | --- |
| REQ-IMP-001 — Importação rastreável | **Migração/cutover** | Batch/arquivo/aba/linha/origem são rastreáveis na fundação; importação real depende das fontes finais. |
| REQ-IMP-002 — Idempotência | **Migração/cutover — fundação utilizável** | Batch/linha possuem identidade determinística e reprocessamento não duplica staging. |
| REQ-IMP-003 — Preview/dry run | **Migração/cutover — fundação utilizável** | Preview existe e não escreve tabelas operacionais. |
| REQ-IMP-004 — Inconsistências | **Migração/cutover — fundação utilizável** | Rejeições, warnings e pending mappings são reportados; transformação real ainda exige dados/regras aprovados. |
| REQ-EXPOR-001 — Exportação | **Utilizável no recorte comprovado** | Financeiro exporta contas a pagar em CSV seguro. O requisito é deliberadamente amplo; não há evidência que justifique uma feature genérica “exportar tudo”. |

---

# Resultado da reconciliação

## 1. Gap funcional novo

**Nenhum gap funcional P0/P1 inequívoco foi encontrado nesta reconciliação.**

Os MUSTs do núcleo possuem uma jornada de produto coerente ou pertencem explicitamente a outro marco. Os SHOULDs previamente selecionados como relevantes foram entregues sem justificar expansão arbitrária. A evidência live da Fase 51 confirma que as superfícies principais e uma amostra profunda de lista → detalhe → retorno estão operáveis em desktop/mobile.

Isso permite registrar o **núcleo do produto como funcionalmente concluído dentro das limitações declaradas**, sem confundir esse marco com conclusão de negócio, go-live ou production-ready.

## 2. Limitação aceita, não prova positiva

`REQ-PLAT-001` possui a ressalva de tablet:

- existe evidência estática touch em 768×1024;
- não existe homologação live autenticada de tablet;
- o operador aceitou explicitamente deferir essa prova por não dispor do dispositivo;
- reabrir somente se uso real de tablet se tornar requisito antes do corte ou por nova decisão explícita.

## 3. PENDINGs que continuam sem decisão

Não resolver por inferência:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio final;
- `REQ-EXP-004` — FEFO como regra de produto aprovada;
- `REQ-FIN-004` — semântica final de pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 também continua aberta para mapear **pessoas/cargos reais → capacidades técnicas** antes de go-live. A existência de roles e RLS não responde essa decisão de negócio.

`docs/product/open-questions.md` ainda contém questões históricas além desse conjunto. Antes da conclusão de negócio, elas devem ser triadas: resposta comprovada deve migrar para regra/ADR; pergunta ainda relevante deve permanecer aberta; dívida documental obsoleta deve ser arquivada. Não preencher respostas por conveniência.

## 4. Migração/cutover

Não são gaps de UI a implementar agora:

- aliases e mapeamentos finais;
- importadores específicos das fontes reais;
- fontes congeladas;
- dry-run real;
- tratamento de rejeições/warnings;
- importação definitiva;
- reconciliação de saldos/totais/amostras;
- preparação de usuários/escopos/configurações reais;
- corte e encerramento/transição das planilhas.

A fundação de importação existe; `ready` no staging não autoriza automaticamente cutover.

## 5. Production-readiness

`REQ-PLAT-005`, #75 e #121 permanecem **TOTALMENTE ON HOLD** durante as etapas de negócio e cutover. Backup automático real, cobertura de Storage, off-site, integridade/retenção e restore drill pertencem ao marco final de production-readiness, salvo decisão explícita posterior do operador.

## 6. Próxima frente objetiva

A próxima etapa não é criar feature técnica por inércia. É **conclusão de negócio**:

1. decidir ou formalmente adiar/descartar somente os PENDINGs necessários para a operação escolhida;
2. resolver Q-022 para os perfis/pessoas reais necessários ao uso;
3. triar `open-questions.md` sem inferência;
4. depois homologar com dados representativos e preparar migração/cutover.

Se uma decisão de negócio revelar um novo comportamento obrigatório, abrir a menor Issue funcional correspondente. Até lá, não implementar `PENDING` por suposição.
