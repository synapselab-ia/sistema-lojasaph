# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — primeira rodada pública corrigida; jornadas autenticadas e validação gráfica por viewport ainda bloqueadas**  
Data: **2026-08-31**  
Issue: **#142**

## Baseline e validação técnica

Baseline após a primeira rodada de correções:

- GitHub `main`: `044cb2099c1285d298040fdc2f12260fbaa2ca3f`;
- PR #167 — `fix: corrigir achados públicos da homologação UX` — merged;
- CI do PR #167 #575 / run `33402272680`: `success`;
- CI pós-merge #576 / run `33402440077`: `success`;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: `success`.

Nenhum schema, migration, RPC, grant, RLS, regra de autorização ou regra de negócio foi alterado.

## Ambiente hospedado observado

A primeira rodada de evidência pública foi executada sobre:

- deployment Vercel: `dpl_2VGNVfvL6LmJjYVwD5TDiF9CMoCa`;
- state: `READY`;
- source: integração GitHub;
- `githubCommitSha=3f99f5c79f05dd6ea494814f924c1cbb2f60fc0a`;
- alias canônico observado: `sistema-lojasaph.vercel.app`.

Esse commit já continha Caixa #161, Dashboard #163 e limpeza #165 e representava corretamente o produto antes das correções do PR #167.

O deployment foi criado automaticamente pela integração Git. **Nenhum deploy manual foi solicitado ou disparado para esta homologação.**

Após o merge do PR #167, a lista de deployments foi consultada novamente e ainda não havia, na última consulta desta execução, deployment automático observado para `044cb209...`.

Consequência: as correções do PR #167 estão integradas e tecnicamente verdes, mas **a revalidação hospedada de UX-51-001/002/003 permanece pendente até a integração automática disponibilizar o `main` corrente**. Não criar deployment manual para acelerar essa evidência.

## Limites da evidência desta execução

O acesso conectado à Vercel permite consultar o HTML efetivamente servido pelo deployment, inclusive redirects resolvidos pelo Next.js. Ele não fornece nesta sessão um browser gráfico com controle de viewport, foco, teclado, drawer ou screenshots.

Foi investigada uma alternativa local:

- Chromium está instalado;
- Playwright está instalado;
- porém o runtime local não resolve hosts externos e não consegue obter o checkout do GitHub nem carregar o domínio Vercel;
- não foi encontrada integração adicional de browser disponível nesta sessão.

Também não existe no contexto atual uma credencial/sessão de teste aprovada para o Sistema Lojasaph.

Consequentemente:

- nenhuma autenticação foi contornada;
- nenhum usuário/dado artificial foi criado em Production;
- nenhuma operação mutável foi usada como prova;
- nenhum e-mail de recuperação foi disparado;
- nenhuma jornada autenticada foi declarada homologada;
- nenhuma viewport foi declarada aprovada apenas por CSS/HTML.

## Evidência pública executada — deployment `3f99f5c...`

| Jornada/rota | Resultado observado no deployment | Estado |
| --- | --- | --- |
| `/` sem sessão | resolve para `/login`; não existe landing técnica intermediária | aprovado no limite HTTP/HTML |
| `/login` | formulário operacional; feedback usa `role="alert"`; links possuem `min-h-11` | aprovado no limite HTTP/HTML |
| `/workspace` sem sessão | resolve para `/login?next=/workspace` com `Sessão expirada. Entre novamente.` em `role="alert"` | aprovado no limite HTTP/HTML |
| `/recuperar-senha` | fluxo/copy corretos; revelou UX-51-001 e UX-51-002 | corrigido no PR #167; revalidação hospedada pendente |
| `/sem-acesso` sem sessão | estado seguro/copy operacional; revelou UX-51-003 | corrigido no PR #167; revalidação hospedada pendente |
| `/auth/atualizar-senha` sem sessão válida | retorna ao Login com `O link de autenticação expirou. Solicite um novo.` anunciado como alerta | aprovado no limite HTTP/HTML |

## Achados concretos

### UX-51-001 — target de toque do retorno da recuperação

- rota: `/recuperar-senha`;
- evidência original: `Voltar ao login` era `inline-block` sem `min-h-11`;
- contexto: a proteção global de `44px` cobre `button/input/select/textarea`, não âncoras;
- esperado: navegação relevante permanece utilizável em touch conforme design system/DoD;
- classificação: `acessibilidade` / `responsividade`;
- correção: **integrada pelo PR #167** com `inline-flex min-h-11 items-center`;
- CI: verde;
- revalidação no deployment pós-correção: **pendente de deployment automático do `main` corrente**.

### UX-51-002 — feedback de erro inconsistente na recuperação

- rota: `/recuperar-senha`;
- evidência original: erro geral era `<p>` estilizado sem `role="alert"`, enquanto Login usa `FeedbackMessage tone="danger" role="alert"`;
- esperado: erro geral usa o contrato de feedback do design system e semântica de anúncio apropriada;
- classificação: `acessibilidade` / `gap de UX`;
- correção: **integrada pelo PR #167** com `FeedbackMessage`; a página também reutiliza `Panel`, `FormField`, `Input` e `Button` sem mudar action ou regra de autenticação;
- CI: verde;
- revalidação no deployment pós-correção: **pendente**.

### UX-51-003 — ações por link pequenas em acesso indisponível

- rota: `/sem-acesso`;
- evidência original: links `Entrar` e `Configurar acesso inicial` usavam apenas `px-4 py-2`, sem altura mínima e fora da regra global de controles de formulário;
- esperado: ações primárias por toque possuem target mínimo consistente;
- classificação: `acessibilidade` / `responsividade`;
- correção: **integrada pelo PR #167** com `inline-flex min-h-11`; erro geral passa a `FeedbackMessage role="alert"` e saída reutiliza `Button`;
- CI: verde;
- revalidação no deployment pós-correção: **pendente**.

## Falso positivo descartado

Os campos e botões de formulário em `/recuperar-senha` não foram classificados como touch target insuficiente: `globals.css` já aplica `min-height: 44px` a `button` e inputs em `(pointer: coarse)`. A correção não duplicou essa regra.

## Matriz de viewports

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada/Login/Recuperação | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | HTML real parcialmente validado; browser gráfico indisponível |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Administração | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Cadastros | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Estoque | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Compras | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Financeiro | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Caixa | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |

**Esta tabela não certifica responsividade.** Ela registra explicitamente a ausência de evidência exigida pelo Definition of Done.

## Jornadas autenticadas bloqueadas

Permanecem sem execução real nesta sessão:

- login com conta real de teste;
- seleção/troca de organização e logout autenticado;
- sidebar desktop e drawer mobile;
- Visão geral e filtros;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- convite válido e definição de nova senha após token legítimo.

Motivo: não há sessão/credencial de teste aprovada e não existe browser gráfico operável sobre o código atual nesta execução. Production não será usada para criar fixtures ou dados de prova.

## Próxima rodada

A homologação da Fase 51 **não está encerrada**.

Na próxima execução:

1. confirmar `main`, CI e deployment automático corrente;
2. se o deployment exato de `044cb209...` ou de um `main` posterior estiver `READY`, revalidar `/recuperar-senha` e `/sem-acesso` e atualizar UX-51-001/002/003;
3. não disparar deploy manual caso ele não exista;
4. quando houver browser real, registrar dimensões e executar desktop/tablet/mobile;
5. quando houver sessão/credencial aprovada, percorrer as jornadas autenticadas sem criar dados artificiais em Production;
6. registrar e corrigir somente achados concretos;
7. não promover reconciliação funcional até a matriz representativa estar realmente homologada ou os bloqueios externos serem explicitamente aceitos pelo operador.

CI/build, leitura de código e inspeção de HTML continuam sendo evidências auxiliares; não substituem homologação de jornada em browser.
