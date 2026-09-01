# Fase 51 — Homologação UX real

Status: **CONCLUÍDA PARA O GATE DE PRODUTO — desktop/mobile com evidência live representativa; tablet deferido por decisão explícita do operador**  
Data: **2026-09-01**  
Issue: **#142**

## Regra de baseline

O HEAD corrente de `main` deve ser consultado no GitHub a cada execução. SHAs/runs abaixo são âncoras de evidência, não baseline eterna.

## Runtime hospedado observado

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

Nenhum deploy Vercel manual foi solicitado ou disparado para produzir evidência.

## Evidência pública já concluída

HTTP/HTML do runtime cobriu:

- `/` sem sessão → Login, sem landing técnica;
- `/workspace` sem sessão → Login preservando `next`;
- `/recuperar-senha` → UX-51-001/002 tratados;
- `/sem-acesso` → UX-51-003 tratado;
- `/auth/atualizar-senha` sem sessão válida;
- estado inicial de `/auth/invite`;
- estado real de `/bootstrap`;
- `/workspace/selecionar-organizacao` sem sessão.

Snapshot gráfico estático com SSR HTML/CSS reais foi executado em Chromium/Playwright para Login, Recuperação com erro e Acesso indisponível em:

- `1440x900` desktop;
- `768x1024` touch/tablet;
- `390x844` touch/mobile.

Resultado: sem overflow horizontal nas combinações; controles/CTAs touch medidos com pelo menos 44 px. Esse snapshot não é browser live e não certifica JS/auth/mutações.

Não repetir essas provas enquanto o runtime da aplicação não mudar.

## Evidência live autenticada — desktop

Em 2026-09-01 o operador abriu o deployment real com sessão legítima.

### Administração após correção do drift

`/workspace/administracao/acessos` carregou normalmente:

- tela **Usuários e permissões**;
- formulário de acesso;
- acessos cadastrados carregados;
- sem `ADMINISTRATION_QUERY_ERROR`.

O screenshot recebido não foi anexado ao GitHub porque continha identificador pessoal; somente a evidência sanitizada foi registrada.

Na mesma navegação, o operador confirmou abertura normal de:

- Visão geral;
- Administração;
- Produtos/Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

## Evidência live autenticada — mobile

Em celular real com sessão legítima, o operador confirmou abertura/navegação normal das superfícies percorridas. Isso comprova execução real do runtime hidratado em mobile, sem transformar a rodada em alegação de teste exaustivo de cada componente/estado.

## Profundidade representativa — desktop/mobile

Depois dos smokes iniciais, foi solicitado um conjunto pequeno e **somente leitura** de jornadas profundas, escolhidas por existirem como rotas reais de lista/detalhe e não exigirem criação de dado artificial:

### Desktop

- Produtos → abrir produto existente → retornar;
- Compras → Pedidos → abrir pedido existente → retornar;
- Financeiro → Contas → abrir conta existente → retornar;
- Caixa → Sessões → abrir sessão existente → retornar.

### Mobile

- abrir o menu;
- entrar em Compras ou Financeiro;
- abrir detalhe quando disponível;
- retornar;
- observar corte, sobreposição, overflow horizontal anormal ou menu sem resposta.

Regra da rodada: se não houvesse registro real disponível, **não criar dado para o teste**; empty state seria evidência válida.

Em 2026-09-01 o operador confirmou explicitamente: **“Os fluxos estão normais”.**

Classificação: **evidência live autenticada representativa de profundidade desktop/mobile**.

Essa confirmação fecha o requisito de profundidade representativa definido para o gate da Fase 51. Ela não significa que todas as mutações, todos os estados `loading/empty/error/success`, todos os tokens auxiliares ou cada combinação possível de viewport foram exercitados em Production.

## Tablet — limitação explicitamente aceita

O operador informou que nem ele nem Asaph possuem tablet e decidiu que **não é necessário testar tablet por enquanto**.

Classificação: **limitação externa residual explicitamente aceita**.

Consequências:

- tablet não é considerado homologado live;
- a ausência do dispositivo não bloqueia este gate da Fase 51;
- não pedir tablet novamente por inércia;
- reabrir somente se uso real de tablet se tornar necessário antes do corte/production-readiness ou por nova decisão explícita.

Existe apenas a evidência estática touch `768x1024` já descrita acima.

## Achados da Fase 51

- **UX-51-001** — target da recuperação: corrigido no #167 e revalidado por HTML/snapshot touch.
- **UX-51-002** — erro de recuperação: corrigido no #167 e revalidado.
- **UX-51-003** — ações pequenas em acesso indisponível: corrigido no #167 e revalidado.
- **UX-51-004** — Administração indisponível por drift de migrations: corrigido operacionalmente no #175 e revalidado live em `/workspace/administracao/acessos`.

Nenhum novo P0/P1 foi reportado na profundidade representativa final.

## UX-51-004 — resumo do incidente fechado

Production estava exatamente duas migrations atrás do Git:

- remoto terminava em `20260827195802`;
- pendentes:
  - `20260828130500_administration_access_management.sql`;
  - `20260828132500_administration_employee_identity.sql`.

Correção:

- PR #175 mergeado em `e7ff15366fec29728308dde8506397f4d68d2c39`;
- CI PR #593 / run `33436348276`: success;
- one-shot `Production Migration Reconcile` #1 / run `33436481787`: success;
- CI pós-merge #594 / run `33436481833`: success;
- aplicação por `supabase db push`, preservando versions Git;
- sem seed/reset/repair/DDL ad hoc;
- reconciliador temporário removido depois.

Paridade read-only posterior confirmou Git e Production até `20260828132500`. Não repetir #175 sem novo drift comprovado.

## Matriz final da Fase 51

| Área | Desktop | Tablet | Mobile | Resultado do gate |
| --- | --- | --- | --- | --- |
| Entrada pública | HTTP/HTML + snapshot | snapshot estático | HTTP/HTML + snapshot | coberta no nível aplicável |
| Navegação/Visão geral | live autenticado | **deferido pelo operador** | live autenticado | representativo |
| Administração | live autenticado; `/acessos` revalidada | **deferido pelo operador** | live autenticado geral | representativo |
| Cadastros | live + detalhe representativo de Produto | **deferido pelo operador** | live | representativo |
| Estoque | live smoke | **deferido pelo operador** | live smoke | cobertura funcional sustentada também por suites transacionais; sem novo achado UX |
| Compras | live + Pedido lista/detalhe/retorno | **deferido pelo operador** | fluxo representativo | representativo |
| Financeiro | live + Conta lista/detalhe/retorno | **deferido pelo operador** | fluxo representativo | representativo |
| Caixa | live + Sessão lista/detalhe/retorno | **deferido pelo operador** | live smoke | representativo |

## Decisão de encerramento

O gate de homologação UX da Fase 51 está **satisfeito dentro das limitações explicitamente declaradas**:

- desktop: live autenticado + profundidade representativa;
- mobile: live autenticado + profundidade representativa;
- tablet: prova live deferida por decisão explícita do operador;
- `/workspace/administracao/acessos`: revalidada após correção do drift;
- nenhum P0/P1 conhecido permanece sem tratamento;
- nenhuma fixture/mutação artificial foi criada para completar checklist.

O próximo passo é a **reconciliação funcional final requisito por requisito**, registrada na Issue #180 e em `docs/qa/final-functional-reconciliation.md`.
