# Next Action — Sistema Lojasaph

## Contexto

A Fase 27 / Issue #69 foi concluída.

Estado comprovado:

- PR #70 — merged;
- Issue #69 — closed/completed;
- head funcional `f1c454d0c7dc4658c59829774c1effa4fe859839`;
- merge `7fe0f574504a1cb7080a54e8391cb1f26ca31ce2`;
- CI #297 — success;
- Business Transactions Integration #152 — success;
- `REQ-PLAT-001 — Responsivo` revisado transversalmente;
- nenhuma migration/DDL, RLS/grant, RPC, Auth ou regra de negócio alterada;
- nenhum deployment Vercel gasto na fase;
- Supabase remoto permanece `ACTIVE_HEALTHY`;
- Production permanece propositalmente no deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` até uma publicação intencional futura.

## Objetivo ativo

**Auditar `REQ-PLAT-002 — Proteção contra duplicidade` transversalmente antes de criar qualquer nova Issue.**

O requisito é MUST: operações críticas devem tolerar retry e evitar submissão duplicada.

Já existe evidência concreta do padrão em `record_stock_entry`: `p_command_id` identifica o comando, retry compatível reaproveita o resultado persistido e reutilização conflitante falha com `IDEMPOTENCY_KEY_CONFLICT`.

Isso ainda não prova todos os write paths críticos.

## Fazer agora

1. Confirmar estado real de `main`, branch de continuidade, PRs, Issues e CI. Não assumir que existe nova Issue aberta.
2. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-002`).
3. Sincronizar a branch de trabalho exatamente com a `main` antes de editar. Não reaproveitar resíduos da Fase 27.
4. Inventariar **todos os comandos persistentes críticos** e criar uma matriz com:
   - operação;
   - adapter/service que gera ou recebe command ID;
   - RPC/função SQL;
   - armazenamento/chave que detecta replay;
   - comportamento em retry idêntico;
   - comportamento em reutilização conflitante;
   - teste existente que comprova o caso.
5. Cobrir no mínimo:
   - entrada de estoque;
   - retirada de estoque;
   - baixa/perda/vencimento;
   - devolução relacionada;
   - despacho e recebimento de transferência;
   - início, atualização de linha, confirmação e cancelamento de inventário;
   - criação, emissão, recebimento e cancelamento de pedido de compra;
   - criação/cancelamento de documento financeiro;
   - pagamento e estorno;
   - criação/configuração de Caixa quando mutável;
   - abertura de sessão, total por meio, movimento, fechamento e cancelamento de sessão.
6. Verificar também a camada cliente/adapters:
   - command ID deve ser gerado uma vez por intenção de usuário;
   - retry de transporte não pode gerar nova intenção silenciosamente;
   - duplo clique/submissão concorrente não pode produzir duplicidade crítica;
   - conflito de chave idempotente deve ser explícito, não mascarado como sucesso.
7. Usar os testes SQL existentes como evidência quando cobrirem replay/conflito. Não criar teste duplicado sem necessidade.
8. Se **todos** os caminhos críticos estiverem comprovadamente cobertos:
   - documentar `REQ-PLAT-002` como atendido;
   - não criar Issue;
   - auditar o próximo MUST verificável e atualizar continuidade.
9. Se existir **lacuna concreta**:
   - criar uma única Issue/fase focada na lacuna observada;
   - não ampliar escopo para refatoração geral;
   - preservar domínio, RLS e transações que já estiverem corretos.
10. Não há migration esperada apenas para auditoria. DDL só é aceitável se a lacuna real exigir mudança de persistência e isso estiver explicitamente justificado na nova Issue.
11. Se houver patch, rodar lint, typecheck, Vitest, build e workflows aplicáveis antes de merge.
12. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao terminar.

## Segurança / operação

- não reabrir bootstrap;
- não recolocar `SUPABASE_SECRET_KEY` em Production;
- não alterar grants/RLS para facilitar retry;
- não testar duplicidade com credenciais ou dados reais desnecessários;
- não disparar deployment Vercel para uma auditoria de idempotência;
- `supabase/tests/security_hardening.sql` continua gate permanente quando houver mudança de banco.

## Não fazer

- não reabrir Fases 26/27;
- não refazer PR #70;
- não criar a próxima Issue antes de comprovar uma lacuna;
- não tratar aviso genérico do Supabase advisor como prova de defeito funcional;
- não resolver Q-001..Q-025 por inferência;
- não importar dados reais;
- não reativar auto-deploy Vercel.

## Critério de conclusão da próxima ação

Existe uma matriz verificável dos write paths críticos demonstrando se `REQ-PLAT-002` está coberto ponta a ponta. Se a cobertura for completa, o requisito é registrado como atendido sem Issue artificial; se houver falha real de idempotência/retry, ela vira a única próxima Issue, com evidência e escopo preciso.
