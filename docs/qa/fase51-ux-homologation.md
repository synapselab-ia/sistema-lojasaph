# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — superfícies públicas possuem evidência HTTP/HTML e snapshot gráfico estático; jornadas live autenticadas ainda bloqueadas**  
Data: **2026-08-31**  
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

Capacidade local:

- Chromium `144.0.7559.96`;
- Python Playwright `1.57.0`;
- Chromium headless funcional;
- container sem saída de rede/DNS para GitHub/Vercel;
- nenhum browser live conectado disponível.

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
- history remoto agora termina em `20260828132500`;
- quatro RPCs administrativos, trigger e grants esperados confirmados read-only;
- INSERT/UPDATE direto de `organization_memberships` continua negado a `authenticated`;
- reconciliador one-shot removido após o uso.

#### Estado de homologação

**Backend corrigido; UI live pendente.**

Não existe browser live + sessão legítima nesta execução, portanto não afirmar que `/workspace/administracao/acessos` foi visual/interativamente revalidada. Ela é item obrigatório na próxima rodada live.

## Matriz da Fase 51

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada pública: Login/Recuperação/Acesso indisponível | snapshot estático | snapshot estático | snapshot estático | geometria/overflow/touch cobertos; live JS/foco pendentes |
| Convite/Nova senha/Bootstrap/Seleção de organização | parcial HTTP/HTML | parcial HTTP/HTML | parcial HTTP/HTML | exige browser live + estado/token/sessão legítimos |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Administração | bloqueado | bloqueado | bloqueado | backend de `/administracao/acessos` restaurado; requer sessão legítima + browser live |
| Cadastros | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Estoque | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Compras | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Financeiro | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Caixa | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |

**A Fase 51 não está homologada.** CI, introspecção de banco e snapshot estático não substituem jornadas live.

## Jornadas live ainda bloqueadas

- login/logout;
- seleção/troca de organização;
- convite válido e nova senha;
- estados adicionais legítimos de bootstrap;
- sidebar/drawer;
- Visão geral;
- Administração, com prioridade para `/workspace/administracao/acessos` após UX-51-004;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- mutações e feedback pós-ação;
- foco/teclado no runtime hidratado.

Motivo: ausência de browser live conectado + sessão/credencial/token legítimos aprovados. Não alterar Production para fabricar prova.

## Próxima evidência incremental

1. consultar GitHub para estado real;
2. conferir read-only a paridade de migrations Production ↔ Git; não repetir #175 sem drift novo;
3. observar somente deployment automático;
4. não repetir evidência pública se o runtime não mudou;
5. obter browser live conectado;
6. usar sessão/credencial/token legítimos;
7. percorrer todas as áreas críticas em desktop/tablet/mobile;
8. revalidar prioritariamente `/workspace/administracao/acessos`;
9. validar foco/teclado, drawer, touch, overflow, tabelas/formulários, loading/empty/error/success e `lista → detalhe → ação → retorno`;
10. mutar somente em estado seguro;
11. corrigir/revalidar achados concretos;
12. promover reconciliação funcional apenas após evidência live suficiente ou aceitação explícita de bloqueio externo.
