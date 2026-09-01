# Handoff — Sistema Lojasaph

## Como ler

**Sempre consultar GitHub para HEAD real de `main`, Issues/PRs/branches e CI.** SHAs e runs abaixo são âncoras de evidência, não estado eterno.

## Transição atual

A Fase 51 / #142 completou a consolidação e o gate UX dentro das limitações aceitas. A Fase 52 / #180 executou a reconciliação funcional final e não encontrou gap funcional P0/P1 novo e inequívoco no núcleo.

Próxima frente: **Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**.

Não declarar o sistema 100%: ainda existem decisões de negócio, homologação com dados representativos, migração/cutover e production-readiness.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## Evidência UX que não deve ser repetida por inércia

### Público

HTTP/HTML e snapshots estáticos já cobrem Login, Recuperação, Acesso indisponível e estados auxiliares documentados em `docs/qa/fase51-ux-homologation.md`.

### Desktop live autenticado

O operador confirmou abertura normal de Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa. `/workspace/administracao/acessos` foi especificamente revalidada após o incidente de migration drift.

### Mobile live autenticado

O operador confirmou abertura/navegação normal das superfícies percorridas em celular real com sessão legítima.

### Profundidade representativa

Em 2026-09-01 o operador confirmou como normais os fluxos solicitados:

- Produto: lista → detalhe → retorno;
- Compras/Pedidos: lista → detalhe → retorno;
- Financeiro/Contas: lista → detalhe → retorno;
- Caixa/Sessões: lista → detalhe → retorno;
- mobile: menu → Compras ou Financeiro → detalhe quando disponível → retorno.

Não interpretar isso como execução de toda mutação/estado possível em Production. A amostra foi deliberadamente read-only para evitar dado artificial.

### Tablet

O operador informou que nem ele nem Asaph possuem tablet e decidiu que não é necessário testar tablet por enquanto.

Registrar como **deferido por decisão explícita**, nunca como homologado live. Não pedir novamente sem nova necessidade real.

## Runtime observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- READY / Production / source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

Não fazer deploy manual apenas para alinhar documentação.

## Migrations Production

UX-51-004 revelou drift exato de duas migrations administrativas. O PR #175 reconciliou por `supabase db push`, preservando as versions Git. Workflow one-shot foi removido depois.

Production e Git foram revalidados read-only até:

- `20260828130500 administration_access_management`;
- `20260828132500 administration_employee_identity`.

Não repetir #175 sem novo drift comprovado. Se Production reportar função/tabela ausente, comparar history remoto ↔ migrations Git antes de alterar código.

## Reconciliação funcional final — Fase 52

Artefato: `docs/qa/final-functional-reconciliation.md`.

Foram classificados os 70 requisitos de `docs/product/requirements.md` pelo gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Resultado:

- nenhum novo gap funcional P0/P1 inequívoco;
- núcleo funcionalmente concluído dentro das limitações declaradas;
- tablet = limitação aceita, não prova positiva;
- importação/cutover separados de conclusão funcional;
- backup/restore separados como production-readiness;
- nenhum PENDING promovido por inferência.

## PENDINGs preservados

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio final;
- `REQ-EXP-004` — FEFO como regra aprovada;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 continua aberta para perfis/pessoas reais. Roles técnicas atuais não equivalem automaticamente a cargos de negócio.

## NEXT_ACTION

### Fase 53 / #181 — decisões de negócio e perfis reais

1. reler governança/handoff;
2. consultar estado GitHub real;
3. não reabrir UX/tablet sem regressão ou nova decisão;
4. revisar cada PENDING somente quanto à necessidade para a operação/cutover escolhido;
5. para cada um: decidir, formalmente adiar/descartar ou manter pendente com justificativa;
6. mapear Q-022 para os perfis/pessoas reais necessários ao go-live;
7. triar `docs/product/open-questions.md`: mover respostas comprovadas para regra/ADR, manter perguntas reais e arquivar dívida documental obsoleta;
8. se uma decisão exigir código, abrir Issue funcional mínima separada — não implementar silenciosamente dentro da Issue de decisão;
9. preservar #75/#121 ON HOLD;
10. ao fechar a conclusão de negócio, promover homologação com dados representativos e preparação de migração/cutover.

## Guardrails

GitHub é fonte de verdade; RLS/backend continuam boundaries; nenhum secret em Git/docs/chat; nenhuma fixture Production para fabricar prova; nenhum deploy Vercel manual rotineiro; nenhum PENDING ou Q-022 por inferência.
