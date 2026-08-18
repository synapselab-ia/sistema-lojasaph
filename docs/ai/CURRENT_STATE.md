# Current State — Sistema Lojasaph

Última atualização: 2026-08-18

## Estado atual

Fase 15 — staging de importação, dry run e reconciliação rastreável — **implementada, aplicada e homologada; aguardando fechamento documental/merge do PR #40**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #39 — open até o merge
- PR #40 — draft na branch `agent/import-staging`
- base da branch: `main` em `dba8f8248e623df020b4e00e82bd9282447a7532`
- último SHA técnico com CI completo verde antes da documentação: `8ee091875bdcc7707a7333b1d4c12acdc2a43931`
- Fase 14 permanece concluída; não recriar/reaplicar `scoped_permissions`.

## Fase 15 — implementado

A fundação cobre os MUST de importação executáveis nesta fase:

- `REQ-IMP-001` — rastreabilidade;
- `REQ-IMP-002` — idempotência;
- `REQ-IMP-003` — preview/dry run;
- `REQ-IMP-004` — relatório de inconsistências;
- suporte explícito de aliases necessário a `REQ-ITEM-002`.

Entregas:

- `import_batches` rastreável por Organization, fonte, SHA-256 e versão de transformação;
- `import_rows` com arquivo/aba/linha/payload bruto, hashes, payload normalizado, warnings/errors e resolução;
- estados `accepted`, `duplicate`, `warning`, `rejected`, `pending_mapping`;
- RPCs auditadas para staging, relatório e finalização de preview;
- idempotência determinística de batch/linha e detecção de duplicata entre versões;
- modo limitado a `dry_run`, sem command para aplicar staging às tabelas operacionais;
- matching de item apenas por nome canônico exato normalizado ou alias explícito;
- referências inexistentes/ambíguas e regras dependentes de Q-001 a Q-025 ficam pendentes para revisão;
- RLS Organization-wide: owner/admin/manager globais; memberships escopados e outsiders não acessam staging;
- escrita direta nas tabelas de staging e execução anônima permanecem bloqueadas;
- `docs/modules/imports.md` documenta o desenho.

## Migrations

GitHub:

- `20260818174500_import_staging.sql`;
- `20260818180500_import_staging_finalize_fix.sql`;
- `20260818182000_import_staging_indexes.sql`.

Supabase remoto:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Não reaplicar.

## Validação

No SHA técnico `8ee091875bdcc7707a7333b1d4c12acdc2a43931` os três workflows passaram:

- `CI` #187;
- `Inventory Count Integration` #110;
- `Business Transactions Integration` #93.

O `CI` validou lint, typecheck, Vitest, build, aplicação integral das migrations e `supabase/tests/import_staging.sql` junto das suítes PostgreSQL existentes.

A homologação remota ocorreu somente após CI verde, em uma única transação `BEGIN/ROLLBACK` com fixtures sintéticos.

Resultado: `import staging tests passed`.

Foi comprovado remotamente:

- idempotência de batch e linha;
- relatório estruturado;
- imutabilidade após finalização;
- duplicata entre versões;
- ausência de escrita operacional no dry run;
- bloqueio de escrita direta;
- isolamento de membership escopado/outsider;
- bloqueio de `anon`;
- auditoria única dos comandos relevantes.

Checagem pós-rollback retornou zero resíduos em usuários, memberships, batches, rows, audits e itens operacionais temporários.

## Advisors

Security Advisor foi executado. Os avisos das novas RPCs são do padrão intencional `SECURITY DEFINER` autenticado já usado pelo projeto; as funções revalidam identidade e escopo e foram homologadas contra memberships restritos/outsider/anon.

Performance Advisor inicialmente encontrou dois novos FKs sem índice. A migration `import_staging_indexes` adicionou os índices cobrindo-os; nova execução não reportou `unindexed_foreign_keys` para `import_batches`/`import_rows`. Permanecem recomendações históricas do projeto e o aviso normal de índices recém-criados ainda sem uso produtivo.

## Migração real continua fora do escopo

Nenhuma das seis planilhas reais foi importada ou versionada. Não houve cutover nem escrita dos dados de staging em tabelas operacionais.

`docs/source-data/migration-plan.md` continua exigindo importadores específicos, regras de transformação aprovadas, backup, reconciliação e aceite da data de corte antes da migração definitiva.

## Próximo passo

Seguir `docs/ai/NEXT_ACTION.md`: finalizar documentação do PR #40, exigir CI verde no SHA documental, atualizar o PR, marcar ready e fazer merge. Só depois fechar/confirmar a Issue #39 e escolher a próxima lacuna MUST.