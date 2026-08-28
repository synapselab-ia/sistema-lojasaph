# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — continua como frente ativa.**

Baseline funcional para a próxima execução:

- `main=692e2fb1ed12085148a04f22c540863b0d699994` — merge do PR #159;
- PR #159 — Financeiro consolidado — merged;
- CI pós-merge #557 / run `33205617449`: success;
- lint, typecheck, tests, production build e banco/migrations/RLS: success;
- CI #556 / run `33205483532`: success no head final do PR;
- Business Transactions Integration #252 / run `33205483531`: success no head final do PR;
- Inventory Count Integration #265 / run `33205483505`: success no head final do PR;
- Issue #142 aberta e ativa;
- #75/#121 **TOTALMENTE ON HOLD**.

Não refazer Cadastros, Estoque, Compras ou Financeiro sem bug/gap concreto.

## NEXT_ACTION objetiva

### Executar a próxima slice da Issue #142: **Caixa**

O objetivo é consolidar configuração, sessões, totais por meio de pagamento, movimentos, fechamento e histórico como uma experiência operacional coerente, sem alterar silenciosamente cálculo de esperado/contado/divergência, taxas, escopos, autorização ou requisitos PENDING.

Documentos de autoridade:

- `docs/product/product-completion-ux-roadmap.md`;
- `docs/product/workspace-information-architecture.md`;
- `docs/product/design-system.md`;
- `docs/qa/definition-of-done.md`;
- `docs/product/open-questions.md`;
- `docs/product/requirements.md`;
- migration/RLS/ADRs e testes de Caixa já existentes.

### 1. Reconciliar e inventariar antes de editar

No início da próxima execução:

1. confirmar `main`, Issue #142, PRs, branches e CI reais;
2. reler os documentos de autoridade;
3. inventariar rotas, página, domínio, gateway, RPCs, tabelas, RLS/grants, permissões e testes de Caixa;
4. localizar cadastro de caixa, meios de pagamento e regras de taxa;
5. localizar abertura, totais por meio, movimentos, fechamento, cancelamento e histórico de sessão;
6. provar como `expected_cash_amount`, `counted_cash_amount` e `cash_difference` são calculados/persistidos;
7. provar como `affects_cash_drawer`, fundo inicial e movimentos entram no esperado;
8. mapear escopo real por Organization/Unit/Register e permissões de configuração/operação;
9. identificar megapágina, linguagem técnica e interações provisórias como `window.prompt()`;
10. definir o contrato de navegação e responsabilidade das páginas antes do código.

Inventário preliminar já comprovado:

- `/workspace/caixa/page.tsx` ainda concentra toda a área;
- `SupabaseCashGateway` já possui commands idempotentes para configuração e operação;
- a migration base é `20260818135623_cash_sessions_flow.sql`, com escopos/permissões endurecidos posteriormente;
- cancelamento de sessão ainda usa `window.prompt()`;
- sessões usam `business_date`, sequência e fundo inicial explícitos;
- totais por meio preservam bruto, taxa, líquido e regra de taxa quando aplicada;
- movimentos persistem tipo, valor, horário, motivo e responsável;
- fechamento persiste esperado, contado e divergência;
- `REQ-CASH-007` e `REQ-CASH-008` continuam PENDING.

Não criar schema/RPC novo para resolver layout. Reaproveitar primeiro os boundaries existentes.

### 2. Escopo funcional da consolidação de Caixa

Organizar conforme o comportamento já suportado:

- visão da área com sessões abertas e atenção operacional;
- configuração de caixas físicos por unidade;
- configuração de meios de pagamento;
- regras de taxa versionadas;
- abertura de sessão com data de negócio, sequência e fundo inicial;
- lista/histórico de sessões;
- detalhe estável da sessão quando a entidade persistente justificar URL própria;
- totais por meio de pagamento;
- movimentos de entrada e saída já suportados;
- valor esperado, contado e divergência;
- fechamento;
- cancelamento conforme regra existente.

Preferir separar **configuração → sessões → detalhe/ação → histórico** em vez de manter tudo na mesma página.

### 3. Preservar invariantes de domínio

Não mover regra crítica para componentes React.

Preservar nos boundaries atuais, entre outras regras comprovadas pelo código/testes:

- caixa físico pertence à unidade/organização válidas;
- sessão possui data de negócio explícita e sequência `>= 1`;
- combinação caixa + data + sequência permanece única;
- fundo inicial é não negativo e separado dos totais por meio;
- somente sessão aberta aceita alterações operacionais suportadas;
- total por meio registra bruto, taxa e líquido conforme contrato persistente;
- taxa é configurável/versionada e não deve ser hardcoded na UI;
- regra de taxa, quando indicada, precisa ser válida para meio/data conforme backend;
- `affects_cash_drawer` continua vindo da configuração do meio;
- movimentos aceitos continuam restritos aos tipos e validações persistentes;
- fechamento recebe valor contado não negativo e preserva esperado/contado/divergência;
- cancelamento mantém registro e auditoria, sem exclusão física;
- idempotência dos commands existentes;
- RLS/grants/RPCs permanecem a fronteira real de autorização.

Se surgir gap, provar com código/teste antes de criar migration/RPC.

### 4. Arquitetura de informação e UX

Usar linguagem operacional de caixa, não nomes de tabela/RPC/RLS.

Preferir:

- raiz orientada a sessões abertas, últimas sessões e tarefas principais;
- configuração administrativa separada da operação diária quando suportado;
- lista de sessões pesquisável/filtrável somente quando os dados justificarem;
- URL estável para sessão persistente;
- abertura em fluxo próprio;
- totais e movimentos no contexto da sessão;
- fechamento como ação explícita com esperado, contado e divergência compreensíveis;
- cancelamento em diálogo explícito, sem `window.prompt()`;
- histórico legível sem expor IDs técnicos;
- estados loading/empty/read-only/not-found e feedback claros;
- estratégia mobile deliberada, sem depender apenas de tabela larga;
- reutilização de `src/components/ui` e padrões já provados.

Não criar abstração genérica sem repetição comprovada.

### 5. Configuração de caixa, meios e taxas

Não duplicar regra de configuração dentro da sessão.

- caixas físicos continuam vinculados a unidade;
- meios mantêm código, nome, tipo e `affects_cash_drawer` conforme configuração atual;
- taxa percentual/fixa permanece versionada por vigência;
- não inventar bandeira/adquirente/parcelamento ou outra dimensão de taxa sem decisão real;
- Q-011/Q-012 permanecem referência de dúvidas abertas quando aplicável;
- mudanças de configuração crítica continuam auditáveis pelos boundaries existentes.

### 6. Requisitos/PENDINGs

Não resolver regra de negócio por conveniência de UX.

Em especial:

- `REQ-CASH-007` — consumo de funcionários — continua PENDING por Q-009;
- não transformar `employee_consumption` em faturamento, venda, benefício, desconto em folha ou consumo gratuito sem decisão explícita;
- `REQ-CASH-008` — integração com vendas — continua PENDING por Q-007;
- não criar vendas individuais, POS/PDV, importação automática de vendas ou nova integração nesta slice;
- demais PENDINGs permanecem inalterados.

### 7. Autorização

Q-022 continua aberta.

Portanto:

- não renomear papéis técnicos como cargos de negócio;
- não ampliar ações por conveniência de UI;
- mapear separadamente permissões de configuração de caixa, configuração financeira e operação quando já existirem;
- manter enforcement no server/domain/banco;
- UI apenas reflete disponibilidade e nunca se torna fronteira de segurança;
- não inferir acesso Organization-wide a partir de papel escopado.

### 8. Testes e validação

Adicionar/ajustar testes somente nos contratos tocados, especialmente para:

- filtros/visões puras quando introduzidos;
- estados seguros de sessão inexistente/inacessível;
- abertura com data/caixa/sequence/fundo válidos;
- total por meio e taxa;
- movimentos em sessão aberta;
- esperado/contado/divergência no fechamento;
- cancelamento sem exclusão;
- idempotência/duplicidade;
- autorização/isolamento por escopo;
- responsividade por estrutura/contrato quando possível.

Manter verdes:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- CI PostgreSQL/RLS aplicável;
- Business Transactions Integration quando Caixa estiver coberto/afetado;
- demais integrações somente quando realmente afetadas.

Se browser real permitido estiver disponível, validar jornadas críticas em desktop e mobile. Se não estiver, registrar a limitação; **não fazer deploy Vercel manual apenas para homologação**.

### 9. Guardrails desta execução

Não:

- reabrir áreas já consolidadas sem evidência concreta;
- redesenhar Dashboard;
- resolver Q-007/Q-009 ou `REQ-CASH-007/008`;
- criar integração POS/PDV/vendas;
- mudar Q-022/política de autorização;
- fazer migração cosmética em massa;
- tocar Production para prova;
- retomar #75/#121;
- fazer deploy Vercel manual/rotineiro.

## Critérios de aceite para Caixa

A slice só pode ser encerrada quando:

- configuração e operação diária deixam de competir na mesma megapágina;
- sessões possuem jornada coerente e navegável;
- sessão persistente possui contexto/URL estável quando aplicável;
- abertura, totais, movimentos e fechamento têm responsabilidades claras;
- esperado, contado e divergência ficam compreensíveis sem recalcular regra crítica em React;
- cancelamento não depende de `window.prompt()`;
- histórico preserva sessões e movimentos auditáveis;
- mobile não depende apenas de overflow horizontal;
- estados loading/empty/error/read-only/not-found e feedback são tratados;
- permissões/RLS continuam a fronteira real;
- `REQ-CASH-007/008` e demais PENDINGs permanecem sem inferência;
- lint, typecheck, testes, build, banco/RLS e integrações aplicáveis estão verdes;
- ausência de browser/homologação visual é registrada honestamente se persistir;
- `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` são reconciliados.

## Depois de Caixa

Somente após a integração da consolidação de Caixa, promover:

> **Dashboard**

Não saltar diretamente para limpeza/homologação.

## Ordem macro

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

## #75/#121 permanecem ON HOLD

Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables, Production fixtures ou evidência de proteção durante a consolidação funcional. O hold só termina por decisão explícita ou no production-readiness final.
