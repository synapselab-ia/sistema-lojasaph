# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

A slice de **limpeza de linguagem/resíduos de engenharia da experiência normal** foi integrada pelo PR #165.

Baseline funcional comprovado:

- PR #165 — `refactor: limpar linguagem técnica da experiência normal` — **merged**;
- merge funcional: `602c840788026ce6b520d0c441b672b48063476e`;
- CI do head do PR #165 #569: **success**;
- Business Transactions Integration #256: **success**;
- Inventory Count Integration #269: **success**;
- CI pós-merge da `main` #570 / run `33398505368`: **success**;
- lint, typecheck, unit tests, production build e job de banco/migrations/RLS: **success**;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro foi feito.

A documentação pode receber commits posteriores sem mudança de runtime; `602c840...` é o baseline funcional da slice #165.

## Slices da Fase 51 já integradas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
6. Estoque: posição + jornadas operacionais consolidadas — PR #155;
7. Compras: pedidos + recebimentos + histórico consolidados — PR #157;
8. Financeiro: documentos + parcelas + pagamentos consolidados — PR #159;
9. Caixa: sessões + fechamento + configuração consolidados — PR #161;
10. Dashboard / Visão geral — PR #163;
11. limpeza de linguagem/resíduos de engenharia — PR #165.

Não refazer essas slices sem bug ou gap concreto.

## O que a limpeza de linguagem entregou

A experiência normal deixou de expor detalhes de implementação sem valor operacional, mantendo os contratos funcionais existentes.

### Entrada, autenticação e contexto

Foram removidas ou traduzidas referências visíveis a:

- `Workspace persistente`;
- Supabase/RLS;
- cookie `httpOnly`;
- `membership`;
- backend/provider;
- Auth/runbook/allowlist em textos voltados ao operador.

Os mesmos controles internos de sessão, autorização e seleção de organização permanecem ativos.

### Administração e papéis

A tela de Usuários e permissões continua permitindo atribuir os perfis técnicos existentes, mas a experiência deixa explícito que **perfil do sistema não equivale automaticamente a cargo real**.

Q-022 permanece aberta. Fora da tarefa administrativa de permissões, códigos técnicos de papel deixaram de ser exibidos como informação operacional comum.

### Proteção dos dados

A tela foi traduzida para linguagem operacional: banco de dados, prazo entre cópias, integridade, retenção, anexos e teste de restauração.

A alteração foi apenas de apresentação. Permanecem iguais:

- política de 24 horas entre cópias válidas;
- retenção configurada;
- cálculo de saúde da proteção;
- cobertura atual do banco;
- limitação conhecida de anexos;
- histórico e evidência persistidos;
- hold de #75/#121.

Nenhum scheduling, Storage/R2/S3, restore real, secret, fixture ou Production foi tocado.

### Estoque, Financeiro e Caixa

Foram simplificados helper texts e mensagens que narravam implementação (`fluxo autoritativo`, `eventos persistidos`, `backend`, `já implementado`, etc.).

As ressalvas funcionais continuam explícitas:

- seleção automática de lote não é apresentada como FEFO homologado;
- regras de custeio não foram redefinidas;
- diferenças financeiras continuam sem classificação automática;
- estorno preserva histórico;
- vigência de taxas e cálculo de fechamento de Caixa permanecem intactos.

## Boundaries e segurança preservados

O PR #165 não criou ou alterou:

- schema;
- migration;
- RPC;
- grant;
- policy/RLS;
- regra de autorização;
- regra crítica de Estoque, Compras, Financeiro ou Caixa.

Queries, RPCs, RLS/grants e boundaries dos módulos continuam sendo a fonte autoritativa. Nenhum PENDING foi resolvido por copy.

## Homologação visual

**Ainda não existe homologação real completa das jornadas em desktop/tablet/mobile.**

CI e build comprovam integridade técnica, mas não substituem uso em browser. Não foi feito deploy Vercel manual apenas para produzir evidência.

## Próxima slice oficial: homologação UX real

A etapa 13 da Issue #142 passa a ser a frente ativa:

> **executar homologação real de UX em desktop/tablet/mobile por jornadas completas.**

A homologação deve testar o produto existente, não redesenhar preventivamente telas. Bugs ou gaps observados devem ser registrados com evidência e corrigidos de forma localizada.

Prioridades:

- entrada/login/recuperação e seleção de organização;
- navegação desktop e drawer mobile;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Usar ambiente seguro já existente ou execução local isolada. **Não disparar deploy Vercel manual/rotineiro e não criar fixture em Production para homologação.** Se não houver sessão/credencial de teste aprovada para uma jornada autenticada, registrar o bloqueio em vez de inventar acesso.

## Ordem oficial de fechamento do produto

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
12. **homologação UX em jornadas desktop/tablet/mobile** — próxima;
13. reconciliação funcional final;
14. PENDINGs necessários;
15. dados representativos;
16. migração/cutover;
17. `REQ-PLAT-005` final.

A numeração documental acima segue o encadeamento operacional usado nos handoffs; na Issue #142 a homologação corresponde ao item macro 13 porque a issue separa arquitetura da informação e navegação em itens distintos.

## PENDING permanece sem inferência

Continuam PENDING até decisão real de negócio:

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
