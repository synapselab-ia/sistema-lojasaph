# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Cadastros está integrada; a próxima slice é Estoque.**

Estado real ao final desta execução:

- `main=97a5975ace5f8e011b27a4e8175d13dcee464253`;
- PR #153 — `feat: consolidar jornadas de Cadastros` — merged;
- CI pós-merge #539 / run `33197347690`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Inventory Count Integration #256 e Business Transactions Integration #243 passaram no head final do PR;
- Issue #142 permanece aberta;
- nenhum PR funcional aberto;
- #75/#121 permanecem **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Não refazer

As seguintes slices já estão integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo;
- PR #151 — Administração: Estrutura + Usuários/Permissões;
- PR #152 — reconciliação/handoff de Cadastros;
- PR #153 — Cadastros: Produtos, Fornecedores e Funcionários.

Não reabrir Cadastros sem bug ou gap concreto.

## O que o PR #153 entregou

### Produtos

- `/workspace/produtos`: lista com busca/filtros, tabela desktop e cards mobile;
- `/workspace/produtos/novo`: criação dedicada;
- `/workspace/produtos/[id]`: detalhe estável + edição contextual;
- identificação, categoria, unidade, tipo, EAN, NCM, CEST, status e flags operacionais;
- persistência/autorização continuam nos boundaries existentes;
- teste puro de busca/filtros adicionado.

### Fornecedores

- `/workspace/fornecedores`: lista focada;
- `/workspace/fornecedores/novo`: criação dedicada;
- `/workspace/fornecedores/[id]`: detalhe estável + edição contextual;
- contatos, condições comerciais e produtos fornecidos reunidos no detalhe;
- `SupplierCommercialTermsPanel` e `SupplierItemsPanel` foram reutilizados;
- nenhuma regra comercial nova foi inventada.

### Funcionários

- `/workspace/funcionarios`: lista focada;
- `/workspace/funcionarios/novo`: criação dedicada;
- `/workspace/funcionarios/[id]`: detalhe estável + edição contextual;
- `linkedUserId` preservado internamente e não exposto na UX;
- Employee continua separado de login/membership;
- acesso, papéis e permissões continuam em Administração.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Cadastros homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Próxima ação: Estoque

O próximo chat deve executar a consolidação de **Estoque**, sem refazer Cadastros.

Passos obrigatórios:

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system, DoD e open questions;
3. inventariar rotas, páginas, domínio, repositories, gateways, services, RPCs e queries de Estoque antes de editar;
4. localizar as transações atômicas já existentes para entrada, retirada, perda, devolução, transferência e inventário;
5. mapear permissões/RLS por organização, unidade, local e setor;
6. consolidar posição/saldos, entradas, baixas/perdas, devoluções existentes, transferências, inventários/contagens, lotes/validades e estoque mínimo como uma área coerente;
7. preservar regras críticas fora da UI e reutilizar boundaries existentes;
8. não inventar FEFO, custeio, empréstimo ou qualquer requisito PENDING;
9. reutilizar o design system e criar abstrações genéricas apenas quando o uso repetido provar o contrato;
10. manter lint, typecheck, tests, build, banco/RLS e integrações aplicáveis verdes;
11. registrar a ausência de browser real se continuar indisponível.

## Fora da próxima slice

Não usar Estoque para:

- reabrir Cadastros sem evidência concreta;
- consolidar Compras, Financeiro ou Caixa;
- redesenhar Dashboard;
- mudar Q-022/política de autorização;
- resolver PENDINGs por conveniência;
- retomar #75/#121;
- tocar Production para prova;
- fazer deploy Vercel manual/rotineiro.

## Ordem oficial

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros~~ — PR #153;
6. **Estoque** — próxima;
7. Compras;
8. Financeiro;
9. Caixa;
10. Dashboard;
11. limpeza de linguagem;
12. homologação UX real;
13. reconciliação funcional;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## Guardrails permanentes

GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; #75/#121 permanecem ON HOLD até production-readiness final ou decisão explícita.