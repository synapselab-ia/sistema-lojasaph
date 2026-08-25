# Next Action — Sistema Lojasaph

## Contexto

Fase 45 concluída:

- `REQ-SUP-004 — Produtos por fornecedor` foi confrontado com schema, runtime, compras e fonte histórica;
- a ausência de manutenção persistente normal de `supplier_items` foi comprovada;
- Issue #101 foi fechada pelo PR #102;
- PR #102 squash-mergeado funcionalmente em `6a86922ef705af25a4897068e223b0e26c1b670a`;
- head final `c9898f7dd90fd453e14775c89a336fc49636463f` passou CI #393, Business Transactions #191 e Inventory Count #207;
- nenhuma migration ou mutation manual de Production;
- Issue #75 continua aberta/desarmada.

A entrega permite manter vínculo fornecedor↔produto, unidade de compra, quantidade por embalagem e status ativo/inativo. O fluxo de pedidos continua usando quantidade na unidade-base; preço observado continua sendo registrado em `supplier_prices` na emissão do pedido.

Com as reconciliações e slices das Fases 41–45, **não existe outra lacuna funcional não-PENDING comprovada que autorize abrir automaticamente uma feature**. O próximo trabalho deve mudar de foco: prontidão operacional para homologação/migração/cutover.

## Objetivo ativo

**Fase 46 — reconciliar a prontidão operacional para homologação e cutover, produzindo uma matriz objetiva de readiness e bloqueios sem importar dados reais, sem criar usuários reais, sem manipular secrets e sem reabrir o núcleo funcional do MVP.**

Esta fase é uma auditoria/preparação operacional. Não é autorização para executar migração real.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo e `WORKFLOW`.
2. Ler também:
   - `docs/modules/imports.md`;
   - `docs/source-data/migration-plan.md`;
   - `docs/source-data/field-catalog.md`;
   - `docs/product/open-questions.md`;
   - `docs/operations/bootstrap-owner.md`;
   - `docs/operations/environments.md`;
   - `docs/operations/backup-restore.md`;
   - `docs/qa/import-foundation-audit.md`;
   - `docs/qa/data-validation.md`;
   - `docs/qa/environment-isolation.md`;
   - `docs/qa/supplier-items-maintenance.md`.
3. Conferir estado real de `main`, Issues, PRs, branches e CI. Confirmar PR #102 mergeado, #101 fechada e #75 ainda aberta/desarmada.
4. Não reabrir Fases 41–45 nem procurar nova feature funcional por inércia. O núcleo funcional está reconciliado até existir regressão ou prioridade explícita nova.
5. Reconciliar o caminho até homologação/cutover em quatro classes:
   - **A — pronto/comprovado:** fundações já existentes e validadas;
   - **B — decisão de negócio/PENDING:** perguntas cuja resposta é necessária antes de uma transformação, configuração ou dado real específico;
   - **C — pré-condição operacional/externa:** credencial, computador confiável, fonte real congelada, aprovação ou atividade que depende do usuário/cliente;
   - **D — fase futura/opcional:** funcionalidade que não bloqueia o MVP básico nem o cutover atual.
6. Para importação, confirmar explicitamente o que já existe e o que falta:
   - staging, idempotência, dry run, relatório e RLS já existem;
   - `ready` de import batch não significa autorização de escrita operacional;
   - não existe command genérico de aplicação às tabelas finais;
   - importadores específicos por fonte, transformações aprovadas, reconciliação e cutover continuam necessários.
7. Mapear `Q-001..Q-025` por impacto. **Não exigir responder todas antes de qualquer homologação.** Identificar somente quais perguntas bloqueiam concretamente cada domínio/fonte/etapa e quais podem permanecer para refinamento posterior.
8. Revisar bootstrap/identidade/permissões:
   - confirmar como owner inicial, memberships, roles e escopos são preparados;
   - distinguir capacidade técnica já pronta do mapeamento das pessoas reais ainda não fornecido;
   - não criar conta, convite ou membership real nesta fase.
9. Revisar ambientes e isolamento:
   - confirmar o que pode ser homologado com dados sintéticos/ambiente existente;
   - não copiar dados reais para ambiente inadequado;
   - não mudar configuração Vercel por conveniência.
10. Revisar backup/cutover:
    - #75 continua bloqueio operacional antes de produção real;
    - não pedir secrets;
    - não ativar automação de backup sem computador confiável e credenciais apropriadas;
    - não executar restore em Production.
11. Produzir um artefato de QA/readiness, por exemplo `docs/qa/operational-readiness.md`, contendo no mínimo:
    - checklist/matriz A/B/C/D;
    - evidência ou documento de origem para cada item;
    - condição objetiva para desbloquear cada bloqueio;
    - indicação de quem/qual contexto precisa fornecer a decisão ou recurso quando isso já estiver documentado;
    - sequência segura recomendada até uma futura homologação/cutover.
12. Não inventar `owner` humano para decisão que não esteja documentada. Use categorias como `produto/cliente`, `operacional`, `credencial/ambiente confiável` quando a responsabilidade nominal não estiver definida.
13. Só abrir uma Issue nova se surgir uma preparação operacional **concreta, independente de secrets/dados reais/PENDING e claramente executável agora**. Não abrir Issue apenas para representar um bloqueio externo ou uma pergunta ao usuário.
14. Não implementar importador real, command de apply/cutover ou mutation de dados reais nesta fase sem fonte congelada + regra aprovada + aceite explícito.
15. Não criar deploy Vercel intermediário.
16. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão da Fase 46

- estado real do repositório/CI/Issues reconciliado;
- núcleo funcional explicitamente preservado como concluído;
- prontidão operacional publicada em matriz/checklist rastreável;
- fundações prontas separadas de decisões PENDING, pré-condições externas e features futuras;
- perguntas abertas associadas apenas aos bloqueios que realmente causam;
- #75 preservada até evidência operacional real;
- nenhum dado real importado e nenhum secret manipulado;
- próxima ação condicionada ao primeiro desbloqueio seguro e concreto, em vez de uma nova feature inventada.

## Fase 45 — não refazer

Produtos por fornecedor já usam:

- `supplier_items` existente;
- browser client autenticado;
- RLS Organization-wide existente;
- vínculo default `supplier_sku IS NULL`;
- `purchase_unit` opcional;
- `units_per_package` positivo via `Quantity`;
- inativação com `active=false`, sem DELETE;
- preço observado separado em `supplier_prices` pelo fluxo de compras.

Não criar migration retrospectiva nem puxar cotação/comparação para essa entrega.

## Backup Production / #75

Somente em computador pessoal/confiável:

1. configurar OAuth Google Drive/rclone;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar `BACKUP_AUTOMATION_ENABLED=true`;
5. executar o primeiro `Production Database Backup` real;
6. confirmar archive + `.sha256` no Drive;
7. registrar evidência e fechar #75.

## Segurança / operação

- não pedir/receber secrets no chat;
- não reabrir Fases 41–45 sem regressão concreta;
- não promover `PENDING` por inferência;
- não transformar readiness em nova feature funcional;
- não importar dados reais sem fonte/regra/aceite;
- não criar/invitar usuários reais sem mapeamento e aprovação;
- não criar migration sem necessidade;
- não contornar RLS;
- não manipular Storage por SQL;
- não ativar/fechar #75 sem run real;
- não restaurar Production para teste;
- não criar deploy Vercel só para auditoria.