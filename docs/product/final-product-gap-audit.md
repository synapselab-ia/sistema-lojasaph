# Auditoria final de gaps — Sistema Lojasaph

Data inicial: 2026-08-31  
Última atualização: 2026-09-01  
Status: **fonte de verdade para a fila de fechamento pós-conclusão funcional**

## Objetivo

Distinguir quatro marcos diferentes:

1. conclusão funcional do produto;
2. conclusão de negócio;
3. go-live/cutover;
4. production-ready.

CI verde, backend implementado ou existência de página isolada nunca significam `100%`.

## Estado executivo atual

### Marco 1 — conclusão funcional do produto: **atingido dentro das limitações declaradas**

A Fase 51 consolidou o produto e fechou o gate UX representativo:

- runtime legado `/cadastros/*` neutralizado;
- telas auxiliares de auth/contexto consolidadas;
- arquitetura de informação, design system e áreas operacionais integrados;
- desktop e mobile com evidência live autenticada;
- profundidade representativa lista → detalhe → retorno confirmada normal pelo operador em Produtos, Compras, Financeiro e Caixa;
- `/workspace/administracao/acessos` revalidada depois da correção do drift de migrations;
- nenhum P0/P1 conhecido sem tratamento.

Tablet live não foi homologado: o operador informou que nem ele nem Asaph dispõem do dispositivo e **aceitou explicitamente deferir essa evidência por enquanto**. Isso é limitação aceita, não prova positiva. Reabrir se tablet se tornar necessário antes do corte/production-readiness.

A Fase 52 / #180 executou a reconciliação completa dos 70 requisitos. Resultado em `docs/qa/final-functional-reconciliation.md`:

> **nenhum gap funcional P0/P1 novo e inequívoco foi encontrado no núcleo do produto.**

Isso não conclui negócio, dados, cutover ou proteção final de Production.

## Histórico dos antigos gaps P0/P1

### Runtime legado `/cadastros/*` — **tratado**

Neutralizado na Fase 51 por redirects seguros para o workspace oficial. Não reabrir sem regressão concreta.

### Telas auxiliares — **tratadas no nível de produto atual**

`/auth/atualizar-senha`, `/auth/invite`, `/bootstrap` e `/workspace/selecionar-organizacao` foram reconciliadas com primitives/feedback compartilhados quando aplicável. Estados reais públicos foram verificados sem fabricar token/bootstrap Production.

### Homologação UX — **gate concluído com tablet deferido**

Evidência detalhada: `docs/qa/fase51-ux-homologation.md`.

Não exigir mutação artificial, convite falso ou dado Production apenas para preencher checklist.

### Administração indisponível por migration drift — **corrigido e revalidado**

UX-51-004 mostrou `/workspace/administracao/acessos` quebrada porque Production estava duas migrations atrás do Git. O PR #175 aplicou somente as versions esperadas por `supabase db push`, sem seed/reset/repair/DDL ad hoc. A rota foi depois reaberta com sessão legítima e funcionou normalmente.

## Marco 2 — conclusão de negócio: **próxima frente**

Issue: **#181 — Fase 53: decisões de negócio e perfis reais para conclusão**.

### PENDINGs preservados

Resolver, adiar formalmente ou descartar somente conforme necessidade da operação/cutover escolhido:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — método final de custeio;
- `REQ-EXP-004` — FEFO como regra de produto aprovada;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Não implementar por inferência. Infraestrutura técnica existente não equivale a decisão empresarial.

### Q-022 — perfis reais

Mapear pessoas/cargos reais às capacidades técnicas existentes antes de preparar acessos de go-live. `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier` e `viewer` são papéis técnicos, não cargos automaticamente aprovados.

### Dívida de `open-questions.md`

Triar sem inventar respostas:

- resposta comprovada → migrar para regra/requisito/ADR e arquivar pergunta;
- pergunta ainda relevante → manter aberta;
- irrelevante para a implantação escolhida → registrar adiamento/arquivamento.

## Marco 3 — dados representativos, migração e cutover: **pendente após conclusão de negócio**

### Homologação operacional com dados representativos

Antes da migração real:

1. usar ambiente seguro;
2. preparar estrutura, usuários/perfis, produtos, fornecedores, funcionários, caixas, meios/configurações relevantes;
3. executar jornadas críticas com quem conhece a operação;
4. homologar nomenclatura, fluxos, permissões e relatórios;
5. corrigir somente gaps comprovados.

Production não deve receber fixtures artificiais só para produzir evidência.

### Migração/cutover

A fundação de staging/dry-run já atende rastreabilidade, idempotência, preview e inconsistências. Ainda são necessários:

1. congelar fontes finais;
2. mapear aliases/códigos/inconsistências;
3. executar preview/dry-run real;
4. revisar rejeições/warnings/pending mappings;
5. corrigir dados/mapeamentos aprovados;
6. executar importação final idempotente/rastreável;
7. reconciliar saldos, totais e amostras;
8. preparar usuários, escopos e configurações reais;
9. aprovar o corte;
10. encerrar ou formalizar a transição das planilhas.

Não criar uma UI genérica de importação apenas porque o cutover existe; migração controlada pode permanecer procedimento operacional.

## Marco 4 — production-readiness: **ON HOLD**

Somente depois de conclusão funcional, decisões necessárias e cutover:

- retomar #75/#121;
- fechar `REQ-PLAT-005`;
- comprovar backup automático real de PostgreSQL;
- proteger objetos/binários de Storage quando aplicável;
- comprovar off-site, integridade e retenção;
- executar restore/drill isolado;
- reconciliar observabilidade/gates finais;
- confirmar separação de ambientes/segredos;
- aprovar go-live/production-readiness.

#75/#121 permanecem **TOTALMENTE ON HOLD** até esse marco ou nova decisão explícita do operador.

## Ordem final atualizada

1. ~~neutralizar runtime legado `/cadastros/*`~~ — concluído;
2. ~~fechar telas auxiliares~~ — concluído;
3. ~~concluir gate UX~~ — concluído com tablet explicitamente deferido;
4. ~~reconciliação funcional final~~ — concluída na Fase 52 / #180;
5. **resolver/adiar PENDINGs necessários + Q-022 + triagem de perguntas** — Fase 53 / #181;
6. homologar com dados representativos;
7. executar migração/cutover real;
8. retomar #75/#121 e fechar production-readiness.

## Regra de encerramento

O Sistema Lojasaph pode ser descrito neste momento como **funcionalmente concluído no núcleo, dentro das limitações declaradas**, mas não como `100%`, `go-live` ou `production-ready`.

Os próximos marcos são empresariais e operacionais, não justificativa automática para criar novos módulos técnicos.
