# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Financeiro está integrada; a próxima slice é Caixa.**

Baseline funcional ao final de Financeiro:

- `main=692e2fb1ed12085148a04f22c540863b0d699994` — merge do PR #159;
- PR #159 — `feat: consolidar jornada de Financeiro` — merged;
- CI pós-merge #557 / run `33205617449`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- CI #556 / run `33205483532`: success no head final do PR;
- Business Transactions Integration #252 / run `33205483531`: success no head final do PR;
- Inventory Count Integration #265 / run `33205483505`: success no head final do PR;
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
- PR #155 — Estoque consolidado;
- PR #157 — Compras consolidado;
- PR #159 — Financeiro consolidado.

Não reabrir essas áreas sem bug ou gap concreto.

## O que o PR #159 entregou

### Estrutura da área

Financeiro agora possui visão principal e destinos subordinados:

- `/workspace/financeiro` — indicadores, vencimentos que exigem atenção e atalhos;
- `/workspace/financeiro/contas` — lista pesquisável/filtrável;
- `/workspace/financeiro/contas/nova` — criação dedicada de documento e parcelas;
- `/workspace/financeiro/contas/[id]` — detalhe estável, parcelas, anexos e histórico;
- `/workspace/financeiro/contas/[id]/pagar` — registro explícito de pagamento;
- `/workspace/financeiro/vencimentos` — consulta por status derivado;
- `/workspace/financeiro/pagamentos` — histórico de pagamentos e estornos.

### Contratos preservados

- nenhum schema/migration/RPC/RLS novo;
- criação, pagamento, estorno e cancelamento continuam usando os RPCs existentes;
- pagamento continua evento auditável e estorno continua evento relacionado, sem apagar histórico;
- duplo estorno continua bloqueado;
- cancelamento com pagamento líquido continua bloqueado até os estornos necessários;
- diferenças entre nominal e pago permanecem explícitas, sem classificação automática;
- referências/instruções permanecem separadas do pagamento executado;
- anexos continuam privados no boundary existente;
- escopos Organization/Unit/Sector, RLS/grants e idempotência permanecem autoritativos;
- `REQ-FIN-004` continua PENDING.

### UX

- a antiga megapágina deixou de ser a experiência normal;
- documento persistente ganhou URL própria;
- criação e pagamento ganharam fluxos dedicados;
- estorno/cancelamento deixaram de depender de `window.prompt()`;
- listas/históricos possuem alternativa mobile;
- documento inexistente/inacessível usa estado seguro;
- exportação CSV foi preservada.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Financeiro homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Próxima ação: Caixa

O próximo chat deve executar a consolidação de **Caixa**, sem refazer Financeiro.

Inventário preliminar comprovado na `main`:

- `/workspace/caixa/page.tsx` ainda concentra configuração e operação em uma única página;
- o gateway principal é `src/modules/cash/adapters/supabase-cash-gateway.ts`;
- a migration-base é `supabase/migrations/20260818135623_cash_sessions_flow.sql`, posteriormente endurecida pelos escopos/permissões;
- commands idempotentes existentes: `create_cash_register`, `create_payment_method`, `create_fee_rule`, `open_cash_session`, `set_cash_payment_total`, `record_cash_movement`, `close_cash_session`, `cancel_cash_session`;
- a página atual mistura cadastro de caixa, meios de pagamento, regras de taxa, abertura de sessão, totais, movimentos, fechamento, cancelamento e histórico;
- cancelamento de sessão ainda usa `window.prompt()`;
- `REQ-CASH-001..006` já descrevem data/unidade, totais por meio, taxas configuráveis, fundo, movimentos e esperado x contado;
- `REQ-CASH-007` e `REQ-CASH-008` permanecem PENDING;
- Q-007 e Q-009 permanecem abertas e impedem inventar venda individual ou semântica final de consumo de funcionários.

### Passos obrigatórios

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system, DoD, requirements e open questions;
3. inventariar página, gateway, migration, RLS/grants, permissões e testes de Caixa antes de editar;
4. provar como esperado, contado e divergência são calculados/persistidos;
5. provar como totais por meio, taxa e `affects_cash_drawer` entram no esperado;
6. mapear escopo real por Organization/Unit/Register e permissões de configuração/operação;
7. separar configuração administrativa de sessão operacional sempre que o comportamento atual suportar;
8. preferir sessão persistente com URL estável e ações contextuais;
9. separar abertura, detalhe/operação, fechamento/cancelamento e histórico em responsabilidades claras;
10. substituir `window.prompt()` por confirmação explícita sem mudar a regra do RPC;
11. garantir estratégia mobile deliberada e feedback/estados seguros;
12. manter lint, typecheck, tests, build, banco/RLS e integrações aplicáveis verdes;
13. registrar ausência de browser real se persistir.

## Invariantes para Caixa

Não permitir que a reorganização visual altere silenciosamente:

- data de negócio e unidade/caixa da sessão;
- sequência da sessão e unicidade já persistida;
- fundo inicial separado dos totais operacionais;
- totais por meio com bruto, taxa e líquido;
- regras de taxa versionadas/configuráveis, sem hardcode na UI;
- `affects_cash_drawer` conforme configuração existente;
- movimentos de entrada/saída com valor, data, motivo e responsável conforme boundary atual;
- sessão aberta como única situação mutável pelas operações suportadas;
- valor esperado calculado pelo contrato persistente existente;
- valor contado informado no fechamento;
- divergência preservada explicitamente;
- cancelamento sem exclusão física e com auditoria;
- idempotência dos commands;
- RLS/grants/RPCs como boundaries reais de autorização.

`REQ-CASH-007` continua PENDING. Não homologar `employee_consumption` como faturamento, venda ao funcionário, desconto ou consumo gratuito apenas porque o tipo existe tecnicamente.

`REQ-CASH-008` continua PENDING. Não criar vendas individuais, POS/PDV ou integração de vendas nesta slice.

## Fora da próxima slice

Não usar Caixa para:

- reabrir áreas já consolidadas sem evidência concreta;
- redesenhar Dashboard;
- resolver Q-007/Q-009 ou `REQ-CASH-007/008` por conveniência;
- mudar Q-022/política de autorização;
- criar integração de vendas/POS;
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
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. **Caixa** — próxima;
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
