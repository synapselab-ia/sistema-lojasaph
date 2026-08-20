# Handoff — Sistema Lojasaph

## Estado

A Fase 35 auditou `REQ-IMP-001` a `REQ-IMP-004` e o suporte migratório de aliases de `REQ-ITEM-002`, usando a Fase 15 / Issue #39 / PR #40 como baseline.

Frente:

- baseline de `main`: `60ab2012f68d9b8bd9d1371a455fd42235a59f7e`;
- branch `agent/import-foundation-audit`;
- nenhuma Issue funcional nova;
- evidência: `docs/qa/import-foundation-audit.md`;
- `docs/modules/imports.md` reconciliado com os filenames canônicos atuais;
- Issue #75 de backup permanece aberta/bloqueada;
- nenhum dado real importado;
- nenhuma migration/DDL/DML remota executada;
- nenhum deploy Vercel criado.

A Fase 34 / Issue #80 / PR #81 já está integrada. `main` contém `20260820184106_membership_rls_initplan.sql`; não reaplicar nem reabrir RLS salvo regressão concreta.

## Resultado da Fase 35

### REQ-IMP-001 — atendido

A fundação preserva batch/origem/arquivo/hash/versão/usuário e, por linha, aba/linha/payload bruto/hash/idempotency key/payload normalizado/resultado/warnings/erros.

### REQ-IMP-002 — atendido no staging

- batch determinístico é reutilizado;
- replay de linha não duplica;
- mudança de payload na mesma posição é conflito;
- origem reapresentada em nova versão pode ser marcada `duplicate`;
- finalização é idempotente.

Não extrapolar isso para a futura escrita definitiva nas tabelas operacionais; essa etapa ainda não existe.

### REQ-IMP-003 — atendido

- `mode` é limitado a `dry_run` pelo banco;
- as únicas RPCs públicas de importação observadas são staging, relatório e finalização de preview;
- introspecção remota confirmou ausência de DML operacional nessas RPCs;
- não existe command de apply/cutover;
- teste PostgreSQL cobre ausência de escrita operacional.

### REQ-IMP-004 — atendido

`import_rows` guarda `accepted`, `duplicate`, `warning`, `rejected`, `pending_mapping`, warnings, erros e resolução. O relatório consolida as seis contagens relevantes e força `review_required` quando há rejeição ou mapeamento pendente.

### REQ-ITEM-002 — aliases atendidos para migração

`item_aliases` continua com RLS e integridade por Organization. O resolver TypeScript usa somente nome canônico exato normalizado ou alias explícito. Similaridade aproximada não é aceita; ambiguidade/inexistência vira `pending_mapping`.

## Supabase remoto — fatos atuais

Projeto `fhbvwyttikrbeaanatlr`:

- `20260818180723 / import_staging` aplicado;
- `20260818180738 / import_staging_finalize_fix` aplicado;
- `20260818181051 / import_staging_indexes` aplicado;
- `20260820184106 / membership_rls_initplan` aplicado;
- `import_batches`, `import_rows`, `item_aliases` com RLS;
- staging oferece somente SELECT direto para `authenticated`;
- quatro RPCs de importação com `search_path=""`, guarda de identidade/escopo e sem EXECUTE para `anon`;
- `import_batches = 0`;
- `import_rows = 0`.

Nenhum write remoto foi usado nesta auditoria.

## Arquivos reais / higiene

- `docs/source-data/` contém somente Markdown;
- buscas não encontraram `.xlsx`, `.xls` ou `.csv` versionados;
- `.gitignore` exclui `.env*` salvo `.env.example` e `/backups/`;
- nenhum dump, planilha real ou segredo foi adicionado.

## Drift documental corrigido

`docs/modules/imports.md` estava desatualizado após a Fase 30 e ainda listava timestamps locais antigos para as migrations da Fase 15.

Agora usa exatamente:

- `20260818180723_import_staging.sql`;
- `20260818180738_import_staging_finalize_fix.sql`;
- `20260818181051_import_staging_indexes.sql`.

## Validação

Último head funcional integral antes desta auditoria documental:

- CI #328 — success;
- Business Transactions Integration #162 — success;
- Inventory Count Integration #178 — success.

O database gate executou `supabase/tests/import_staging.sql` em PostgreSQL 17 após aplicar a cadeia completa de migrations.

A Fase 35 não muda código/SQL. Confirmar CI do head documental final e fazer squash merge do PR desta branch.

## Issue #75 — backup

Permanece bloqueada por decisões operacionais de RPO/RTO/destino/retenção/proteção/alerta. Não editar/fechar sem decisão nova e automação real.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e `requirements.md`.
2. Conferir `main`, Issue #75, PRs/branches e CI reais.
3. Confirmar que a Fase 35 está integrada e que `docs/qa/import-foundation-audit.md` está em `main`.
4. Não reabrir Fase 15/importação nem Fase 34/RLS sem regressão concreta.
5. Executar a auditoria de `REQ-SEC-003 — Auditoria` definida em `NEXT_ACTION`.
6. Mapear `audit_logs` e todos os write paths críticos de Estoque, Caixa, Financeiro e configurações.
7. Verificar actor, Organization, action/entity, before/after/metadata necessários, idempotência de eventos, RLS/grants e ausência de DELETE direto.
8. Confirmar que payloads auditados não carregam secrets/tokens/credenciais ou conteúdo sensível desnecessário.
9. Usar Supabase read-only salvo correção versionada necessária.
10. Se o requisito estiver atendido, documentar sem Issue artificial; se houver gap reproduzível, uma única Issue + branch/fix mínimo.
11. Não criar deploy Vercel para uma auditoria de banco que não dependa de runtime hospedado.
12. Atualizar continuidade ao final.

## Não fazer

- não importar dados reais/cutover;
- não criar apply operacional de staging nesta frente;
- não reaplicar migrations;
- não redesenhar RLS/RPCs por warnings genéricos;
- não fechar #75 sem backup automático real;
- não reativar auto-deploy Vercel;
- não inferir Q-001..Q-025.
