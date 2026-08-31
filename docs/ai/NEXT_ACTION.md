# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

A auditoria final de produto mostrou que, antes de ampliar a homologação UX, existe um gap P0 concreto no runtime: a árvore antiga `/cadastros/*` permanece navegável e usa infraestrutura/demo antiga paralela ao workspace oficial.

Fonte de verdade da fila final:

- `docs/product/final-product-gap-audit.md`.

Baseline real antes deste PR documental:

- `main=75b36db62895bfdb67923afb348c45084e537365`;
- CI #578 / run `33403368142`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**.

## NEXT_ACTION objetiva

### **Remover/redirectar o runtime legado `/cadastros/*` sem alterar domínio ou regras de negócio**

Esta é a próxima slice executável.

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

## 2. Inventariar o runtime legado

Inspecionar toda a árvore:

- `src/app/cadastros`.

Já foi comprovado que:

- `src/app/cadastros/layout.tsx` usa `DemoWorkspaceProvider`;
- `/cadastros` exibe `Fase 4`, `fixtures` e alterações apenas durante a sessão;
- existem subrotas legadas de estrutura, produtos, fornecedores, estoque, inventários e validades.

Não assumir que a lista acima é exaustiva: inventariar a árvore real antes de remover.

## 3. Mapear para as rotas oficiais

Usar `docs/product/workspace-information-architecture.md` como autoridade.

Mapear cada rota antiga para a rota oficial correspondente em `/workspace` quando existir.

Exemplos conceituais:

- estrutura → Administração/Estrutura;
- produtos → Cadastros/Produtos;
- fornecedores → Cadastros/Fornecedores;
- estoque/validades/inventários → jornadas oficiais de Estoque.

Não criar uma segunda arquitetura paralela.

## 4. Neutralizar as rotas antigas

Para cada rota antiga, escolher a menor solução correta:

- remover a página/árvore quando não houver dependência legítima;
- ou transformar em redirect seguro para a rota oficial equivalente quando compatibilidade de URL for útil.

Critérios:

- usuário final não deve acessar experiência baseada em `DemoWorkspaceProvider`;
- não deve aparecer `Fase`, `fixtures`, `demonstração` ou linguagem de desenvolvimento;
- não deve haver duas telas concorrentes para a mesma tarefa;
- fixtures podem permanecer apenas se ainda tiverem uso legítimo em testes/engenharia e não forem expostas como produto.

## 5. Guardrails da slice

Não alterar nessa limpeza:

- schema/migrations;
- RPCs;
- grants/RLS;
- autorização/perfis;
- ledger/estoque;
- regras financeiras;
- regras de Caixa;
- semântica de Compras;
- Q-022;
- requisitos PENDING.

Não fazer redesign das áreas oficiais já consolidadas.

Não fazer deploy Vercel manual/rotineiro para prova.

## 6. Testes obrigatórios

Adicionar ou atualizar testes que comprovem, quando aplicável:

- rotas antigas não renderizam mais a UI demo;
- redirects apontam para rotas internas oficiais e estáveis;
- navegação normal não referencia `/cadastros/*` legado;
- strings de produto indevidas como `Fase 4`, `fixtures` e CTA de demonstração não reaparecem na experiência normal.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI de banco/RLS normal do repositório.

## 7. Critério de aceite desta slice

A slice termina quando:

- toda a árvore `/cadastros/*` estiver inventariada;
- nenhuma página demo antiga permanecer como superfície concorrente do produto;
- redirects/removals estiverem documentados e testados;
- nenhum boundary de negócio ou segurança tiver sido alterado sem necessidade;
- CI estiver verde;
- documentação/handoff refletirem o estado real.

## 8. Próxima slice após esta

Promover imediatamente:

### **Fechar telas auxiliares de autenticação/contexto**

Rotas prioritárias:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

Objetivo:

- reutilizar primitives compartilhados quando aplicável;
- feedback acessível;
- foco/teclado;
- touch targets;
- loading/error/success coerentes;
- homologar fluxo real quando houver token/sessão legítimos.

Não reimplementar auth/RLS por estética.

## 9. Ordem completa depois da próxima slice

1. **runtime legado `/cadastros/*` — NEXT_ACTION atual**;
2. **telas auxiliares de autenticação/contexto**;
3. **homologação UX desktop/tablet/mobile** usando `docs/qa/fase51-ux-homologation.md`;
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
