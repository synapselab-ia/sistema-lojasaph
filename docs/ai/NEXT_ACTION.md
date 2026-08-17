# Next Action — Sistema Lojasaph

## Contexto

- Fase 7 / Issue #19 está implementada na branch `agent/supabase-adapters`.
- Projeto Supabase remoto foi conectado/reutilizado com segurança.
- Migrations, RLS e seed demo foram aplicados no remoto.
- Adapters reais existem para StockItem e Supplier.
- Primeiro comando crítico real existe em `record_stock_entry` + `SupabaseStockEntryGateway`.
- Teste remoto de idempotência/saldo/custo/lote/audit passou em transação com rollback.
- Próxima Issue criada: #21 — Autenticação real e runtime Supabase.

## Objetivo atual

Fechar a Issue #19 via PR/CI e iniciar a Fase 8, conectando Auth/sessão real aos adapters existentes sem enfraquecer RLS.

## Fazer agora

1. Abrir PR de `agent/supabase-adapters` contra `main`.
2. Confirmar que não existem workflows temporários nem migrations duplicadas.
3. Exigir CI completo:
   - `npm ci`;
   - lint;
   - typecheck;
   - testes;
   - build;
   - PostgreSQL efêmero;
   - todas as migrations;
   - seed;
   - smoke tests de RLS e `record_stock_entry`.
4. Corrigir qualquer falha antes do merge.
5. Integrar o PR na `main` e encerrar Issue #19.
6. Criar branch nova a partir da `main` para Issue #21.
7. Na Issue #21, implementar:
   - Supabase Auth e sessão server-side;
   - login/logout/recuperação mínima;
   - proteção de rotas;
   - resolução de Organization/membership;
   - onboarding administrativo server-only;
   - composição runtime dos adapters com JWT + RLS;
   - workspace autenticado usando persistência real;
   - estado explícito para usuário sem membership;
   - testes de roles e isolamento.
8. Continuar usando adapters in-memory nos unit tests.
9. Não migrar dados reais do cliente ainda.
10. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION ao concluir a próxima etapa.

## Regras de segurança que não podem regredir

- `SUPABASE_SECRET_KEY` nunca vai para browser/`NEXT_PUBLIC_*`.
- Publishable key não é autorização; RLS continua obrigatória.
- Autorização deriva de `organization_memberships`, não de `user_metadata`.
- Helpers privilegiados de membership ficam em schema `private`.
- `record_stock_entry` é a única escrita real de entrada nesta fase; não adicionar grants diretos ao ledger.
- RPC `SECURITY DEFINER` deve sempre validar `auth.uid()` + role + inputs e ter EXECUTE restrito.
- GitHub migrations continuam fonte de verdade do schema.

## Critério de conclusão da Issue #19

Issue #19 encerra quando o PR atual passar CI e estiver na `main`. O caminho de persistência real já cobre cadastros/leitura e o primeiro comando transacional de estoque, com RLS/migrations reproduzíveis.

## Regra de eficiência

Não refazer etapas concluídas. Conferir estado real do GitHub/Supabase antes de agir e avançar automaticamente enquanto não houver custo ou decisão estrutural não reversível.
