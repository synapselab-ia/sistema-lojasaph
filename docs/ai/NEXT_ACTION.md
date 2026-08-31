# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

O P0 do runtime legado `/cadastros/*` foi neutralizado no PR #170. As URLs antigas permanecem apenas como redirects para o `/workspace`, sem `DemoWorkspaceProvider`, `AdminShell` ou UI concorrente de fixtures.

Fonte de verdade da fila final:

- `docs/product/final-product-gap-audit.md`.

Baseline anterior ao PR #170:

- `main=6f0c0cfcd0e969335cd4d23ddefd1a2ef17dad11`;
- CI #580 / run `33424103707`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**.

## NEXT_ACTION objetiva

### **Fechar telas auxiliares de autenticação/contexto sem reimplementar auth/RLS**

Esta é a próxima slice executável.

Rotas prioritárias:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

## 1. Reconciliar estado real antes de mudar

No começo da execução:

1. ler `AGENTS.md`;
2. ler `docs/00-START-HERE.md`;
3. ler `docs/ai/CURRENT_STATE.md`;
4. ler `docs/ai/HANDOFF.md`;
5. ler este `NEXT_ACTION.md`;
6. ler `docs/product/final-product-gap-audit.md`;
7. confirmar `main`, Issue #142, PRs, branches e CI reais;
8. não refazer slices já integradas.

## 2. Inspecionar as quatro jornadas auxiliares

Para cada rota:

- identificar o estado real de carregamento, sucesso, erro e ausência de contexto/token;
- conferir consistência com `PageHeader`, `Panel`, `FormField`, `Input`, `Select`, `Button`, `FeedbackMessage`, `EmptyState` e demais primitives existentes quando aplicáveis;
- revisar foco, teclado, `aria-*`, mensagens anunciáveis e touch targets;
- verificar navegação/retorno/CTA sem expor detalhes técnicos ao usuário;
- manter a semântica atual de sessão, convite, bootstrap e seleção de organização.

Não fazer redesign amplo: corrigir gaps concretos.

## 3. Guardrails da slice

Não alterar por estética:

- schema/migrations;
- RPCs;
- grants/RLS;
- modelo de autorização/perfis;
- contratos de sessão/token;
- Q-022;
- requisitos PENDING;
- regras de estoque, compras, financeiro ou caixa.

Se surgir um bug real de segurança/autorização, documentar a causa e aplicar a menor correção segura, sem expandir escopo silenciosamente.

Não fazer deploy Vercel manual/rotineiro para prova.

## 4. Testes obrigatórios

Adicionar ou atualizar testes que comprovem, quando aplicável:

- feedback de erro/sucesso acessível;
- controles e CTAs reutilizam padrões compartilhados;
- estados sem token/contexto não quebram a navegação;
- links internos apontam para rotas canônicas;
- não há regressão do contrato atual de auth/contexto.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI de banco/RLS normal do repositório.

## 5. Critério de aceite desta slice

A slice termina quando:

- as quatro rotas estiverem inventariadas e reconciliadas com o padrão atual;
- gaps concretos de acessibilidade/feedback/responsividade estiverem corrigidos;
- nenhuma regra de auth/RLS tiver sido reescrita sem necessidade;
- testes relevantes estiverem verdes;
- CI estiver verde;
- documentação/handoff refletirem o estado real.

## 6. Próxima slice após esta

Promover imediatamente:

### **Concluir homologação UX desktop/tablet/mobile**

Usar `docs/qa/fase51-ux-homologation.md` e browser real com sessão/ambiente seguro.

Percorrer:

- Entrada/contexto;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

CI, build, CSS e inspeção estática não substituem evidência real de viewport, drawer, foco, teclado, overflow, touch e fluxos interativos.

## 7. Ordem completa depois desta slice

1. ~~runtime legado `/cadastros/*`~~ — PR #170;
2. **telas auxiliares de autenticação/contexto — NEXT_ACTION atual**;
3. **homologação UX desktop/tablet/mobile**;
4. **reconciliação funcional final** usando critério de usabilidade;
5. **resolver/adiar formalmente PENDINGs necessários + Q-022**;
6. **homologar com dados representativos**;
7. **migração/cutover real**;
8. **retomar #75/#121 e fechar production-readiness / `REQ-PLAT-005`**.

## PENDINGs que continuam sem inferência

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta.

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção nesta slice.

O hold termina apenas por decisão explícita ou no production-readiness final.
