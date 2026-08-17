# Next Action — Sistema Lojasaph

## Contexto

- Fase 6 implementada na branch `agent/lots-expiry-inventory-count`.
- PR atual: #18 — lotes, validades e inventário físico.
- CI funcional passou `npm ci`, lint, typecheck, testes e build.
- Próxima Issue: #19 — Persistência PostgreSQL/Supabase e segurança base.

## Objetivo atual

Integrar a Fase 6 e introduzir schema/migrations reais, mantendo domínio/UI desacoplados do provedor.

## Fazer agora

1. Confirmar o CI final do PR #18.
2. Integrar o PR #18 na `main` e encerrar a Issue #17.
3. Criar branch dedicada à Issue #19 a partir da `main` atualizada.
4. Registrar ADR: PostgreSQL como modelo físico e Supabase como provedor hospedado inicial preferido/revisável.
5. Criar estrutura `supabase/` versionada no GitHub.
6. Criar migrations iniciais para:
   - Organization, Business, Unit, Sector e StockLocation;
   - usuários/membership/escopos mínimos;
   - categorias, unidades de medida e StockItem;
   - fornecedores, contatos, SupplierItem e histórico de preços;
   - StockMovement, itens de movimento, InventoryBalance, InventoryBatch, Transfer e InventoryCount.
7. Usar tipos exatos para dinheiro e quantidade e constraints para invariantes estruturais.
8. Habilitar RLS nas tabelas expostas e criar políticas por Organization/membership.
9. Não liberar acesso anônimo aos dados operacionais.
10. Criar seed somente com dados demo anonimizados.
11. Adicionar validação de schema/migrations em CI quando possível sem credenciais remotas.
12. Documentar `.env.example` e fluxo local/remoto sem inserir segredos.
13. Começar adapters reais por cadastros/estoque, mantendo adapters in-memory para testes.
14. Atualizar CURRENT_STATE, HANDOFF e NEXT_ACTION ao concluir a etapa alcançável sem projeto remoto.

## Não fazer ainda

- Não migrar dados reais.
- Não colocar service role key, senha ou URL secreta no GitHub.
- Não expor tabelas operacionais sem RLS.
- Não implementar financeiro/caixa completos antes da persistência base estar estável.
- Não remover repositories/adapters para chamar Supabase diretamente da UI.

## Critério de conclusão

O schema deve ser reproduzível por migrations, proteger dados por escopo organizacional e permitir que os fluxos já existentes tenham adapters de persistência real sem alterar o domínio.

## Dependência externa

A criação/ligação de um projeto Supabase remoto pode ficar para um passo posterior se não houver conexão segura disponível. Isso não bloqueia schema, migrations, políticas e testes locais/versionados.

## Regra estrutural

GitHub permanece a fonte de verdade do schema e das migrations. O Dashboard remoto não deve ser a única fonte de uma alteração de banco.