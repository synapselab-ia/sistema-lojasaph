# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 15 — staging de importação, dry run e reconciliação rastreável — **concluída e integrada na `main`**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #40 — merged
- Issue #39 — closed/completed
- merge commit: `88be9da74b9c3611f533e388c5387ac0f9906d23`
- head final pré-merge: `3ef9e595249885d0e1f0b1567874037377e01aab`
- próximo trabalho selecionado: Issue #41 — `Fase 16 — backup automático, restauração testada e recuperação operacional`
- nenhuma branch funcional da Fase 16 foi criada ainda.

## Fase 15 — concluído

A fundação cobre `REQ-IMP-001` a `REQ-IMP-004` e o suporte explícito de aliases necessário a `REQ-ITEM-002`:

- `import_batches` rastreável por Organization, fonte, SHA-256 e versão de transformação;
- `import_rows` preservando arquivo/aba/linha/payload bruto e resultado de validação;
- idempotência determinística de batch e linha;
- estados `accepted`, `duplicate`, `warning`, `rejected` e `pending_mapping`;
- preview/dry run sem aplicação nas tabelas operacionais;
- relatório estruturado;
- matching somente por nome canônico exato normalizado ou alias explícito, sem fuzzy auto-merge;
- referência ambígua/inexistente e transformação dependente de Q-001 a Q-025 ficam para revisão;
- RLS Organization-wide e command surface auditada;
- memberships escopados, outsider e `anon` bloqueados conforme o desenho;
- Vitest e suíte PostgreSQL `supabase/tests/import_staging.sql` integrados ao CI;
- documentação em `docs/modules/imports.md` e `docs/source-data/migration-plan.md`.

## CI final da Fase 15

No SHA pré-merge `3ef9e595249885d0e1f0b1567874037377e01aab` passaram:

- `CI` #192;
- `Inventory Count Integration` #115;
- `Business Transactions Integration` #98.

O `CI` incluiu lint, typecheck, Vitest, build, aplicação integral das migrations e a suíte de staging/dry run.

## Supabase remoto

Migrations da Fase 15 já aplicadas — **não reaplicar**:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Homologação remota com fixtures sintéticos foi executada em uma única transação `BEGIN/ROLLBACK` e retornou `import staging tests passed`.

Checagem após rollback confirmou zero resíduos em usuários, memberships, batches, rows, audits e itens operacionais temporários.

Security Advisor manteve somente o padrão intencional de RPCs autenticadas `SECURITY DEFINER` já protegidas por validação interna de identidade/escopo. Performance Advisor inicialmente encontrou dois FKs novos sem índice; ambos foram corrigidos pela migration `import_staging_indexes` e deixaram de aparecer como `unindexed_foreign_keys` nas tabelas novas.

## Migração real continua bloqueada

Nenhuma das seis planilhas reais foi importada ou versionada. Não houve cutover nem aplicação do staging às tabelas operacionais.

A migração definitiva continua condicionada a importadores específicos, regras de transformação aprovadas, backup, reconciliação, validação e aceite da data de corte conforme `docs/source-data/migration-plan.md`.

## Próxima frente — Issue #41

Após o fechamento da Fase 15, os requisitos MUST e Issues reais foram revistos. Não havia Issue aberta.

A próxima lacuna executável escolhida é `REQ-PLAT-005 — Backup e restauração`, MUST antes de produção e explicitamente fora do escopo da Fase 15.

A Issue #41 deve construir estratégia/runbook e prova de restauração segura com dados sintéticos, sem executar restore destrutivo sobre o projeto remoto ativo e sem inventar RPO/RTO de negócio.

## Não repetir

- não reaplicar `scoped_permissions`;
- não reaplicar migrations da Fase 15;
- não importar dados reais nem executar cutover;
- não inferir Q-001 a Q-025;
- não executar restore destrutivo no Supabase remoto ativo;
- não versionar backups contendo dados reais ou segredos.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: iniciar a Issue #41 em branch própria a partir da `main`, verificar primeiro as capacidades atuais de backup/restauração do Supabase e implementar somente uma estratégia segura, reproduzível e testada com fixtures sintéticos.