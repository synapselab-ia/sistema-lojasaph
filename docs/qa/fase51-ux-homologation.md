# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — superfícies públicas cobertas; smoke live autenticado desktop e mobile concluídos; tablet deferido por decisão explícita do operador; jornadas profundas ainda pendentes**  
Data: **2026-09-01**  
Issue: **#142**

## Regra de baseline

O HEAD corrente de `main` deve ser consultado no GitHub a cada execução. Este documento não fixa HEAD documental como baseline permanente. SHAs/runs abaixo são âncoras de evidência.

## Runtime hospedado observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

Nenhum deploy Vercel manual foi solicitado ou disparado.

## Evidência HTTP/HTML concluída

| Jornada/rota | Evidência | Estado |
| --- | --- | --- |
| `/` sem sessão | resolve para Login; sem landing técnica | revalidado |
| `/workspace` sem sessão | Login com `next=/workspace` e alerta de sessão expirada | revalidado |
| `/recuperar-senha?error=Teste` | `role="alert"`; retorno com `min-h-11` | UX-51-001/002 tratados |
| `/sem-acesso?error=Teste` | `role="alert"`; ações com `min-h-11` | UX-51-003 tratado |
| `/auth/atualizar-senha` sem sessão válida | Login com alerta de link expirado | revalidado |
| `/auth/invite` sem fragmento | `aria-busy`, `role="status"`, `aria-live` | estado inicial revalidado |
| `/bootstrap` | configuração inicial desabilitada no estado real | revalidado |
| `/workspace/selecionar-organizacao` sem sessão | Login preservando `next` | revalidado |

Não repetir enquanto o runtime de aplicação não mudar.

## Snapshot gráfico público já executado

Capacidade local registrada:

- Chromium `144.0.7559.96`;
- Python Playwright `1.57.0`;
- Chromium headless funcional;
- container sem saída de rede/DNS para GitHub/Vercel;
- nenhum browser live conectado disponível ao agente.

Método: SSR HTML + CSS reais obtidos pela integração Vercel foram renderizados localmente em Chromium/Playwright. Isso é **snapshot gráfico estático**, não navegação live do Next.js.

Viewports:

- desktop `1440x900` sem touch;
- tablet `768x1024` touch;
- mobile `390x844` touch/mobile.

Superfícies:

- Login;
- Recuperação com erro;
- Acesso indisponível com erro.

| Superfície | Viewport | Overflow horizontal | Target touch/CTA < 44 px | Resultado visual |
| --- | --- | --- | --- | --- |
| Login | 1440x900 | não | nenhum CTA | contido |
| Login | 768x1024 | não | nenhum | contido |
| Login | 390x844 | não | nenhum | coluna contida |
| Recuperação | 1440x900 | não | nenhum CTA | contido |
| Recuperação | 768x1024 | não | nenhum | contido |
| Recuperação | 390x844 | não | nenhum | contido |
| Acesso indisponível | 1440x900 | não | nenhum | contido |
| Acesso indisponível | 768x1024 | não | nenhum | contido |
| Acesso indisponível | 390x844 | não | nenhum | ações sem overflow |

Em tablet/mobile, inputs/buttons/links de ação medidos ficaram em **44 px ou mais**. Em desktop, inputs ficaram em ~42 px sem `pointer: coarse`, enquanto buttons/links de ação permaneceram em 44 px, coerente com o design system.

Limite: o snapshot não certifica hidratação/JS, Next navigation, server actions, sessão/auth, mutações, redirects client-side, drawer autenticado, estados pós-ação ou foco completo live.

## Smoke live autenticado desktop — 2026-09-01

O operador abriu o deployment real em um browser com sessão legítima e forneceu evidência direta da tela `/workspace/administracao/acessos` carregada após a correção de migrations.

Na captura recebida foi possível observar:

- título **Usuários e permissões**;
- formulário **Convidar ou adicionar acesso**;
- seletores de perfil e área de atuação;
- seção **Acessos cadastrados** com um acesso real carregado;
- ausência de mensagem de erro ou fallback referente a `ADMINISTRATION_QUERY_ERROR`;
- foco visual aparente em um controle do formulário.

O screenshot não foi anexado ao GitHub porque contém identificador pessoal de conta. A documentação registra somente a evidência sanitizada necessária.

Na mesma rodada, o operador confirmou que abriram normalmente em navegação live autenticada no desktop:

- Visão geral;
- Administração;
- Produtos/Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Classificação: **smoke live autenticado desktop**. Isso comprova carregamento e navegação básicos no runtime hidratado, mas não substitui homologação de ações de negócio, teclado completo ou estados pós-ação.

## Smoke live autenticado mobile — 2026-09-01

Depois do smoke desktop, o operador abriu o sistema em celular real com sessão legítima e confirmou que, até o ponto percorrido, as superfícies testadas estavam abrindo normalmente também no mobile.

Classificação: **smoke live autenticado mobile de carregamento/navegação**.

O qualificativo “por enquanto” é preservado semanticamente: a evidência cobre o que foi percorrido naquele momento e não autoriza afirmar que todos os fluxos, componentes ou estados mobile foram testados.

Esse smoke comprova:

- deployment real acessível no aparelho;
- sessão legítima operando em contexto mobile;
- abertura/navegação básica das superfícies percorridas sem regressão reportada.

Não comprova isoladamente:

- drawer/menu em todos os estados;
- dimensões de todos os touch targets autenticados;
- ausência de overflow em todas as tabelas/formulários densos;
- foco/ordem de teclado;
- mutações e feedback pós-ação;
- todos os estados loading/empty/error/success;
- jornadas completas `lista → detalhe → ação → retorno`.

## Decisão operacional sobre tablet — 2026-09-01

O operador informou explicitamente que **nem ele nem Asaph possuem tablet e que não é necessário testar tablet por enquanto**.

Classificação: **limitação externa residual aceita pelo operador**.

Consequências:

- tablet **não é considerado homologado live**;
- tablet deixa de bloquear o encerramento desta etapa da Fase 51 enquanto a decisão permanecer válida;
- não solicitar novamente prova tablet por inércia;
- reabrir essa matriz antes de go-live/production-readiness somente se surgir necessidade operacional real de uso em tablet ou nova decisão explícita do operador.

Essa aceitação vale somente para tablet. Ela não transforma gaps residuais de profundidade desktop/mobile em evidência positiva.

## Achados anteriores

- **UX-51-001:** retorno da recuperação com target mínimo — corrigido no #167; HTTP/HTML + snapshot touch confirmam tratamento.
- **UX-51-002:** erro de recuperação com feedback acessível — corrigido no #167; HTML + snapshot de erro confirmam tratamento.
- **UX-51-003:** ações pequenas em acesso indisponível — corrigido no #167; HTML + snapshot touch confirmam tratamento.

## Achado funcional descoberto por telemetria Production

### UX-51-004 — Administração indisponível por drift de migrations

- rota observada: `/workspace/administracao/acessos`;
- fonte de evidência: telemetria/runtime errors do deployment Production;
- sintoma: `ADMINISTRATION_QUERY_ERROR` repetido;
- erro backend: PostgREST não encontrava `public.admin_list_organization_access(...)`;
- impacto: a tela autenticada de Usuários/Permissões não conseguia carregar os acessos da Organization;
- classificação: **funcional/backend dependency**, não problema visual.

#### Causa

Production estava exatamente duas migrations atrás do Git:

- remoto terminava em `20260827195802`;
- pendentes versionadas:
  - `20260828130500_administration_access_management.sql`;
  - `20260828132500_administration_employee_identity.sql`.

#### Correção

- PR #175 mergeado em `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI PR #593 / run `33436348276`: **success**;
- workflow one-shot `Production Migration Reconcile` #1 / run `33436481787`: **success**;
- CI pós-merge #594 / run `33436481833`: **success**;
- aplicação via `supabase db push` com allowlist exata das duas migrations;
- nenhum seed/reset/repair/DDL ad hoc;
- history remoto termina em `20260828132500`;
- quatro RPCs administrativos, trigger e grants esperados confirmados read-only;
- INSERT/UPDATE direto de `organization_memberships` continua negado a `authenticated`;
- reconciliador one-shot removido após o uso.

#### Estado de homologação

**Backend corrigido e smoke live desktop revalidado.**

Em 2026-09-01 o operador abriu `/workspace/administracao/acessos` com sessão legítima no browser real e a tela carregou normalmente. O erro anterior não reapareceu nessa evidência.

Não alterar novamente schema/RPC dessa rota sem novo erro concreto.

## Paridade de migrations revalidada

Após o PR #178, nova checagem read-only confirmou:

- Git termina em `20260828132500_administration_employee_identity.sql`;
- Production termina em `20260828132500 administration_employee_identity`;
- não existe drift novo.

Não repetir #175 sem nova divergência comprovada.

## Matriz da Fase 51

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada pública: Login/Recuperação/Acesso indisponível | snapshot estático | snapshot estático | snapshot estático | geometria/overflow/touch cobertos; live JS/foco ainda parcial |
| Convite/Nova senha/Bootstrap/Seleção de organização | parcial HTTP/HTML | deferido/sem live | parcial HTTP/HTML | exige estado/token/sessão legítimos para fluxos completos quando necessários |
| Navegação/Visão geral | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal em desktop/mobile; profundidade residual pendente |
| Administração | smoke live autenticado | **deferido pelo operador** | smoke live autenticado geral | `/administracao/acessos` revalidada especificamente no desktop após drift |
| Cadastros | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal confirmada; ações profundas pendentes |
| Estoque | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal confirmada; ações profundas pendentes |
| Compras | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal confirmada; jornada completa pendente |
| Financeiro | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal confirmada; jornada completa pendente |
| Caixa | smoke live autenticado | **deferido pelo operador** | smoke live autenticado | abertura normal confirmada; jornada completa pendente |

**A Fase 51 ainda não deve ser encerrada apenas com os smokes.** O gate de tablet está aceito/deferido; permanece necessária profundidade representativa desktop/mobile ou aceite explícito dos limites residuais correspondentes.

## Jornadas live ainda pendentes

- logout e troca/seleção de organização quando aplicável;
- convite válido e nova senha com token legítimo quando necessários;
- estados adicionais legítimos de bootstrap quando aplicáveis;
- drawer/menu mobile em estados representativos;
- touch/overflow em componentes autenticados densos;
- fluxos `lista → detalhe → ação → retorno` representativos;
- mutações seguras e feedback pós-ação;
- loading/empty/error/success;
- foco/teclado no runtime hidratado;
- tabelas/formulários densos em viewports menores.

Não alterar Production para fabricar prova e não executar mutações só para preencher checklist.

## Próxima evidência incremental

1. consultar GitHub para estado real;
2. conferir read-only a paridade de migrations Production ↔ Git; não repetir #175 sem drift novo;
3. observar somente deployment automático;
4. não repetir evidência pública nem smokes desktop/mobile se o runtime não mudou;
5. não exigir tablet enquanto a decisão operacional permanecer válida;
6. validar profundidade representativa em desktop/mobile: drawer, touch, overflow, foco/teclado e componentes densos;
7. percorrer jornadas `lista → detalhe → ação → retorno` quando seguro;
8. validar loading/empty/error/success e feedback pós-ação;
9. mutar somente em estado seguro e por intenção operacional real;
10. corrigir/revalidar achados concretos;
11. promover reconciliação funcional apenas após evidência live suficiente ou aceite explícito dos limites residuais restantes pelo operador.
