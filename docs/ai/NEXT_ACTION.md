# Next Action — Sistema Lojasaph

## Contexto

A Fase 35 auditou conjuntamente `REQ-IMP-001` a `REQ-IMP-004` e o suporte migratório de aliases de `REQ-ITEM-002`, usando a Fase 15 / Issue #39 / PR #40 como baseline.

Resultado:

- rastreabilidade de batch/linha preservada;
- idempotência de staging/reprocessamento preservada;
- modo do batch limitado a `dry_run`;
- nenhuma RPC atual de importação faz DML nas tabelas operacionais finais;
- relatório preserva accepted/duplicate/warning/rejected/pending mapping e respectivos detalhes por linha;
- matching aceita somente nome canônico exato normalizado ou alias explícito, sem fuzzy auto-merge;
- RLS/Organization continuam protegidos pelo baseline da Fase 34;
- `import_batches = 0` e `import_rows = 0` no projeto hospedado;
- nenhuma planilha real, dump ou carga foi executada;
- migrations locais/remotas de importação permanecem alinhadas;
- único ajuste encontrado foi drift documental dos filenames em `docs/modules/imports.md`;
- nenhuma nova Issue funcional foi necessária.

Evidência: `docs/qa/import-foundation-audit.md`.

Não reabrir a Fase 15 nem iniciar migração real sem uma frente própria de importadores/cutover e sem os pré-requisitos do plano de migração.

## Issue #75 — continuar bloqueada

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta.

Se continuar sem essas decisões, não inventar cron/storage e não interromper a próxima auditoria independente.

## Objetivo ativo

**Auditar `REQ-SEC-003 — Auditoria`: alterações críticas em estoque, caixa, financeiro e configurações devem ser auditáveis.**

A tarefa começa como auditoria transversal da trilha existente, não como redesign de `audit_logs` e não autoriza criar eventos novos sem gap concreto.

## Baseline existente

O projeto já possui `public.audit_logs` desde a fundação e diversas RPCs transacionais escrevem eventos de auditoria.

As fases anteriores já testam eventos específicos em Estoque, Inventário, Compras, Financeiro, Caixa, Importação, Funcionários, Perdas e Devoluções.

Também existe hardening de RLS/grants que restringe leitura de `audit_logs` e impede DELETE direto do cliente.

Reutilizar essas entregas antes de criar trabalho novo.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW` e `requirements.md`.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Confirmar a integração da Fase 35 e não refazer a auditoria de importação.
4. Se #75 continuar bloqueada, não editar backup.
5. Localizar o schema/migration original de `audit_logs`, policies/grants atuais, documentação de segurança/observabilidade e todos os testes que fazem assertions de auditoria.
6. Construir uma matriz dos write paths críticos atuais, pelo menos:
   - Estoque: entrada, retirada, perda/vencimento, devolução e transferências;
   - Inventário físico: início/linhas/confirmação/cancelamento conforme relevância crítica;
   - Compras: criação/emissão/recebimento/cancelamento;
   - Financeiro: documento, pagamento, estorno/cancelamento;
   - Caixa: configuração relevante, abertura, totais/movimentos, fechamento/cancelamento;
   - Configurações/mestres cuja alteração afete regra operacional global;
   - Importação e funcionários apenas como evidência complementar, sem ampliar artificialmente o requisito.
7. Para cada mutation relevante, verificar no código/SQL atual:
   - evento persistente em `audit_logs` ou trilha equivalente suficiente;
   - `organization_id` correto;
   - `actor_user_id` quando a ação deriva de usuário autenticado;
   - `action`, `entity_type` e `entity_id` estáveis/rastreáveis;
   - `before_data`, `after_data` e/ou `metadata` suficientes para explicar a mudança quando necessário;
   - retries idempotentes não criam eventos duplicados indevidos;
   - rollback da transação não deixa audit log órfão;
   - cancelamento/estorno preserva histórico em vez de delete físico.
8. Verificar segurança da própria trilha:
   - RLS habilitado;
   - leitura somente por papéis/escopos previstos;
   - sem INSERT/UPDATE/DELETE direto para clientes normais salvo necessidade explicitamente documentada;
   - `anon` sem acesso;
   - audit events não registram passwords, JWTs, secret keys, connection strings ou payload sensível completo sem necessidade.
9. Consultar Supabase somente por leitura para confirmar schema/policies/grants/contagens/definições atuais. Não fabricar eventos reais para testar.
10. Reutilizar CI/suites existentes para validar audit assertions. Se faltar cobertura e houver patch, adicionar teste mínimo que prove o gap/fix.
11. Não confundir `REQ-SEC-003` com observabilidade de aplicação (`REQ-PLAT-006`): logs estruturados de runtime e audit trail de mutações são camadas distintas.
12. Se `REQ-SEC-003` estiver atendido, documentar evidência sem Issue artificial.
13. Se houver gap concreto e reproduzível, abrir uma única Issue, criar branch dedicada e implementar o menor fix reversível/versionado.
14. Não criar deploy Vercel para essa auditoria salvo necessidade real de runtime hospedado.
15. Se houver patch funcional, validar lint, typecheck, Vitest, build e gates PostgreSQL aplicáveis antes do merge.
16. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão

A auditoria pode considerar `REQ-SEC-003` atendido quando houver evidência suficiente de que:

- mutações críticas dos módulos exigidos deixam trilha persistente e correlacionável ao ator/Organization/recurso;
- eventos permitem entender a alteração sem depender apenas de logs efêmeros de runtime;
- retry/rollback não produzem auditoria enganosa ou duplicada;
- registros críticos são corrigidos por eventos/cancelamentos/estornos rastreáveis quando aplicável, não por DELETE silencioso;
- a própria tabela/trilha de auditoria está protegida contra acesso/mutação indevida;
- a trilha não armazena segredos/credenciais ou dados sensíveis desnecessários.

## Segurança / operação

- não registrar secrets, JWTs, passwords ou connection strings em testes/documentação;
- não inserir eventos artificiais no Supabase Production para provar a auditoria;
- não reabrir RLS só por warning genérico de `SECURITY DEFINER`;
- não redesenhar observabilidade da Fase 17 nesta frente;
- não fechar #75 sem backup automático real;
- não importar dados reais/cutover;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
