# Next Action — Sistema Lojasaph

## Contexto

Fase 46 concluiu a reconciliação de prontidão operacional para homologação/cutover.

Resultado:

- o núcleo funcional do MVP permanece reconciliado;
- nenhuma nova lacuna funcional não-PENDING foi encontrada;
- nenhuma Issue nova foi aberta;
- `docs/qa/operational-readiness.md` publica a matriz A/B/C/D e o impacto de Q-001..Q-025;
- Supabase Production permanece `ACTIVE_HEALTHY`, sem development branches e com migration final `20260822195823 / finance_attachments`;
- Production Vercel observada está `READY` no SHA `62c3af63939c808487434e6e539ef0870a60d530`, igual à `main` na entrada da fase;
- `/health` Production respondeu HTTP 200, `environment=production`, Supabase permitido e admin bloqueado;
- nenhum deploy foi criado pela Fase 46;
- #75 continua aberta/desarmada;
- nenhum dado real, usuário real ou secret foi manipulado.

A próxima ação **não é uma Fase funcional automática**. O projeto entrou em estado de gate operacional.

## Objetivo ativo

**Verificar qual foi o primeiro desbloqueio concreto desde a Fase 46 e executar somente a trilha correspondente. Se nenhum gate foi desbloqueado, não abrir Issue/feature por inércia.**

## Ordem de decisão

### Gate 1 — backup Production / Issue #75

Considerar desbloqueado somente quando o operador estiver em computador pessoal/confiável e puder configurar as credenciais fora do chat.

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
4. confrontar `field-catalog.md`, `migration-plan.md` e a tabela Q-001..Q-025 de `operational-readiness.md`;
5. responder/solicitar somente as decisões que bloqueiam essa fonte;
6. documentar target canônico, transformação, rejeições/pending mappings e reconciliação;
7. somente depois abrir uma Issue de engenharia pequena para o importador específico;
8. implementar staging/dry run primeiro;
9. não criar aplicação definitiva genérica por antecipação;
10. antes de qualquer escrita real, exigir idempotência do apply, reconciliação, aceite e backup Production comprovado.

`ready` de import batch nunca significa autorização de cutover.

### Gate 3 — bootstrap do primeiro owner

Considerar desbloqueado somente quando houver:

- e-mail exato aprovado para o primeiro owner;
- Organization alvo confirmada quando necessário;
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

## Baseline a preservar

### GitHub/CI

- `main` de entrada da Fase 46: `62c3af63939c808487434e6e539ef0870a60d530`;
- CI #396: success;
- nenhuma nova Issue funcional na Fase 46;
- #75 é a única Issue operacional aberta.

### Supabase

Projeto `fhbvwyttikrbeaanatlr`:

- Production;
- `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- zero development branches;
- última migration `20260822195823 / finance_attachments`.

Não criar migration/branch/projeto sem necessidade e autorização.

### Vercel

Na Fase 46:

- Production já estava `READY` no SHA da `main` de entrada;
- `/health` estava saudável;
- nenhuma mudança de configuração/deploy foi necessária.

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
- não criar deploy Vercel só para auditoria;
- não fechar #75 sem backup real comprovado.

## Critério de conclusão do próximo chat

O próximo chat deve terminar em exatamente um destes estados:

1. um gate concreto foi executado com evidência e handoff atualizado; ou
2. nenhum gate estava desbloqueado e nenhuma mudança artificial foi criada.
