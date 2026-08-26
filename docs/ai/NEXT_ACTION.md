# Next Action — Sistema Lojasaph

## Contexto

A Fase 46 continua integrada e o núcleo funcional do MVP permanece reconciliado.

A frente ativa continua sendo a Issue #75 / `REQ-PLAT-005 — Proteção, backup e recuperação de dados`.

Slices concluídas:

1. PR #107 — ADR-009 / arquitetura revisada;
2. PR #108 — transporte S3-compatible provider-neutral;
3. PR #109 — hard stop de archive em `300000000` bytes antes do upload;
4. Cloudflare R2 + lifecycle + Bucket Lock + credenciais/Variables operacionais;
5. primeiro backup PostgreSQL Production real comprovado no run `33006253661`;
6. PR #113 — persistência autoritativa dos runs de proteção + relação com Organizations + RLS + boundary server-side.

## Fonte autoritativa disponível

Supabase Production possui a migration:

`20260826201252 / protection_run_persistence`

A fonte de verdade operacional agora é:

- `public.protection_runs`;
- `public.protection_run_organizations`.

A leitura é protegida por RLS e a mutation é reservada aos comandos privados server-side. Usuários comuns não podem forjar sucesso de backup.

No fim da slice de persistência havia `0` rows reais em `protection_runs`, porque nenhuma execução real do workflow novo havia ocorrido ainda. Isso é um estado inicial legítimo. Não fazer backfill manual do run histórico `33006253661`.

## Objetivo ativo

**Implementar a menor slice read-only da UI `Proteção dos dados`, consumindo exclusivamente a fonte autoritativa de proteção.**

A UI não deve inferir sucesso pelo horário do cron, por GitHub Actions ou por documentação histórica.

## Antes de alterar código

1. ler `AGENTS.md`;
2. ler `docs/00-START-HERE.md`;
3. reler `docs/ai/CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
4. conferir Issue #75, PRs, branches e CI reais;
5. reler `docs/decisions/ADR-009-data-protection-architecture.md`;
6. reler `docs/operations/backup-restore.md`;
7. conferir o estado real do Supabase Production e verificar se já existe algum run autoritativo real pós-integração;
8. seguir Issue → branch → PR e integrar somente com CI verde.

## Escopo mínimo da próxima slice

### Navegação

- adicionar `Proteção dos dados` ao `src/components/runtime-shell.tsx` seguindo o padrão dos links existentes;
- criar a rota `/workspace/backup` dentro do grupo operacional do App Router, consistente com as demais rotas em `src/app/workspace/(operacao)`;
- não criar uma segunda shell nem fluxo administrativo paralelo.

### Leitura dos dados

A página deve consultar somente os registros visíveis pela RLS para a Organization corrente.

Não usar credencial privilegiada no browser e não introduzir mutation de backup nesta slice.

A implementação deve suportar, no mínimo:

- estado vazio quando ainda não houver run autoritativo;
- último run de PostgreSQL visível;
- última cópia válida (`valid_copy_at`);
- status persistido (`running`, `succeeded`, `failed`);
- integridade verificada;
- cobertura declarada;
- tamanho quando aplicável;
- provider/destino em linguagem lógica, sem revelar credenciais ou detalhes internos desnecessários;
- histórico recente de runs visíveis;
- restore drill quando existir registro desse tipo;
- retenção/política operacional apresentada a partir da configuração/documentação estável do produto, sem fingir evidência de um run que não existe.

### Semântica visual

A UI pode usar verde/âmbar/vermelho, mas a decisão deve ser derivada de dados autoritativos e da política de RPO de 24 horas.

Regras mínimas:

- **verde** somente quando houver cópia PostgreSQL `succeeded`, `integrity_verified=true` e `valid_copy_at` dentro do RPO vigente;
- **âmbar** para estado transitório/indeterminado que exija atenção sem prova de falha definitiva, por exemplo `running` ou ausência inicial de histórico logo após a ativação;
- **vermelho** para falha persistida ou ausência de cópia válida além do RPO;
- não converter simplesmente o cron diário em “backup OK”;
- se houver ambiguidade entre runs concorrentes ou cobertura incompleta, preferir estado conservador e explicação clara em vez de inventar sucesso.

### Estado vazio

Se `protection_runs` continuar vazio:

- mostrar que ainda não existe execução autoritativa registrada;
- não mostrar o run `33006253661` como se estivesse na nova fonte;
- não criar row manualmente para melhorar a aparência;
- explicar de forma curta que o histórico começa com a automação autoritativa integrada.

### Segurança / privacidade

Não expor na UI:

- connection strings;
- secrets/tokens;
- bucket endpoint físico quando não necessário ao usuário;
- GitHub run IDs/URLs como fonte primária de estado;
- conteúdo de erro bruto;
- SQL dump, object keys sensíveis ou material de autenticação.

`error_summary`, se exibido, deve continuar tratado como mensagem operacional sanitizada.

## Testes obrigatórios

A slice deve provar pelo menos:

- renderização do estado vazio;
- renderização de run válido/sucedido;
- renderização de `running`;
- renderização de falha;
- tratamento de cópia válida fora do RPO;
- histórico ordenado corretamente;
- nenhuma mutation privilegiada no cliente;
- acesso respeitando a Organization/RLS existente;
- lint;
- typecheck;
- testes unitários/relevantes;
- production build;
- CI verde antes do merge.

Se a arquitetura atual já tiver helpers/repositories server-side para leitura Supabase autenticada, reutilizá-los em vez de criar um caminho paralelo.

## Fora do escopo desta slice

- iniciar backup manual pela UI;
- retry/cancelar workflow;
- editar políticas de retenção;
- backup dos binários do Supabase Storage/anexos;
- restore real;
- exportação manual por Organization;
- backfill do run histórico anterior à persistência;
- dashboards/BI de custo ou SLA além do necessário para a página de proteção.

## Depois desta slice

A ordem planejada passa a ser:

1. persistência autoritativa de proteção — **concluída**;
2. UI `Proteção dos dados` — **próxima ação**;
3. backup dos binários do Supabase Storage/anexos;
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
- primeiro backup PostgreSQL real verde;
- hard cap pré-upload 300 MB;
- migration `20260826201252` e RLS da persistência autoritativa.

Não repetir essas etapas sem evidência concreta de regressão/configuração perdida.

## Repositório público temporário

O repositório continua temporariamente `public` para evitar bloqueio por minutos de GitHub Actions no plano Free.

Não voltar para `private` automaticamente; o operador pretende fazer isso depois da fase intensiva de CI.

## Segurança / não fazer

- não pedir/receber secrets no chat;
- não reprovisionar R2 por inércia;
- não armazenar dump real no Git ou GitHub Artifact;
- não restaurar Production para teste;
- não declarar Storage protegido pelo dump PostgreSQL;
- não manipular tabelas internas `storage.*` via SQL para copiar objetos;
- não mutar `protection_runs` pelo browser;
- não usar o cron como fonte de verdade da UI;
- não backfillar manualmente `33006253661`;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não voltar a rclone/Drive/Gmail;
- não remover o hard cap de 300 MB.

## Critério de conclusão do próximo chat

A próxima sessão deve terminar com a UI `Proteção dos dados`:

- implementada em branch própria;
- consumindo a fonte autoritativa sob RLS;
- cobrindo estado vazio e estados operacionais reais;
- testada sem mutation privilegiada no browser;
- com PR/CI verdes e integrada quando seguro;
- documentação de continuidade atualizada para a próxima slice da Issue #75.

Se surgir bloqueio real de negócio/segurança, documentar o bloqueio e não inventar requisito para contorná-lo.
