# Next Action — Sistema Lojasaph

## Contexto

- Fase 3 implementada na branch `agent/technical-foundation`.
- PR atual: #12 — fundação técnica da aplicação.
- CI passou instalação, lint, typecheck, testes e build; o lockfile está versionado e o CI usa `npm ci`.
- Próxima Issue já criada: #13 — Fase 4 — Cadastros base e primeiro fluxo funcional.

## Objetivo atual

Integrar a fundação técnica e iniciar o primeiro fluxo vertical utilizável, ainda com repositories/adapters in-memory e sem banco definitivo.

## Fazer agora

1. Confirmar o CI final do PR #12.
2. Integrar o PR #12 na `main` e encerrar a Issue #10.
3. Criar branch dedicada à Issue #13 a partir da `main` atualizada.
4. Implementar casos de uso e UI para:
   - Organization, Business, Unit, Sector e StockLocation;
   - StockItem e categorias/unidades essenciais;
   - Supplier e múltiplos contatos;
   - vínculo SupplierItem e preço básico observado.
5. Manter UI separada dos repositories/adapters.
6. Usar dados de demonstração anonimizados/fixtures, nunca dados reais das planilhas.
7. Criar navegação administrativa inicial responsiva.
8. Criar testes unitários e de integração dos casos de uso.
9. Rodar lint, typecheck, testes e build via CI.
10. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo ao concluir.

## Não fazer ainda

- Não criar Supabase.
- Não criar autenticação real.
- Não migrar dados reais.
- Não implementar financeiro/caixa completos.
- Não implementar PDV.
- Não começar vários módulos transacionais em paralelo.

## Depois da Issue #13

O próximo fluxo deve ser estoque transacional: entrada, retirada e transferência entre locais/unidades usando o ledger definido no ADR-002.

## Critério de conclusão

A Fase 4 termina quando um usuário de demonstração consegue navegar pela estrutura organizacional, criar/editar produtos e fornecedores e relacionar fornecedor a item, com validações e CI passando.

## Regra de eficiência

Não bloquear o projeto por decisões facilmente reversíveis. Preservar as invariantes dos ADRs e registrar no GitHub qualquer decisão estrutural nova.