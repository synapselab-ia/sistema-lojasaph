# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

As slices até o PR #172 estão integradas. A frente atual continua sendo a homologação UX real em desktop, tablet e mobile.

Baseline real:

- `main=01da4646d8e2ae6c533bc81d66afb2fb9d60ec5c` — merge do PR #172;
- CI pós-merge #588 / run `33427974722`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**.

Runtime hospedado de aplicação:

- deployment automático `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, target `production`, source `git`;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias canônico `sistema-lojasaph.vercel.app`.

O PR #172 foi somente documental, portanto não há novo runtime a homologar. Não disparar deploy manual.

A revalidação HTTP/HTML e o snapshot gráfico estático das superfícies públicas já estão registrados em `docs/qa/fase51-ux-homologation.md` e não devem ser repetidos enquanto o runtime não mudar.

## NEXT_ACTION objetiva

### **Concluir a homologação UX live com browser conectado e sessão legítima**

Essa continua sendo a próxima slice obrigatória. **Não promover para reconciliação funcional final com base apenas em CI, HTML/CSS ou snapshot estático.**

## 1. Reconciliar estado antes de testar

No início:

1. ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
2. ler `docs/product/product-completion-ux-roadmap.md`, `docs/product/final-product-gap-audit.md` e `docs/qa/fase51-ux-homologation.md`;
3. confirmar `main`, Issue #142, PRs, branches e CI reais;
4. observar somente deployment **automático** quando útil;
5. não refazer slices integradas;
6. se runtime/deployment não mudou, não repetir HTTP/HTML nem o snapshot público por inércia.

## 2. Gate de evidência pendente

A próxima evidência incremental exige:

- browser live capaz de navegar o deployment real e executar JavaScript;
- sessão/credencial legítima e aprovada para jornadas autenticadas;
- token legítimo para convite/recuperação/nova senha quando necessário;
- ambiente/estado seguro para operações mutáveis.

Capacidade já conhecida e **insuficiente para fechar o gate**:

- Chromium + Python Playwright existem localmente e lançam corretamente;
- o runtime local não possui saída de rede/DNS para o deployment;
- SSR HTML + CSS reais podem ser renderizados localmente, mas isso é snapshot estático, não jornada live.

Se as pré-condições live continuarem indisponíveis:

- não contornar auth;
- não criar usuário, convite, fixture ou dado artificial em Production;
- não promover snapshot/CI a prova live;
- não criar novo PR apenas para repetir o mesmo bloqueio sem evidência nova.

## 3. Evidência pública já concluída

No runtime atual já foram cobertos em HTTP/HTML:

- `/` sem sessão → Login;
- `/workspace` sem sessão → Login com `next=/workspace` e alerta de sessão expirada;
- `/recuperar-senha` → UX-51-001/002 revalidados;
- `/sem-acesso` → UX-51-003 revalidado;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real atual de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

Também já existe snapshot gráfico estático de Login, Recuperação com erro e Acesso indisponível em:

- desktop `1440x900`;
- tablet/touch `768x1024`;
- mobile/touch `390x844`.

Esse snapshot confirmou ausência de overflow horizontal e controles/CTAs com pelo menos 44 px em contextos touch. Não repetir sem mudança de runtime ou novo achado.

## 4. Matriz live a executar

Com browser conectado, registrar dimensões representativas de desktop/tablet/mobile e, por jornada, verificar:

- navegação e hierarquia;
- foco visível e ordem por teclado;
- drawer/menu mobile;
- touch targets;
- overflow horizontal/vertical;
- legibilidade de tabelas e formulários densos;
- loading, empty, error e success;
- feedback após ações;
- linguagem de negócio;
- `lista → detalhe → ação → retorno` quando aplicável.

## 5. Jornadas mínimas autenticadas

### Entrada/contexto

- login;
- recuperação e definição de nova senha com token legítimo;
- convite;
- bootstrap quando naturalmente aplicável;
- 0/1/múltiplas organizações e troca de contexto;
- logout;
- sessão expirada/acesso negado.

### Visão geral

- filtros;
- cards/alertas;
- links;
- estados vazios/erro/loading.

### Administração

- Estrutura;
- Usuários/Permissões;
- Proteção dos dados apenas dentro do estado real permitido enquanto #75/#121 estão on hold.

### Cadastros

- Produtos;
- Fornecedores;
- Funcionários.

### Estoque

- posição/filtros;
- entradas;
- retiradas/baixas/perdas;
- devoluções;
- transferências;
- inventários;
- lotes/validades;
- estoque mínimo.

### Compras

- lista;
- novo pedido;
- detalhe;
- emissão/cancelamento quando seguro;
- recebimento parcial/total;
- histórico.

### Financeiro

- lista;
- novo documento;
- detalhe;
- vencimentos;
- pagamento;
- estorno/cancelamento quando seguro;
- anexos;
- histórico.

### Caixa

- visão;
- lista de sessões;
- abertura;
- detalhe;
- movimentos;
- contagem/fechamento;
- cancelamento quando seguro;
- configuração conforme permissão.

## 6. Regra para achados

Para cada problema real:

1. registrar rota, viewport, estado e passos;
2. classificar impacto;
3. aplicar a menor correção consistente com padrões existentes;
4. não alterar auth/RLS/regra de negócio por estética;
5. adicionar teste de regressão quando útil;
6. manter CI verde;
7. revalidar no mesmo tipo de evidência que revelou o problema.

## 7. Critério de aceite

A homologação termina somente quando:

- a matriz contém evidência live representativa de desktop/tablet/mobile para as áreas críticas;
- jornadas autenticadas necessárias foram percorridas com sessão legítima, ou limitação externa restante foi explicitamente aceita pelo operador como adiada;
- achados concretos foram tratados e revalidados;
- não existe gap P0/P1 de UX conhecido sem tratamento;
- CI está verde;
- documentação/handoff reflete o estado real.

## 8. Próxima slice após homologação

Promover imediatamente:

### **Reconciliação funcional final requisito por requisito**

Gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## 9. Guardrails permanentes

Não resolver por inferência: `REQ-ITEM-004`, `REQ-ITEM-005`, `REQ-STK-007`, `REQ-STK-010`, `REQ-EXP-004`, `REQ-FIN-004`, `REQ-CASH-007`, `REQ-CASH-008` e Q-022.

#75/#121 permanecem **TOTALMENTE ON HOLD**. Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables ou Production fixtures nesta slice.
