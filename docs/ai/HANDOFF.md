# Handoff — Sistema Lojasaph

## Estado

A Fase 28 — idempotência ponta a ponta das operações críticas — foi concluída.

`REQ-PLAT-002 — Proteção contra duplicidade` está fechada pela Issue #71 / PR #72.

Estado comprovado ao encerrar:

- `main`: `9dc6164e628605e0ff74f748200dce165b70fdd9` antes deste commit documental;
- Issue #71 — closed/completed;
- PR #72 — merged por squash;
- CI #301 — success;
- Business Transactions Integration #153 — success;
- Inventory Count Integration #169 — success;
- nenhuma migration/DDL;
- nenhuma alteração de RLS/grants/roles/Auth;
- nenhum deployment Vercel.

A branch `agent/idempotency-e2e` foi integrada. Não continuar trabalho funcional nela sem antes conferir `main` e criar uma branch nova para uma lacuna nova comprovada.

## Fase 28 — o que foi implementado

Foi adicionada a abstração `IdempotentCommandRegistry` em `src/lib/runtime/idempotent-command.ts`.

Contrato:

- cria UUID opaco de forma lazy por intenção;
- mantém a chave em retry após falha ambígua;
- limpa somente após sucesso definitivo do command;
- usa fingerprint semântico apenas para detectar mudança local de intenção;
- payload alterado após falha recebe nova chave;
- submissões concorrentes idênticas convergem para a mesma Promise/comando;
- payload divergente enquanto uma intenção está em voo é bloqueado;
- `IDEMPOTENCY_KEY_CONFLICT` não é mascarado como sucesso.

A política foi aplicada aos 26 write paths críticos auditados:

- Estoque: entrada, retirada, perda/vencimento e devolução;
- Transferências: despacho e recebimento;
- Inventário: início, linha, confirmação e cancelamento;
- Compras: criação, emissão, recebimento e cancelamento;
- Financeiro: documento, pagamento, estorno e cancelamento;
- Caixa: caixa, meio de pagamento, regra de taxa, abertura, total por meio, movimento, fechamento e cancelamento.

Os adapters normalizam valores semânticos antes do fingerprint. Por exemplo, quantidades e valores monetários usam as representações canônicas de `Quantity`/`Money`, evitando que formas textuais equivalentes criem intenções diferentes.

## Evidência de regressão

Client/runtime:

- `src/lib/runtime/idempotent-command.test.ts` cobre retry, sucesso/reset, mudança semântica, concorrência e canonicalização;
- `supabase-stock-withdrawal-gateway.test.ts` comprova reapresentação real do mesmo `p_command_id` após falha ambígua e visibilidade de `IDEMPOTENCY_KEY_CONFLICT`.

PostgreSQL efêmero:

- `schema_smoke.sql` agora rejeita mesma chave de entrada de estoque com payload diferente;
- `cash_sessions.sql` amplia replay/conflito para configuração de Caixa e movimento;
- suites estabilizadas de Estoque, Inventário, Compras, Financeiro e Caixa permaneceram verdes.

Gates:

- CI #301: database + lint + typecheck + Vitest + production build — success;
- Business Transactions Integration #153 — success;
- Inventory Count Integration #169 — success.

## Supabase / Production

Projeto Supabase `fhbvwyttikrbeaanatlr`, PostgreSQL 17, permanece `ACTIVE_HEALTHY`.

Confirmação read-only posterior à implementação encontrou os 26 RPCs críticos esperados com `p_command_id`. Nenhum DDL, migration, policy, grant, função, dado operacional ou configuração foi alterado remotamente.

Production Vercel continua deliberadamente no deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`, commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`, com auto-deploy desabilitado.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Conferir o estado real de `main`, Issues, PRs, branches e workflows antes de editar.
3. Não reabrir a Fase 28 nem repetir a auditoria de `REQ-PLAT-002`.
4. Auditar `REQ-PLAT-003 — Validação de dados` como próximo MUST verificável.
5. Mapear regras essenciais entre domínio, server/actions, adapters/RPCs e constraints do banco; a UI é apenas validação complementar.
6. Priorizar evidências de risco: campos obrigatórios, quantidades/valores/precisão, enums/status transitions, referências cross-org, datas e IDs com escopo.
7. Reaproveitar as suites existentes antes de criar teste novo.
8. Abrir uma única Issue/branch somente se a auditoria encontrar lacuna concreta e reproduzível.
9. Se `REQ-PLAT-003` já estiver suficientemente fechado, documentar a evidência e avançar ao próximo MUST sem criar Issue artificial.
10. Manter Supabase remoto em leitura durante auditoria; migration somente se uma regressão estrutural real exigir.
11. Não fazer deploy Vercel para auditoria/iteração.
12. Atualizar continuidade ao final.

## Não fazer

- não reabrir #69 ou #71;
- não criar nova Issue de idempotência sem nova regressão concreta;
- não reescrever backend idempotente;
- não ampliar RLS/grants por conveniência;
- não tratar advisor genérico como requisito funcional;
- não reativar bootstrap ou auto-deploy;
- não usar dados/credenciais reais em testes;
- não inferir Q-001..Q-025.
