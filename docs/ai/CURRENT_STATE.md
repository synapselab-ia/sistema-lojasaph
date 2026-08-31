# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

A etapa em andamento é **homologação UX real em jornadas desktop/tablet/mobile**. A homologação não está concluída: nesta execução foi possível validar de forma segura as superfícies públicas do deployment atual, corrigir três gaps concretos e integrar essas correções, mas ainda não existe evidência gráfica por viewport nem execução das jornadas autenticadas.

Baseline funcional atual:

- `main=044cb2099c1285d298040fdc2f12260fbaa2ca3f` — merge do PR #167;
- PR #167 — `fix: corrigir achados públicos da homologação UX` — **merged**;
- CI do head do PR #167 #575 / run `33402272680`: **success**;
- CI pós-merge da `main` #576 / run `33402440077`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
6. Estoque: posição + jornadas operacionais consolidadas — PR #155;
7. Compras: pedidos + recebimentos + histórico consolidados — PR #157;
8. Financeiro: documentos + parcelas + pagamentos consolidados — PR #159;
9. Caixa: sessões + fechamento + configuração consolidados — PR #161;
10. Dashboard / Visão geral — PR #163;
11. limpeza de linguagem/resíduos de engenharia — PR #165.

Não refazer essas slices sem bug ou gap concreto.

## Homologação UX — progresso real

A evidência detalhada está em `docs/qa/fase51-ux-homologation.md`.

### Ambiente observado

A integração GitHub/Vercel criou automaticamente um deployment `READY` para o `main=3f99f5c79f05dd6ea494814f924c1cbb2f60fc0a` (merge documental do PR #166):

- deployment: `dpl_2VGNVfvL6LmJjYVwD5TDiF9CMoCa`;
- alias canônico: `sistema-lojasaph.vercel.app`;
- source: Git integration;
- nenhum deploy manual foi disparado.

Esse deployment já continha Caixa #161, Dashboard #163 e limpeza #165 e, portanto, removeu o antigo bloqueio de versão hospedada defasada.

Após o merge do PR #167, foi consultada novamente a integração Vercel. **Ainda não havia novo deployment automático observado para `044cb209...` na última consulta desta execução.** Não disparar deployment manual para contornar isso; apenas reconsultar o estado na próxima execução.

### Superfícies públicas exercitadas

Sobre o deployment exato `3f99f5c...`, a consulta ao HTML realmente servido confirmou:

- `/` sem sessão resolve para o Login atual, sem landing técnica;
- `/login` usa linguagem operacional, feedback acessível e links com target de toque;
- `/workspace` sem sessão retorna ao Login preservando `next=/workspace` e informa `Sessão expirada. Entre novamente.` com `role="alert"`;
- `/auth/atualizar-senha` sem sessão/token válido retorna ao Login com erro operacional anunciado como alerta;
- `/recuperar-senha` e `/sem-acesso` estavam funcionais, mas revelaram gaps objetivos de acessibilidade/consistência corrigidos pelo PR #167.

Nenhum formulário mutável foi submetido em Production e nenhum e-mail de recuperação foi disparado como prova.

### Achados corrigidos pelo PR #167

- `UX-51-001`: `Voltar ao login` em `/recuperar-senha` não possuía target mínimo de toque para âncora;
- `UX-51-002`: erro geral da recuperação não usava o contrato `FeedbackMessage`/`role="alert"` já adotado no Login;
- `UX-51-003`: links de ação de `/sem-acesso` não possuíam target mínimo de toque e o feedback geral estava fora do padrão compartilhado.

Correções integradas:

- `/recuperar-senha` reutiliza `Panel`, `FeedbackMessage`, `FormField`, `Input` e `Button` e preserva a mesma action/regra de autenticação;
- link de retorno recebeu `min-h-11`;
- `/sem-acesso` reutiliza `Panel`, `FeedbackMessage` e `Button`; links primários receberam `min-h-11`;
- `responsive-contract.test.ts` cobre os contratos públicos de touch target e anúncio de erro.

Nenhuma lógica de autenticação, sessão, autorização, bootstrap, schema, migration, RPC, grant ou RLS mudou.

## Limite atual da homologação

**Ainda não existe homologação gráfica real por desktop/tablet/mobile nem execução das jornadas autenticadas.**

Bloqueios comprovados nesta execução:

1. o acesso conectado à Vercel permite observar HTML/redirects reais, mas não oferece controle gráfico de viewport, foco, teclado, drawer ou screenshots;
2. o runtime local possui Chromium/Playwright, porém não consegue resolver hosts externos nem obter o checkout do repositório, portanto não consegue executar o código atual localmente;
3. não há nesta conversa sessão/credencial de teste aprovada para percorrer as áreas autenticadas;
4. Production não será usada para criar usuários, fixtures ou dados artificiais de homologação.

CI/build e inspeção de HTML **não** substituem a evidência exigida pelo Definition of Done.

## Próxima ação oficial

A próxima execução deve **continuar a mesma homologação UX**, não promover a reconciliação funcional ainda.

Prioridade imediata:

1. reconciliar o estado real do `main`, Issue #142, PRs/CI e deployment automático;
2. verificar se a integração GitHub/Vercel já publicou automaticamente `044cb209...` ou um `main` posterior; não disparar deploy manual;
3. quando o deployment atual estiver disponível, revalidar `/recuperar-senha` e `/sem-acesso` no HTML servido;
4. se houver browser real com controle de viewport e sessão/credencial de teste aprovada, executar a matriz desktop/tablet/mobile de `docs/qa/fase51-ux-homologation.md`;
5. se esses recursos continuarem indisponíveis, manter os itens como `bloqueio de ambiente`; não declarar homologação concluída e não inventar acesso.

Somente após a matriz representativa ser realmente executada e os achados corrigidos/revalidados promover:

> **reconciliação funcional final usando critério de usabilidade.**

## Ordem oficial de fechamento do produto

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. ~~Caixa~~ — PR #161;
10. ~~Dashboard~~ — PR #163;
11. ~~limpeza de linguagem/resíduos de engenharia~~ — PR #165;
12. **homologação UX em jornadas desktop/tablet/mobile — em andamento**;
13. reconciliação funcional final;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## PENDING permanece sem inferência

Continuam PENDING até decisão real de negócio:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

Q-022 também permanece aberta; não reinterpretar papéis técnicos como cargos de negócio.

## #75/#121 — TOTALMENTE ON HOLD

Não investigar scheduling, não disparar workflows manualmente para prova, não criar fixtures Production, não alterar Storage/R2/S3/retention/secrets/variables e não retomar restore nesta fase.

`REQ-PLAT-005` será retomado no production-readiness final, salvo decisão explícita do operador.
