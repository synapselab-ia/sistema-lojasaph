# Fase 51 — Homologação UX real

Status: **EM ANDAMENTO — superfícies públicas cobertas; smoke live autenticado desktop e mobile concluídos; tablet e jornadas profundas ainda pendentes**  
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

SSR HTML + CSS reais do deployment foram renderizados localmente em Chromium/Playwright para Login, Recuperação com erro e Acesso indisponível em:

- desktop `1440x900`;
- tablet `768x1024` touch;
- mobile `390x844` touch/mobile.

Resultado: sem overflow horizontal nas combinações verificadas; layout contido; inputs/buttons/links de ação em tablet/mobile com pelo menos 44 px.

Limite: snapshot estático não certifica hidratação/JS, Next navigation, server actions, sessão/auth, mutações, redirects client-side, drawer autenticado, estados pós-ação ou foco completo live.

## Smoke live autenticado desktop — 2026-09-01

O operador abriu o deployment real em browser com sessão legítima e forneceu evidência direta de `/workspace/administracao/acessos` após a correção de migrations.

Na captura recebida foi possível observar:

- título **Usuários e permissões**;
- formulário **Convidar ou adicionar acesso**;
- seletores de perfil e área de atuação;
- seção **Acessos cadastrados** com acesso real carregado;
- ausência de `ADMINISTRATION_QUERY_ERROR`;
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

Classificação: **smoke live autenticado desktop**. Isso comprova carregamento e navegação básicos no runtime hidratado, mas não substitui homologação de ações de negócio, teclado completo, tablet/mobile ou estados pós-ação.

## Smoke live autenticado mobile — 2026-09-01

Após o smoke desktop, o operador abriu o sistema em celular real e confirmou que **as superfícies testadas estavam abrindo normalmente também no mobile até aquele ponto**.

Classificação: **smoke live autenticado mobile de carregamento/navegação**.

O qualificativo “por enquanto” é preservado semanticamente: a evidência cobre o que foi percorrido naquele momento e não autoriza afirmar que todos os fluxos, componentes ou estados mobile foram testados.

O smoke mobile comprova:

- deployment real acessível no aparelho;
- sessão legítima operando no contexto mobile;
- abertura/navegação básica das superfícies percorridas sem regressão reportada pelo operador.

Não comprova isoladamente:

- drawer/menu em todos os estados;
- dimensões de todos os touch targets autenticados;
- ausência de overflow em todas as tabelas/formulários densos;
- foco/ordem de teclado;
- mutações e feedback pós-ação;
- todos os estados loading/empty/error/success;
- jornadas completas `lista → detalhe → ação → retorno`.

## Achados anteriores

- **UX-51-001:** retorno da recuperação com target mínimo — corrigido no #167; HTTP/HTML + snapshot touch confirmam tratamento.
- **UX-51-002:** erro de recuperação com feedback acessível — corrigido no #167; HTML + snapshot de erro confirmam tratamento.
- **UX-51-003:** ações pequenas em acesso indisponível — corrigido no #167; HTML + snapshot touch confirmam tratamento.

## UX-51-004 — Administração indisponível por drift de migrations

A telemetria Production revelou `/workspace/administracao/acessos` falhando com `ADMINISTRATION_QUERY_ERROR` porque Production estava exatamente duas migrations atrás do Git:

- `20260828130500_administration_access_management.sql`;
- `20260828132500_administration_employee_identity.sql`.

O PR #175 aplicou exatamente essas migrations via `supabase db push` com allowlist fechada, sem seed/reset/repair/DDL ad hoc. O histórico remoto, RPCs, grants e trigger esperados foram confirmados read-only.

### Estado de homologação

**Backend corrigido e smoke live desktop revalidado.**

Em 2026-09-01 o operador abriu `/workspace/administracao/acessos` com sessão legítima no browser real e a tela carregou normalmente. O erro anterior não reapareceu nessa evidência.

Não alterar novamente schema/RPC dessa rota sem novo erro concreto.

## Matriz da Fase 51

| Área | Desktop | Tablet | Mobile | Estado |
| --- | --- | --- | --- | --- |
| Entrada pública: Login/Recuperação/Acesso indisponível | snapshot estático | snapshot estático | snapshot estático | geometria/overflow/touch públicos cobertos; live JS/foco parcial |
| Convite/Nova senha/Bootstrap/Seleção de organização | parcial HTTP/HTML | parcial HTTP/HTML | parcial HTTP/HTML | exige estado/token/sessão legítimos para fluxos completos |
| Navegação/Visão geral | smoke live autenticado | pendente | smoke live autenticado | abertura normal em desktop/mobile; tablet e profundidade pendentes |
| Administração | smoke live autenticado | pendente | smoke live autenticado geral | `/administracao/acessos` revalidada especificamente no desktop após drift |
| Cadastros | smoke live autenticado | pendente | smoke live autenticado | abertura normal; ações profundas pendentes |
| Estoque | smoke live autenticado | pendente | smoke live autenticado | abertura normal; ações profundas pendentes |
| Compras | smoke live autenticado | pendente | smoke live autenticado | abertura normal; jornada completa pendente |
| Financeiro | smoke live autenticado | pendente | smoke live autenticado | abertura normal; jornada completa pendente |
| Caixa | smoke live autenticado | pendente | smoke live autenticado | abertura normal; jornada completa pendente |

**A Fase 51 ainda não está integralmente homologada.** Os smokes desktop/mobile reduzem o bloqueio, mas ainda faltam tablet e profundidade suficiente das jornadas/estados.

## Jornadas live ainda pendentes

- tablet autenticado para as áreas principais;
- drawer/menu mobile em estados representativos;
- touch/overflow em componentes autenticados densos;
- logout e troca/seleção de organização quando aplicável;
- convite válido e nova senha com token legítimo quando necessários;
- fluxos `lista → detalhe → ação → retorno` representativos;
- mutações seguras e feedback pós-ação;
- loading/empty/error/success;
- foco/teclado no runtime hidratado;
- tabelas/formulários densos em viewports menores.

Não alterar Production para fabricar prova.

## Próxima evidência incremental

1. consultar GitHub para estado real;
2. conferir read-only a paridade de migrations Production ↔ Git; não repetir #175 sem drift novo;
3. observar somente deployment automático;
4. não repetir evidência pública nem smokes desktop/mobile se o runtime não mudou;
5. obter evidência **tablet** com sessão legítima;
6. aprofundar drawer, touch, overflow, foco/teclado e tabelas/formulários densos;
7. percorrer jornadas profundas representativas quando seguro;
8. validar loading/empty/error/success e feedback pós-ação;
9. mutar somente em estado seguro;
10. corrigir/revalidar achados concretos;
11. promover reconciliação funcional apenas após evidência live suficiente ou aceitação explícita do limite residual pelo operador.
