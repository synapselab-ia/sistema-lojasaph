# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Estado real de partida para a próxima execução:

- `main=3f0049c98f36f351d88ffe20afc5c77d17f73f70` — merge do PR #155;
- PR #155 — Estoque consolidado — merged;
- CI pós-merge #544 / run `33199243676`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- Inventory Count Integration #258 e Business Transactions Integration #245: success no head final do PR;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Cadastros ou Estoque sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **Compras**

O objetivo é consolidar a jornada de pedidos e recebimentos como uma experiência coerente, com contexto estável e linguagem operacional, sem alterar silenciosamente regras comerciais, integração com Estoque, escopo, RLS ou requisitos PENDING.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- ADRs e requisitos de Compras/Estoque já existentes.

### 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. inventariar rotas, páginas, domínio, repositories, gateways, services, RPCs e queries de Compras;
4. localizar criação/edição de pedido, transições de status, recebimentos e histórico;
5. localizar a integração autoritativa entre recebimento e entrada de Estoque;
6. mapear permissões/RLS atuais por Organization/Unit e demais escopos aplicáveis;
7. identificar megapáginas, `window.prompt()` e linguagem técnica ainda presente;
8. definir o contrato de navegação e responsabilidade das páginas antes do código.

Não criar schema/RPC novo para resolver layout. Reaproveitar primeiro os boundaries existentes.

### 2. Escopo funcional da consolidação de Compras

Organizar conforme o comportamento já suportado:

- lista/visão de pedidos;
- criação de pedido quando existente;
- detalhe estável do pedido quando a entidade justificar URL própria;
- itens e quantidades pedidas;
- fornecedor e unidade/contexto existentes;
- recebimentos totais/parciais já suportados;
- histórico e estado do pedido;
- feedback e contexto do impacto do recebimento no Estoque.

Preferir `lista → detalhe → ação` em vez de concentrar criação, edição, recebimento e histórico na mesma página.

### 3. Preservar invariantes de domínio

Não mover regra crítica para componentes React.

Preservar nos boundaries atuais, entre outras regras comprovadas pelo código/testes:

- transições de status válidas;
- quantidade pedida versus quantidade recebida;
- recebimento parcial se já suportado;
- vínculo com fornecedor, unidade, produto e condições comerciais existentes;
- movimentação de estoque gerada pelo recebimento sem dupla contabilização;
- atomicidade/idempotência já implementadas;
- RLS/grants/RPCs como fronteira real de autorização.

Se surgir gap, provar com código/teste antes de criar migration/RPC.

### 4. Arquitetura de informação e UX

Usar linguagem de compra/operação, não nomes de tabela/RPC/RLS.

Preferir:

- lista pesquisável/filtrável se o volume e os dados existentes justificarem;
- URL estável para detalhe do pedido;
- ações contextuais no detalhe;
- recebimento em fluxo explícito, sem `window.prompt()`;
- feedback claro sobre sucesso/erro e quantidade recebida/pendente;
- estados loading/empty/read-only/not-found seguros;
- estratégia mobile deliberada, sem depender apenas de tabela larga.

Reutilizar `src/components/ui` e os padrões já provados em Cadastros/Estoque. Não criar abstração genérica sem repetição comprovada.

### 5. Relação com Cadastros e Estoque

Não duplicar manutenção de:

- Produto;
- Fornecedor;
- estrutura/unidades;
- saldos/lotes de Estoque.

Compras pode referenciar esses contextos, mas o recebimento deve continuar usando o boundary autoritativo existente para movimentar Estoque.

### 6. Requisitos/PENDINGs

Não resolver requisito de negócio por conveniência visual.

Em especial:

- não decidir custeio (`REQ-STK-010`) dentro da UI de Compras;
- não homologar FEFO (`REQ-EXP-004`) a partir do recebimento;
- não inventar novas condições comerciais, aprovação ou política de compra sem evidência existente;
- demais PENDINGs continuam inalterados.

### 7. Autorização

Q-022 continua aberta.

Portanto:

- não renomear papéis técnicos como cargos de negócio;
- não ampliar ações por conveniência de UI;
- manter checks no server/domain/banco quando já existirem;
- UI apenas reflete disponibilidade, não se torna fronteira de segurança.

### 8. Testes e validação

Adicionar/ajustar testes somente nos contratos tocados, especialmente para:

- transições de pedido;
- recebimento total/parcial;
- prevenção de recebimento além do permitido;
- integração pedido → Estoque sem duplicação;
- autorização/isolamento;
- estados seguros de pedido inexistente/inacessível;
- filtros/visões puras quando houver.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- Business Transactions Integration;
- outras integrações apenas quando realmente afetadas.

Se browser real permitido estiver disponível, validar jornadas críticas em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

### 9. Guardrails desta execução

Não:

- reabrir Cadastros ou Estoque sem evidência concreta;
- consolidar Financeiro ou Caixa;
- redesenhar Dashboard;
- mudar Q-022/política de autorização;
- resolver PENDINGs;
- fazer migração cosmética em massa;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite para Compras

A slice só pode ser encerrada quando:

- pedidos e recebimentos formam uma jornada coerente e navegável;
- entidade persistente relevante possui contexto/URL estável quando aplicável;
- recebimento não depende de prompt técnico do navegador;
- regras comerciais/transacionais permanecem fora da UI;
- recebimento atualiza Estoque exatamente uma vez pelo boundary existente;
- quantidade pedida/recebida/pendente fica compreensível;
- mobile não depende apenas de overflow horizontal;
- estados loading/empty/error/read-only/not-found e feedback são tratados;
- permissões/RLS continuam a fronteira real;
- requisitos PENDING permanecem sem inferência;
- lint, typecheck, testes, build, banco/RLS e integrações aplicáveis estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois de Compras

Somente após a integração da consolidação de Compras, promover:

> **Financeiro**

Não saltar diretamente para Caixa/Dashboard.

## Ordem macro

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

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. O hold só termina por decisão explícita ou no production-readiness final.