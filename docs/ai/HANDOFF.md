# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

O sistema possui núcleo operacional consolidado, mas a auditoria final de produto mostrou que ainda existem gaps obrigatórios antes de chamá-lo de `100%`.

Fonte de verdade nova:

- `docs/product/final-product-gap-audit.md`.

Baseline real antes deste PR documental:

- `main=75b36db62895bfdb67923afb348c45084e537365` — merge do PR #168;
- CI #578 / run `33403368142`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Não refazer

Já integrados:

- #145 entrada técnica;
- #147 arquitetura da informação/navegação;
- #149 design system mínimo;
- #151 Administração;
- #153 Cadastros oficiais;
- #155 Estoque;
- #157 Compras;
- #159 Financeiro;
- #161 Caixa;
- #163 Dashboard;
- #165 limpeza de linguagem;
- #167 primeiros gaps públicos de UX;
- #168 reconciliação documental.

Não reabrir por preferência estética. Corrigir somente gaps comprovados.

## Descoberta nova que muda a próxima ação

Existe uma árvore antiga de demonstração ainda navegável sob `src/app/cadastros`.

Comprovado:

- `src/app/cadastros/layout.tsx` usa `DemoWorkspaceProvider`;
- `/cadastros` ainda fala em `Fase 4`, `fixtures` e alterações só durante a sessão;
- há subrotas legadas de estrutura, produtos, fornecedores, estoque, inventários e validades;
- essas rotas são paralelas às rotas oficiais de `/workspace` e não pertencem à IA aprovada.

Esse é um **gap P0 de produto** e deve ser removido antes de prosseguir com a homologação ampla.

## NEXT_ACTION imediata

### Remover/neutralizar o runtime legado `/cadastros/*`

No próximo chat:

1. ler `AGENTS.md`, `00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md` e `docs/product/final-product-gap-audit.md`;
2. confirmar `main`, Issue #142, PRs/branches/CI reais;
3. inventariar toda a árvore `src/app/cadastros`;
4. mapear cada rota para o equivalente oficial em `/workspace`;
5. decidir por rota entre remoção ou redirect seguro;
6. preservar fixture/demo somente se ainda necessária para testes/engenharia e fora da experiência normal;
7. garantir que usuário final não veja `Fase`, `fixtures`, `demonstração` ou páginas concorrentes;
8. adicionar/ajustar testes de contrato de entrada/rotas;
9. não alterar schema, migration, RPC, grant, RLS, autorização ou regra de negócio;
10. manter CI verde;
11. reconciliar documentação e promover a próxima slice.

Não fazer deploy Vercel manual para provar essa limpeza.

## Slice seguinte — telas auxiliares

Depois do runtime legado:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

Objetivo:

- primitives compartilhados quando aplicáveis;
- feedback acessível e consistente;
- foco/teclado/touch targets;
- loading/error/success claros;
- homologação dos fluxos reais quando houver token/sessão legítimos.

Não reimplementar auth/RLS por estética.

## Depois — homologação UX completa

Só então continuar a matriz de `docs/qa/fase51-ux-homologation.md` em desktop/tablet/mobile.

Jornadas mínimas:

- Entrada/contexto;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Exigir browser real para certificar viewport, drawer, foco, teclado, overflow, touch e fluxos interativos. CI/CSS/HTML estático não substituem essa evidência.

Production não deve receber fixtures, usuários artificiais ou ações destrutivas para prova.

## Depois da homologação UX

Executar reconciliação funcional final com o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar MUST e SHOULD aplicáveis, não apenas existência de backend/telas.

## PENDINGs que continuam sem decisão por inferência

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta: mapear perfis reais antes do go-live, sem equiparar automaticamente papéis técnicos a cargos.

Durante a reconciliação final, revisar `open-questions.md` e migrar/arquivar perguntas já resolvidas por decisões posteriores.

## Fechamento operacional depois dos PENDINGs

1. ambiente seguro com dados representativos;
2. homologação com operação real;
3. preparação de estrutura/usuários/perfis/configurações;
4. congelamento das fontes;
5. dry-run/importação rastreável;
6. tratamento de inconsistências;
7. importação final;
8. reconciliação de saldos/totais/amostras;
9. cutover;
10. encerramento/transição das planilhas.

## Production-readiness final

Somente depois:

- retomar #75/#121;
- backup PostgreSQL automático real;
- cobertura de Storage/binários;
- destino off-site, integridade e retenção;
- restore/drill isolado;
- observabilidade/gates finais;
- fechamento de `REQ-PLAT-005`.

#75/#121 permanecem **TOTALMENTE ON HOLD** até essa etapa ou decisão explícita.

## Ordem final oficial

1. **runtime legado `/cadastros/*`**;
2. **telas auxiliares de autenticação/contexto**;
3. **homologação UX desktop/tablet/mobile**;
4. **reconciliação funcional final**;
5. **PENDINGs necessários + Q-022**;
6. **dados representativos/homologação operacional**;
7. **migração/cutover**;
8. **#75/#121 / production-readiness**.

## Guardrails permanentes

GitHub é fonte de verdade; RLS/backend são boundaries; nenhum secret no Git/docs/browser; Production não recebe fixture para prova; nenhum deploy Vercel manual/rotineiro; PENDINGs não são resolvidos por inferência; #75/#121 continuam on hold até o final.
