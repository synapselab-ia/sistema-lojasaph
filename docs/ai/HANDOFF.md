# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Estoque está integrada; a próxima slice é Compras.**

Estado real ao final da implementação funcional:

- `main=3f0049c98f36f351d88ffe20afc5c77d17f73f70` — merge do PR #155;
- PR #155 — `feat: consolidar jornada de Estoque` — merged;
- CI pós-merge #544 / run `33199243676`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Inventory Count Integration #258 / run `33199098224`: success no head final do PR;
- Business Transactions Integration #245 / run `33199098274`: success no head final do PR;
- Issue #142 permanece aberta;
- #75/#121 permanecem **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Não refazer

Slices já integradas:

- PR #145 — remoção da entrada técnica;
- PR #147 — arquitetura da informação + navegação desktop/mobile;
- PR #149 — design system mínimo;
- PR #151 — Administração: Estrutura + Usuários/Permissões;
- PR #152 — reconciliação/handoff de Cadastros;
- PR #153 — Cadastros: Produtos, Fornecedores e Funcionários;
- PR #155 — Estoque consolidado.

Não reabrir Cadastros ou Estoque sem bug ou gap concreto.

## O que o PR #155 entregou

### Estrutura da área

Estoque agora possui visão principal e destinos subordinados:

- `/workspace/estoque` — posição/saldos e atenção operacional;
- `/workspace/estoque/entradas` — entradas;
- `/workspace/estoque/retiradas` — retiradas por setor;
- `/workspace/baixas` — baixas e perdas;
- `/workspace/devolucoes` — devoluções relacionadas a retiradas;
- `/workspace/transferencias` — expedição/recebimento;
- `/workspace/inventarios` — contagens físicas;
- `/workspace/estoque/lotes` — lotes e validades;
- `/workspace/estoque/minimos` — estoque mínimo.

### Contratos preservados

- nenhum schema/migration/RPC/RLS novo;
- entrada, retirada, perdas, devoluções, transferências, inventário e mínimo continuam usando os boundaries existentes;
- saldo não é editado diretamente na visão de posição;
- transferências mantêm expedição e recebimento como etapas distintas;
- inventário mantém proteção contra mudança concorrente durante contagem;
- aumento de item rastreado não inventa lote/validade para contornar a regra existente;
- a UI não homologou FEFO, custeio ou empréstimo.

### UX

- posição ganhou busca/filtro e indicadores objetivos;
- páginas tocadas usam linguagem operacional em vez de jargão de implementação;
- cancelamento de inventário exige confirmação explícita;
- tabelas/históricos críticos ganharam alternativa mobile quando necessário;
- estados read-only/loading/empty/success/error foram tratados conforme o fluxo.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Estoque homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Próxima ação: Compras

O próximo chat deve executar a consolidação de **Compras**, sem refazer Estoque.

Passos obrigatórios:

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system, DoD e open questions;
3. inventariar rotas, páginas, domínio, repositories, gateways, services, RPCs e queries de Compras antes de editar;
4. localizar o boundary autoritativo de criação/edição de pedido e de recebimento;
5. mapear a integração já existente entre recebimento de compra e movimentação de Estoque, evitando qualquer dupla contabilização;
6. mapear permissões/RLS atuais por Organization/Unit e demais escopos relevantes;
7. identificar megapágina, `window.prompt()` ou linguagem técnica ainda presente na jornada atual;
8. definir o contrato `lista → detalhe → ação` quando pedido/recebimento justificar URL estável;
9. separar pedido, recebimento e histórico conforme o comportamento já suportado, sem inventar regra comercial;
10. manter feedback explícito, estados seguros e estratégia mobile deliberada;
11. manter lint, typecheck, tests, build, banco/RLS e Business Transactions Integration verdes; executar outras integrações somente quando afetadas;
12. registrar a ausência de browser real se continuar indisponível.

## Invariantes para Compras

Não permitir que a reorganização visual altere silenciosamente:

- status/transições já aceitas de pedido;
- quantidade pedida versus recebida;
- recebimentos parciais se já suportados;
- vínculo com fornecedor, unidade, produto e condições comerciais existentes;
- geração de movimentação de estoque no recebimento;
- idempotência/atomicidade existente;
- autorização e isolamento por RLS/grants/RPCs.

Se surgir gap real, provar com código/teste antes de criar migration/RPC.

## Fora da próxima slice

Não usar Compras para:

- reabrir Cadastros ou Estoque sem evidência concreta;
- consolidar Financeiro ou Caixa;
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
6. ~~Estoque~~ — PR #155;
7. **Compras** — próxima;
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