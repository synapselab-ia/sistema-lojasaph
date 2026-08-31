# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX e o incidente de drift de migrations Production estão tratados. A próxima slice continua sendo a homologação UX **live** em desktop, tablet e mobile.

> Regra: consultar GitHub para HEAD/PRs/Issues/branches/CI no início. SHAs abaixo são âncoras de evidência, não HEAD permanente.

Evidência operacional recente:

- PR #175 — drift de migrations Production — integrado em `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI do PR #593 / run `33436348276`: **success**;
- `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- Production alinhado através de `20260828132500`;
- workflow one-shot removido após o uso;
- #75/#121 **TOTALMENTE ON HOLD**.

Runtime de aplicação observado:

- deployment automático `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171).

Nenhum deploy Vercel manual é necessário para a correção de banco já aplicada.

## NEXT_ACTION objetiva

### **Concluir homologação UX live com browser conectado e sessão legítima**

Não promover para reconciliação funcional final com base apenas em CI, HTML/CSS, snapshot estático ou introspecção de banco.

## 1. Reconciliar estado real

No início:

1. ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
2. ler roadmap/auditoria de produto e `docs/qa/fase51-ux-homologation.md`;
3. consultar GitHub para `main`, Issue #142, PRs, branches e CI;
4. comparar **read-only** a linhagem `supabase/migrations/*` com o histórico Production;
5. se não houver drift novo, não repetir a reconciliação #175;
6. observar somente deployment automático quando útil;
7. se o runtime de aplicação não mudou, não repetir HTTP/HTML nem snapshot público por inércia.

## 2. Gate pendente

A próxima evidência incremental exige:

- browser live capaz de navegar o deployment e executar JavaScript;
- sessão/credencial legítima aprovada;
- token legítimo para convite/recuperação/nova senha quando necessário;
- ambiente/estado seguro para mutações.

Capacidade conhecida, mas insuficiente:

- Chromium + Python Playwright existem localmente;
- o container não possui saída de rede/DNS ao deployment;
- o `agent-browser` não está disponível como browser live operável nesta execução;
- SSR HTML + CSS reais podem ser renderizados localmente, mas isso é snapshot estático.

Se o gate continuar bloqueado:

- não contornar auth;
- não criar usuário, convite, fixture ou dado artificial em Production;
- não promover snapshot/CI/introspecção a prova live;
- não criar novo PR apenas para repetir o mesmo bloqueio sem evidência nova.

## 3. Incidente Administração a revalidar no browser

A telemetria Production revelou `/workspace/administracao/acessos` falhando porque Production estava duas migrations atrás do Git. O PR #175 restaurou as dependencies backend e a história remota agora contém:

- `20260828130500 administration_access_management`;
- `20260828132500 administration_employee_identity`.

Read-only confirmou os RPCs/grants/trigger esperados.

**Ainda falta:** abrir `/workspace/administracao/acessos` com sessão legítima no browser live e confirmar que a tela carrega/funciona sem `ADMINISTRATION_QUERY_ERROR`.

Não alterar novamente schema/RPC para essa rota sem novo erro concreto.

## 4. Evidência pública que não precisa ser refeita no runtime atual

HTTP/HTML já cobre:

- `/` sem sessão;
- `/workspace` sem sessão;
- `/recuperar-senha` — UX-51-001/002;
- `/sem-acesso` — UX-51-003;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

Snapshot gráfico estático já cobre Login, Recuperação com erro e Acesso indisponível em `1440x900`, `768x1024` touch e `390x844` touch/mobile, sem overflow horizontal e sem controles/CTAs abaixo de 44 px nos contextos touch.

## 5. Matriz live a executar

Em desktop/tablet/mobile, por jornada, validar:

- navegação/hierarquia;
- foco visível e ordem por teclado;
- drawer/menu mobile;
- touch targets;
- overflow;
- tabelas/formulários densos;
- loading/empty/error/success;
- feedback pós-ação;
- linguagem operacional;
- `lista → detalhe → ação → retorno` quando aplicável.

## 6. Jornadas mínimas

**Entrada/contexto:** login; recuperação/nova senha com token legítimo; convite; bootstrap quando aplicável; 0/1/múltiplas organizações; troca de contexto; logout; sessão expirada/acesso negado.

**Visão geral:** filtros, cards/alertas, links e estados.

**Administração:** Estrutura; Usuários/Permissões; revalidação obrigatória de `/workspace/administracao/acessos`; Proteção dos dados apenas dentro do estado permitido enquanto #75/#121 estão on hold.

**Cadastros:** Produtos; Fornecedores; Funcionários.

**Estoque:** posição/filtros; entradas; retiradas/baixas/perdas; devoluções; transferências; inventários; lotes/validades; estoque mínimo.

**Compras:** lista; novo pedido; detalhe; emissão/cancelamento quando seguro; recebimento parcial/total; histórico.

**Financeiro:** lista; novo documento; detalhe; vencimentos; pagamento; estorno/cancelamento quando seguro; anexos; histórico.

**Caixa:** visão; sessões; abertura; detalhe; movimentos; contagem/fechamento; cancelamento quando seguro; configuração conforme permissão.

## 7. Achados

Para cada problema real:

1. registrar rota, viewport, estado e passos;
2. classificar impacto;
3. aplicar a menor correção consistente;
4. não alterar auth/RLS/regra de negócio por estética;
5. quando o erro for `undefined function/table` em Production, checar paridade de migrations antes de mudar código;
6. adicionar regressão quando útil;
7. manter CI verde;
8. revalidar no mesmo tipo de evidência.

## 8. Aceite

A homologação termina somente quando:

- há evidência live representativa desktop/tablet/mobile;
- jornadas autenticadas necessárias foram percorridas legitimamente, ou limitação externa foi explicitamente aceita pelo operador;
- `/workspace/administracao/acessos` foi revalidada live após a correção de drift;
- achados concretos foram tratados/revalidados;
- não existe gap P0/P1 conhecido sem tratamento;
- CI está verde;
- documentação/handoff descreve corretamente runtime, migrations, evidência e bloqueios.

## 9. Depois

Promover **reconciliação funcional final requisito por requisito** usando:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## 10. Guardrails

Não inferir `REQ-ITEM-004`, `REQ-ITEM-005`, `REQ-STK-007`, `REQ-STK-010`, `REQ-EXP-004`, `REQ-FIN-004`, `REQ-CASH-007`, `REQ-CASH-008` ou Q-022.

#75/#121 permanecem **TOTALMENTE ON HOLD**. Não investigar scheduling, Storage/R2/S3, restore drills ou Production fixtures nesta slice.
