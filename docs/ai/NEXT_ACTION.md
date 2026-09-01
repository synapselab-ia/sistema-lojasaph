# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX e o incidente de drift de migrations Production estão tratados. Em 2026-09-01 houve smoke live autenticado no desktop com sessão legítima fornecida pelo operador e, depois, confirmação de abertura/navegação normal também em celular real.

> Regra: consultar GitHub para HEAD/PRs/Issues/branches/CI no início. SHAs abaixo são âncoras de evidência, não HEAD permanente.

Evidência operacional recente:

- PR #175 — drift de migrations Production — integrado em `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI do PR #593 / run `33436348276`: **success**;
- `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- Production alinhado através de `20260828132500`;
- workflow one-shot removido após o uso;
- `/workspace/administracao/acessos` revalidada em browser live autenticado no desktop em 2026-09-01, sem `ADMINISTRATION_QUERY_ERROR`;
- operador confirmou Visão geral, Administração, Produtos/Cadastros, Estoque, Compras, Financeiro e Caixa abrindo normalmente no mesmo smoke live desktop;
- operador confirmou também abertura/navegação normal das superfícies percorridas em celular real no smoke live mobile;
- #75/#121 **TOTALMENTE ON HOLD**.

Runtime de aplicação observado:

- deployment automático `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171).

Nenhum deploy Vercel manual é necessário.

## NEXT_ACTION objetiva

### **Concluir a homologação UX live restante, priorizando tablet e jornadas profundas**

Não repetir os smokes desktop/mobile já comprovados por inércia e não promover para reconciliação funcional final apenas porque as páginas abriram.

## 1. Reconciliar estado real

No início:

1. ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
2. ler roadmap/auditoria de produto e `docs/qa/fase51-ux-homologation.md`;
3. consultar GitHub para `main`, Issue #142, PRs, branches e CI;
4. comparar **read-only** a linhagem `supabase/migrations/*` com o histórico Production;
5. se não houver drift novo, não repetir a reconciliação #175;
6. observar somente deployment automático quando útil;
7. se o runtime de aplicação não mudou, não repetir HTTP/HTML, snapshot estático ou smokes live já registrados por inércia.

## 2. Evidência já válida e que não precisa ser repetida

### Público

HTTP/HTML já cobre:

- `/` sem sessão;
- `/workspace` sem sessão;
- `/recuperar-senha` — UX-51-001/002;
- `/sem-acesso` — UX-51-003;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

Snapshot gráfico estático já cobre Login, Recuperação com erro e Acesso indisponível em `1440x900`, `768x1024` touch e `390x844` touch/mobile.

### Live autenticado desktop

Em 2026-09-01, com sessão legítima:

- `/workspace/administracao/acessos` carregou normalmente após a correção de migrations;
- UX-51-004 está revalidado no nível de smoke live desktop;
- Visão geral, Administração, Produtos/Cadastros, Estoque, Compras, Financeiro e Caixa abriram normalmente.

### Live autenticado mobile

Em 2026-09-01, o operador abriu o sistema em celular real com sessão legítima e confirmou que as superfícies percorridas também estavam abrindo normalmente no mobile.

Limite: esse smoke mobile comprova carregamento/navegação básicos no aparelho real; não certifica isoladamente todos os estados do drawer, todos os touch targets, ausência de overflow em tabelas/formulários densos, mutações, estados pós-ação ou fluxos completos.

## 3. Matriz live ainda necessária

Priorizar **tablet** com sessão legítima e, onde seguro, aprofundar jornadas autenticadas já abertas em desktop/mobile.

Validar:

- navegação/hierarquia;
- drawer/menu mobile em estados representativos;
- touch targets;
- overflow;
- foco visível e ordem por teclado;
- tabelas/formulários densos;
- loading/empty/error/success;
- feedback pós-ação;
- linguagem operacional;
- `lista → detalhe → ação → retorno` quando aplicável.

## 4. Jornadas mínimas restantes

**Entrada/contexto:** logout real; seleção/troca de organização quando aplicável; convite/recuperação/nova senha somente com token legítimo; sessão expirada/acesso negado.

**Visão geral:** filtros, cards/alertas, links e estados.

**Administração:** validar tablet e profundidade; `/workspace/administracao/acessos` não precisa ser repetida no desktop sem regressão concreta.

**Cadastros:** Produtos; Fornecedores; Funcionários.

**Estoque:** posição/filtros; entradas; retiradas/baixas/perdas; devoluções; transferências; inventários; lotes/validades; estoque mínimo.

**Compras:** lista; novo pedido; detalhe; emissão/cancelamento quando seguro; recebimento parcial/total; histórico.

**Financeiro:** lista; novo documento; detalhe; vencimentos; pagamento; estorno/cancelamento quando seguro; anexos; histórico.

**Caixa:** visão; sessões; abertura; detalhe; movimentos; contagem/fechamento; cancelamento quando seguro; configuração conforme permissão.

## 5. Mutação e segurança

- usar somente sessão/credencial/token legítimos;
- mutar somente em estado seguro e com intenção operacional real;
- não criar usuário, convite, fixture ou dado artificial em Production para fabricar evidência;
- não contornar auth/RLS;
- não anexar screenshot com identificadores pessoais ao GitHub; registrar evidência sanitizada.

## 6. Achados

Para cada problema real:

1. registrar rota, viewport, estado e passos;
2. classificar impacto;
3. aplicar a menor correção consistente;
4. não alterar auth/RLS/regra de negócio por estética;
5. quando o erro for `undefined function/table` em Production, checar paridade de migrations antes de mudar código;
6. adicionar regressão quando útil;
7. manter CI verde;
8. revalidar no mesmo tipo de evidência.

## 7. Aceite

A homologação termina somente quando:

- há evidência live representativa desktop/tablet/mobile;
- jornadas autenticadas necessárias foram percorridas legitimamente, ou limitação externa residual foi explicitamente aceita pelo operador;
- `/workspace/administracao/acessos` permanece revalidada após a correção de drift;
- achados concretos foram tratados/revalidados;
- não existe gap P0/P1 conhecido sem tratamento;
- CI está verde;
- documentação/handoff descreve corretamente runtime, migrations, evidência e bloqueios.

## 8. Depois

Promover **reconciliação funcional final requisito por requisito** usando:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## 9. Guardrails

Não inferir `REQ-ITEM-004`, `REQ-ITEM-005`, `REQ-STK-007`, `REQ-STK-010`, `REQ-EXP-004`, `REQ-FIN-004`, `REQ-CASH-007`, `REQ-CASH-008` ou Q-022.

#75/#121 permanecem **TOTALMENTE ON HOLD**. Não investigar scheduling, Storage/R2/S3, restore drills ou Production fixtures nesta slice.
