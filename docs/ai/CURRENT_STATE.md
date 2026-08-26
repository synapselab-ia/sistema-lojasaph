# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 continua integrada; frente ativa: Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.**

A slice de **persistência autoritativa dos runs de proteção no PostgreSQL** foi implementada no PR #113 e aplicada ao Supabase Production pela migration `20260826201252 / protection_run_persistence`.

O backup automático off-site do PostgreSQL Production continua operacional no Cloudflare R2. A nova persistência não substitui o bundle de recuperação: ela é o espelho operacional sanitizado que a futura UI `Proteção dos dados` deve consumir.

O núcleo funcional das Fases 41–45 não foi reaberto.

## GitHub / baseline desta slice

- `main` no início desta sessão: `e0f46000637adcd2479f6a4322cfb9137a699752`;
- branch ativa: `agent/protection-run-persistence`;
- PR #113: `feat(backup): persist authoritative protection runs`;
- CI #419 comprovou a implementação inicial com `database`, lint, typecheck, unit tests e production build verdes;
- qualquer commit documental/reconciliação posterior do PR também deve permanecer verde antes do merge;
- Issue #75 continua aberta: UI, Storage, restore real isolado e demais slices ainda não estão concluídos;
- repositório continua temporariamente `public` por decisão operacional para evitar bloqueio por minutos privados do GitHub Free; não retornar para `private` automaticamente.

## Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- região `sa-east-1`;
- PostgreSQL 17;
- migration final: `20260826201252 / protection_run_persistence`;
- migration do Git foi reconciliada para a mesma versão hospedada;
- teste hospedado real de RLS foi executado dentro de transação com `ROLLBACK`:
  - membro ativo da Organization coberta conseguiu ler o run sintético;
  - usuário autenticado não conseguiu inserir run diretamente;
  - outsider autenticado não conseguiu ler o run;
  - nenhum dado sintético permaneceu no banco;
- security advisors não introduziram warning novo ligado à persistência de proteção;
- performance advisors apenas reportaram `protection_runs_recent_idx` como ainda não utilizado, esperado para uma tabela recém-criada e vazia, além de avisos anteriores não relacionados.

### Estado inicial da fonte autoritativa

No encerramento da validação hospedada:

- `protection_runs = 0`;
- isso é **esperado**: nenhum run real do workflow novo aconteceu após a integração desta slice;
- não fazer backfill manual do backup anterior `33006253661` como se fosse evidência autoritativa produzida pelo novo processo;
- a primeira execução real pós-integração do workflow deve ser a primeira a gravar o novo histórico automaticamente.

## Persistência autoritativa implementada

### `public.protection_runs`

Registra somente metadata operacional sanitizada:

- tipo: `automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`;
- estado: `running`, `succeeded`, `failed`;
- início/fim;
- timestamp da cópia válida;
- integridade verificada;
- tamanho seguro quando aplicável;
- provider/destino lógico sem credenciais;
- cobertura;
- referência não sensível de execução;
- erro sanitizado;
- created/updated metadata.

Constraints impedem declarar `succeeded` sem cópia válida, integridade positiva e tamanho conhecido. Falhas exigem resumo sanitizado.

### `public.protection_run_organizations`

Relaciona um run global às Organizations cobertas. O backup PostgreSQL Production continua sendo um único dump global por environment; não existe duplicação física por Organization.

### Segurança / RLS

- `authenticated` possui somente `SELECT` nas tabelas;
- leitura de `protection_runs` exige membership ativa em pelo menos uma Organization coberta;
- leitura da tabela de relação também é restrita à própria Organization;
- cross-Organization foi testado negativamente no CI e no Supabase hospedado;
- usuários comuns não podem executar os comandos privilegiados;
- `service_role` também não recebe INSERT/UPDATE/DELETE direto nas tabelas;
- mutations passam somente por `private.begin_protection_run(...)` e `private.complete_protection_run(...)`;
- os comandos são idempotentes por `execution_reference` e rejeitam replay divergente;
- nenhuma connection string, token R2, SQL dump ou conteúdo de backup é persistido.

## Workflow de backup atualizado

`.github/workflows/production-backup.yml` agora:

1. valida configuração/tooling;
2. abre o run autoritativo antes da exportação;
3. exporta, empacota e verifica o backup;
4. envia ao R2 e revalida os objetos remotos;
5. remove material temporário local;
6. somente então finaliza `succeeded` com timestamp/tamanho/integridade;
7. em falha, tenta finalizar `failed` com mensagem sanitizada e mantém o incidente GitHub-native existente.

O fluxo é fail-closed: se o registro autoritativo não puder ser iniciado/finalizado corretamente, o job não deve aparentar sucesso completo.

## Backup PostgreSQL real já comprovado

A prova off-site anterior permanece válida:

- workflow run: `33006253661`;
- archive: `lojasaph-production-20260826T194047Z-33006253661.tar.gz`;
- tamanho: `53185` bytes;
- hard cap: `300000000` bytes;
- roles/schema/data exportados;
- checksums e manifesto verificados;
- upload R2 concluído;
- objetos remotos baixados novamente e SHA-256 revalidado;
- cleanup do runner concluído;
- Issue #111 resolvida automaticamente após recuperação.

Esse run antecede a nova persistência e não deve ser backfilled manualmente.

## Warning relevante para restore

O primeiro dump real reportou constraints circulares em:

- `stock_movements`;
- `payments`.

O artefato off-site é válido, mas restaurabilidade Production end-to-end ainda não foi comprovada. O restore real deve ocorrer somente em destino isolado e tratar explicitamente esse warning.

## Cobertura atual

### Comprovado

- backup automático lógico do PostgreSQL Production;
- archive + checksums + manifesto;
- hard cap pré-upload de 300 MB decimal;
- transporte off-site para R2;
- re-download/rehash remoto;
- retenção/lock configurados pelo operador;
- incidente persistente GitHub-native em falha e auto-resolve em recuperação;
- persistência autoritativa sanitizada no PostgreSQL;
- relação run global ↔ Organizations;
- RLS e bloqueio de mutation comum;
- boundary server-side idempotente para registrar runs.

### Ainda não comprovado/concluído

- primeiro run **real pós-integração** gravado pela nova automação;
- card/página `Proteção dos dados`;
- backup dos binários do Supabase Storage/anexos;
- restore real do bundle Production em ambiente isolado compatível;
- exportação manual complementar por Organization;
- cobertura completa de plataforma/configurações externas ao dump;
- retorno do repositório para `private`.

## Próxima ação exata

**Implementar a UI read-only `Proteção dos dados`, consumindo exclusivamente a nova fonte autoritativa sob RLS.**

A próxima slice deve:

1. conferir GitHub/CI/Supabase reais e reler os documentos canônicos;
2. verificar se já existe run real pós-integração; se ainda não existir, tratar isso como estado vazio legítimo;
3. adicionar o acesso no `RuntimeShell` e a rota `/workspace/backup`;
4. consultar somente `protection_runs`/relação autorizada pela RLS da Organization corrente;
5. mostrar estado, última cópia válida, integridade, cobertura, retenção/histórico e restore drill quando houver evidência real;
6. nunca inferir sucesso apenas pelo cron, nem usar o run antigo como backfill fictício;
7. não expor IDs internos desnecessários, GitHub internals, bucket físico, connection strings ou secrets;
8. validar estados vazio/sucesso/falha e isolamento, além de lint, typecheck, testes e build;
9. integrar somente com CI verde.

Ver `docs/ai/NEXT_ACTION.md` para o escopo detalhado.

## Não fazer

- não backfillar manualmente `33006253661` na nova tabela;
- não reprovisionar R2, bucket, lifecycle, lock, token ou GitHub Secrets já concluídos sem evidência de problema;
- não pedir/receber secrets no chat;
- não declarar Storage/anexos cobertos pelo backup PostgreSQL;
- não restaurar Production para teste;
- não alterar diretamente `protection_runs` a partir do cliente;
- não basear a UI em horário do cron ou GitHub Actions como fonte de verdade;
- não voltar ao fluxo Drive/rclone/Gmail;
- não desfazer o limite rígido de 300 MB;
- não retornar o repositório para `private` até decisão do operador;
- não criar deploy Vercel para esta slice backend/documental; a próxima slice de UI é runtime e deve seguir o fluxo normal do projeto quando chegar a hora.
