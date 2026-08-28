# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

A primeira slice da fase foi concluída no PR #145.

Baseline integrado confirmado em 2026-08-28:

- `main=62c2f82546cc93dd2499c3c5f5a156be702879b3`;
- PR #145 `feat: remove technical entry from root`: merged;
- CI do PR #509 / run `33183155459`: success;
- Business Transactions Integration #226 / run `33183155489`: success;
- CI pós-merge #510 / run `33183295797`: success;
- Issue #142 aberta e ativa;
- #75 e #121 continuam **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- documento de autoridade: `docs/product/product-completion-ux-roadmap.md`.

Não refazer a landing/entrada técnica já removida.

## NEXT_ACTION objetiva

### Executar a segunda slice da Issue #142: fechar arquitetura da informação e navegação desktop/mobile

A navegação atual é plana e expõe operações internas como destinos equivalentes. A próxima slice deve organizar o produto em áreas compreensíveis **antes** de redesenhar páginas individuais.

Baseline de primeiro nível já aprovado:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

### 1. Reconciliar antes de editar

No início da implementação:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. ler `docs/product/product-completion-ux-roadmap.md`;
3. inventariar as rotas e layouts atuais em `src/app/workspace`;
4. inspecionar `src/components/runtime-shell.tsx` e componentes/helpers de navegação relacionados;
5. identificar condicionais de papel/escopo que possam afetar visibilidade ou acesso, sem alterar a política de autorização.

Não inferir acesso a partir do menu: RLS e guards existentes continuam sendo a boundary autoritativa.

### 2. Produzir um mapa explícito rota → área/subárea

Antes da mudança visual, registrar no PR ou em documentação adequada o mapeamento de destinos atuais para a arquitetura alvo.

Como mínimo:

- `/workspace` → Visão geral;
- produtos, fornecedores e funcionários → Cadastros;
- posição/entradas/baixas/devoluções/transferências/inventários/lotes-validades/mínimo → Estoque;
- compras/pedidos/recebimentos/histórico → Compras;
- contas a pagar/pagamentos/vencimentos/documentos → Financeiro;
- sessões/movimentações/fechamento/histórico → Caixa;
- seleção/estrutura/permissões/proteção/configurações administrativas aplicáveis → Administração, respeitando o que realmente existe hoje.

Não inventar páginas ausentes nesta slice apenas para completar a taxonomia. Lacunas de Administração pertencem à etapa própria posterior.

### 3. Implementar a nova estrutura do shell

Depois do mapa estar coerente:

- substituir a lista plana atual por navegação agrupada segundo as áreas aprovadas;
- garantir estado ativo compreensível para área e subárea;
- desktop deve permitir orientação rápida entre áreas e operações relacionadas;
- mobile deve possuir um padrão de navegação utilizável sem depender de overflow horizontal como solução principal;
- preservar URLs atuais quando possível nesta slice;
- se alguma URL mudar por necessidade comprovada, atualizar links e redirects de forma consistente;
- não alterar regras de negócio, queries ou autorização para acomodar a navegação.

### 4. Testar o contrato de navegação

Adicionar/ajustar testes adequados para garantir, no mínimo:

- áreas e agrupamentos esperados;
- links atuais relevantes continuam alcançáveis;
- estado ativo não quebra em subrotas;
- navegação mobile/desktop não depende de dados de demonstração;
- não existe retorno de `Abrir demonstração` à experiência normal.

Além disso, manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- workflows PostgreSQL/RLS aplicáveis.

### 5. Não extrapolar a slice

Nesta execução **não**:

- criar o design system inteiro;
- refatorar as páginas internas de Estoque/Compras/Financeiro/Caixa;
- criar a administração completa de Estrutura ou Usuários/Permissões;
- resolver UUID técnico de Funcionários ainda, salvo ajuste puramente de navegação sem regra nova;
- resolver requisitos PENDING por conveniência de UI;
- tocar em migrations/RLS/Supabase sem prova concreta de necessidade;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite

A slice só pode ser encerrada quando:

- o primeiro nível da navegação reflete Visão geral, Estoque, Compras, Financeiro, Caixa, Cadastros e Administração de forma coerente com o que existe;
- operações de Estoque não aparecem mais como módulos equivalentes independentes no primeiro nível;
- desktop e mobile possuem desenho de navegação intencional e utilizável;
- rotas existentes continuam acessíveis ou possuem transição explicitamente documentada;
- permissões/guards/RLS não foram enfraquecidos;
- nenhuma feature ausente foi inventada apenas para preencher o menu;
- testes relevantes foram criados/ajustados;
- lint, typecheck, testes, build e CI aplicável estão verdes;
- documentação/handoff são reconciliados;
- PR explica o mapa de arquitetura e as escolhas desktop/mobile.

## Depois desta slice

Somente após a integração da arquitetura/navegação, promover a próxima etapa:

> **Design system mínimo e padrões reutilizáveis de página.**

Não saltar diretamente para refatoração ampla dos módulos antes desse padrão visual/comportamental existir.

## Ordem macro que não deve ser perdida

1. ~~entrada técnica~~ — concluída no PR #145;
2. arquitetura da informação;
3. navegação desktop/mobile;
4. design system mínimo;
5. Administração;
6. Cadastros;
7. Estoque;
8. Compras;
9. Financeiro;
10. Caixa;
11. Dashboard;
12. limpeza de linguagem;
13. homologação UX;
14. reconciliação funcional;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

## PENDING — não promover por conveniência de UI

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

## REQ-PLAT-005 continua ON HOLD

Não investigar cron/scheduling, não disparar workflows para prova, não mexer em Storage/R2/S3/restore/secrets/variables e não fabricar evidência Production enquanto o hold estiver ativo.

A trilha #75/#121 será retomada no fechamento funcional/homologação final, salvo revogação explícita do operador.

## Restrições permanentes

- GitHub é a fonte de continuidade;
- RLS continua boundary de acesso;
- nenhum secret em browser/Git/docs/chat;
- não fabricar evidência Production;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente;
- não misturar redesign visual amplo com mudança silenciosa de regra de negócio.
