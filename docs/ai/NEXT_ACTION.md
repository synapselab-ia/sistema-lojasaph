# Next Action — Sistema Lojasaph

## Estado

A Fase 51 / #142 concluiu o gate de consolidação/UX dentro das limitações explicitamente aceitas pelo operador.

A Fase 52 / #180 executou a reconciliação funcional final requisito por requisito. Artefato: `docs/qa/final-functional-reconciliation.md`.

Resultado da reconciliação:

- nenhum gap funcional P0/P1 novo e inequívoco no núcleo;
- desktop/mobile possuem evidência live representativa;
- tablet live está deferido por decisão explícita do operador, não homologado;
- `/workspace/administracao/acessos` permanece revalidada após a correção do drift de migrations;
- migração/cutover e production-readiness permanecem marcos separados;
- nenhum requisito PENDING foi resolvido por inferência.

> Regra: consultar GitHub para HEAD/Issues/PRs/branches/CI no início. Não tratar SHAs documentais como HEAD permanente.

## NEXT_ACTION objetiva

### **Executar Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**

A próxima etapa é de **conclusão de negócio**, não de expansão técnica automática.

## 1. PENDINGs

Revisar somente quanto à necessidade para a operação/cutover escolhidos:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — método final de custeio;
- `REQ-EXP-004` — FEFO como regra de produto aprovada;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Para cada item, uma das saídas válidas é:

1. decisão explícita suficiente para implementação;
2. formalmente adiado para depois do go-live;
3. formalmente descartado para a operação escolhida;
4. permanece pendente porque ainda não é necessário decidir.

**Não inferir a resposta a partir do código existente.** Infraestrutura técnica compatível não equivale a decisão de negócio.

## 2. Q-022 — pessoas e perfis reais

Mapear quem precisa operar o sistema e quais capacidades são necessárias.

Os papéis técnicos atuais — `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier`, `viewer` — são boundaries já implementados, mas não devem ser tratados automaticamente como cargos reais.

O objetivo é chegar a um mapeamento operacional suficiente para preparar usuários/escopos do go-live sem enfraquecer RLS ou criar role nova por conveniência.

## 3. Triagem de `open-questions.md`

Para cada pergunta:

- se já existe resposta comprovada em requisito/regra/ADR/código homologado, migrar/registrar a decisão na fonte apropriada e arquivar a pergunta;
- se continua relevante, manter aberta;
- se se tornou irrelevante para a operação escolhida, registrar adiamento/arquivamento;
- não preencher resposta apenas para limpar a lista.

## 4. Quando uma decisão exigir código

Não implementar silenciosamente dentro da #181.

1. escrever a regra aprovada;
2. abrir a menor Issue funcional correspondente;
3. implementar em branch própria;
4. validar/CI/merge;
5. retornar à #181 para atualizar a conclusão de negócio.

## 5. O que não fazer agora

- não reabrir a Fase 51 ou repetir smokes sem regressão concreta;
- não pedir tablet enquanto a decisão de deferimento permanecer válida;
- não fabricar usuário/dado/invite Production para validar hipótese;
- não iniciar migração real antes de decisões necessárias e ambiente/dados representativos;
- não retomar #75/#121;
- não executar deploy Vercel manual rotineiro.

## 6. Depois da conclusão de negócio

Promover, nesta ordem:

1. homologação operacional com dados representativos em ambiente seguro;
2. preparação das fontes finais e dry-run de migração;
3. importação/cutover e reconciliação;
4. somente então production-readiness, incluindo #75/#121 e `REQ-PLAT-005`.

## Guardrails permanentes

GitHub é fonte de verdade. Backend/RLS são boundaries. Nenhum secret no Git/docs/chat. Nenhuma regra de negócio por inferência. Nenhuma prova Production artificial.
