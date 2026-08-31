# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — evidência pública executada; jornadas autenticadas e validação visual por viewport ainda bloqueadas**  
Data: **2026-08-31**  
Issue: **#142**

## Baseline observado

- GitHub `main`: `3f99f5c79f05dd6ea494814f924c1cbb2f60fc0a`;
- CI pós-merge #574 / run `33399818968`: `success`;
- deployment Vercel: `dpl_2VGNVfvL6LmJjYVwD5TDiF9CMoCa`;
- deployment state: `READY`;
- source: integração GitHub, `githubCommitSha=3f99f5c79f05dd6ea494814f924c1cbb2f60fc0a`;
- alias canônico observado: `sistema-lojasaph.vercel.app`.

O deployment foi criado automaticamente pela integração Git após o merge do PR #166. **Nenhum deploy manual foi solicitado ou disparado para esta homologação.**

## Limites da evidência desta execução

A ferramenta conectada à Vercel permite consultar o HTML efetivamente servido pelo deployment atual, inclusive redirects resolvidos pelo Next.js. Ela não fornece nesta sessão um navegador gráfico com viewport, foco, teclado, drawer ou screenshots.

O runtime de shell disponível também não resolve DNS externo e não possui `agent-browser` instalado, portanto não foi possível substituir essa limitação por browser local.

Não existe nesta sessão uma credencial/sessão de teste aprovada para o Sistema Lojasaph. Consequentemente:

- nenhuma autenticação foi contornada;
- nenhum usuário/dado artificial foi criado em Production;
- nenhuma operação de escrita foi usada como prova;
- nenhum e-mail de recuperação foi disparado;
- nenhuma jornada autenticada foi declarada homologada.

## Evidência pública executada

| Jornada/rota | Resultado observado no deployment atual | Classificação |
| --- | --- | --- |
| `/` sem sessão | resposta atual resolve para `/login`; não existe landing técnica intermediária | aprovado no limite HTTP/HTML |
| `/login` | formulário de e-mail/senha em linguagem operacional; feedback usa `role="alert"`; links possuem `min-h-11` | aprovado no limite HTTP/HTML |
| `/workspace` sem sessão | resolve para `/login?next=/workspace` com `Sessão expirada. Entre novamente.` em `role="alert"` | aprovado no limite HTTP/HTML |
| `/recuperar-senha` | formulário e copy corretos; foram encontrados gaps de consistência/acessibilidade descritos abaixo | correção necessária |
| `/sem-acesso` sem sessão | estado seguro e copy operacional; foram encontrados gaps de touch target/feedback descritos abaixo | correção necessária |
| `/auth/atualizar-senha` sem sessão válida | resolve para Login com `O link de autenticação expirou. Solicite um novo.` anunciado como alerta | aprovado no limite HTTP/HTML |

## Achados concretos

### UX-51-001 — target de toque do retorno da recuperação

- rota: `/recuperar-senha`;
- evidência: o link `Voltar ao login` era `inline-block` sem `min-h-11`;
- contexto: a proteção global de `44px` cobre `button/input/select/textarea`, não âncoras;
- esperado: controles de navegação relevantes continuam utilizáveis em touch, conforme design system/DoD;
- classificação: `acessibilidade` / `responsividade`;
- correção: aplicada em `fix/51-public-auth-ux-homologation` com `inline-flex min-h-11 items-center`.

### UX-51-002 — feedback de erro inconsistente na recuperação

- rota: `/recuperar-senha`;
- evidência: erro geral era um `<p>` estilizado sem `role="alert"`, enquanto Login já usa `FeedbackMessage tone="danger" role="alert"`;
- esperado: erro geral da jornada usa o contrato de feedback do design system e semântica de anúncio apropriada;
- classificação: `acessibilidade` / `gap de UX`;
- correção: aplicada usando `FeedbackMessage`; a página também passa a reutilizar `Panel`, `FormField`, `Input` e `Button` sem alterar a action ou regra de autenticação.

### UX-51-003 — ações por link pequenas em acesso indisponível

- rota: `/sem-acesso`;
- evidência: links `Entrar` e `Configurar acesso inicial` usavam apenas `px-4 py-2`, sem altura mínima e fora da regra global para controles de formulário;
- esperado: ações primárias por toque possuem target mínimo consistente;
- classificação: `acessibilidade` / `responsividade`;
- correção: aplicada com `inline-flex min-h-11`; erro geral passa a `FeedbackMessage role="alert"` e o botão de saída reutiliza `Button`.

## O que foi deliberadamente descartado como falso positivo

Os campos e botões de formulário em `/recuperar-senha` não foram classificados como touch target insuficiente: `globals.css` já aplica `min-height: 44px` a `button` e inputs em `(pointer: coarse)`. A correção não duplica essa regra.

## Matriz de viewports

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada/Login/Recuperação | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | HTML atual validado; browser gráfico indisponível |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Administração | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Cadastros | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Estoque | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Compras | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Financeiro | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |
| Caixa | bloqueado | bloqueado | bloqueado | requer sessão autenticada + browser |

**Esta tabela não certifica responsividade.** Ela registra explicitamente a ausência de evidência que o Definition of Done exige.

## Jornadas autenticadas bloqueadas

Permanecem sem execução real nesta sessão:

- seleção/troca de organização e logout autenticado;
- sidebar desktop e drawer mobile;
- Visão geral e filtros;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- convite válido e definição de nova senha após token válido.

Motivo: não há sessão/credencial de teste aprovada nesta execução. Production não será usada para criar fixtures ou dados de prova.

## Critério para continuar

A homologação da Fase 51 **não está encerrada**. A próxima execução deve continuar esta mesma matriz quando existir:

1. browser real com controle de viewport/foco/teclado; e
2. sessão/credencial aprovada que permita percorrer as jornadas autenticadas sem criar dados artificiais em Production.

Até lá, somente superfícies públicas e estados seguros podem ser validados; CI/build e inspeção de HTML não substituem a homologação real desktop/tablet/mobile.
