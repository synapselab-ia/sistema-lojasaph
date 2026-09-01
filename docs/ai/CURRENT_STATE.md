# Current State — Sistema Lojasaph

Última atualização: 2026-09-01

## Regra de baseline

**Não usar este arquivo como fonte do SHA corrente de `main`.** Toda execução deve consultar GitHub para HEAD real, PRs, Issues, branches e CI. SHAs e runs abaixo são âncoras de evidência concluída, não uma alegação de HEAD permanente.

## Estado do produto

**Fase 51 / Issue #142 permanece ativa.**

O núcleo operacional está consolidado, mas o produto ainda não deve ser declarado 100% concluído. `docs/product/final-product-gap-audit.md` continua como inventário da fila final.

Slices/fechamentos já integrados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176 e #177.

Não refazer essas etapas sem bug/gap concreto.

#75/#121 continuam **TOTALMENTE ON HOLD**. PENDINGs de negócio e Q-022 continuam sem inferência.

## Runtime hospedado de aplicação

O último deployment automático de aplicação observado continua sendo:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- alias `sistema-lojasaph.vercel.app`.

PRs posteriores que alteraram apenas documentação/operação não exigem deploy Vercel manual. **Nenhum deploy manual foi disparado.**

## Homologação UX — evidência já obtida

### HTTP/HTML público

O runtime acima já teve revalidação HTTP/HTML de `/`, `/workspace`, `/recuperar-senha`, `/sem-acesso`, `/auth/atualizar-senha`, `/auth/invite`, `/bootstrap` e `/workspace/selecionar-organizacao` nos estados públicos/sem sessão apropriados. UX-51-001, UX-51-002 e UX-51-003 permanecem tratados nesse nível de evidência.

### Snapshot gráfico estático

SSR HTML + CSS reais do deployment foram renderizados localmente em Chromium/Playwright para Login, Recuperação com erro e Acesso indisponível em `1440x900`, `768x1024` touch e `390x844` touch/mobile.

Resultado: sem overflow horizontal nas combinações verificadas; layout contido; controles/CTAs touch com pelo menos 44 px.

**Limite:** isso não é browser live e não certifica hidratação/JS, navegação Next, server actions, sessão/auth, mutações, drawer autenticado nem foco completo no runtime live.

### Smoke live autenticado desktop — 2026-09-01

O operador abriu o deployment real em browser com sessão legítima e forneceu evidência direta de `/workspace/administracao/acessos` carregada após a correção de migrations. A tela **Usuários e permissões** exibiu formulário e acessos cadastrados sem `ADMINISTRATION_QUERY_ERROR`.

Na mesma rodada, confirmou que abriram normalmente: Visão geral, Administração, Produtos/Cadastros, Estoque, Compras, Financeiro e Caixa.

### Smoke live autenticado mobile — 2026-09-01

O operador também abriu o sistema em celular real, com sessão legítima, e confirmou que a navegação/apertura das áreas testadas permaneceu normal no viewport mobile.

Registrar isso como **smoke live autenticado mobile de carregamento/navegação**, não como homologação integral da responsividade ou das jornadas. A frase “por enquanto” do operador é tratada como confirmação do smoke executado até esse ponto, não como garantia de fluxos ainda não percorridos.

Essa evidência reduz o gap mobile, mas ainda não certifica isoladamente:

- drawer/menu mobile em todos os estados;
- medidas de touch target de todos os controles autenticados;
- ausência de overflow em todas as tabelas/formulários densos;
- ações mutáveis e feedback pós-ação;
- fluxos `lista → detalhe → ação → retorno`;
- foco/ordem de teclado;
- tablet live autenticado;
- convite/recuperação/nova senha com token legítimo;
- todos os estados loading/empty/error/success.

Detalhes: `docs/qa/fase51-ux-homologation.md`.

## Incidente Production — drift de migrations — corrigido e revalidado

A telemetria Production havia mostrado `/workspace/administracao/acessos` falhando com `ADMINISTRATION_QUERY_ERROR` porque Production estava duas migrations atrás do Git. O PR #175 aplicou, por `supabase db push` com allowlist fechada, exatamente:

- `20260828130500_administration_access_management.sql`;
- `20260828132500_administration_employee_identity.sql`.

Sem seed, reset, `migration repair`, DDL ad hoc ou fixture em Production. O histórico remoto, RPCs, grants e trigger foram verificados read-only após a correção.

Em 2026-09-01 o operador abriu `/workspace/administracao/acessos` autenticado no browser real e a tela carregou normalmente, sem o erro anterior. UX-51-004 está revalidado no nível de smoke live desktop. Não repetir schema/RPC para essa rota sem nova regressão concreta.

## Regra operacional — paridade de migrations

Antes de diagnosticar erro Production de função/tabela ausente quando o recurso já existe em migration mergeada:

1. comparar `supabase/migrations/*` com o histórico remoto;
2. confirmar o conjunto exato de versions pendentes;
3. aplicar somente migrations versionadas/revisadas com mecanismo que preserve versions, preferencialmente `supabase db push`;
4. falhar fechado se houver drift inesperado;
5. não usar `migration repair`, edição direta de history, seed ou reset como atalho.

## Bloqueio restante da Fase 51

Já existem smoke live autenticados em desktop e mobile. A homologação UX completa ainda precisa principalmente de evidência representativa de:

- **tablet live autenticado**;
- drawer/menu mobile, touch e overflow em estados representativos;
- foco visível e ordem por teclado no runtime hidratado;
- tabelas/formulários densos em viewports menores;
- fluxos `lista → detalhe → ação → retorno` representativos;
- loading/empty/error/success e feedback pós-ação;
- ações mutáveis somente em estado seguro;
- convite/recuperação/nova senha com token legítimo quando necessários ao aceite.

Não fabricar usuário, convite, fixture ou dado em Production para preencher a matriz.

## NEXT_ACTION

**Concluir a homologação UX live residual, priorizando tablet e profundidade funcional/estados de interação, sem repetir os smokes desktop/mobile já comprovados.**

Não repetir a reconciliação de migrations sem novo drift comprovado; fazer apenas checagem read-only de paridade no início.

Depois da homologação UX, promover reconciliação funcional requisito por requisito usando:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

## PENDINGs e Q-022

Não resolver por inferência:

- `REQ-ITEM-004`;
- `REQ-ITEM-005`;
- `REQ-STK-007`;
- `REQ-STK-010`;
- `REQ-EXP-004`;
- `REQ-FIN-004`;
- `REQ-CASH-007`;
- `REQ-CASH-008`;
- Q-022.
