# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

A prioridade foi definida explicitamente pelo operador em 2026-08-28 após auditoria de fechamento do produto.

Baseline antes da frente:

- `main=37124e86e28f3e07cee0b49afecc8cad29689c78`;
- Fase 50 concluída e integrada;
- Issue #142 aberta;
- #75 e #121 continuam TOTALMENTE ON HOLD em `REQ-PLAT-005`;
- documento de autoridade: `docs/product/product-completion-ux-roadmap.md`.

Não refazer a auditoria e não voltar ao estado "não existe frente funcional" enquanto #142 estiver ativa.

## NEXT_ACTION objetiva

### Executar a primeira slice da Issue #142: remover a entrada técnica do sistema

A landing atual de `/` não deve ser redesenhada. Deve deixar de fazer parte da experiência normal.

### 1. Reconciliar antes de editar

No início da implementação:

1. confirmar `main`, Issue #142, PRs e branch ativa;
2. ler o roadmap de consolidação;
3. inspecionar antes de alterar:
   - `src/app/page.tsx`;
   - `src/app/login/page.tsx`;
   - `src/app/bootstrap/page.tsx`;
   - `src/app/workspace/(operacao)/layout.tsx`;
   - `src/app/workspace/selecionar-organizacao/page.tsx`;
   - `src/lib/auth/redirect.ts` e testes;
   - helpers/runtime de autenticação que já decidem bootstrap/membership/organização;
   - `src/components/runtime-shell.tsx`.

Objetivo da inspeção: **reutilizar a lógica existente**, não criar um segundo roteador de sessão/contexto.

### 2. Alterar o contrato da raiz `/`

Resultado esperado:

- `/` não renderiza apresentação técnica;
- não autenticado chega ao Login;
- autenticado segue para o fluxo operacional correto conforme contexto já suportado;
- se o runtime existente exigir seleção de organização ou bootstrap, preservar esse comportamento;
- não introduzir nova regra de negócio ou autorização.

A implementação concreta pode usar redirect server-side ou o mecanismo mais natural ao código atual, desde que não crie flash/landing intermediária desnecessária e preserve os guardrails existentes.

### 3. Remover demonstração da experiência normal

No `RuntimeShell` e outros pontos normais de entrada:

- remover `Abrir demonstração`;
- não promover `/cadastros` ao usuário operacional;
- **não apagar nesta slice** as rotas/código demo se ainda forem úteis para engenharia/testes, salvo se a remoção for comprovadamente trivial e sem efeito colateral — a prioridade é desacoplar a experiência normal.

### 4. Não extrapolar a slice

Nesta primeira execução **não**:

- redesenhar a sidebar inteira;
- criar a arquitetura de informação completa;
- criar design system completo;
- refatorar Estoque/Compras/Financeiro/Caixa;
- criar Estrutura/Usuários e Permissões ainda;
- tocar em migrations/RLS/Supabase sem prova concreta de necessidade;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

Esses itens pertencem às próximas etapas documentadas.

## Critérios de aceite

A slice só pode ser encerrada quando:

- visitar `/` não exibe a landing técnica antiga;
- não existe CTA normal para escolher "workspace persistente";
- não existe CTA normal `Abrir demonstração`;
- usuário não autenticado é encaminhado ao login;
- usuário autenticado mantém o comportamento correto de bootstrap/seleção/workspace;
- comportamento não depende de client-side workaround desnecessário se o fluxo puder ser resolvido no servidor;
- nenhuma regra de permissão é enfraquecida;
- testes do contrato de redirect/entrada são criados ou atualizados conforme o desenho adotado;
- `npm run lint` passa;
- `npm run typecheck` passa;
- `npm run test` passa;
- `npm run build` passa;
- documentação/handoff são atualizados;
- PR explica claramente por que a landing foi removida e qual é o novo contrato.

## Depois desta slice

Somente depois do merge/validação da entrada, promover a próxima slice da Fase 51:

> **Arquitetura da informação + desenho da navegação desktop/mobile.**

Não saltar diretamente para redesign de páginas individuais antes desse mapa estar fechado.

## Ordem macro que não deve ser perdida

1. entrada técnica;
2. arquitetura da informação;
3. navegação;
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
