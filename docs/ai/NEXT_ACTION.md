# Next Action — Sistema Lojasaph

## Contexto

A Fase 28 foi concluída e `REQ-PLAT-002 — Proteção contra duplicidade` está fechada.

Estado comprovado:

- PR #72 — merged por squash em `main`;
- merge funcional: `9dc6164e628605e0ff74f748200dce165b70fdd9`;
- Issue #71 — closed/completed;
- CI #301 — success;
- Business Transactions Integration #153 — success;
- Inventory Count Integration #169 — success;
- 26 write paths críticos usam ciclo de intenção idempotente no client/runtime;
- confirmação Supabase read-only encontrou os 26 RPCs críticos com `p_command_id`;
- nenhuma migration/DDL/RLS/grant/Auth change na Fase 28;
- nenhum deployment Vercel.

## O que já foi concluído — não repetir

Não repetir a auditoria ou implementação de `REQ-PLAT-002`.

O runtime já possui `IdempotentCommandRegistry` com UUID opaco lazy, retry estável, reset após sucesso, reset por mudança semântica, deduplicação concorrente e conflito explícito. Estoque, Transferências, Inventário, Compras, Financeiro e Caixa estão integrados e cobertos por Vitest/SQL/workflows.

## Objetivo ativo

**Auditar `REQ-PLAT-003 — Validação de dados`: regras essenciais devem ser validadas no servidor/domínio e, quando aplicável, no banco.**

A tarefa inicial é de auditoria verificável, não de implementação presumida. Só abrir Issue e alterar código se houver lacuna concreta.

## Fazer agora

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-003`).
2. Conferir estado real de `main`, branches, Issues, PRs e workflows. Não assumir que nada mudou desde o handoff.
3. Não reutilizar `agent/idempotency-e2e` como branch de nova frente; criar branch somente depois de identificar uma lacuna nova.
4. Montar uma matriz de validação das superfícies críticas, distinguindo:
   - validação de domínio/value objects;
   - validação server-side/actions;
   - validação em adapters/RPCs;
   - constraints/FKs/checks/guards no PostgreSQL;
   - validação de UI apenas como ergonomia, nunca como única barreira.
5. Priorizar regras de alto impacto já existentes no produto:
   - obrigatoriedade e normalização de campos;
   - quantidades não negativas/positivas e precisão decimal;
   - valores monetários e precisão;
   - enums/status e transições de lifecycle;
   - referências pertencentes à mesma Organization/unidade/setor;
   - datas e intervalos válidos;
   - IDs/referências inexistentes, inativas ou cross-org;
   - invariantes de Estoque, Compras, Financeiro e Caixa.
6. Reaproveitar testes existentes antes de adicionar novos casos. Não criar suíte duplicada só para produzir volume.
7. Inspecionar o Supabase remoto apenas em modo leitura se a definição hospedada for necessária para confirmar constraints/functions atuais.
8. Se houver lacuna concreta:
   - registrar evidência reproduzível;
   - abrir uma única Issue para a frente;
   - criar branch dedicada a partir de `main`;
   - implementar a correção mínima mantendo domínio/RLS/scopes consistentes;
   - validar lint, typecheck, Vitest, build e workflows PostgreSQL aplicáveis.
9. Se a auditoria demonstrar que `REQ-PLAT-003` já está suficientemente atendido:
   - documentar a matriz/evidência;
   - não criar Issue artificial;
   - avançar ao próximo MUST verificável.
10. Não fazer deploy Vercel durante auditoria/iteração. Production só deve mudar com necessidade real e intenção explícita.
11. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao encerrar.

## Critério de conclusão da auditoria

Para cada regra essencial amostrada deve ser possível apontar onde a validação autoritativa acontece e qual teste/constraint prova o comportamento. Nenhuma regra crítica pode depender exclusivamente de formulário/UI.

Uma nova fase só é justificada se existir caso concreto em que entrada inválida alcance estado persistente ou transição proibida por falta de validação autoritativa.

## Segurança / operação

- não reabrir bootstrap;
- não recolocar secret administrativa em Production;
- não alterar grants/RLS para facilitar validação de formulário;
- não usar dados reais desnecessários em testes;
- não disparar Vercel para auditoria;
- não misturar advisor genérico de segurança com `REQ-PLAT-003` sem regressão concreta.

## Não fazer

- não reabrir #69 ou #71;
- não repetir a auditoria de idempotência;
- não criar Issue antes de comprovar lacuna;
- não reescrever RPCs/constraints que já protegem a regra;
- não resolver Q-001..Q-025 por inferência;
- não importar dados reais;
- não reativar auto-deploy Vercel.
