# Next Action — Sistema Lojasaph

## Contexto

A Fase 46 continua integrada e o núcleo funcional do MVP permanece reconciliado.

A frente ativa continua sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices concluídas:

1. PR #107 — ADR-009 / arquitetura revisada;
2. PR #108 — transporte S3-compatible provider-neutral;
3. PR #109 — hard stop de archive em `300000000` bytes antes do upload;
4. provisionamento operacional do Cloudflare R2 + lifecycle + Bucket Lock + token limitado + GitHub Secrets/Variables;
5. ativação de `BACKUP_AUTOMATION_ENABLED=true`;
6. primeiro backup PostgreSQL Production real comprovado no run `33006253661`.

## Prova real já concluída

Run:
`https://github.com/synapselab-ia/sistema-lojasaph/actions/runs/33006253661`

Resultado:

- workflow `success`;
- roles/schema/data exportados;
- checksums internos verificados;
- archive `53185` bytes, abaixo do limite de `300000000`;
- manifesto verificado;
- upload para R2 concluído;
- objetos remotos rebaixados e re-hasheados com sucesso;
- cleanup do runner concluído;
- incidente #111 resolvido e fechado automaticamente.

Warning a preservar para a trilha de restore: `pg_dump` reportou constraints circulares em `stock_movements` e `payments`.

## Objetivo ativo

**Implementar a menor slice de persistência autoritativa de proteção no PostgreSQL.**

A UI `Proteção dos dados` não deve ser implementada antes desta fonte autoritativa existir e estar protegida por RLS.

## Antes de alterar código/banco

1. ler `AGENTS.md`;
2. ler `docs/00-START-HERE.md`;
3. reler `docs/ai/CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
4. conferir Issue #75, PRs, branches e CI reais;
5. reler `docs/decisions/ADR-009-data-protection-architecture.md`;
6. reler `docs/operations/backup-restore.md`;
7. conferir o estado real do Supabase Production;
8. consultar documentação/changelog atuais do Supabase antes de qualquer migration/RLS;
9. seguir Issue → branch → PR e integrar somente com CI verde.

## Escopo mínimo da próxima slice

Modelar uma fonte de verdade operacional para a proteção sem duplicar fisicamente o backup por Organization.

A implementação deve suportar no mínimo:

### Run de proteção

- identificador;
- tipo: `automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`;
- estado: `running`, `succeeded`, `failed`;
- início e fim;
- timestamp da cópia válida;
- integridade verificada;
- tamanho seguro quando aplicável;
- provider/destino lógico sem credenciais;
- cobertura declarada, inicialmente `postgres`;
- referência não sensível de execução quando útil;
- erro sanitizado;
- created/updated metadata conforme padrões existentes.

### Organizations cobertas

Um backup PostgreSQL Production é global por database/environment. Não criar um dump por Organization.

Persistir relação entre um run global e as Organizations cobertas para permitir que a futura UI derive o estado de proteção de cada Organization.

### Segurança / RLS

- membros autorizados podem ler o estado da própria Organization;
- cross-Organization deve ser negado;
- usuários comuns não podem forjar um run de backup bem-sucedido;
- escrita deve ser reservada ao processo server-side autorizado e ações administrativas explicitamente permitidas;
- nenhuma connection string, secret R2, token, SQL dump ou conteúdo sensível na tabela;
- erro deve ser sanitizado.

## Validação obrigatória da slice

- migration versionada;
- migration aplicada/testada em ambiente apropriado conforme workflow do projeto;
- RLS habilitada;
- teste positivo de leitura autorizada;
- teste negativo cross-Organization;
- teste negativo de mutation por usuário comum;
- validações SQL/database existentes;
- lint;
- typecheck;
- testes relevantes;
- build;
- CI verde antes do merge.

## Depois desta slice

A ordem planejada permanece:

1. persistência autoritativa de proteção — **próxima ação**;
2. UI `Proteção dos dados` no `RuntimeShell` + `/workspace/backup`;
3. trilha de backup dos binários do Supabase Storage/anexos;
4. restore real do bundle Production em destino isolado, considerando os warnings de FK circular;
5. exportação manual complementar por Organization, se mantida;
6. evidência final e fechamento da Issue #75 somente com cobertura real declarada.

## Estado operacional que não deve ser refeito

Já está concluído:

- Cloudflare R2 autorizado/provisionado;
- bucket `lojasaph-production-backups`;
- prefixo `production/postgres`;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- token limitado ao bucket;
- GitHub Actions Variables/Secrets do R2;
- Session pooler 5432 funcional;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup real verde;
- hard cap pré-upload 300 MB.

Não repetir essas etapas sem evidência concreta de regressão/configuração perdida.

## Repositório público temporário

O repositório está temporariamente `public` para evitar bloqueio por minutos de GitHub Actions no plano Free. Isso é uma decisão operacional temporária.

Não voltar para `private` automaticamente; o operador pretende fazer isso depois da fase intensiva de CI.

## Segurança / não fazer

- não pedir/receber secrets no chat;
- não reprovisionar R2 por inércia;
- não armazenar dump real no Git ou GitHub Artifact;
- não restaurar Production para teste;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular tabelas internas `storage.*` via SQL para copiar objetos;
- não pular a persistência e implementar UI baseada apenas em horário do cron;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não voltar a rclone/Drive/Gmail;
- não remover o hard cap de 300 MB;
- não criar deploy Vercel sem mudança runtime que realmente o exija.

## Critério de conclusão do próximo chat

A próxima sessão deve terminar com a slice de persistência autoritativa:

- implementada em branch própria;
- migration/RLS/testes validados;
- PR com CI verde e integrado quando seguro;
- documentação de continuidade atualizada;
- próxima ação apontando para a UI `Proteção dos dados`.

Se surgir bloqueio real de negócio/segurança, documentar o bloqueio e não inventar requisito para contorná-lo.
