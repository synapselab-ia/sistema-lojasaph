# Current State — Sistema Lojasaph

Última atualização: 2026-08-28

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

Baseline funcional após a consolidação de Financeiro:

- `main=692e2fb1ed12085148a04f22c540863b0d699994` — merge do PR #159;
- PR #159 — `feat: consolidar jornada de Financeiro` — **merged**;
- CI pós-merge da `main` #557 / run `33205617449`: **success**;
- lint, typecheck, unit tests, production build e banco/migrations/RLS: **success**;
- no head final do PR #159, CI #556 / run `33205483532`: **success**;
- no head final do PR #159, Business Transactions Integration #252 / run `33205483531`: **success**;
- no head final do PR #159, Inventory Count Integration #265 / run `33205483505`: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. reconciliação/handoff de Cadastros — PR #152;
6. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
7. Estoque: posição + jornadas operacionais consolidadas — PR #155;
8. Compras: pedidos + recebimentos + histórico consolidados — PR #157;
9. Financeiro: contas, vencimentos, pagamentos e documento estável — PR #159.

## Financeiro consolidado

A área de Financeiro deixou de concentrar visão, criação de documento/parcelas, pagamentos, estornos, cancelamento, anexos e histórico em uma única página.

### Visão da área

`/workspace/financeiro` agora apresenta:

- total nominal;
- pago líquido;
- saldo positivo em aberto;
- quantidade de parcelas vencidas;
- parcelas vencidas ou vencendo hoje que exigem atenção;
- atalhos para Contas a pagar, Vencimentos e Pagamentos;
- exportação CSV já existente para perfis autorizados.

Nenhuma janela arbitrária de “próximos N dias” foi criada.

### Contas a pagar e documento estável

`/workspace/financeiro/contas` passou a ser a lista principal:

- busca por fornecedor, unidade, número, tipo, série ou observação;
- filtro por situação derivada;
- nominal, saldo/diferença e próximo vencimento em aberto;
- tabela desktop e cards mobile;
- URL estável para cada documento.

`/workspace/financeiro/contas/nova` concentra a criação de documento e parcelas usando o mesmo command/RPC idempotente existente.

`/workspace/financeiro/contas/[id]` apresenta:

- fornecedor, unidade e setor;
- identificação documental;
- nominal, pago líquido e saldo/diferença;
- parcelas, vencimentos, status e referências;
- anexos privados pelo boundary já existente;
- histórico de pagamentos e estornos;
- ações contextuais de pagamento, estorno e cancelamento.

Documento inexistente ou inacessível usa estado seguro, sem confirmar existência fora do escopo.

### Pagamento, estorno e cancelamento

`/workspace/financeiro/contas/[id]/pagar` registra pagamento no contexto explícito do documento/parcela e continua chamando o mesmo `record_installment_payment` pelo gateway existente.

A UI deliberadamente não inventa limite `valor pago <= nominal/saldo`, pois o contrato persistente atual preserva diferenças e `REQ-FIN-004`/Q-014/Q-015 permanecem sem decisão adicional.

Estorno e cancelamento deixaram de usar `window.prompt()`:

- estorno usa diálogo explícito com motivo opcional e continua criando evento reverso sem apagar o pagamento original;
- pagamento já estornado não oferece nova ação de estorno na UI e continua protegido pelo banco;
- cancelamento usa diálogo explícito com motivo opcional;
- documento com pagamento líquido continua exigindo estorno antes do cancelamento conforme o RPC existente.

### Vencimentos e pagamentos

- `/workspace/financeiro/vencimentos` consulta parcelas pelos status persistentes/derivados: vencida, vence hoje, a vencer, paga e cancelada;
- `/workspace/financeiro/pagamentos` consulta pagamentos e estornos como eventos separados, com contexto de documento/parcela quando disponível;
- ambas possuem tabela desktop e alternativa mobile própria.

## Boundaries e regras preservados

Nenhum schema, migration, RPC, grant ou policy/RLS foi criado ou alterado para esta consolidação.

Continuam autoritativos:

- `create_payable_document`;
- `record_installment_payment`;
- `reverse_installment_payment`;
- `cancel_payable_document`;
- `SupabaseFinanceGateway` e o registry idempotente existente;
- RLS/grants e escopos por Organization/Unit/Sector;
- status/saldo derivados dos registros persistidos;
- anexos privados e autorização server-side existente;
- exportação CSV pelo gateway próprio.

A consolidação adicionou somente uma consulta read-only dedicada ao detalhe para não depender do limite da visão geral; ela continua sujeita ao mesmo RLS.

A UI não decidiu cardinalidade final de pagamentos, não classificou diferenças financeiras e não alterou Storage.

## Limite de homologação visual

**Não houve homologação em browser real nesta execução.**

Build e CI comprovam integridade técnica, mas não substituem homologação visual desktop/tablet/mobile. Não foi feito deploy Vercel manual apenas para produzir essa evidência.

## Próxima slice oficial: Caixa

**A próxima área da Fase 51 é Caixa. Não refazer Cadastros, Estoque, Compras ou Financeiro sem bug/gap concreto.**

Inventário preliminar já confirmado na `main`:

- `/workspace/caixa` ainda é uma única página que mistura configuração e operação;
- `SupabaseCashGateway` já contém commands idempotentes para criar caixa, meio de pagamento, regra de taxa, abrir sessão, registrar totais, registrar movimento, fechar e cancelar sessão;
- a página atual mistura cadastro de caixas, meios/taxas, abertura de sessão, totais por meio, movimentos, fechamento/cancelamento e histórico;
- cancelamento de sessão ainda usa `window.prompt()`;
- sessões possuem data de negócio e sequência explícitas;
- totais por meio preservam bruto, taxa e líquido;
- fechamento preserva esperado, contado e divergência;
- `REQ-CASH-007` (consumo de funcionários) e `REQ-CASH-008` (integração com vendas) continuam PENDING e não podem ser resolvidos pela reorganização de UX.

A próxima execução deve inventariar também migration/RLS/permissões de Caixa antes de editar e preferir separar **configuração → sessões → detalhe/fechamento → histórico** conforme os boundaries realmente suportados.

Não criar migration/RPC para resolver layout antes de provar gap real.

## Ordem oficial de fechamento do produto

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
11. limpeza de linguagem/resíduos de engenharia;
12. homologação UX em jornadas desktop/tablet/mobile;
13. reconciliação funcional final;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

## PENDING permanece sem inferência

Continuam PENDING até decisão real de negócio, entre outros:

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
