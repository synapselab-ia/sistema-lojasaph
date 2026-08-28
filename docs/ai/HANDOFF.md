# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa. A slice de Compras está integrada; a próxima slice é Financeiro.**

Baseline funcional ao final de Compras:

- `main=63d97153cbe90fa13e9316522d1b909b5ed14840` — merge do PR #157;
- PR #157 — `feat: consolidar jornada de Compras` — merged;
- CI pós-merge #553 / run `33203276726`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Business Transactions Integration #251 / run `33203078639`: success no head final do PR;
- Inventory Count Integration #264 / run `33203078624`: success no head final do PR;
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
- PR #157 — Compras consolidado.

Não reabrir Cadastros, Estoque ou Compras sem bug ou gap concreto.

## O que o PR #157 entregou

### Estrutura da área

Compras agora possui visão principal e destinos subordinados:

- `/workspace/compras` — visão de pedidos em andamento e atenção operacional;
- `/workspace/compras/pedidos` — lista pesquisável/filtrável;
- `/workspace/compras/pedidos/novo` — criação de rascunho;
- `/workspace/compras/pedidos/[id]` — detalhe estável e ações contextuais;
- `/workspace/compras/pedidos/[id]/receber` — recebimento total/parcial explícito;
- `/workspace/compras/recebimentos` — entregas já efetivadas;
- `/workspace/compras/historico` — pedidos recebidos/cancelados.

### Contratos preservados

- nenhum schema/migration/RPC/RLS novo;
- criação, emissão, recebimento e cancelamento continuam usando os RPCs existentes;
- recebimento parcial continua suportado;
- quantidade recebida não pode ultrapassar o pendente;
- recebimento continua movimentando Estoque exatamente uma vez pelo mesmo boundary transacional/idempotente;
- lote/validade não ganhou nova semântica de negócio;
- RLS/grants continuam sendo a fronteira de segurança.

### UX

- a antiga megapágina foi removida da experiência normal;
- pedido persistente possui URL própria;
- a lista possui busca/filtro e alternativa mobile;
- pedido mostra quantidade pedida, recebida e pendente;
- recebimento ganhou fluxo vertical dedicado;
- cancelamento deixou de depender de `window.prompt()`;
- estados loading/empty/error/read-only/not-found foram tratados conforme o fluxo.

## Homologação visual

**Não houve browser real disponível nesta execução.**

Não declarar Compras homologado visualmente em desktop/tablet/mobile apenas por build/CI. Também não fazer deploy manual na Vercel apenas para criar essa evidência.

## Próxima ação: Financeiro

O próximo chat deve executar a consolidação de **Financeiro**, sem refazer Compras.

Inventário preliminar já comprovado na `main`:

- somente `/workspace/financeiro/page.tsx` representa a área hoje;
- a página possui aproximadamente 26 KB e concentra visão, criação, parcelas, pagamentos, estornos, cancelamento, anexos e exportação;
- o gateway principal é `src/modules/finance/adapters/supabase-finance-gateway.ts`;
- exportação usa boundary próprio `supabase-payables-export-gateway.ts`;
- anexos já possuem componente/boundary próprio (`FinanceAttachmentsPanel` e APIs server-side existentes);
- `window.prompt()` ainda é usado para motivo de estorno e cancelamento;
- `REQ-FIN-004` continua PENDING e não pode ser resolvido pela refatoração.

### Passos obrigatórios

1. reconciliar `main`, Issue #142, PRs, branches e CI reais;
2. reler `NEXT_ACTION.md`, roadmap, IA, design system, DoD, open questions e requisitos/ADRs de Financeiro;
3. inventariar domínio, tabelas, views, gateways, RPCs, RLS/grants, APIs de anexos e exportação antes de editar;
4. localizar os boundaries autoritativos de criação de documento, pagamento, estorno e cancelamento;
5. provar as regras atuais de documento/parcelas/pagamentos por código e testes;
6. mapear permissões e escopos por Organization/Unit/Sector conforme implementados;
7. definir a navegação e responsabilidades antes do código;
8. preferir `lista → detalhe → ação` para documento/conta persistente;
9. separar criação de documento da listagem/detalhe;
10. tornar pagamento e estorno ações explícitas, sem `window.prompt()`;
11. manter anexos no boundary existente, sem duplicar upload/download nem expor Storage/admin credentials;
12. preservar exportação CSV sem colocá-la como regra de domínio;
13. oferecer estratégia mobile deliberada, feedback e estados seguros;
14. manter lint, typecheck, tests, build, banco/RLS e integrações aplicáveis verdes;
15. registrar a ausência de browser real se continuar indisponível.

## Invariantes para Financeiro

Não permitir que a reorganização visual altere silenciosamente:

- total nominal derivado das parcelas conforme contrato existente;
- status de parcela derivado de vencimento/saldo/eventos;
- pagamento como evento auditável, sem apagar histórico;
- estorno como evento relacionado ao pagamento original;
- pagamentos já estornados não serem estornados novamente;
- documento com pagamento líquido não ser cancelado antes dos estornos exigidos;
- diferenças entre nominal e efetivamente pago permanecerem explícitas, sem classificá-las automaticamente como juros, multa ou desconto;
- referências/instruções de pagamento permanecerem separadas do evento de pagamento;
- anexos privados e autorização server-side;
- idempotência/atomicidade dos comandos;
- RLS/grants/RPCs como boundaries reais de autorização.

`REQ-FIN-004` permanece PENDING. Não decidir nesta slice se a cardinalidade final de pagamentos por parcela deve ser restringida além do que o sistema já suporta.

## Fora da próxima slice

Não usar Financeiro para:

- reabrir Cadastros, Estoque ou Compras sem evidência concreta;
- consolidar Caixa;
- redesenhar Dashboard;
- mudar Q-022/política de autorização;
- resolver `REQ-FIN-004` ou outros PENDINGs por conveniência;
- alterar política de anexos/Storage sem necessidade comprovada da própria jornada;
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
8. **Financeiro** — próxima;
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
