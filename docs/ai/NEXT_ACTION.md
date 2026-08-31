# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

A homologação UX real foi iniciada e permanece **EM ANDAMENTO**.

Baseline atual:

- `main=044cb2099c1285d298040fdc2f12260fbaa2ca3f`;
- PR #167 — correções dos primeiros achados públicos de UX — merged;
- CI do PR #167 #575 / run `33402272680`: success;
- CI pós-merge #576 / run `33402440077`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Administração, Cadastros, Estoque, Compras, Financeiro, Caixa, Dashboard ou limpeza de linguagem sem bug/gap concreto.

## Evidência já produzida

A matriz está em `docs/qa/fase51-ux-homologation.md`.

Sobre o deployment automático `READY` que representava `main=3f99f5c79f05dd6ea494814f924c1cbb2f60fc0a`, foram exercitados com segurança:

- `/` sem sessão;
- `/login`;
- `/workspace` sem sessão;
- `/recuperar-senha`;
- `/sem-acesso`;
- `/auth/atualizar-senha` sem sessão/token válido.

Foram encontrados e corrigidos pelo PR #167:

- `UX-51-001` — link de retorno da recuperação sem target mínimo de toque;
- `UX-51-002` — erro geral da recuperação fora do contrato acessível `FeedbackMessage`/`role="alert"`;
- `UX-51-003` — links de ação em `/sem-acesso` sem target mínimo e feedback geral fora do padrão compartilhado.

Nenhuma regra de autenticação, sessão, autorização, banco ou negócio foi alterada.

## Estado do ambiente

O antigo bloqueio de deployment defasado em `0329ec...` não vale mais: a integração GitHub/Vercel publicou automaticamente `3f99f5c...`, que já incluía Caixa #161, Dashboard #163 e limpeza #165.

Após o merge do PR #167, **ainda não havia deployment automático observado para `044cb209...` na última consulta desta execução**.

Isso não autoriza criar ou promover deployment manual. Reconsultar a integração na próxima execução e usar somente deployment automático que represente exatamente o `main` corrente.

### Bloqueios que ainda impedem encerrar a homologação

- o acesso Vercel disponível permite inspeção de HTML/redirects, mas não um browser gráfico controlável por viewport/foco/teclado;
- o runtime local possui Chromium/Playwright, mas não consegue acessar hosts externos nem obter o checkout do repositório;
- não há integração adicional de browser disponível nesta sessão;
- não há sessão/credencial de teste aprovada no contexto atual para jornadas autenticadas;
- Production não pode receber usuários, fixtures ou dados artificiais de prova.

## NEXT_ACTION objetiva

### **Continuar a homologação real de UX em desktop/tablet/mobile e fechar a matriz somente com evidência real**

Esta etapa continua sendo de homologação e correção orientada por evidência. **Não promover reconciliação funcional ainda.**

Documentos de autoridade:

- `docs/qa/fase51-ux-homologation.md`;
- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/requirements.md`;
- `docs/product/open-questions.md`.

## 1. Reconciliar antes de testar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. confirmar o estado do PR #167 e CI #576;
3. consultar deployments Vercel somente leitura;
4. identificar o deployment automático que corresponda exatamente ao `main` corrente;
5. **não disparar deploy Vercel manual/rotineiro**;
6. se `044cb209...` ou um commit posterior de `main` já estiver `READY`, revalidar primeiro `/recuperar-senha` e `/sem-acesso` para fechar UX-51-001/002/003 no ambiente hospedado;
7. se o deployment exato ainda não existir, registrar o bloqueio; não testar uma versão anterior como se fosse a atual.

## 2. Browser e sessão

Para certificar a matriz desktop/tablet/mobile é obrigatório usar browser real com controle de viewport e interação.

Antes das jornadas autenticadas:

- confirmar que existe sessão/credencial de teste aprovada;
- não usar credencial inventada;
- não afrouxar autenticação/RLS para testar;
- não criar usuário ou fixture em Production;
- não executar ações destrutivas sobre dados reais apenas para gerar evidência.

Se browser ou sessão continuarem indisponíveis, registrar `bloqueio de ambiente` e manter a slice aberta. Não substituir por CI, CSS ou inspeção estática.

## 3. Matriz mínima de viewports

Quando o browser estiver disponível, registrar dimensões efetivamente usadas para pelo menos:

- **desktop** — largura típica de notebook/desktop;
- **tablet** — largura intermediária que force adaptação de layout;
- **mobile** — largura de telefone com navegação por drawer.

Para cada jornada registrar resultado por viewport em `docs/qa/fase51-ux-homologation.md`.

## 4. Jornadas prioritárias remanescentes

### Entrada e contexto

- revalidar recuperação e acesso indisponível após PR #167;
- login interativo somente com credencial aprovada;
- seleção/troca de organização;
- logout;
- convite/definição de senha somente quando existir token de teste legítimo.

### Navegação e Visão geral

- sidebar desktop;
- drawer mobile, abertura/fechamento/foco/teclado;
- estado ativo de área/subárea;
- Visão geral e filtros;
- links de alertas/cards para jornadas específicas.

### Administração

- Estrutura;
- Usuários e permissões;
- Proteção dos dados somente leitura, sem retomar #75/#121.

### Cadastros

- Produtos;
- Fornecedores;
- Funcionários.

### Estoque

- posição e filtros;
- entradas;
- retiradas;
- baixas/perdas;
- devoluções;
- transferências;
- inventários;
- lotes/validades;
- estoque mínimo.

### Compras

- visão/lista;
- criação/detalhe somente em ambiente/dados seguros;
- recebimento/histórico;
- emissão/cancelamento apenas quando a ação for segura e aprovada.

### Financeiro

- visão/lista;
- documento/detalhe;
- vencimentos/histórico;
- pagamento/estorno/cancelamento somente quando houver dados de teste aprovados.

### Caixa

- visão;
- sessões;
- abertura/detalhe/fechamento somente quando seguro;
- configuração conforme permissão.

## 5. O que observar

Para cada jornada/viewport verificar:

- hierarquia e clareza da tarefa;
- navegação `lista → detalhe → ação → retorno`;
- rota ativa e links quebrados;
- overflow/truncamento/tabelas em telas menores;
- drawer/dialog/foco/teclado;
- touch targets;
- labels, helper text e feedback;
- loading/empty/error/success;
- ações inadequadas ao estado/permissão;
- inconsistência desktop/tablet/mobile;
- qualquer resíduo técnico ainda visível.

## 6. Tratamento dos achados

Cada achado deve conter:

- rota/jornada;
- viewport;
- passos de reprodução;
- observado versus esperado;
- evidência verificável;
- classificação (`bug`, `gap de UX`, `acessibilidade`, `responsividade` ou `bloqueio de ambiente`);
- status da correção/revalidação.

Corrigir somente o que for comprovado. Se o problema tocar domínio, autorização, schema ou regra crítica, reconciliar requirements/ADRs antes de mudar comportamento.

## 7. Validação técnica após correções

Manter verdes, quando houver código alterado:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- integrações de banco somente quando afetadas.

Não disparar workflow adicional apenas para “ter evidência” se o workflow normal já cobre a mudança.

## 8. Critério de aceite para encerrar homologação

A homologação só pode ser encerrada quando:

- a matriz representativa tiver evidência real em desktop/tablet/mobile, ou cada item impossibilitado tiver bloqueio externo explicitamente aceito pelo operador;
- os achados relevantes estiverem corrigidos e revalidados;
- o deployment/ambiente observado corresponder ao código certificado;
- jornadas autenticadas tiverem sido percorridas com sessão aprovada, sem dados artificiais em Production;
- Q-022 e PENDINGs permanecerem intactos;
- #75/#121 permanecerem on hold;
- gates aplicáveis estiverem verdes;
- `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION` e a evidência QA estiverem reconciliados.

## Depois da homologação UX

Somente então promover:

> **reconciliação funcional final usando critério de usabilidade, não apenas existência técnica.**

## Ordem macro

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
12. **homologação UX real — em andamento**;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante esta slice. O hold só termina por decisão explícita ou no production-readiness final.
