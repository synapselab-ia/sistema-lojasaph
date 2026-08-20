# Next Action — Sistema Lojasaph

## Contexto

A Fase 27 foi concluída e a auditoria transversal de `REQ-PLAT-002 — Proteção contra duplicidade` também foi concluída.

A auditoria encontrou uma lacuna real e abriu a Issue #71 — **Fase 28 — idempotência ponta a ponta das operações críticas**.

Estado comprovado:

- `main` e `agent/responsive-workspace` estavam idênticas em `265c3262b8cfd0b22e549118505911950c5019f3` antes deste commit documental;
- Issue #71 — open;
- PRs abertos — 0;
- CI #297 — success;
- Business Transactions Integration #152 — success;
- nenhum patch funcional na auditoria;
- Supabase remoto permanece `ACTIVE_HEALTHY`;
- nenhum DDL/RLS/grant/RPC/Auth change;
- nenhum deployment Vercel;
- branch de trabalho da Fase 28: `agent/idempotency-e2e`.

## O que já foi comprovado — não repetir

Foram auditados 26 write paths críticos de Estoque, Transferências, Inventário, Compras, Financeiro e Caixa.

No Supabase remoto, os RPCs públicos atuais delegam para funções `private.*` com autorização/escopo. As implementações efetivas possuem `p_command_id`, advisory lock e rejeição de reutilização semanticamente incompatível com `IDEMPOTENCY_KEY_CONFLICT`.

`record_stock_loss` recebe esse contrato por `private.record_stock_outflow`. `record_stock_entry` também está endurecido na definição privada atual.

A lacuna está na camada cliente:

- vários gateways aceitam `commandId` opcional, mas os chamadores reais não fornecem um;
- Inventário, Compras, Financeiro e Caixa geram `newEntityId()` dentro das mutações;
- retry após falha ambígua de transporte pode gerar outro UUID e ser interpretado pelo banco como nova intenção;
- `saving` reduz double-click, mas não fecha o requisito ponta a ponta.

## Objetivo ativo

**Executar a Issue #71 e fechar `REQ-PLAT-002` tornando a chave de idempotência estável por intenção do usuário.**

Não refazer o backend já comprovadamente idempotente. A mudança principal deve acontecer em client/runtime/adapters e nos testes de regressão.

## Fazer agora

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-002`);
   - Issue #71.
2. Conferir estado real de `main`, `agent/idempotency-e2e`, Issue #71, PRs e workflows. Não assumir que nada mudou desde o handoff.
3. Trabalhar na `agent/idempotency-e2e` sincronizada com `main`.
4. Definir uma abstração pequena e testável para **intenção idempotente** no client, com pelo menos:
   - criação lazy de UUID opaco;
   - reutilização enquanto a mesma intenção permanece ativa;
   - reset explícito após sucesso definitivo;
   - reset quando o payload semântico muda;
   - preservação em erro de transporte/resultado ambíguo;
   - proteção contra duas execuções concorrentes da mesma intenção.
5. Não usar hash do payload como substituto da chave. Payload pode ser usado apenas para detectar mudança semântica local e decidir reset da intenção.
6. Fazer os gateways críticos receberem `commandId` explicitamente onde hoje o geram internamente. Evitar fallback silencioso em caminhos de UI críticos se ele impedir garantia de retry.
7. Integrar o ciclo de intenção nas superfícies reais:
   - Estoque: entrada e retirada;
   - Baixas: perda/vencimento;
   - Devoluções;
   - Transferências: despacho/recebimento;
   - Inventários: início, linha, confirmação e cancelamento;
   - Compras: criação, emissão, recebimento e cancelamento;
   - Financeiro: documento, cancelamento, pagamento e estorno;
   - Caixa: configuração mutável, abertura, total por meio, movimento, fechamento e cancelamento.
8. Tratar `IDEMPOTENCY_KEY_CONFLICT` como erro explícito de refresh/reconciliação; não converter conflito em sucesso genérico.
9. Adicionar testes client/unit que provem:
   - mesma intenção reutiliza a chave;
   - retry após erro ambíguo reutiliza a chave;
   - sucesso limpa a intenção;
   - mudança semântica cria nova chave;
   - double submit não cria duas chaves/comandos concorrentes;
   - conflito idempotente continua visível.
10. Completar apenas a cobertura SQL faltante de baixo custo quando necessário para a matriz final, especialmente:
    - entrada de estoque com mesmo command ID + payload diferente;
    - mutações de Caixa em que o backend possui guard, mas a suite principal não demonstra explicitamente replay/conflito daquele comando.
11. Não criar migration só para reorganizar código. DDL não é esperado. Se uma regressão real do backend for descoberta, documentar evidência antes de alterar persistência.
12. Rodar antes de qualquer merge:
    - lint;
    - typecheck;
    - Vitest;
    - build;
    - workflows PostgreSQL aplicáveis, incluindo gates de segurança/transações.
13. Confirmar remotamente, em modo leitura, que as funções finais continuam com Auth/scope/idempotência intactos se houver qualquer mudança que toque adapters SQL ou migrations.
14. Não fazer deploy Vercel durante iteração. Production só deve ser publicada intencionalmente se houver necessidade real de homologação hospedada ao final.
15. Ao concluir a Fase 28:
    - atualizar a matriz de `REQ-PLAT-002`;
    - fechar #71 somente com CI verde e evidência ponta a ponta;
    - atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`;
    - auditar o próximo MUST verificável sem criar Issue artificial.

## Critério de conclusão da Fase 28

Para cada write path crítico, existe evidência de que:

- uma intenção de usuário gera exatamente uma chave;
- retries da mesma intenção reapresentam a mesma chave;
- falha ambígua de transporte não cria nova intenção silenciosamente;
- mudança semântica do draft recebe nova chave;
- submissões concorrentes não produzem dois comandos independentes;
- PostgreSQL não duplica efeitos em replay compatível;
- reutilização incompatível continua falhando com `IDEMPOTENCY_KEY_CONFLICT`;
- CI permanece verde;
- domínio, RLS, roles, scopes e regras transacionais existentes permanecem intactos.

## Segurança / operação

- não reabrir bootstrap;
- não recolocar secret administrativa em Production;
- não alterar grants/RLS para facilitar retry;
- não usar dados reais desnecessários em testes;
- não disparar Vercel para iteração;
- não misturar advisors genéricos de segurança com a correção de idempotência sem regressão concreta.

## Não fazer

- não refazer a auditoria transversal já concluída;
- não criar nova Issue concorrente à #71 para o mesmo requisito;
- não reabrir Fases 26/27;
- não reescrever RPCs idempotentes sem necessidade comprovada;
- não resolver Q-001..Q-025 por inferência;
- não importar dados reais;
- não reativar auto-deploy Vercel.
