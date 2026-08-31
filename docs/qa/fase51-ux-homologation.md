# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — superfícies públicas possuem evidência HTTP/HTML e snapshot gráfico estático; jornadas live autenticadas ainda bloqueadas**  
Data: **2026-08-31**  
Issue: **#142**

## Baseline técnica real

- GitHub `main`: `01da4646d8e2ae6c533bc81d66afb2fb9d60ec5c` — merge do PR #172;
- PR #172 — `docs: reconciliar evidência hospedada da homologação UX` — merged;
- CI pós-merge #588 / run `33427974722`: **success**;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: **success**.

O PR #172 alterou somente documentação. Nenhum schema, migration, RPC, grant, RLS, contrato de sessão/token, papel, escopo ou regra de negócio foi alterado.

## Runtime hospedado observado

O último deployment automático de aplicação continua sendo:

- Vercel deployment `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- state: `READY`;
- target: `production`;
- source: `git`;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- alias canônico: `sistema-lojasaph.vercel.app`.

Não existe deployment posterior para `01da4646...`; isso é coerente com o merge #172 ter sido documental. O runtime de aplicação não mudou desde a evidência pública anterior.

**Nenhum deploy manual foi solicitado ou disparado para esta homologação.**

## Evidência HTTP/HTML já concluída

No runtime acima já foram observados:

| Jornada/rota | Evidência | Estado |
| --- | --- | --- |
| `/` sem sessão | resolve para Login; sem landing técnica | revalidado em HTTP/HTML |
| `/workspace` sem sessão | Login com `next=/workspace` e alerta de sessão expirada | revalidado em HTTP/HTML |
| `/recuperar-senha?error=Teste` | `role="alert"`; `Voltar ao login` com `min-h-11` | UX-51-001/002 revalidados |
| `/sem-acesso?error=Teste` | `role="alert"`; ações com `min-h-11` | UX-51-003 revalidado |
| `/auth/atualizar-senha` sem sessão válida | Login com alerta de link expirado | revalidado em HTTP/HTML |
| `/auth/invite` sem fragmento | estado inicial com `aria-busy`, `role="status"`, `aria-live` | estado inicial revalidado |
| `/bootstrap` | configuração inicial desabilitada no estado real corrente | estado atual revalidado |
| `/workspace/selecionar-organizacao` sem sessão | Login preservando `next=/workspace/selecionar-organizacao` | revalidado em HTTP/HTML |

Como o runtime hospedado não mudou, essas verificações **não devem ser repetidas por inércia**.

## Capacidade gráfica disponível e seu limite

Foi reavaliado o runtime local e encontrado:

- Chromium `144.0.7559.96` instalado;
- Python Playwright `1.57.0` instalado;
- Chromium headless lança e captura screenshots corretamente.

Porém o container não possui saída de rede/DNS para GitHub/Vercel. Portanto ele não consegue abrir o deployment diretamente. Também não há browser interativo conectado exposto nesta sessão.

Para obter evidência gráfica incremental sem fabricar uma sessão live, foi usado o seguinte método:

1. buscar pela integração Vercel o **SSR HTML realmente servido** pelo runtime automático;
2. buscar pela mesma integração o **CSS realmente servido** pelo bundle;
3. reconstruir apenas as superfícies SSR públicas observadas em uma página local, mantendo markup e estilos relevantes do deployment;
4. renderizar em Chromium/Playwright nas viewports definidas abaixo;
5. medir geometria/overflow/altura dos controles e inspecionar as imagens resultantes.

### Limite metodológico

Esse método é um **snapshot gráfico estático de HTML/CSS hospedados**, não uma navegação live do Next.js.

Ele **não** certifica:

- hidratação ou JavaScript;
- Next navigation;
- server actions;
- redirects client-side;
- sessão/autenticação;
- mutações;
- drawer autenticado;
- estados produzidos após ações;
- foco completo no runtime live.

A sequência de Tab foi exercitada no harness e alcançou os controles na ordem do DOM, mas a aparência de foco **não será promovida a gate aprovado** a partir dessa reconstrução estática. Foco/teclado deve ser revalidado no browser live.

## Snapshot gráfico público por viewport

Viewports usadas:

- **desktop:** `1440x900`, contexto sem touch;
- **tablet:** `768x1024`, contexto touch;
- **mobile:** `390x844`, contexto touch/mobile.

Superfícies:

- Login;
- Recuperar senha com feedback de erro;
- Acesso operacional indisponível com feedback de erro.

### Medições

| Superfície | Viewport | Overflow horizontal | Controles abaixo de 44 px no contexto touch/CTA | Observação visual |
| --- | --- | --- | --- | --- |
| Login | 1440x900 | não | nenhum CTA abaixo de 44 px | card centralizado, conteúdo contido |
| Login | 768x1024 touch | não | nenhum | card centralizado, controles contidos |
| Login | 390x844 touch | não | nenhum | layout em coluna, conteúdo contido |
| Recuperação com erro | 1440x900 | não | nenhum CTA abaixo de 44 px | erro e formulário legíveis |
| Recuperação com erro | 768x1024 touch | não | nenhum | conteúdo contido |
| Recuperação com erro | 390x844 touch | não | nenhum | conteúdo contido |
| Acesso indisponível | 1440x900 | não | nenhum | ações e alerta contidos |
| Acesso indisponível | 768x1024 touch | não | nenhum | ações contidas |
| Acesso indisponível | 390x844 touch | não | nenhum | ações cabem sem overflow |

Alturas relevantes medidas:

- em tablet/mobile, inputs, buttons e links de ação dessas superfícies ficaram em **44 px ou mais**;
- em desktop, inputs sem contexto coarse ficaram em aproximadamente 42 px, enquanto buttons/links de ação permaneceram em 44 px; isso é coerente com a regra do design system que eleva controles a 44 px em `(pointer: coarse)`.

Nenhum novo gap visual concreto foi encontrado nessas três superfícies estáticas.

## Achados concretos anteriores

### UX-51-001 — target de toque do retorno da recuperação

- rota: `/recuperar-senha`;
- correção: integrada pelo PR #167;
- HTTP/HTML hospedado: confirmado;
- snapshot gráfico tablet/mobile: sem target abaixo de 44 px;
- **estado: tratado**.

### UX-51-002 — feedback de erro inconsistente na recuperação

- rota: `/recuperar-senha`;
- correção: `FeedbackMessage` + `role="alert"` pelo PR #167;
- HTML hospedado e snapshot gráfico de erro: confirmados;
- **estado: tratado**.

### UX-51-003 — ações por link pequenas em acesso indisponível

- rota: `/sem-acesso`;
- correção: integrada pelo PR #167;
- HTML hospedado e snapshot gráfico tablet/mobile: ações sem altura inferior a 44 px;
- **estado: tratado**.

## Matriz da Fase 51

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada pública: Login/Recuperação/Acesso indisponível | snapshot gráfico estático executado | snapshot gráfico estático executado | snapshot gráfico estático executado | geometria/overflow/touch público cobertos; live JS/foco ainda pendentes |
| Convite/Nova senha/Bootstrap/Seleção de organização | parcial em HTTP/HTML | parcial em HTTP/HTML | parcial em HTTP/HTML | exige browser live e estados/token/sessão legítimos |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Administração | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Cadastros | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Estoque | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Compras | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Financeiro | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |
| Caixa | bloqueado | bloqueado | bloqueado | requer sessão legítima + browser live |

**Esta tabela não declara a Fase 51 homologada.** O snapshot estático reduz o gap de evidência pública, mas não substitui as jornadas live exigidas pelo Definition of Done.

## Jornadas live autenticadas ainda bloqueadas

Permanecem sem execução real:

- login com conta legítima;
- seleção/troca de organização e logout autenticado;
- sidebar desktop e drawer mobile;
- Visão geral e filtros;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- convite válido e definição de nova senha após token legítimo;
- estados de bootstrap que não existam naturalmente no ambiente;
- operações mutáveis e feedback pós-ação.

Motivo: ausência de browser live conectado ao deployment e de sessão/credencial/token legítimos aprovados. Production não será alterada para fabricar prova.

## Estado da homologação

A Fase 51 **não pode ser promovida ainda para reconciliação funcional final**. O critério de aceite continua exigindo jornadas live representativas em desktop/tablet/mobile e estados autenticados necessários, salvo aceitação explícita do operador para adiar uma limitação externa.

## Próxima evidência incremental necessária

1. confirmar estado real de `main`, CI e deployment automático;
2. não repetir HTTP/HTML nem snapshot estático se o runtime não mudou;
3. obter browser live operável contra o deployment;
4. usar somente sessão/credencial legítima aprovada;
5. percorrer Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
6. validar foco/teclado, drawer, touch targets, overflow, tabelas/formulários densos, loading/empty/error/success e `lista → detalhe → ação → retorno`;
7. executar mutações somente em ambiente/estado seguro;
8. registrar e corrigir apenas achados concretos;
9. promover reconciliação funcional somente quando a matriz tiver evidência suficiente ou quando bloqueios externos forem explicitamente aceitos pelo operador.

CI/build e inspeção estática continuam sendo evidências auxiliares; não substituem homologação live.
