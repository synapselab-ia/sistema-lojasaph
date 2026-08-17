# Next Action — Sistema Lojasaph

## Contexto

- Fase 8 / Issue #21 foi implementada no PR #23.
- Auth SSR, login/logout/recuperação, membership e seleção de Organization já existem.
- `/workspace` usa persistência real para produtos, fornecedores/contatos e entrada de estoque.
- `/cadastros` continua in-memory para retirada, transferência, FEFO e inventário físico.
- `record_stock_entry` é o primeiro comando PostgreSQL transacional do ledger.
- CI da Fase 8 cobre aplicação, migrations, RLS/RPC, roles e isolamento entre Organizations.
- Próxima Issue: #24 — Fase 9 — estoque transacional completo no Supabase.

## Objetivo atual

Depois que o PR #23 estiver integrado e a Issue #21 fechada, iniciar a Issue #24 e persistir os demais fluxos principais de estoque sem liberar escrita direta no ledger.

## Fazer agora

1. Confirmar que PR #23 está na `main` e Issue #21 fechada.
2. Manter Issue #24 como única frente em execução.
3. Criar branch nova a partir da `main`, sugerida: `agent/stock-transactional-runtime`.
4. Ler antes de codar:
   - `docs/modules/inventory.md`;
   - `docs/decisions/ADR-002-inventory-ledger-and-balance.md`;
   - `docs/decisions/ADR-003-inventory-costing.md`;
   - `docs/decisions/ADR-006-postgresql-supabase-persistence.md`;
   - implementação/testes atuais de `InventoryService`;
   - migrations de estoque e `record_stock_entry`.
5. Implementar primeiro a retirada persistente:
   - command ID/idempotência;
   - `auth.uid()` + role organizacional;
   - lock de saldo e lotes envolvidos;
   - impedir saldo negativo conforme regra do local;
   - lote preferido quando informado;
   - FEFO quando lote não for informado;
   - custo snapshot sem recalcular custo médio de saída;
   - `stock_movements` + itens + alocações + saldo/lotes + audit na mesma transação;
   - nenhuma informação de lote/validade inventada.
6. Adicionar gateway/adapters reais sem alterar contratos de domínio desnecessariamente.
7. Criar testes SQL para:
   - retirada simples;
   - FEFO;
   - lote preferido;
   - estoque insuficiente;
   - idempotência;
   - role sem permissão;
   - isolamento cross-Organization;
   - rollback atômico em erro.
8. Só depois do comando estar verde, adicionar retirada ao `/workspace/estoque`.
9. Repetir o mesmo padrão para transferência e inventário físico, em entregas incrementais dentro da Issue #24.
10. Rodar advisors Supabase após qualquer DDL/RPC e manter CI completo verde.
11. Não importar dados reais do cliente nesta fase.
12. Atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION ao encerrar a sessão.

## Regras que não podem regredir

- GitHub migrations são fonte de verdade do schema.
- Não editar `inventory_balances` diretamente pela UI.
- Não conceder INSERT/UPDATE cliente-side nas tabelas do ledger.
- Operações críticas usam transação/locks e são idempotentes.
- `SUPABASE_SECRET_KEY` permanece server-only e não é usada em operação normal.
- Autorização deriva de `organization_memberships`.
- Custos/quantidades continuam usando precisão exata do modelo.
- Lote/validade desconhecidos permanecem desconhecidos.
- Adapters in-memory permanecem disponíveis para testes e demo até a paridade real estar pronta.

## Critério da primeira entrega da Issue #24

Um usuário com papel de estoque deve conseguir registrar uma retirada real no workspace persistente, com FEFO/lote correto, saldo consistente, idempotência e auditoria; usuários sem papel e outras Organizations não podem executar/observar a operação.

## Regra de eficiência

Não refazer Auth, schema base ou entrada de estoque. Começar pela retirada, validar end-to-end em CI/ambiente demo e só então avançar para transferência/inventário.
