# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Baseline funcional para a próxima execução:

- `main=63d97153cbe90fa13e9316522d1b909b5ed14840` — merge do PR #157;
- PR #157 — Compras consolidado — merged;
- CI pós-merge #553 / run `33203276726`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Business Transactions Integration #251 / run `33203078639`: success no head final do PR;
- Inventory Count Integration #264 / run `33203078624`: success no head final do PR;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Cadastros, Estoque ou Compras sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **Financeiro**

O objetivo é consolidar documentos/contas a pagar, parcelas, pagamentos, estornos, anexos e histórico como uma jornada coerente, com contexto estável e linguagem operacional, sem alterar silenciosamente regras financeiras, escopos, autorização, Storage ou requisitos PENDING.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- `docs/product/requirements.md`;
- ADRs e requisitos financeiros/anexos já existentes.

### 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. inventariar rotas, páginas, domínio, gateways, RPCs, views, queries, APIs, RLS/grants e testes de Financeiro;
4. localizar criação/cancelamento de documento, parcelas, registro/estorno de pagamentos, instruções/referências de pagamento e cálculo de status/saldo;
5. localizar o boundary de anexos privados e a exportação CSV existente;
6. mapear permissões/escopos atuais por Organization/Unit/Sector e demais dimensões realmente usadas;
7. identificar linguagem técnica, megapágina e interações provisórias como `window.prompt()`;
8. definir o contrato de navegação e responsabilidade das páginas antes do código.

Inventário preliminar já comprovado:

- `/workspace/financeiro/page.tsx` é hoje uma única página de aproximadamente 26 KB;
- ela mistura visão geral, criação de documento/parcelas, pagamentos, estornos, cancelamento, anexos e histórico;
- `SupabaseFinanceGateway` já possui commands idempotentes para criação de documento, pagamento, estorno e cancelamento;
- `FinanceAttachmentsPanel` e APIs server-side já formam boundary próprio para anexos;
- a exportação usa gateway próprio;
- estorno e cancelamento ainda usam `window.prompt()`.

Não criar schema/RPC novo para resolver layout. Reaproveitar primeiro os boundaries existentes.

### 2. Escopo funcional da consolidação de Financeiro

Organizar conforme o comportamento já suportado:

- visão/lista de contas a pagar/documentos;
- busca/filtros somente quando os dados existentes justificarem;
- criação dedicada de documento com parcelas;
- detalhe estável do documento quando a entidade persistente justificar URL própria;
- fornecedor, unidade/setor e identificação documental existentes;
- parcelas com nominal, vencimento, pago líquido, saldo/diferença e status derivados;
- instruções/referências de pagamento;
- registro de pagamento;
- histórico de pagamentos e estornos;
- cancelamento de documento conforme regra existente;
- anexos privados;
- exportação CSV existente;
- indicadores de vencimento/saldo que já possam ser derivados sem inventar regra.

Preferir `lista → detalhe → ação` em vez de concentrar criação, pagamento, estorno, cancelamento, anexos e histórico na mesma página.

### 3. Preservar invariantes de domínio

Não mover regra crítica para componentes React.

Preservar nos boundaries atuais, entre outras regras comprovadas pelo código/testes:

- documento exige conjunto válido de parcelas;
- unidade/setor/fornecedor devem permanecer disponíveis no escopo real;
- valores monetários mantêm precisão e validações existentes;
- status da parcela permanece derivado de vencimento, saldo e eventos persistidos;
- pagamento permanece evento auditável separado;
- estorno não apaga o pagamento original e referencia o evento revertido;
- somente pagamento reversível pode ser estornado e pagamento já estornado não pode ser estornado novamente;
- documento com pagamentos líquidos não pode ser cancelado antes dos estornos exigidos pelo contrato atual;
- diferença entre nominal e pago permanece explícita, sem ser classificada automaticamente como juros, multa, desconto ou outra categoria;
- referências/instruções de pagamento continuam separadas do pagamento executado;
- idempotência/atomicidade já implementadas;
- RLS/grants/RPCs continuam a fronteira real de autorização.

Se surgir gap, provar com código/teste antes de criar migration/RPC.

### 4. Arquitetura de informação e UX

Usar linguagem financeira/operacional, não nomes de tabela/RPC/RLS/Storage.

Preferir:

- visão de contas a pagar orientada a fornecedor, vencimento, saldo e situação;
- URL estável para documento/conta persistente quando aplicável;
- criação em fluxo próprio;
- pagamento como ação explícita no contexto da parcela/documento;
- estorno e cancelamento em diálogos/formulários explícitos, sem `window.prompt()`;
- histórico financeiro legível sem expor IDs técnicos;
- feedback claro de sucesso/erro;
- estados loading/empty/read-only/not-found seguros;
- estratégia mobile deliberada, sem depender apenas de tabela larga;
- reutilização de `src/components/ui` e padrões provados em Cadastros/Estoque/Compras.

Não criar abstração genérica sem repetição comprovada.

### 5. Anexos e exportação

Não duplicar nem enfraquecer os boundaries existentes.

Para anexos:

- preservar `FinanceAttachmentsPanel`/APIs existentes quando a responsabilidade continuar adequada;
- manter bucket/objetos privados;
- não expor admin client, secret, signed URL permanente ou Storage como detalhe da UX;
- autorização server-side/RLS continua obrigatória;
- não transformar esta slice em trabalho de backup Storage (#121 permanece ON HOLD).

Para exportação:

- manter o gateway CSV existente;
- tratar exportar como ação de produto quando útil, não como substituto da jornada normal;
- não alterar contrato de dados por conveniência visual sem prova de necessidade.

### 6. Requisitos/PENDINGs

Não resolver regra financeira por conveniência de UI.

Em especial:

- `REQ-FIN-004` — cardinalidade final de pagamentos — continua PENDING;
- não impor artificialmente “um pagamento por parcela” nem outra cardinalidade sem decisão explícita;
- não interpretar diferença nominal/pago como juros/multa/desconto automaticamente;
- demais PENDINGs permanecem inalterados.

### 7. Autorização

Q-022 continua aberta.

Portanto:

- não renomear papéis técnicos como cargos de negócio;
- não ampliar ações financeiras por conveniência de UI;
- manter enforcement no server/domain/banco quando já existir;
- UI apenas reflete disponibilidade e nunca se torna fronteira de segurança;
- não inferir acesso Organization-wide a partir de papel escopado.

### 8. Testes e validação

Adicionar/ajustar testes somente nos contratos tocados, especialmente para:

- filtros/visões puras quando introduzidos;
- estados seguro de documento inexistente/inacessível;
- criação de documento/parcelas quando o contrato de UI mudar;
- pagamento e saldo/status derivados;
- estorno e prevenção de duplo estorno;
- cancelamento bloqueado quando pagamentos líquidos exigirem estorno prévio;
- autorização/isolamento por escopo;
- anexos apenas se o boundary for tocado;
- responsividade por estrutura/contrato quando possível tecnicamente.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- Business Transactions Integration se Financeiro estiver coberto/afetado;
- demais integrações somente quando realmente afetadas.

Se browser real permitido estiver disponível, validar jornadas críticas em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

### 9. Guardrails desta execução

Não:

- reabrir Cadastros, Estoque ou Compras sem evidência concreta;
- consolidar Caixa;
- redesenhar Dashboard;
- mudar Q-022/política de autorização;
- resolver `REQ-FIN-004` ou outros PENDINGs;
- refazer arquitetura de anexos/Storage sem gap concreto;
- fazer migração cosmética em massa;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite para Financeiro

A slice só pode ser encerrada quando:

- documentos/contas, parcelas e pagamentos formam jornada coerente e navegável;
- entidade persistente relevante possui contexto/URL estável quando aplicável;
- criação deixa de competir com listagem/histórico na mesma megapágina;
- pagamento possui contexto claro de parcela/documento;
- estorno/cancelamento não dependem de `window.prompt()`;
- nominal, pago, saldo/diferença, vencimento e status ficam compreensíveis;
- histórico preserva pagamentos e estornos como eventos auditáveis;
- anexos continuam privados e no boundary seguro existente;
- mobile não depende apenas de overflow horizontal;
- estados loading/empty/error/read-only/not-found e feedback são tratados;
- permissões/RLS continuam a fronteira real;
- `REQ-FIN-004` e demais PENDINGs permanecem sem inferência;
- lint, typecheck, testes, build, banco/RLS e integrações aplicáveis estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois de Financeiro

Somente após a integração da consolidação de Financeiro, promover:

> **Caixa**

Não saltar diretamente para Dashboard.

## Ordem macro

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

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. O hold só termina por decisão explícita ou no production-readiness final.
