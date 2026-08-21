# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 40 — revalidação de `REQ-PLAT-003 — Validação de dados` — **concluída sem finding funcional**.

`REQ-PLAT-003` já havia sido auditado e considerado atendido na Fase 29. A Fase 40 ocorreu porque a continuidade pós-Fase 39 voltou a apontar para esse requisito; em vez de repetir trabalho, foi feita uma comparação diferencial entre a auditoria original e a `main` atual.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main` de entrada: `ff65c09d14b3468eb119e083f67e63d70aaa81ce`
- baseline original de `REQ-PLAT-003`: `370b37161150bcf2eac3afb4afb9d8bb80d96e10`
- branch da revalidação: `agent/data-validation-revalidation`
- Issue corretiva nova: nenhuma
- Issue #75: continua aberta/desarmada até ativação segura do backup Production
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17
- nenhum deployment Vercel criado nesta fase
- nenhuma mutation/DDL de negócio executada em Production

## Resultado da Fase 40

Evidência consolidada em `docs/qa/data-validation.md`.

### Drift desde a Fase 29

A comparação entre `370b37161150bcf2eac3afb4afb9d8bb80d96e10` e a `main` de entrada mostrou 14 commits posteriores, mas **nenhuma alteração em `src/**`**.

As únicas mudanças funcionais de banco posteriores relevantes para validação foram:

- `20260820184106_membership_rls_initplan.sql`: otimização de policy sem mudança de semântica de autorização;
- `20260820192526_critical_config_audit.sql`: triggers adicionais de auditoria para configuração crítica de estoque.

Nenhuma delas remove ou substitui os boundaries de validação que sustentaram a Fase 29.

### Production read-only

Introspecção SQL somente leitura confirmou:

- migrations hospedadas mais recentes alinhadas com `critical_config_audit` e `membership_rls_initplan`;
- dinheiro/quantidades críticas continuam usando escalas apropriadas;
- `CHECK`s de sinal, enum e lifecycle continuam presentes;
- FKs compostas por `organization_id` continuam protegendo relações críticas;
- compras continuam impondo pedido/recebimento/preço coerentes;
- Financeiro continua impondo parcelas, pagamentos, reversões e lifecycle coerentes;
- Caixa continua impondo lifecycle, valores, sequência, movimentos e vigência de taxa coerentes;
- Inventário continua impondo quantidade/custo válidos e relações estruturais;
- `inventory_balances_negative_policy` continua presente;
- triggers de auditoria críticos coexistem com os checks/triggers de validação anteriores.

Nenhum command crítico, DML de teste ou DDL foi executado remotamente.

### Conclusão

Não existe evidência de regra essencial que tenha passado a depender exclusivamente da UI. Não foi criada Issue, migration, patch funcional ou suíte duplicada.

A última mudança funcional anterior já estava coberta pelo CI #353; a branch documental desta revalidação deve passar pelo CI principal antes do merge.

## Backup Production / Issue #75

A Fase 38 continua válida e não foi refeita.

Política já aprovada:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- workflows de backup/drill mergeados;
- `PRODUCTION_SUPABASE_DB_URL` provisionado via Session pooler 5432.

Ainda pendente, deliberadamente até computador pessoal/confiável:

- OAuth Google Drive/rclone;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real + archive/checksum off-site;
- fechamento da #75.

A #75 permanece aberta, mas não bloqueia frentes independentes.

## Próxima ação

Fase 41 — **reconciliar o escopo MVP restante e selecionar a próxima vertical slice explícita, sem reabrir requisitos já fechados**.

O ponto de partida deve ser `docs/product/scope.md` + `docs/product/requirements.md` contra o estado real do código. Dois candidatos explícitos que merecem verificação são:

- `REQ-FIN-008 — Anexos` / anexos e comprovantes no Financeiro;
- `REQ-EXPOR-001 — Exportação` / CSV/Excel onde fizer sentido.

Não assumir que esses são os únicos gaps nem escolher por conveniência técnica. A Fase 41 deve confirmar o que ainda falta no MVP, excluir itens `PENDING`/fase posterior e priorizar uma única entrega com processo real e critério de aceite claro.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não reabrir `REQ-PLAT-003` sem regressão concreta;
- não reabrir Fases 38/39/40 por rotina;
- não pedir/receber secrets de backup no chat;
- não ativar `BACKUP_AUTOMATION_ENABLED` antes dos secrets restantes;
- não fechar #75 sem primeiro run real;
- não restaurar backup real sobre Production para teste;
- não contratar plano/add-on sem autorização;
- não implementar requisito `PENDING` por inferência;
- não criar deployment Vercel sem necessidade real;
- não reaplicar migrations existentes;
- não importar dados reais/cutover.
