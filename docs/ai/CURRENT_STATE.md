# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 28 foi concluída e `REQ-PLAT-002 — Proteção contra duplicidade` está fechada.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main`: `9dc6164e628605e0ff74f748200dce165b70fdd9` após o merge funcional da Fase 28
- Issue #71 — closed/completed
- PR #72 — merged por squash
- CI #301 — success (`database`, lint, typecheck, Vitest e production build)
- Business Transactions Integration #153 — success
- Inventory Count Integration #169 — success
- nenhuma migration/DDL na Fase 28
- nenhuma alteração de RLS, grants, roles, Auth ou regras transacionais
- nenhum deployment Vercel

## REQ-PLAT-002 — fechado

A lacuna comprovada entre o client e os RPCs idempotentes foi corrigida por uma abstração única em `src/lib/runtime/idempotent-command.ts`.

Contrato efetivo do runtime:

- UUID opaco criado de forma lazy por intenção;
- payload normalizado é usado somente para fingerprint semântico local, nunca como command ID;
- retry da mesma intenção após falha ambígua reapresenta o mesmo UUID;
- sucesso definitivo encerra a intenção e a próxima operação recebe nova chave;
- mudança semântica após falha abandona a intenção anterior e cria nova chave;
- duas submissões concorrentes idênticas compartilham a mesma Promise/comando;
- mudança de payload enquanto a intenção anterior está em voo é rejeitada localmente;
- `IDEMPOTENCY_KEY_CONFLICT` permanece erro explícito de reconciliação/refresh.

Os gateways de Estoque que já aceitavam `commandId` explícito preservam esse caminho para teste/homologação; o caminho normal sem chave explícita usa o registro estável, sem fallback para UUID novo a cada retry.

### Matriz final de cobertura

| Superfície | Write paths | Evidência client/runtime | Evidência PostgreSQL |
| --- | ---: | --- | --- |
| Estoque | 4 | entrada, retirada, perda/vencimento e devolução usam intenção estável | replay/conflito em suites existentes; `schema_smoke.sql` agora cobre conflito explícito de entrada |
| Transferências | 2 | despacho e recebimento usam escopos idempotentes próprios | suites de transferência mantidas verdes |
| Inventário | 4 | início, linha, confirmação e cancelamento usam intenção estável | Inventory Count Integration #169 verde |
| Compras | 4 | criação, emissão, recebimento e cancelamento usam intenção estável | Business Transactions Integration #153 verde |
| Financeiro | 4 | documento, pagamento, estorno e cancelamento usam intenção estável | Business Transactions Integration #153 verde |
| Caixa | 8 | configuração, abertura, total, movimento, fechamento e cancelamento usam intenção estável | `cash_sessions.sql` cobre replay/conflito adicional e integração #153 verde |
| **Total** | **26** | ciclo de chave estável coberto por Vitest + teste de gateway real | RPCs/locks/guards existentes preservados |

Regressões client adicionadas provam:

- reutilização da chave após falha ambígua;
- reset após sucesso;
- nova chave após mudança semântica;
- deduplicação de double submit concorrente;
- bloqueio de payload divergente em voo;
- fingerprint canônico;
- reutilização real de `p_command_id` no gateway de retirada;
- conflito idempotente continua visível.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17, permanece `ACTIVE_HEALTHY`.

Após a implementação, uma confirmação SQL somente leitura verificou os 26 RPCs críticos de Estoque, Transferências, Inventário, Compras, Financeiro e Caixa. Todos continuam expondo `p_command_id` e nenhuma função/schema/policy/grant/dado foi modificado remotamente nesta fase.

Estado operacional preservado:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- bootstrap desabilitado em Production.

Os avisos genéricos do advisor continuam fora de escopo salvo regressão concreta.

## Vercel Production

`git.deploymentEnabled=false` continua deliberadamente preservado.

Último Production intencional permanece:

- deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` — READY;
- commit funcional hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`.

Nenhum deployment foi criado na Fase 28.

## Próxima ação

Auditar `REQ-PLAT-003 — Validação de dados` como o próximo MUST verificável de Plataforma.

A próxima sessão deve primeiro comprovar o estado real de `main`, Issues/PRs e workflows. Depois deve mapear validações essenciais entre domínio/server/RPC/banco, reaproveitar testes existentes e abrir nova Issue somente se houver lacuna concreta. Não implementar validações por presunção e não reabrir a Fase 28.

## Não repetir

- não reabrir Issues #69 ou #71;
- não refazer a auditoria de idempotência já encerrada;
- não reescrever RPCs idempotentes sem regressão específica;
- não alterar RLS/grants para resolver validação de formulário;
- não reativar bootstrap ou auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.
