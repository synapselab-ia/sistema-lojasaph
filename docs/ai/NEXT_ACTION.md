# Next Action — Sistema Lojasaph

## Contexto

Fase 46 concluiu a reconciliação de prontidão operacional para homologação/cutover. O gate check pós-Fase 46 foi integrado pelo PR #105.

Baseline de referência confirmada em 2026-08-26:

- baseline anterior ao gate check: `b5caef11ef6e0a84b47101dc63fb1c0d05218e2d`;
- PR #105 — `docs(ai): refresh operational gate handoff`: merged;
- merge do gate check/handoff: `f0ce56425d9e31aebbc3447112bd05f381fd2ccd`;
- CI #399 no head do PR #105: success;
- CI #400 em `main` após o merge: success (`database`, lint, typecheck, Vitest e production build);
- nenhum PR aberto após o merge do #105;
- única Issue aberta: #75 — backup automático real de Production;
- Supabase Production `fhbvwyttikrbeaanatlr`: `ACTIVE_HEALTHY`, PostgreSQL 17, zero development branches e migration final `20260822195823 / finance_attachments`;
- Vercel Production continua `READY` no deployment existente `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`, hospedando o SHA `62c3af63939c808487434e6e539ef0870a60d530`;
- `/health` continua HTTP 200 com Production/Supabase permitidos e admin bloqueado;
- nenhum deploy foi criado para sincronizar documentação;
- nenhum dado real, usuário real, secret, migration, DDL ou DML foi manipulado no gate check.

`f0ce5642...` é **SHA de referência do gate check**, não um HEAD eterno. Este arquivo pode ser integrado por commit/PR exclusivamente documental posterior. Um novo chat deve sempre conferir a `main` real e distinguir um avanço documental de uma nova frente funcional.

O gate check encontrou **todos os quatro gates ainda bloqueados**. A próxima ação continua sendo gate-driven, não uma nova fase funcional automática.

## Objetivo ativo

**Verificar qual foi o primeiro desbloqueio concreto desde o último gate check e executar somente a trilha correspondente. Se nenhum gate foi desbloqueado, preservar a baseline e não criar trabalho artificial.**

## Ordem de decisão

### Gate 1 — backup Production / Issue #75

Considerar desbloqueado somente quando o operador estiver em computador pessoal/confiável e puder configurar as credenciais fora do chat.

Estado conhecido:

- implementação/workflows já prontos;
- política aprovada: RPO 24h, diário, RTO <=4h, Drive privado, retenção 30 dias, alerta `synapselab.ia@gmail.com`, restore drill mensal isolado;
- `PRODUCTION_SUPABASE_DB_URL` já foi provisionado anteriormente;
- ainda faltam OAuth/rclone, `BACKUP_RCLONE_CONFIG_B64`, `BACKUP_ALERT_GMAIL_APP_PASSWORD`, arming e primeiro run real.

Se estiver desbloqueado:

1. reler `docs/operations/backup-restore.md` e a Issue #75;
2. nunca pedir valores de secrets no chat;
3. configurar OAuth/rclone `[lojasaph-drive]` em máquina confiável;
4. provisionar, fora do chat, os secrets pendentes;
5. criar `BACKUP_AUTOMATION_ENABLED=true` somente depois dos secrets;
6. executar uma única vez `Production Database Backup` via `workflow_dispatch`;
7. confirmar run verde, archive + `.sha256` no Drive e integridade pós-upload;
8. registrar somente evidência não sensível;
9. fechar #75 somente depois da evidência completa.

Não restaurar Production para teste e não criar deploy Vercel para essa trilha.

### Gate 2 — fonte final para migração

Considerar desbloqueado somente quando existir uma fonte final congelada para um recorte específico, com arquivo/cópia aprovada disponível de forma segura.

Se estiver desbloqueado:

1. não começar por todas as seis planilhas;
2. identificar uma única fonte/vertical;
3. registrar timestamp de extração e SHA-256 sem versionar o arquivo real no Git;
4. confrontar `docs/source-data/field-catalog.md`, `docs/source-data/migration-plan.md` e `docs/qa/operational-readiness.md`;
5. responder/solicitar somente as decisões `Q-*` que bloqueiam aquela fonte;
6. documentar target canônico, transformação, rejeições/pending mappings e reconciliação;
7. somente depois abrir uma Issue de engenharia pequena para o importador específico;
8. implementar staging/dry run primeiro;
9. não criar aplicação definitiva genérica por antecipação;
10. antes de qualquer escrita real, exigir idempotência do apply, reconciliação, aceite e backup Production comprovado.

`ready` de import batch nunca significa autorização de cutover.

### Gate 3 — bootstrap do primeiro owner

Considerar desbloqueado somente quando houver, como conjunto aprovado:

- e-mail exato do primeiro owner;
- Organization alvo confirmada quando necessária;
- domínio HTTPS canônico;
- redirect `/auth/invite` autorizado no Supabase Auth;
- capacidade de entrega do convite verificada;
- autorização operacional para abrir a janela curta de bootstrap.

Se estiver desbloqueado:

1. reler `docs/operations/bootstrap-owner.md` e `docs/operations/environments.md`;
2. não aceitar e-mail arbitrário do browser;
3. não criar senha conhecida pelo operador/agente;
4. usar somente envs server-only temporárias;
5. enviar uma única vez o convite ao e-mail autorizado;
6. deixar o usuário definir a própria senha;
7. criar o membership owner somente pela action prevista;
8. validar audit/login/RLS;
9. remover as envs temporárias após o bootstrap;
10. não provisionar outros usuários até Q-022 e o mapeamento real de roles/escopos estarem aprovados.

### Gate 4 — nova prioridade explícita/regressão

Se houver uma regressão reproduzível ou nova prioridade de produto fornecida explicitamente:

1. confrontar requirements/scope/ADRs e o estado real;
2. abrir no máximo uma Issue clara para a menor slice necessária;
3. não reabrir Fases 41–46 sem evidência;
4. não puxar SHOULD/COULD/PENDING apenas porque existe capacidade técnica.

## Se nenhum gate estiver desbloqueado

Não alterar código, Supabase, Vercel ou dados.

Não abrir Issue para representar:

- pergunta PENDING;
- ausência de fonte final;
- secret/credencial ainda não provisionado;
- usuário/role ainda não mapeado;
- data de cutover ainda não aprovada.

A resposta correta é preservar a baseline e deixar explícito qual evento externo precisa acontecer primeiro.

Um update documental de continuidade só se justifica quando houver drift real de baseline/handoff. **Não criar PR documental repetitivo apenas para atualizar o SHA produzido pelo próprio PR documental.** O SHA de referência do último gate check é suficiente; o HEAD real deve ser consultado ao iniciar cada chat.

## Baseline a preservar

### GitHub/CI

- referência do gate check integrado: `f0ce56425d9e31aebbc3447112bd05f381fd2ccd`;
- CI #400: success;
- PRs abertos após o gate check: nenhum;
- Issue aberta: somente #75;
- se `main` estiver em SHA posterior, verificar se é apenas continuidade documental antes de interpretar como nova frente.

### Supabase

Projeto `fhbvwyttikrbeaanatlr`:

- Production;
- `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero development branches;
- última migration `20260822195823 / finance_attachments`.

Não criar migration/branch/projeto sem necessidade e autorização.

### Vercel

- deployment Production observado: `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`;
- estado `READY`;
- commit hospedado `62c3af63...`;
- `/health` saudável;
- commits posteriores observados são documentais no último gate check.

Não consumir deploy por conveniência.

## Readiness — consulta obrigatória

Antes de qualquer trilha, ler:

- `docs/qa/operational-readiness.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- documentação específica do gate.

Para migração também ler:

- `docs/modules/imports.md`;
- `docs/source-data/migration-plan.md`;
- `docs/source-data/field-catalog.md`;
- `docs/product/open-questions.md`.

## Segurança / operação

- nunca pedir/receber secrets no chat;
- não importar dados reais sem fonte congelada, regra, dry run, reconciliação e aceite;
- não criar/invitar usuários reais sem gate específico;
- não promover `PENDING` por inferência;
- não contornar RLS;
- não manipular Storage por SQL;
- não restaurar Production para teste;
- não usar outro projeto Supabase como Preview por inferência;
- não criar branch/projeto pago sem autorização;
- não criar deploy Vercel só para documentação;
- não fechar #75 sem backup real comprovado.

## Critério de conclusão do próximo chat

O próximo chat deve terminar em exatamente um destes estados:

1. um gate concreto foi executado com evidência e handoff atualizado; ou
2. nenhum gate estava desbloqueado, a baseline foi preservada e nenhuma mudança artificial foi criada.
