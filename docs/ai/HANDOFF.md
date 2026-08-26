# Handoff — Sistema Lojasaph

## Estado

**Fase 46 continua concluída e integrada.**  
A frente ativa continua sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

A slice de **persistência autoritativa dos runs de proteção** foi integrada pelo PR #113 em `main`, validada no CI e aplicada ao Supabase Production pela migration `20260826201252 / protection_run_persistence`.

A próxima slice é a UI read-only `Proteção dos dados`. Não reimplementar a persistência.

## Estado vivo no encerramento desta slice

### GitHub

- `main`: `61224515d361607a0a97e0bbab3b9d1bddd3352a` — squash merge do PR #113;
- PR #113: integrado — `feat(backup): persist authoritative protection runs`;
- head final do PR `c532f68dfb388bfdc2a8466a9820e13947bd5377`: `database`, `validate`, `inventory-database` e `business-database` verdes;
- CI pós-merge #427 / run `33009978256` em `main`: `database` e `validate` verdes, incluindo lint, typecheck, unit tests e production build;
- a branch `agent/protection-run-persistence` é histórica após o merge;
- Issue #75 permanece aberta;
- repositório segue temporariamente `public` por decisão operacional do operador; não alterar automaticamente.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- PostgreSQL 17 / `sa-east-1`;
- migration final: `20260826201252 / protection_run_persistence`;
- arquivo versionado do Git foi reconciliado para a mesma versão;
- objetos novos não colidiram com schema pré-existente;
- teste hospedado de RLS em transação + rollback passou;
- nenhum dado sintético de validação permaneceu;
- security advisors não criaram warning novo ligado à nova persistência;
- performance advisor marcou apenas o índice novo como ainda não utilizado, esperado enquanto a tabela está vazia.

## O que a slice criou

### Fonte autoritativa

`public.protection_runs` guarda metadata sanitizada de:

- `automatic_database`;
- `automatic_storage`;
- `manual_export`;
- `restore_drill`.

Estados suportados:

- `running`;
- `succeeded`;
- `failed`.

Também registra início/fim, cópia válida, integridade, tamanho, provider/destino lógico, cobertura, referência de execução, erro sanitizado e timestamps de criação/atualização.

`public.protection_run_organizations` relaciona cada run às Organizations cobertas. O PostgreSQL Production continua produzindo **um único backup global**, sem dump duplicado por Organization.

### Segurança

- RLS está habilitada nas duas tabelas;
- membro ativo lê somente runs que cobrem sua Organization;
- tabela de relação também filtra por Organization;
- `authenticated` não possui INSERT/UPDATE/DELETE;
- `authenticated` não executa os comandos privados de mutation;
- `service_role` também não possui mutation direta das tabelas;
- escrita autorizada ocorre somente por:
  - `private.begin_protection_run(...)`;
  - `private.complete_protection_run(...)`;
- os comandos são idempotentes por `execution_reference`;
- replay divergente é rejeitado;
- nenhuma credencial, connection string, dump, token ou conteúdo sensível é persistido.

### Workflow

`.github/workflows/production-backup.yml` agora:

1. abre o run autoritativo antes da exportação;
2. executa dump/package/checksums/manifesto;
3. envia ao R2 e revalida remotamente;
4. limpa o material temporário;
5. só depois finaliza `succeeded` com evidência sanitizada;
6. em falha, tenta finalizar `failed` e mantém o incidente GitHub-native.

A automação é fail-closed: falha de persistência autoritativa impede um sucesso enganoso do job.

## Validação realizada

### CI

A suíte `supabase/tests/protection_runs.sql` provou:

- start/finalização idempotentes;
- run global relacionado a múltiplas Organizations;
- leitura autorizada;
- cross-Organization negado;
- outsider negado;
- anon negado;
- INSERT/UPDATE/DELETE por usuário comum negados;
- RPC privada negada a `authenticated`;
- `service_role` com EXECUTE dos comandos, mas sem mutation direta.

Além do CI funcional inicial, o head final do PR passou todos os checks aplicáveis e o push do merge em `main` passou o CI #427 integralmente.

### Production hospedado

Foi feita validação não destrutiva em transação com rollback:

- um membro ativo leu um run sintético coberto;
- o mesmo contexto autenticado não conseguiu inserir diretamente;
- um UUID outsider não leu o run;
- rollback removeu todo material sintético.

Privilégios hospedados confirmados:

- `service_role`: EXECUTE nos dois comandos privados;
- `service_role`: sem INSERT/UPDATE direto em `protection_runs`;
- `authenticated`: sem EXECUTE nos comandos;
- `authenticated`: sem INSERT direto;
- `authenticated`: SELECT sujeito à RLS.

## Estado inicial importante

No momento da validação, `public.protection_runs` possui **0 rows**.

Isso é correto: o workflow com persistência ainda não teve uma execução real pós-integração. Não inserir manualmente o backup histórico `33006253661` para “preencher” a UI; ele aconteceu antes do novo boundary e deve permanecer apenas como evidência histórica documental/GitHub-native.

A primeira execução real futura do workflow integrado deve gerar o primeiro registro autoritativo automaticamente.

## Backup PostgreSQL já comprovado antes desta slice

- run `33006253661`;
- archive `lojasaph-production-20260826T194047Z-33006253661.tar.gz`;
- `53185` bytes;
- hard cap `300000000` bytes;
- R2 upload + re-download + SHA-256 OK;
- lifecycle 30 dias + Bucket Lock 30 dias já configurados;
- Issue #111 de incidente já foi fechada após recuperação.

Não repetir configuração/provisionamento sem regressão concreta.

## Warning para restore

O dump real anterior reportou constraints circulares em:

- `stock_movements`;
- `payments`.

Não declarar restore Production end-to-end comprovado. A prova real de restore ainda precisa acontecer em destino isolado e compatível.

## Próxima slice exata

**UI read-only `Proteção dos dados`.**

O próximo chat deve:

1. ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, ADR-009 e runbook;
2. conferir GitHub/CI/Supabase reais antes de alterar código;
3. verificar se já apareceu um run autoritativo real; se não, tratar zero rows como estado vazio legítimo;
4. abrir Issue/branch/PR conforme workflow se necessário dentro da #75;
5. adicionar acesso no `RuntimeShell` e rota `/workspace/backup`;
6. consumir somente a fonte autoritativa existente sob RLS;
7. mostrar estado/cópia válida/integridade/cobertura/retenção/histórico/restore drill apenas quando os dados existirem;
8. não inferir sucesso a partir de cron/GitHub Actions e não backfillar manualmente run antigo;
9. manter a slice read-only — nenhuma mutation operacional de backup no browser;
10. provar estados vazio/sucesso/falha e isolamento, além de lint/typecheck/test/build;
11. integrar somente com CI verde.

## O que ainda falta na #75

1. UI `Proteção dos dados`;
2. primeira execução real pós-integração persistida automaticamente;
3. backup dos binários do Supabase Storage/anexos;
4. restore real do backup Production em ambiente isolado compatível;
5. exportação manual complementar por Organization, se mantida;
6. evidência final suficiente para fechar #75;
7. retorno do repositório a `private` quando o operador decidir encerrar a fase temporária de CI público.

## Restrições importantes

- não refazer a migration/persistência já concluída;
- não backfillar `33006253661` manualmente;
- não reprovisionar R2 nem recriar tokens/secrets sem motivo concreto;
- não pedir secrets no chat;
- não manipular `storage.*` diretamente por SQL para copiar arquivos;
- não declarar Storage/anexos cobertos pelo dump PostgreSQL;
- não restaurar Production para teste;
- não voltar a Drive/rclone/Gmail;
- não remover/reduzir o hard cap de 300 MB;
- não retornar o repositório para private automaticamente;
- não reabrir Fases 41–45 sem regressão concreta.
