# Handoff — Sistema Lojasaph

## Como ler este handoff

**Sempre consultar o GitHub para obter o HEAD real de `main` e o CI mais recente.** SHAs/runs abaixo são âncoras de evidência concluída, não estado eterno do repositório.

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

A consolidação estrutural/UX e o incidente de drift de migrations Production estão tratados. Em 2026-09-01 o operador forneceu evidência live autenticada em desktop e, depois, confirmou smoke equivalente de abertura/navegação em celular real.

Não refazer por inércia: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176 e #177.

#75/#121 permanecem **TOTALMENTE ON HOLD**.

## Runtime de aplicação observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime SHA `64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

PRs documentais/operacionais posteriores não exigem deploy Vercel manual. Nenhum deploy manual foi feito.

## Evidência UX já concluída

HTTP/HTML público e snapshot gráfico estático continuam registrados em `docs/qa/fase51-ux-homologation.md` e não devem ser repetidos se o runtime não mudar.

### Smoke live desktop — 2026-09-01

Com sessão legítima, o operador abriu `/workspace/administracao/acessos` no browser real. A tela **Usuários e permissões** exibiu formulário e acessos cadastrados sem `ADMINISTRATION_QUERY_ERROR`.

Também confirmou que Visão geral, Administração, Produtos/Cadastros, Estoque, Compras, Financeiro e Caixa abriram normalmente. O screenshot recebido no chat não foi anexado ao GitHub porque continha identificador pessoal de conta; somente evidência sanitizada foi registrada.

### Smoke live mobile — 2026-09-01

Depois, o operador confirmou que o sistema também estava abrindo normalmente em celular real durante a navegação autenticada realizada até aquele ponto.

Classificação correta: **smoke live autenticado mobile de carregamento/navegação**. Não converter essa confirmação em garantia de fluxos ainda não percorridos nem em homologação integral de responsividade.

Já existe, portanto, evidência live representativa de abertura/navegação em **desktop e mobile**. Permanecem sem prova suficiente:

- tablet live autenticado;
- drawer/menu mobile em todos os estados relevantes;
- touch targets e overflow em todos os componentes autenticados densos;
- foco/ordem de teclado;
- fluxos profundos `lista → detalhe → ação → retorno`;
- mutações seguras e feedback pós-ação;
- todos os estados loading/empty/error/success;
- convite/recuperação/nova senha com token legítimo quando aplicáveis.

## Incidente Production — drift de migrations — FECHADO E REVALIDADO

`/workspace/administracao/acessos` havia falhado porque Production estava duas migrations atrás do Git. O PR #175 aplicou exatamente as duas migrations administrativas pendentes via `supabase db push`, preservando versions Git e sem seed/reset/repair/DDL ad hoc.

Production passou a registrar as versions esperadas e os RPCs/grants/trigger foram verificados read-only. Em 2026-09-01 a rota foi reaberta com sessão legítima no browser real e carregou normalmente. **UX-51-004 está revalidado no nível de smoke live desktop.** Não mexer novamente em schema/RPC dessa rota sem nova regressão concreta.

## Regra de prevenção de recorrência

Quando Production disser que uma função/tabela mergeada não existe:

1. comparar migrations Git com histórico remoto antes de alterar código;
2. identificar exatamente as versions pendentes;
3. usar migrations versionadas e mecanismo que preserve as versions (`supabase db push` quando aplicável);
4. falhar fechado em drift inesperado;
5. não usar `migration repair`, edição manual de history, seed ou reset como atalho.

## NEXT_ACTION imediata

### Concluir a homologação UX live residual sem repetir os smokes desktop/mobile já comprovados

Na próxima execução:

1. reler governança/handoff;
2. consultar `main`, Issue #142, PRs, branches e CI reais;
3. fazer checagem **read-only** de paridade de migrations Production ↔ Git; não reaplicar #175 sem drift novo;
4. observar somente deployment automático;
5. não repetir HTTP/HTML, snapshot público ou smokes desktop/mobile por inércia;
6. colher evidência representativa **tablet** com sessão legítima;
7. aprofundar drawer/touch/overflow, foco/teclado e tabelas/formulários densos;
8. percorrer fluxos representativos `lista → detalhe → ação → retorno` quando seguro;
9. validar loading/empty/error/success e feedback pós-ação;
10. mutar somente em estado seguro;
11. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
12. promover reconciliação funcional apenas após evidência live suficiente ou aceitação explícita do limite residual pelo operador.

## Guardrails

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret em Git/docs/browser; nenhum deploy Vercel manual/rotineiro; PENDINGs e Q-022 sem inferência; #75/#121 continuam **TOTALMENTE ON HOLD**.
