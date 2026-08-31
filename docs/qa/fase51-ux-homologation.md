# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — superfícies públicas possuem evidência HTTP/HTML e snapshot gráfico estático; jornadas live autenticadas ainda bloqueadas**  
Data: **2026-08-31**  
Issue: **#142**

## Regra de baseline

O HEAD corrente de `main` deve ser consultado no GitHub a cada execução. Este documento **não fixa o HEAD documental como baseline permanente**.

Âncoras desta evidência:

- PR #173 — reconciliação da evidência gráfica pública — merged em `a3ae77a4e43da8e5c13ede27b65a4bc3653f383c`;
- CI PR #589 / run `33430536367`: **success**;
- CI pós-merge #590 / run `33430695863`: **success**;
- nenhum código, schema, migration, RPC, grant, RLS, auth ou regra de negócio foi alterado nessa slice.

## Runtime hospedado observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

PRs #172/#173 foram documentais e não alteraram o runtime. Nenhum deploy manual foi solicitado ou disparado.

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

## Capacidade gráfica e método

Disponível localmente:

- Chromium `144.0.7559.96`;
- Python Playwright `1.57.0`;
- Chromium headless funcional.

Bloqueio: container sem saída de rede/DNS para GitHub/Vercel e sem browser live conectado.

Evidência incremental executada:

1. SSR HTML realmente servido obtido pela integração Vercel;
2. CSS realmente servido pelo mesmo runtime obtido pela integração Vercel;
3. superfícies públicas reconstruídas localmente com esse markup/estilos;
4. renderização/medição em Chromium/Playwright.

**Classificação:** snapshot gráfico estático de HTML/CSS hospedados, não navegação live do Next.js.

Não certifica hidratação/JS, Next navigation, server actions, sessão/auth, mutações, redirects client-side, drawer autenticado, estados pós-ação ou foco completo live.

A ordem de Tab foi exercitada no harness, mas foco visual permanece gate live.

## Viewports e resultados públicos

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

Em tablet/mobile, inputs/buttons/links de ação medidos ficaram em **44 px ou mais**. Em desktop, inputs ficaram em ~42 px sem `pointer: coarse`, enquanto buttons/links de ação permaneceram em 44 px — coerente com o design system.

Nenhum novo gap visual concreto foi encontrado nessas superfícies estáticas.

## Achados anteriores

- **UX-51-001:** retorno da recuperação com target mínimo — corrigido no #167; HTTP/HTML + snapshot touch confirmam tratamento.
- **UX-51-002:** erro de recuperação com feedback acessível — corrigido no #167; HTML + snapshot de erro confirmam tratamento.
- **UX-51-003:** ações pequenas em acesso indisponível — corrigido no #167; HTML + snapshot touch confirmam tratamento.

## Matriz da Fase 51

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada pública: Login/Recuperação/Acesso indisponível | snapshot estático | snapshot estático | snapshot estático | geometria/overflow/touch cobertos; live JS/foco pendentes |
| Convite/Nova senha/Bootstrap/Seleção de organização | parcial HTTP/HTML | parcial HTTP/HTML | parcial HTTP/HTML | exige browser live + estado/token/sessão legítimos |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Administração | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Cadastros | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Estoque | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Compras | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Financeiro | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |
| Caixa | bloqueado | bloqueado | bloqueado | sessão legítima + browser live |

**A Fase 51 não está homologada.** Snapshot estático não substitui jornadas live.

## Jornadas live bloqueadas

Ainda sem execução legítima:

- login/logout;
- seleção/troca de organização;
- convite válido e nova senha;
- estados adicionais legítimos de bootstrap;
- sidebar/drawer;
- Visão geral;
- Administração;
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
2. observar somente deployment automático;
3. não repetir evidência pública se o runtime não mudou;
4. obter browser live conectado;
5. usar sessão/credencial/token legítimos;
6. percorrer todas as áreas críticas em desktop/tablet/mobile;
7. validar foco/teclado, drawer, touch, overflow, tabelas/formulários, loading/empty/error/success e `lista → detalhe → ação → retorno`;
8. mutar somente em estado seguro;
9. corrigir/revalidar achados concretos;
10. promover reconciliação funcional apenas após evidência live suficiente ou aceitação explícita de bloqueio externo.
