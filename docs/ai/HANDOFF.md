# Handoff — Sistema Lojasaph

## Estado

Fase 14 — Permissões por escopo de unidade/setor e hardening RLS — **concluída**.

- PR #38 — merged;
- Issue #37 — closed/completed;
- merge commit: `0cbb6ed38add92fb220f575cad17c6983d700ed3`;
- SHA final validado antes do merge: `8795f4b3aca0d1693da3ede0c4fc68e3f024ba56`;
- próxima frente registrada: Issue #39 — Fase 15 — staging de importação, dry run e reconciliação rastreável;
- ainda não existe branch funcional da Fase 15.

## Fase 14 — não repetir

- migration `20260818143221_scoped_permissions.sql` criada, validada e integrada;
- helpers privados de escopo;
- trigger de hierarquia de membership;
- RLS scope-aware;
- wrappers públicos de commands críticos;
- implementations transacionais no schema `private` sem `EXECUTE` para `authenticated` nas funções testadas;
- política conservadora de transferências;
- mutation global bloqueada para membership restrito quando aplicável;
- UI/runtime com distinção entre roles globais e escopadas;
- `docs/architecture/authorization-scopes.md`;
- `supabase/tests/scoped_permissions.sql`;
- CI final completo verde;
- migration aplicada no Supabase remoto;
- advisors executados;
- homologação funcional remota final aprovada em `BEGIN/ROLLBACK`;
- checagem pós-rollback com zero resíduos.

Não recriar nem reaplicar `scoped_permissions`.

## Supabase remoto

O histórico contém `scoped_permissions` como versão remota `20260818150253`.

Homologação remota retornou `scoped permission tests passed` e comprovou Organization-wide, Business, Unit, Sector, múltiplos memberships, transferências, Compras, Financeiro, Caixa, viewer read-only e bloqueio das implementations privadas testadas.

Security Advisor mantém warnings esperados dos wrappers públicos `SECURITY DEFINER`. Performance Advisor mantém recomendações de tuning não bloqueantes.

## Próxima frente — Issue #39

A Issue #39 foi criada a partir dos MUST ainda incompletos de importação:

- `REQ-IMP-001` rastreabilidade;
- `REQ-IMP-002` idempotência;
- `REQ-IMP-003` dry run;
- `REQ-IMP-004` relatório de inconsistências;
- `REQ-ITEM-002` aliases necessários à futura migração.

O plano existente em `docs/source-data/migration-plan.md` exige staging/validação antes das tabelas finais, preservação de arquivo/aba/linha, reprocessamento sem duplicidade, dry run e relatório de aceitos/rejeitados/warnings.

### Limites da Fase 15

- usar apenas fixtures sintéticos/amostras artificiais versionáveis;
- não importar as planilhas reais;
- não executar cutover;
- não inventar respostas para Q-001 a Q-025;
- matching por alias deve ser explícito, sem auto-merge por similaridade;
- dry run não grava nas tabelas operacionais finais;
- arquivos reais e segredos não entram no GitHub;
- reutilizar autorização/RLS existentes sem inventar distribuição real de pessoas/perfis.

## Próxima ação exata

1. confirmar estado da Issue #39 e `main`;
2. criar branch `agent/import-staging` a partir da `main`;
3. ler `requirements.md`, `migration-plan.md`, documentação de source-data, persistência e ADRs relacionados;
4. inspecionar migrations/schema/código existentes antes de modelar;
5. implementar somente a fundação de staging/dry run da Issue #39;
6. criar migration via Supabase CLI pinado, RLS/auditoria e testes sintéticos;
7. rodar lint, typecheck, Vitest, build e suítes PostgreSQL relevantes;
8. somente com CI verde aplicar/homologar a migration no Supabase remoto, preservando forward-only e rollback de dados temporários;
9. atualizar documentação e continuidade antes do PR/merge.

## Regras que permanecem

- GitHub é fonte de verdade;
- service role nunca no browser;
- Q-022 continua aberta para pessoas/perfis reais;
- nenhuma questão de negócio deve ser resolvida por inferência;
- mudanças de banco sempre por migration versionada.
