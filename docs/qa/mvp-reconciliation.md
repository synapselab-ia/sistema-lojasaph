# Reconciliação do MVP — Fase 41

Data: 2026-08-21

## Resultado

A Fase 41 confrontou `docs/product/scope.md`, `docs/product/requirements.md`, documentação de módulos, árvore completa da `main`, histórico recente e estado hospedado necessário para os candidatos explícitos.

Conclusão: **não foi encontrado novo MUST funcional do núcleo sem cobertura**. O próximo gap inequívoco e independente é `REQ-FIN-008 — Anexos`, registrado na Issue #92. `REQ-EXPOR-001 — Exportação` permanece sem implementação aparente, mas é mais genérico e fica na fila após a vertical slice escolhida.

A reconciliação não promoveu requisitos `PENDING`, não reabriu requisitos já fechados e não transformou bloqueios operacionais em features artificiais.

## Matriz do MVP profissional

| Área do MVP | Estado | Evidência / decisão |
| --- | --- | --- |
| Organização, unidades, setores e locais | Entregue | master data persistente, runtime Supabase e permissões por escopo |
| Produtos/categorias/unidades de medida | Entregue | catálogo persistente, categoria obrigatória e configuração auditada |
| Fornecedores e contatos | Entregue no núcleo | cadastro canônico, contatos e relações já existem; evolução comercial avançada continua fora do núcleo atual |
| Funcionários e usuários | Entregue | identidade operacional separada de Auth + escopo |
| Estoque: entrada/retirada/transferência/devolução/perda/saldo/histórico | Entregue | ledger + RPCs transacionais + suites SQL estabilizadas |
| Inventário físico/ajuste | Entregue | contagem persistente, confirmação/cancelamento e ajuste auditável |
| Lotes/validades/alertas básicos | Entregue | lotes por local e alertas no dashboard; FEFO continua `PENDING` |
| Compras/recebimentos | Entregue no escopo atual | pedido, emissão, parcial, recebimento e cancelamento persistentes |
| Financeiro: documento/parcelas/pagamentos/status/referência | Entregue | documento, parcelas, eventos de pagamento/estorno e status derivados |
| Financeiro: anexos/comprovantes | **Não entregue; implementável agora** | `REQ-FIN-008`; módulo Financeiro declara Storage/anexos fora da Fase 11; Issue #92 |
| Caixa | Entregue | sessão, fundo, meios, taxas, movimentos, esperado x contado, cancelamento |
| Auth/permissões/auditoria | Entregue no escopo atual | Auth real, RLS + escopo, trilha crítica e hardening |
| Dashboard operacional básico | Entregue | atenção necessária, KPIs, Unit/Setor/período; dashboards avançados ficam para fase posterior |
| Importação rastreável/dry-run | Foundation entregue | batch/staging/aliases/preview/inconsistências; cutover real depende de fonte congelada, mapeamento aprovado, backup e reconciliação operacional |
| Exportação tabular | **Não entregue; candidato posterior** | `REQ-EXPOR-001` é SHOULD e diz “onde fizer sentido”; nenhuma superfície única foi pré-priorizada nesta fase |
| Backup/restauração | Parcial por operação | mecânica e automação existem; Issue #75 aguarda secrets/OAuth + primeiro run real em computador confiável |
| Observabilidade/ambientes/migrations/validação/idempotência | Entregue/auditado | requisitos transversais já fechados; não reabrir sem regressão |

## Itens deliberadamente excluídos da próxima vertical slice

### `PENDING` / dependentes de decisão

Não foram promovidos por inferência:

- produto de venda/POS e integração com vendas;
- ficha técnica/receita;
- empréstimo como processo distinto;
- método final de custeio e FEFO;
- cardinalidade final de pagamentos parciais além do comportamento já suportado;
- significado financeiro de consumo de funcionários;
- demais itens ligados a Q-001..Q-025 ainda não aprovados.

### Fase posterior já explicitada

Não competem com o núcleo atual:

- cotações e compras avançadas;
- estoque mínimo/sugestão de compra;
- histórico avançado de custos;
- leitura de código de barras;
- PWA refinada;
- dashboards avançados e notificações externas.

### Bloqueios operacionais, não gaps de código a inventar

- cutover/importação real das planilhas: requer fonte congelada, transformações aprovadas, backup e reconciliação;
- Production backup Issue #75: requer OAuth/rclone/App Password + primeiro run real em computador pessoal/confiável.

## Por que `REQ-FIN-008` foi escolhido antes de exportação

`REQ-FIN-008` tem processo, entidade e critério de aceite mais específicos:

- o escopo do MVP cita explicitamente `anexos e comprovantes` dentro de Financeiro;
- o requisito cita NF/PDF/XML/boleto/comprovante;
- `docs/architecture/domain-model.md` já prevê `Attachment` ligado a documento/parcela/pagamento/recebimento;
- `docs/architecture/data-model.md` já define metadata mínima de arquivo e deixa apenas a estratégia física para a implementação;
- `docs/modules/finance.md` confirma que anexos/Storage não entraram na Fase 11;
- a UI/gateway Financeiro atuais não possuem upload/listagem/download;
- a árvore completa da `main` não possui módulo/tabela de attachment;
- Production não possui bucket de Storage, policy em `storage.objects` nem relação pública de anexos na inspeção read-only desta fase.

`REQ-EXPOR-001`, em contraste, é propositalmente amplo: “dados tabulares relevantes” e “onde fizer sentido”. Implementá-lo primeiro exigiria escolher uma superfície por conveniência, contrariando a regra contra expansão arbitrária.

## Baseline de Storage / segurança

Supabase Production `fhbvwyttikrbeaanatlr` foi consultado **somente read-only**:

- projeto `ACTIVE_HEALTHY`, PostgreSQL 17;
- `storage.buckets`: nenhum bucket atual;
- policies de `storage.objects`: nenhuma;
- relações públicas com nome de attachment/file: nenhuma.

Nenhum arquivo, bucket, policy, DDL, DML ou dado de negócio foi criado remotamente nesta fase.

A documentação Supabase atual foi revisada antes de selecionar a implementação:

- documentos sensíveis devem permanecer em bucket privado;
- operações de objeto devem usar a Storage API, não mutação manual de metadata em `storage`;
- bucket pode restringir MIME/tamanho;
- chave secret/service permanece apenas em trusted server;
- tabelas públicas novas precisam de grants explícitos compatíveis com RLS, em vez de depender de exposição automática da Data API.

## Vertical slice escolhida

Issue #92 — `Fase 42 — anexos financeiros privados (REQ-FIN-008)`.

Primeiro vínculo: `payable_document`. O modelo poderá evoluir depois para parcelas/pagamentos/recebimentos sem exigir que todos os vínculos possíveis sejam implementados agora.

Princípios já fixados pela Issue:

- bucket privado;
- browser sem secret/service key;
- metadata com Organization + documento + nome original + MIME + tamanho + SHA-256;
- upload apenas por papel financeiro autorizado no escopo do documento;
- leitura/download conforme a visibilidade do documento;
- sem URL pública permanente;
- sem overwrite/upsert;
- sem exclusão física na primeira versão;
- compensação quando upload físico ocorrer e registro de metadata falhar;
- RLS/grants/testes e audit trail explícitos.

## Resultado operacional da Fase 41

- uma única Issue funcional nova: #92;
- Issue #75 preservada;
- nenhuma migration/schema/policy/grant alterada nesta fase;
- nenhum dado Production alterado;
- nenhum deploy Vercel;
- próxima sessão deve implementar #92 em branch funcional, gerando a migration com a Supabase CLI pinada em checkout real antes de escrever o SQL.
