# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

A primeira slice da Fase 51 foi concluída e integrada.

Estado real confirmado:

- `main=62c2f82546cc93dd2499c3c5f5a156be702879b3`;
- PR #145 `feat: remove technical entry from root`: merged;
- CI do PR #509 / run `33183155459`: success;
- Business Transactions Integration #226 / run `33183155489`: success;
- CI pós-merge #510 / run `33183295797`: success;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD** em `REQ-PLAT-005`;
- nenhum deploy Vercel manual/rotineiro foi realizado;
- nenhuma migration/RLS/regra de negócio/Supabase data foi alterada nesta slice.

Não refazer #138/#139, não refazer a auditoria, não refazer a remoção da landing e não reabrir a ordem aprovada sem nova evidência ou prioridade explícita.

## O que já foi concluído na Fase 51

### Entrada normal do produto

`/` não renderiza mais a landing técnica. O novo contrato é server-side:

- backend operacional indisponível/bloqueado → `/login`;
- não autenticado → `/login`;
- autenticado → `/workspace`.

O `/workspace` continua sendo a autoridade para membership, `sem-acesso`, seleção de organização e operação. A raiz apenas entrega o usuário ao fluxo existente; não existe segundo roteador de contexto.

O fluxo de bootstrap/invite existente não foi reescrito.

### Demonstração

`Abrir demonstração` saiu do `RuntimeShell`. `/cadastros` e demais rotas demo permanecem no código para uso interno de engenharia/testes, mas não são promovidos na navegação normal.

### Validação

Foram adicionados testes do contrato de entrada e os gates de aplicação/banco passaram no PR e novamente na `main` pós-merge.

## Diagnóstico que não deve ser perdido

O documento de autoridade da frente é:

- `docs/product/product-completion-ux-roadmap.md`.

A aplicação possui núcleo técnico forte, mas a experiência cresceu página por página e ainda precisa de consolidação de arquitetura da informação, navegação, jornadas, design system e administração.

Uma UI não é considerada pronta apenas porque renderiza e passa build. A tarefa precisa ser executável por uma pessoa autorizada sem conhecimento técnico externo.

## Próxima slice obrigatória

A próxima slice é:

> **Arquitetura da informação + desenho da navegação desktop/mobile.**

Antes de alterar visualmente páginas individuais, o próximo chat deve:

1. confirmar o estado real de `main`, Issue #142, PRs e CI;
2. inventariar as rotas reais em `src/app/workspace` e o modelo atual do `RuntimeShell`;
3. mapear cada rota/destino atual para a hierarquia de produto aprovada, preservando permissões e regras existentes;
4. fechar um modelo explícito de navegação desktop e mobile;
5. só depois implementar a nova estrutura do shell, de forma incremental e testável;
6. manter as URLs existentes quando possível nesta slice; mudança de rota deve ter justificativa e redirects/links consistentes;
7. não usar essa etapa para refatorar as páginas internas dos módulos ainda.

Baseline aprovado para o primeiro nível:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

Estoque deve agrupar posição, entradas, baixas, devoluções, transferências, inventários, lotes/validades e mínimo/alertas em vez de expor operações como módulos equivalentes no primeiro nível.

## Ordem oficial

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
12. limpeza de linguagem técnica;
13. homologação UX real;
14. reconciliação funcional final;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

Não adicionar feature grande aleatória no meio desse programa salvo bug crítico, segurança, urgência operacional ou nova decisão explícita.

## Administração e regras de negócio continuam fora da próxima slice

Lacunas de produto conhecidas que **não** devem ser resolvidas por inferência durante a arquitetura de navegação:

- Estrutura: unidades/setores/locais;
- Usuários/Permissões;
- exposição de UUID técnico em Funcionários;
- regras PENDING de itens, estoque, financeiro e caixa.

Q-022 continua autoridade para pessoas/perfis reais; não inventar política de acesso.

## PENDING continua PENDING

Não promover por conveniência de UI:

- `REQ-ITEM-004` / produto de venda;
- `REQ-ITEM-005` / ficha técnica;
- `REQ-STK-007` / empréstimo;
- `REQ-STK-010` / custeio;
- `REQ-EXP-004` / FEFO;
- `REQ-FIN-004` / pagamento parcial/múltiplo final;
- `REQ-CASH-007` / consumo de funcionários;
- `REQ-CASH-008` / integração com vendas.

## #75/#121 permanecem ON HOLD

Não retomar scheduling, Storage, R2/S3, restore drills ou evidência automática de proteção durante a Fase 51. O hold só termina no fechamento funcional/homologação ou por nova instrução explícita do operador.

## Próximo chat

Consultar GitHub real e `NEXT_ACTION.md`, criar branch a partir da `main` vigente e executar a slice de **arquitetura da informação + navegação desktop/mobile**. Não refazer a entrada e não saltar diretamente para redesign de Estoque/Compras/Financeiro/Caixa antes de fechar o mapa de navegação.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
