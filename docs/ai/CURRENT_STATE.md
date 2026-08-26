# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 — prontidão operacional para homologação e cutover — concluída e integrada.**

O núcleo funcional do MVP permanece reconciliado após as Fases 41–45. A Fase 46 publicou `docs/qa/operational-readiness.md` e não encontrou nova lacuna funcional não-PENDING que justifique abrir feature ou Issue por inércia.

### Gate check pós-Fase 46 — 2026-08-26

O `NEXT_ACTION` foi reexecutado contra o estado real depois do merge da Fase 46.

Resultado: **nenhum dos quatro gates operacionais foi desbloqueado**.

1. **Backup Production / #75:** continua aguardando computador pessoal/confiável para provisionar OAuth/rclone, Gmail App Password, armar a automação e executar o primeiro backup real. Nenhuma nova evidência foi registrada na Issue.
2. **Fonte final para migração:** nenhuma fonte final congelada/aprovada apareceu no repositório ou foi fornecida para esta sessão.
3. **Bootstrap do primeiro owner:** e-mail/Organization/redirect/entrega e autorização operacional não foram fornecidos como conjunto aprovado; nenhum usuário real foi criado ou convidado.
4. **Nova prioridade/regressão:** não surgiu nova Issue, PR, requisito explícito ou regressão reproduzível.

Portanto não foi aberta nova Issue funcional, não foi criada feature e nenhum dado/ambiente foi alterado.

## Snapshot real após o gate check

### GitHub

- `main`: `b5caef11ef6e0a84b47101dc63fb1c0d05218e2d`;
- PR #104 — `docs: reconcile operational readiness`: merged;
- CI #398 em `main`: success (`database`, lint, typecheck, Vitest e production build);
- nenhum PR aberto;
- única Issue aberta: #75 — backup automático real de Production;
- branches `agent/*` existentes, inclusive `agent/operational-readiness`, são históricas quando não possuem PR aberto.

O gate check documental usa branch própria somente para atualizar continuidade; não representa nova frente funcional.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr` foi novamente inspecionado em modo read-only:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history continua terminando em `20260822195823 / finance_attachments`.

Nenhuma migration, DDL ou DML foi aplicada.

### Vercel Production

O deployment Production mais recente continua:

- `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`;
- target `production`;
- estado `READY`;
- commit hospedado `62c3af63939c808487434e6e539ef0870a60d530`.

A diferença para a `main` atual (`b5caef11...`) é apenas o merge documental da Fase 46. Não foi criado deploy para sincronizar Markdown.

`GET https://sistema-lojasaph.vercel.app/health` respondeu HTTP 200 no gate check com:

- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

Nenhum deploy Vercel foi criado nesta checagem.

## Readiness — fonte de verdade

Artefato principal:

- `docs/qa/operational-readiness.md`

A matriz separa:

- **A — pronto/comprovado**;
- **B — decisão de negócio/PENDING**;
- **C — pré-condição operacional/externa**;
- **D — fase futura/opcional**.

Regra central: não é necessário responder `Q-001..Q-025` em bloco. Somente as perguntas que bloqueiam o recorte real escolhido devem ser resolvidas.

## Fundações já prontas — não reimplementar

Entre as fundações comprovadas estão:

- núcleo funcional das Fases 41–45;
- schema/migrations versionados;
- RLS e autorização por papel + escopo;
- validação autoritativa;
- staging de importação com lineage;
- idempotência de batch/staging;
- preview/dry run e relatório de inconsistências;
- aliases explícitos sem fuzzy auto-merge;
- isolamento de ambientes fail-closed;
- mecanismo técnico de bootstrap do primeiro owner;
- workflows/scripts de backup e restore;
- CI completa verde.

`ready` de importação significa somente preview validado. Não existe command genérico de aplicação às tabelas operacionais.

## Pré-condições externas ainda pendentes

Antes de migração/cutover real continuam necessários, conforme o recorte:

- fonte final congelada com timestamp/hash e armazenamento seguro fora do Git;
- regras de transformação aprovadas;
- importador específico por fonte;
- idempotência da escrita definitiva;
- dry run real, reconciliação e validação de amostras;
- decisões `Q-*` materialmente necessárias à fonte escolhida;
- primeiro owner e, depois, mapeamento das pessoas/roles/escopos reais (Q-022);
- backup Production real comprovado (#75);
- data/hora de corte e procedimento para uso paralelo das planilhas;
- inventário inicial quando a reconciliação de estoque indicar necessidade.

## Backup Production / #75

A automação continua deliberadamente desarmada.

Política aprovada permanece:

- RPO 24h;
- diário;
- RTO <= 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR.

`PRODUCTION_SUPABASE_DB_URL` já foi provisionado anteriormente. Restam, somente em computador pessoal/confiável:

- OAuth/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup real + archive/checksum off-site;
- fechar #75 somente após evidência real.

Nunca pedir nem receber esses secrets no chat.

## Próxima ação

O projeto permanece em **gate operacional**.

O próximo chat deve verificar novamente, nesta ordem, se apareceu:

1. ambiente confiável para concluir #75;
2. fonte final congelada para uma vertical de migração;
3. condições aprovadas para bootstrap controlado do primeiro owner;
4. nova prioridade explícita de produto ou regressão concreta.

Se nenhum gate estiver desbloqueado, preservar a baseline e não criar trabalho artificial.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não reabrir Fases 41–46 sem regressão concreta;
- não promover `PENDING` por inferência;
- não criar importador/apply genérico sem fonte congelada + regra aprovada;
- não tratar `ready` de staging como autorização de cutover;
- não criar/invitar pessoas reais sem gate aprovado;
- não pedir secrets no chat;
- não criar migration/branch Supabase sem necessidade e autorização;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não restaurar Production para teste;
- não criar deploy Vercel só para sincronizar documentação;
- não importar dados reais nem executar cutover sem gates e aceite.
