# Handoff — Sistema Lojasaph

## Estado

**Fase 46 — prontidão operacional para homologação/cutover — concluída.**

Não existe nova frente funcional automaticamente autorizada. O núcleo do MVP permanece reconciliado depois das Fases 41–45.

Artefato principal da fase:

- `docs/qa/operational-readiness.md`

A readiness foi separada em quatro classes:

- **A — pronto/comprovado**;
- **B — decisão de negócio/PENDING**;
- **C — pré-condição operacional/externa**;
- **D — fase futura/opcional**.

**Não refazer a Fase 46.** O próximo trabalho deve ser disparado pelo primeiro gate externo que realmente for desbloqueado, conforme `docs/ai/NEXT_ACTION.md`.

## Snapshot real usado na auditoria

### GitHub

- `main` na entrada: `62c3af63939c808487434e6e539ef0870a60d530`;
- CI #396: success;
- nenhum PR aberto na entrada;
- única Issue aberta: #75;
- PR #102 e Issue #101 da Fase 45 já encerrados;
- PR #103 de handoff da Fase 45 já integrado;
- branches `agent/*` anteriores são históricos.

Nenhuma Issue nova foi criada na Fase 46 porque os bloqueios encontrados não são trabalho funcional independente de dados/decisões/credenciais.

### Supabase

Production `fhbvwyttikrbeaanatlr`:

- `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history termina em `20260822195823 / finance_attachments`.

A Fase 46 foi read-only no Supabase. Não criar migration retrospectiva.

### Vercel

A documentação antiga dizia que Production ainda estava no commit da Fase 26. Isso mudou.

Na Fase 46 foi observado:

- deployment `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`;
- target `production`;
- estado `READY`;
- commit `62c3af63939c808487434e6e539ef0870a60d530`;
- `sistema-lojasaph.vercel.app/health` → HTTP 200;
- `environment=production`;
- `supabaseAccess=allowed`;
- `supabaseReason=production_backend`;
- `adminAccess=blocked`.

A Fase 46 não criou deploy.

A conexão atual ainda não expõe listagem material de env vars por target. Não inferir valores/compartilhamento. Preview sem backend isolado deve continuar fail-closed.

## O que já está pronto — classe A

Não reimplementar:

- schema/migrations;
- RLS e role+scope;
- validação autoritativa;
- staging/import lineage;
- idempotência do batch/staging;
- preview/dry run;
- relatório de inconsistências;
- aliases explícitos;
- isolamento de ambientes;
- bootstrap técnico do primeiro owner;
- workflows/scripts de backup e restore;
- módulos funcionais reconciliados até Fase 45.

Importante: `ready` do import batch significa somente preview validado. **Não existe hoje command genérico de aplicação em tabelas operacionais.**

## Q-001..Q-025 — regra de uso

Não exigir todas antes de avançar.

Consultar a tabela completa em `docs/qa/operational-readiness.md` e responder somente as perguntas que bloqueiam a fonte/domínio em trabalho.

Atalhos:

- estrutura real: Q-001/Q-002;
- `Gabarito`: Q-006;
- transferências ambíguas: Q-003/Q-004/Q-005;
- financeiro histórico: Q-013 e, conforme casos, Q-014/Q-015;
- caixa histórico: Q-009/Q-010 e quando aplicável Q-011/Q-012;
- custeio/política de estoque: Q-008/Q-021;
- pessoas reais: Q-022.

Não transformar Q-007, Q-019/Q-020, Q-024/Q-025 ou outros refinamentos em bloqueio global quando o recorte atual não depender deles.

## Caminho de importação

A fundação genérica já existe, mas a migração real exige por recorte:

1. fonte final congelada;
2. timestamp/hash e armazenamento seguro fora do Git;
3. target canônico definido;
4. transformação documentada;
5. respostas apenas às Qs necessárias;
6. importador específico;
7. dry run real;
8. relatório sem pendência não aceita;
9. aplicação definitiva idempotente delimitada;
10. reconciliação;
11. aceite explícito;
12. backup Production real antes do cutover.

Não criar importador ou command de `apply` genérico por antecipação.

## Identidade e permissões

Capacidade técnica pronta:

- roles `owner/admin/manager/finance/purchases/inventory/cashier/viewer`;
- escopos Organization/Business/Unit/Sector;
- múltiplos memberships;
- RLS/wrappers já testados;
- bootstrap seguro do primeiro owner.

Ainda externo/PENDING:

- e-mail exato do primeiro owner;
- Organization alvo quando ambígua;
- redirect HTTPS e capacidade de entrega do convite;
- pessoas reais e respectivos roles/escopos (Q-022);
- estratégia de onboarding multiusuário depois do mapeamento.

Não criar conta, convite ou membership real sem esses gates.

## Backup Production / #75

Issue #75 continua a única Issue aberta.

A mecânica está pronta. O schedule de 2026-08-26 rodou o workflow e concluiu como `skipped`, comportamento esperado com a automação desarmada.

Política aprovada:

- RPO 24h;
- diário;
- RTO <= 4h;
- Drive privado;
- retenção 30 dias;
- alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR.

Somente em computador pessoal/confiável:

- OAuth/rclone `[lojasaph-drive]`;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real;
- confirmação de archive + `.sha256`;
- fechar #75 somente após evidência real.

Nunca pedir secrets no chat.

## Próximo gatilho

No próximo chat, verificar primeiro se apareceu pelo menos um destes fatos:

1. **#75 desbloqueada:** operador está em computador confiável e pronto para provisionar as credenciais fora do chat;
2. **migração desbloqueada:** existe uma fonte final congelada para um recorte específico;
3. **bootstrap desbloqueado:** e-mail/Organization/redirect/entrega do owner estão aprovados;
4. **produto desbloqueado:** há nova prioridade explícita ou regressão concreta.

Se nenhum estiver verdadeiro, não inventar feature nem Issue. Preservar a baseline e informar que o próximo passo depende do primeiro gate externo.

## Não fazer

- não reabrir Fases 41–46 sem regressão;
- não abrir SUP-005 avançado, cotação, comparação ou sugestão por inércia;
- não promover `PENDING`;
- não construir importação definitiva sem fonte/regra;
- não tratar `ready` do staging como cutover;
- não criar/invitar pessoas reais sem aprovação;
- não pedir/receber secrets no chat;
- não criar migration sem necessidade;
- não contornar RLS;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não usar outro projeto Supabase como Preview por inferência;
- não criar branch/projeto pago sem autorização;
- não restaurar Production para teste;
- não criar deploy Vercel só para auditoria;
- não importar dados reais/cutover sem gates e aceite.
