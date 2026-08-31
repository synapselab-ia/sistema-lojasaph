# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de limpeza de linguagem/resíduos de engenharia foi integrada; a próxima slice é homologação UX real em desktop/tablet/mobile.**

Baseline funcional:

- PR #165 — `refactor: limpar linguagem técnica da experiência normal` — merged;
- merge funcional `602c840788026ce6b520d0c441b672b48063476e`;
- CI do PR #165 #569: success;
- Business Transactions Integration #256: success;
- Inventory Count Integration #269: success;
- CI pós-merge #570 / run `33398505368`: success;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: success;
- Issue #142 permanece aberta;
- nenhum PR concorrente estava aberto na reconciliação de 2026-08-31;
- #75/#121 permanecem **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

`602c840...` é o baseline funcional. Commits posteriores podem ser exclusivamente documentais.

## Não refazer

Slices já integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo;
- PR #151 — Administração: Estrutura + Usuários/Permissões;
- PR #153 — Cadastros: Produtos, Fornecedores e Funcionários;
- PR #155 — Estoque consolidado;
- PR #157 — Compras consolidado;
- PR #159 — Financeiro consolidado;
- PR #161 — Caixa consolidado;
- PR #163 — Dashboard / Visão geral consolidado;
- PR #165 — limpeza de linguagem/resíduos de engenharia.

Não reabrir essas áreas por preferência estética. Corrigir somente bugs ou gaps comprovados durante a homologação.

## O que o PR #165 entregou

### Shell, autenticação e contexto

A experiência normal deixou de expor termos de infraestrutura e implementação como:

- `Workspace persistente`;
- Supabase/RLS;
- cookie `httpOnly`;
- `membership`;
- backend/provider;
- Auth/runbook/allowlist em mensagens voltadas ao operador.

A lógica interna de sessão, seleção de organização e autorização não mudou.

### Administração

Usuários e permissões continuam usando os perfis técnicos existentes. A UI reforça que esses perfis **não equivalem automaticamente a cargos reais**.

Q-022 permanece aberta e não foi reinterpretada.

### Proteção dos dados

A tela passou a falar em banco de dados, cópia válida, prazo entre cópias, retenção, anexos e restauração em vez de RLS/PostgreSQL/RPO/provider/Production.

Não houve mudança de política. Permanecem iguais os cálculos, os estados de saúde, a retenção, a cobertura e a limitação de anexos.

#75/#121 continuam totalmente on hold.

### Estoque, Financeiro e Caixa

Helper texts e feedbacks deixaram de narrar detalhes como `fluxo autoritativo`, `eventos persistidos`, `backend` ou `já implementado`.

Foram preservados:

- seleção automática de lotes sem promessa de FEFO;
- ausência de nova política de custeio;
- diferenças financeiras sem classificação inferida;
- estorno auditável;
- regras de Caixa, vigência de taxas e fechamento.

### Segurança e contratos

Nenhum schema, migration, RPC, grant, RLS, autorização ou boundary transacional foi alterado pelo PR #165.

## Validação do PR #165

Head final:

- CI #569: success;
- lint: success;
- typecheck: success;
- unit tests: success;
- production build: success;
- banco/migrations/RLS: success;
- Business Transactions Integration #256: success;
- Inventory Count Integration #269: success.

Após o merge:

- CI #570 / run `33398505368`: success;
- jobs `validate` e `database`: success.

## Limite atual

**Ainda não houve homologação real completa em browser das jornadas desktop/tablet/mobile.**

Não usar CI/build como substituto dessa evidência. Também não fazer deploy Vercel manual apenas para homologar.

### Preflight Vercel já realizado

Consulta somente leitura ao projeto Vercel `sistema-lojasaph` em 2026-08-31 confirmou:

- o projeto está conectado ao repositório `synapselab-ia/sistema-lojasaph`;
- o deployment Production mais recente disponível está `READY`;
- esse deployment corresponde ao commit **`0329ec389521f32e6378429c81b3f444a7b6898a`**, mensagem `docs: reconciliar handoff após Financeiro (#160)`;
- portanto ele é **anterior** às slices de Caixa #161, Dashboard #163 e limpeza de linguagem #165.

Conclusão: **`sistema-lojasaph.vercel.app` não representa o baseline funcional atual e não pode ser usado para certificar a homologação da Fase 51 atual.**

Nenhum deployment foi criado ou promovido durante esse preflight. Não disparar deploy manual para contornar o bloqueio. A próxima execução deve preferir uma execução local isolada do código atual, caso consiga prover um backend/credencial de teste aprovado sem usar Production; caso contrário, registrar as jornadas autenticadas como bloqueadas por ambiente.

## Próxima ação: homologação UX real

O próximo chat deve executar a slice de **homologação real de UX em jornadas completas**, conforme a etapa seguinte da Issue #142.

### Objetivo

Validar a aplicação existente como produto em tamanhos de tela e jornadas reais, encontrando regressões ou gaps concretos antes da reconciliação funcional final.

### Preparação obrigatória

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system e Definition of Done;
3. não usar o deployment Production atual para certificar as slices pós-#160, pois ele está comprovadamente defasado;
4. identificar um ambiente seguro que represente o código atual;
5. não disparar deploy Vercel manual/rotineiro para criar esse ambiente;
6. não usar Production como laboratório e não criar fixtures nela;
7. confirmar se existe sessão/credencial de teste aprovada para jornadas autenticadas; se não existir, registrar o bloqueio e homologar apenas o que for seguro/acessível, sem inventar credenciais.

### Jornadas prioritárias

Cobrir, com evidência de browser quando possível:

1. entrada → login → recuperação de senha;
2. seleção/troca de organização e navegação principal;
3. Visão geral e filtros;
4. Administração → Estrutura e Usuários/permissões;
5. Cadastros → Produtos, Fornecedores e Funcionários;
6. Estoque → posição, entrada, retirada, baixa, devolução, transferência, inventário, lotes e mínimos;
7. Compras → lista, criação, detalhe, recebimento e histórico;
8. Financeiro → lista, criação, detalhe, pagamento, vencimentos e histórico;
9. Caixa → visão, sessões, abertura/detalhe/fechamento e configuração.

### Viewports

Validar pelo menos:

- desktop;
- tablet;
- mobile.

Não limitar a revisão a screenshots estáticos. Navegar, abrir drawers/dialogs, preencher formulários seguros, usar filtros e percorrer estados de loading/empty/error quando reproduzíveis sem adulterar dados reais.

### O que observar

- hierarquia e clareza da tarefa;
- navegação ativa e retorno entre lista/detalhe/ação;
- overflow, truncamento e tabelas em telas menores;
- drawer mobile e foco/teclado;
- labels, helper text e mensagens;
- ações indisponíveis conforme permissão/estado;
- diálogos destrutivos;
- formulários e validações;
- inconsistência entre desktop e mobile;
- resíduos técnicos ainda visíveis;
- links quebrados ou rotas antigas.

### Como tratar achados

- registrar evidência concreta por jornada/viewport;
- classificar como bug, gap de UX ou bloqueio de ambiente;
- corrigir somente o que for comprovado;
- não usar homologação para inventar regra de negócio;
- manter Q-022 e PENDINGs intactos;
- se houver código alterado, passar lint, typecheck, testes, build e gates aplicáveis antes do merge.

## Depois da homologação UX

Somente após registrar/corrigir os achados e reconciliar a documentação, promover:

> **reconciliação funcional final usando critério de usabilidade, não apenas existência técnica.**

## Ordem oficial

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
12. **homologação UX real** — próxima;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## Guardrails permanentes

GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; Q-022 e requisitos PENDING permanecem sem inferência; #75/#121 permanecem ON HOLD até production-readiness final ou decisão explícita.
