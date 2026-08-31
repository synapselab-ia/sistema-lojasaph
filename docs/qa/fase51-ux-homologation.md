# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — deployment corrente revalidado; homologação gráfica por viewport e jornadas autenticadas ainda bloqueadas**  
Data: **2026-08-31**  
Issue: **#142**

## Baseline e validação técnica

Baseline corrente:

- GitHub `main`: `64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- PR #171 — `fix: fechar UX auxiliar de autenticação e contexto` — merged;
- CI pós-merge #586 / run `33426777989`: **success**;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: **success**.

O PR #171 fechou as telas auxiliares `/auth/atualizar-senha`, `/auth/invite`, `/bootstrap` e `/workspace/selecionar-organizacao` sem alterar schema, migrations, RPCs, grants, RLS, contratos de sessão/token, papéis, escopos ou regras de negócio.

## Deployment automático corrente

A integração Git disponibilizou automaticamente a versão exata da `main` corrente:

- deployment Vercel: `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- state: `READY`;
- target: `production`;
- source: `git`;
- `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b`;
- alias canônico observado: `sistema-lojasaph.vercel.app`;
- alias sem erro.

**Nenhum deploy manual foi solicitado ou disparado para esta homologação.**

O bloqueio antigo de “versão hospedada ainda não correspondente à `main`” está encerrado.

## Limites da evidência desta execução

A sessão atual permite consultar o deployment hospedado e o HTML/redirects realmente servidos, porém **não dispõe de browser gráfico operável** para controlar viewport, foco, teclado, drawer ou screenshots. A alternativa de browser automatizado disponível na documentação do ambiente foi investigada, mas o executável correspondente não está instalado e não existe outro conector de browser exposto nesta sessão.

Também não existe no contexto atual uma sessão/credencial de teste aprovada nem token legítimo de convite/recuperação do Sistema Lojasaph.

Consequentemente:

- nenhuma autenticação foi contornada;
- nenhum usuário, convite, fixture ou dado artificial foi criado em Production;
- nenhuma operação mutável foi usada como prova;
- nenhum e-mail de recuperação foi disparado;
- nenhuma jornada autenticada foi declarada homologada;
- nenhuma viewport foi declarada aprovada apenas por HTML/CSS;
- evidência HTTP/HTML abaixo **não substitui** homologação gráfica de desktop/tablet/mobile.

## Evidência hospedada corrente — `64e1c0d...`

| Jornada/rota | Evidência observada no deployment corrente | Estado |
| --- | --- | --- |
| `/` sem sessão | resolve para Login; não existe landing técnica intermediária | revalidado em HTTP/HTML |
| `/workspace` sem sessão | resolve para Login com `next=/workspace` e `Sessão expirada. Entre novamente.` em `role="alert"` | revalidado em HTTP/HTML |
| `/recuperar-senha` com erro controlado por query | feedback usa `role="alert"`; `Voltar ao login` possui `inline-flex min-h-11` | **UX-51-001/002 revalidados em HTTP/HTML** |
| `/sem-acesso` com erro controlado por query | feedback usa `role="alert"`; CTA `Entrar` e ação de saída possuem `min-h-11` | **UX-51-003 revalidado em HTTP/HTML** |
| `/auth/atualizar-senha` sem sessão válida | retorna ao Login com `O link de autenticação expirou. Solicite um novo.` anunciado como alerta | revalidado em HTTP/HTML |
| `/auth/invite` sem fragmento | estado inicial hospedado usa `aria-busy="true"`, `role="status"` e `aria-live="polite"` | estado inicial revalidado; parser/handoff JS exige browser/token legítimo |
| `/bootstrap` no estado atual | informa que a configuração inicial não está habilitada; retorno usa CTA com touch target mínimo | estado real atual revalidado; demais estados não foram fabricados |
| `/workspace/selecionar-organizacao` sem sessão | resolve para Login preservando `next=/workspace/selecionar-organizacao` | revalidado em HTTP/HTML; 0/1/múltiplas organizações exigem sessão legítima |

## Achados concretos anteriores

### UX-51-001 — target de toque do retorno da recuperação

- rota: `/recuperar-senha`;
- achado original: `Voltar ao login` não possuía target mínimo consistente;
- correção: integrada pelo PR #167 com `inline-flex min-h-11 items-center`;
- revalidação hospedada atual: **confirmada** no deployment `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- nível de evidência: HTTP/HTML real do deployment corrente, não inspeção gráfica por viewport.

### UX-51-002 — feedback de erro inconsistente na recuperação

- rota: `/recuperar-senha`;
- achado original: erro geral sem `role="alert"` e fora do contrato compartilhado;
- correção: integrada pelo PR #167 com `FeedbackMessage` e `role="alert"`;
- revalidação hospedada atual: **confirmada** no deployment corrente;
- nível de evidência: HTTP/HTML real.

### UX-51-003 — ações por link pequenas em acesso indisponível

- rota: `/sem-acesso`;
- achado original: links relevantes sem altura mínima consistente;
- correção: integrada pelo PR #167;
- revalidação hospedada atual: **confirmada** no deployment corrente, incluindo `min-h-11` e feedback `role="alert"`;
- nível de evidência: HTTP/HTML real.

## Falso positivo preservado

Os campos e botões de formulário em `/recuperar-senha` não são classificados como touch target insuficiente: os controles compartilhados já seguem a altura mínima definida pelo design system. Não duplicar regra apenas para gerar evidência.

## Matriz de viewports

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada/Login/Recuperação | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | bloqueado para inspeção gráfica | deployment corrente revalidado em HTTP/HTML; browser gráfico indisponível |
| Navegação/Visão geral | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Administração | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Cadastros | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Estoque | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Compras | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Financeiro | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |
| Caixa | bloqueado | bloqueado | bloqueado | requer sessão autenticada legítima + browser |

**Esta tabela não certifica responsividade.** Ela registra explicitamente a evidência ainda ausente pelo Definition of Done.

## Jornadas autenticadas ainda bloqueadas

Permanecem sem execução real:

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
- convite válido e definição de nova senha após token legítimo;
- estados de bootstrap que não existem naturalmente no ambiente corrente.

Motivo: ausência de browser gráfico operável e de sessão/credencial/token legítimos aprovados. Production não será alterada para criar prova artificial.

## Estado da homologação

A Fase 51 **não pode ser promovida ainda para reconciliação funcional final** porque o critério de aceite exige evidência representativa em browser para desktop/tablet/mobile e jornadas autenticadas necessárias, salvo aceitação explícita do operador para adiar bloqueios externos.

A revalidação HTTP/HTML pública da versão corrente está concluída. **Não repetir mecanicamente essas mesmas verificações em nova sessão sem mudança de deployment ou novo achado.**

## Próxima evidência incremental necessária

1. confirmar que a `main`, CI e deployment automático continuam coerentes;
2. usar browser gráfico real quando a capacidade estiver disponível e registrar dimensões de desktop/tablet/mobile;
3. usar somente sessão/credencial legítima aprovada para jornadas autenticadas;
4. percorrer Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
5. validar foco/teclado, drawer mobile, touch targets, overflow, tabelas/formulários densos, loading/empty/error/success e `lista → detalhe → ação → retorno`;
6. executar convite/nova senha/bootstrap/troca de organização somente em estados legítimos;
7. registrar e corrigir apenas achados concretos;
8. promover reconciliação funcional somente quando a matriz tiver evidência suficiente ou quando bloqueios externos forem explicitamente aceitos pelo operador.

CI/build e inspeção de HTML permanecem evidências auxiliares; não substituem homologação de jornada em browser.
