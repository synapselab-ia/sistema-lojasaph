# Next Action — Sistema Lojasaph

## Contexto

A Fase 46 continua integrada e a frente ativa permanece na Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices concluídas ou já implementadas nesta frente:

1. PR #107 — ADR-009 / arquitetura revisada;
2. PR #108 — transporte S3-compatible provider-neutral;
3. PR #109 — hard stop de archive em `300000000` bytes;
4. Cloudflare R2 + lifecycle + Bucket Lock + credenciais/Variables operacionais;
5. primeiro backup PostgreSQL Production real comprovado — run `33006253661`;
6. PR #113 — persistência autoritativa + relação com Organizations + RLS + boundary server-side;
7. PR #115 — UI read-only `Proteção dos dados`, implementada e validada em CI nesta slice.

Se PR #115 ainda estiver aberto ao retomar, não reimplementar. Conferir somente o head/CI final e integrar se estiver seguro.

## Estado real relevante

### Supabase Production

- projeto `fhbvwyttikrbeaanatlr`;
- `ACTIVE_HEALTHY`;
- PostgreSQL 17 / `sa-east-1`;
- migration `20260826201252 / protection_run_persistence`;
- `public.protection_runs = 0` rows reais na última revalidação.

Não fazer backfill manual do run `33006253661`.

### Backup real disponível

O primeiro archive Production real foi criado em `2026-08-26T19:40:47Z` e foi verificado off-site com checksums + re-download/rehash.

### Issue #110

Issue aberta: `[backup-alert] Monthly restore drill failing`.

O run `33000481649` falhou em `2026-08-26T18:35:37Z` na etapa `Download and verify latest real off-site backup` porque ainda não existia archive Production no namespace configurado. Essa falha ocorreu **antes** do primeiro backup real.

## Gap técnico identificado no restore drill atual

`.github/workflows/backup-restore-drill.yml` hoje faz duas provas diferentes:

1. baixa o bundle Production real e valida archive/manifesto/checksums;
2. constrói um banco **sintético** por migrations + seed e chama `scripts/verify-backup-restore.sh`, que gera e restaura um novo dump desse banco sintético.

Logo, o workflow atual **não restaura roles/schema/data do bundle Production baixado**.

Mesmo que uma nova execução fique verde agora que existe archive, isso comprovaria:

- download real;
- checksums/manifesto do bundle real;
- regressão sintética de pg_dump/pg_restore;

mas ainda não comprovaria restaurabilidade end-to-end do backup Production.

Warnings conhecidos do dump Production:

- constraints circulares em `stock_movements`;
- constraints circulares em `payments`.

## Objetivo ativo

**Provar a restauração end-to-end do bundle PostgreSQL Production real em destino isolado e registrar o restore drill autoritativamente, reconciliando a Issue #110.**

Production nunca deve ser restaurado ou mutado durante essa prova.

## Antes de alterar código

1. ler `AGENTS.md`;
2. ler `docs/00-START-HERE.md`;
3. reler `CURRENT_STATE`, `HANDOFF` e este arquivo;
4. conferir Issue #75 e Issue #110;
5. conferir PRs/branches/CI reais;
6. verificar se PR #115 já foi integrado e não refazer a UI;
7. reler ADR-009 e `docs/operations/backup-restore.md`;
8. revisar a documentação vigente do Supabase/PostgreSQL para restore lógico compatível;
9. não pedir nem transportar secrets pelo chat.

## Primeiro passo operacional

A falha da Issue #110 ocorreu simplesmente porque o archive ainda não existia.

Portanto, é aceitável executar **uma única nova prova controlada** do workflow atual depois de confirmar que ele está rodando a partir do `main` esperado.

Objetivo dessa execução inicial:

- confirmar que a descoberta/download do bundle agora avança;
- confirmar checksums/manifesto do bundle real;
- observar qualquer falha subsequente sem repetir runs inutilmente;
- permitir que o mecanismo idempotente de incidente atualize/feche #110 conforme o resultado.

Se esse run ficar verde, **não encerrar a slice**: o gap do restore real continua existindo enquanto o workflow restaurar apenas o dump sintético.

## Implementação mínima necessária

### 1. Restore do bundle real

Criar/adaptar um helper explícito para restaurar o conteúdo baixado do bundle Production em um PostgreSQL 17/destino isolado compatível.

A entrada deve ser o diretório extraído contendo:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`;
- metadata já validada.

O fluxo deve:

1. criar destino isolado novo/limpo;
2. nunca apontar para Production;
3. restaurar somente depois de validar checksums/manifesto;
4. aplicar a sequência apropriada de roles/schema/data conforme orientação vigente;
5. lidar com extensões/roles/ownership incompatíveis de forma explícita e auditável, sem simplesmente silenciar erro;
6. tratar triggers/FKs/ciclos de `stock_movements` e `payments` de forma reproduzível;
7. falhar fechado se qualquer etapa crítica não puder ser comprovada;
8. executar smoke tests de estrutura/dados mínimos no banco restaurado;
9. destruir somente o destino temporário ao final.

### 2. Não substituir a prova real por seed

O banco sintético pode continuar existindo como teste de regressão local/CI, mas não pode ser a evidência principal do restore drill mensal.

O resumo do workflow deve distinguir claramente:

- integridade/download do bundle Production;
- restore real do bundle Production;
- regressão sintética, se ainda mantida.

### 3. Persistência autoritativa de `restore_drill`

A fonte `public.protection_runs` já suporta `restore_drill`.

Generalizar/reutilizar o boundary server-side para que o workflow mensal registre:

- início;
- `restore_drill` / cobertura `postgres`;
- `succeeded` somente depois da restauração isolada real + smoke tests;
- `failed` com resumo sanitizado quando aplicável;
- relação às Organizations cobertas;
- sem secrets, connection strings ou conteúdo do dump.

Não mutar `protection_runs` diretamente e não criar mutation no browser.

### 4. Issue #110

O incidente deve continuar idempotente:

- falha mantém/atualiza #110;
- recuperação verde fecha #110 automaticamente;
- não fechar manualmente antes de uma prova verde suficiente.

## Testes obrigatórios

A slice deve provar no mínimo:

- helper recusa destino igual/compatível com Production quando houver risco de ambiguidade;
- archive/sidecars precisam estar íntegros antes do restore;
- restore real do bundle em ambiente isolado;
- falha explícita para erro de roles/schema/data;
- tratamento dos ciclos/FKs conhecidos sem perda silenciosa;
- smoke test de dados/objetos críticos restaurados;
- persistência `restore_drill` positiva/negativa e idempotente;
- RLS/grants existentes continuam verdes;
- lint;
- typecheck;
- unit/integration tests aplicáveis;
- production build;
- CI verde.

## Fora do escopo

- restaurar Production;
- cutover real para novo projeto;
- backup de Supabase Storage/anexos;
- exportação manual por Organization;
- mudar RPO/retention;
- reprovisionar R2;
- alterar secrets por inércia;
- deploy Vercel para validar restore backend.

## Depois desta slice

Ordem recomendada:

1. persistência autoritativa — concluída;
2. UI `Proteção dos dados` — concluída/PR #115;
3. restore real isolado + `restore_drill` autoritativo — **próxima ação**;
4. backup dos binários Supabase Storage/anexos;
5. exportação manual complementar, se mantida;
6. evidência final e fechamento da #75 somente com cobertura corretamente declarada.

## Estado operacional que não deve ser refeito

- R2 já provisionado;
- bucket/prefix/lifecycle/lock já configurados;
- credenciais já estão em GitHub Actions Secrets;
- Session pooler 5432 já comprovado;
- `BACKUP_AUTOMATION_ENABLED=true`;
- backup Production real já existe;
- hard cap 300 MB ativo;
- migration `20260826201252` ativa;
- UI read-only já implementada no PR #115.

## Segurança / não fazer

- não pedir/receber secrets no chat;
- não restaurar Production para teste;
- não usar dump real como GitHub Artifact;
- não colocar conteúdo do backup em logs/documentação;
- não backfillar `33006253661` em `protection_runs`;
- não mutar `protection_runs` pelo browser;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular binários via `storage.*` SQL;
- não voltar a Drive/rclone/Gmail;
- não remover o hard cap;
- não retornar o repositório a `private` automaticamente.

## Critério de conclusão da próxima sessão

A próxima sessão deve terminar com uma resposta inequívoca para: **o bundle PostgreSQL Production real consegue ser restaurado em destino isolado e validado?**

- se sim: evidência registrada, `restore_drill` autoritativo persistido, #110 resolvida e documentação atualizada;
- se não: falha reproduzida, causa concreta registrada e código/documentação deixados em estado seguro para a correção seguinte.
