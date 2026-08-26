# Current State — Sistema Lojasaph

Última atualização: 2026-08-26

## Estado atual

**Fase 46 — prontidão operacional para homologação e cutover — concluída documentalmente.**

O núcleo funcional do MVP permanece reconciliado após as Fases 41–45. A Fase 46 não encontrou nova lacuna funcional não-PENDING que justifique abrir feature ou Issue por inércia.

Artefato principal:

- `docs/qa/operational-readiness.md`

Ele separa a readiness em:

- **A — pronto/comprovado**;
- **B — decisão de negócio/PENDING**;
- **C — pré-condição operacional/externa**;
- **D — fase futura/opcional**.

## Snapshot real da Fase 46

### GitHub

Na entrada:

- `main`: `62c3af63939c808487434e6e539ef0870a60d530`;
- PR #102 / Fase 45: merged;
- Issue #101: closed/completed;
- PR #103 / handoff Fase 45: merged;
- nenhum PR aberto;
- única Issue aberta: #75 — backup automático real de Production;
- CI #396 em `main`: success;
- branches `agent/*` existentes são históricos, não frentes paralelas ativas.

A Fase 46 não abriu Issue porque os bloqueios encontrados dependem de fonte real, decisão, credencial/ambiente confiável ou aceite externo.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr` foi somente inspecionado read-only:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history termina em `20260822195823 / finance_attachments`.

Nenhuma migration, DDL ou DML foi aplicada na Fase 46.

### Vercel Production

A auditoria corrigiu uma informação antiga do runbook de ambientes.

O deployment Production mais recente observado é:

- `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`;
- target `production`;
- estado `READY`;
- commit `62c3af63939c808487434e6e539ef0870a60d530`, igual à `main` na entrada da fase.

`GET https://sistema-lojasaph.vercel.app/health` respondeu HTTP 200 em 2026-08-26 com:

- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

A Fase 46 não criou deployment Vercel.

A ferramenta conectada continua sem listagem material de environment variables por target; não inferir valores ou compartilhamento. O runtime fail-closed permanece o controle compensatório.

## Prontidão já comprovada — classe A

Entre as fundações prontas estão:

- núcleo funcional das Fases 41–45;
- schema/migrations versionados;
- RLS e autorização por papel + escopo;
- validação autoritativa;
- staging de importação com lineage;
- idempotência de batch/staging;
- preview/dry run;
- relatório de inconsistências;
- aliases explícitos sem fuzzy auto-merge;
- isolamento de ambientes fail-closed;
- Production web atual alinhada à `main` de entrada;
- mecanismo técnico de bootstrap do primeiro owner;
- mecânica de backup/restore e workflows já implementados;
- CI completa verde.

`ready` de importação continua significando apenas preview validado. Não existe command genérico de aplicação às tabelas operacionais.

## Decisões PENDING — classe B

`Q-001..Q-025` foram mapeadas por impacto em `docs/qa/operational-readiness.md`.

Regra central:

**não é necessário responder todas antes de qualquer homologação.**

Responder somente as perguntas que bloqueiam o recorte real escolhido. Exemplos:

- estrutura/cadastros: Q-001/Q-002 e Q-006 quando `Gabarito` entrar;
- transferências: Q-003/Q-004/Q-005 para linhas/campos afetados;
- financeiro: Q-013 e, quando aplicável, Q-014/Q-015;
- caixa: Q-009/Q-010 e, conforme a fonte, Q-011/Q-012;
- estoque: Q-008/Q-021 antes de políticas/custos reais;
- usuários: Q-022 antes de provisionamento multiusuário.

Questões de POS, FEFO, automação de compra, alertas refinados etc. não bloqueiam o MVP básico enquanto permanecem PENDING/futuras.

## Pré-condições externas — classe C

Ainda faltam antes de uma migração/cutover real:

- fontes finais congeladas, timestamp/hash e armazenamento seguro fora do Git;
- regras de transformação aprovadas por fonte;
- importadores específicos por fonte;
- idempotência da futura escrita definitiva;
- dry run com fonte real;
- reconciliação e validação de amostras;
- e-mail/configuração do primeiro owner quando o bootstrap real for autorizado;
- mapeamento das pessoas reais para roles/escopos (Q-022);
- decisão sobre onboarding multiusuário após esse mapeamento;
- ativação e primeiro run real do backup Production (#75);
- data/hora de corte;
- procedimento de interrupção/uso paralelo das planilhas;
- inventário inicial quando a reconciliação de estoque indicar necessidade.

## Backup Production / #75

A automação continua deliberadamente desarmada.

O schedule observado em 2026-08-26 executou o workflow, mas concluiu como `skipped`, comportamento esperado enquanto `BACKUP_AUTOMATION_ENABLED` não estiver ativado.

Política aprovada permanece:

- RPO 24h;
- diário;
- RTO <= 4h;
- Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR.

Pendências somente em computador pessoal/confiável:

- OAuth/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup real + archive/checksum off-site;
- fechar #75 somente após evidência real.

Não pedir nem receber esses secrets no chat.

## Próxima ação

**Gate operacional após Fase 46.**

O próximo chat deve primeiro verificar se surgiu algum desbloqueio concreto:

1. ambiente confiável disponível para concluir #75;
2. fonte final congelada disponível para um recorte de migração;
3. e-mail/Organization/redirect aprovados para bootstrap controlado do primeiro owner;
4. nova prioridade explícita de produto ou regressão concreta.

Se nenhum desses fatos existir, não abrir feature ou Issue apenas para manter atividade.

Ver `docs/ai/NEXT_ACTION.md`.

## Fases que não devem ser refeitas

- Fase 41: reconciliação inicial do MVP;
- Fase 42 / #92: anexos financeiros privados;
- Fase 43 / #95: contas a pagar em CSV;
- Fase 44 / #98: condições comerciais de fornecedor;
- Fase 45 / #101: manutenção básica de produtos por fornecedor;
- Fase 46: readiness operacional A/B/C/D;
- Fase 38 / #75: automação de backup já preparada, aguardando ativação operacional.

## Não fazer

- não reabrir Fases 41–46 sem regressão concreta;
- não promover `PENDING` por inferência;
- não criar importador/apply genérico sem fonte congelada + regra aprovada;
- não tratar `ready` de staging como autorização de cutover;
- não criar/invitar pessoas reais sem aprovação e mapeamento;
- não pedir secrets no chat;
- não criar migration sem necessidade;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não criar Supabase branch/projeto por conveniência;
- não criar deploy Vercel intermediário;
- não restaurar Production para teste;
- não importar dados reais nem executar cutover sem gates e aceite.
