# Next Action — Sistema Lojasaph

## Contexto

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — foi encerrada com sucesso.

Estado real:

- PR #38 — merged em `main`;
- Issue #37 — closed/completed;
- merge commit: `0cbb6ed38add92fb220f575cad17c6983d700ed3`;
- SHA final pré-merge `8795f4b3aca0d1693da3ede0c4fc68e3f024ba56` teve `CI`, `Inventory Count Integration` e `Business Transactions Integration` verdes;
- migration remota `20260818150253 / scoped_permissions` já aplicada e homologada;
- homologação remota final passou com `scoped permission tests passed` e zero resíduos após rollback;
- próxima Issue criada: #39 — `Fase 15 — staging de importação, dry run e reconciliação rastreável`;
- nenhuma branch funcional da Fase 15 foi criada ainda.

## Fazer agora

1. Conferir a Issue #39 e o estado atual da `main` antes de alterar código.
2. Criar a branch `agent/import-staging` a partir da `main` atual.
3. Ler antes da implementação:
   - `docs/product/requirements.md` — especialmente `REQ-IMP-001` a `REQ-IMP-004` e `REQ-ITEM-002`;
   - `docs/source-data/migration-plan.md`;
   - `docs/source-data/README.md`, `field-catalog.md` e `spreadsheets-map.md`;
   - documentação de persistência/Supabase e ADRs relacionados.
4. Inspecionar migrations, schema, auditoria, autorização scope-aware e padrões de command/repository já existentes.
5. Implementar **somente** a fundação da Issue #39:
   - batch de importação rastreável;
   - staging por arquivo/aba/linha/payload bruto;
   - validação e estados explícitos;
   - chave determinística/idempotência;
   - dry run sem escrita nas tabelas operacionais finais;
   - relatório estruturado de aceitos, duplicados, warnings, rejeitados e mapeamentos pendentes;
   - suporte explícito a aliases para futura migração, sem auto-merge inseguro.
6. Usar apenas fixtures sintéticos/amostras artificiais nos testes. Não adicionar planilhas reais ao repositório.
7. Qualquer transformação dependente de Q-001 a Q-025 deve resultar em pendência/revisão explícita; não inferir regra de negócio.
8. Se houver mudança de banco, gerar migration pelo Supabase CLI pinado e manter RLS/auditoria coerentes com a arquitetura atual.
9. Rodar no mínimo lint, typecheck, Vitest, build e suítes PostgreSQL relevantes; manter os workflows de integração existentes verdes.
10. Somente após CI verde aplicar/homologar migration nova no Supabase remoto. Não editar regra diretamente no remoto; usar migration forward-only.
11. Homologar com dados sintéticos e rollback quando aplicável, confirmando ausência de resíduos temporários.
12. Atualizar `CURRENT_STATE.md`, `HANDOFF.md`, este arquivo e documentação do módulo antes do fechamento da Issue/PR.

## Não fazer agora

- não reabrir nem reimplementar a Fase 14;
- não reaplicar `scoped_permissions`;
- não importar as seis planilhas reais;
- não executar cutover nem migração definitiva;
- não versionar dados reais, segredos ou chaves;
- não resolver Q-001 a Q-025 por inferência;
- não criar integração permanente com Google Sheets/Excel nesta fase;
- não misturar backup/restauração de produção (`REQ-PLAT-005`) na mesma entrega;
- não alterar fluxos transacionais homologados sem necessidade direta da infraestrutura de importação.

## Critério para encerrar a Fase 15

A fundação deve receber dados sintéticos em staging, preservar origem e rastreabilidade, validar/dry-run sem gravar nas tabelas finais, ser idempotente em reprocessamento, produzir relatório de inconsistências/mapeamentos pendentes, respeitar RLS/autorização e permanecer verde em CI e homologação remota. Dados reais continuam fora desta fase.
