# Next Action — Sistema Lojasaph

## Contexto

A Fase 43 selecionou e implementou uma única vertical slice explícita de `REQ-EXPOR-001 — Exportação`: **contas a pagar em CSV**.

Decisão e evidência: `docs/qa/payables-csv-export.md`.

A seleção não foi por conveniência técnica. Financeiro foi o candidato superior porque a planilha histórica de NFs tinha uma lista operacional principal e o sistema já possui `payable_installment_summary` com os mesmos conceitos normalizados. Estoque, Inventário, Compras e Caixa não apresentaram uma primeira superfície mais clara sem inventar semântica adicional.

PR funcional: #96 / Issue #95.

A Issue #75 continua aberta/desarmada e depende de computador pessoal/confiável para os secrets e o primeiro backup real.

## Objetivo ativo após o merge do PR #96

**Fase 44 — reconciliar o MVP após a primeira entrega de `REQ-EXPOR-001` e decidir, com base no escopo/requisitos e estado real, se existe alguma lacuna não-PENDING restante que justifique nova frente funcional.**

A Fase 44 é uma reconciliação, não uma autorização para abrir automaticamente outra exportação.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW`, `docs/product/scope.md`, `docs/product/requirements.md`, `docs/qa/mvp-reconciliation.md` e `docs/qa/payables-csv-export.md`.
2. Conferir estado real de `main`, PRs, Issues, branches e CI.
3. Confirmar o resultado do PR #96 / Issue #95. Se já mergeado/fechado, não refazer a Fase 43.
4. Reconciliar novamente a matriz do MVP, agora considerando entregues:
   - núcleo funcional já confirmado na Fase 41;
   - `REQ-FIN-008 — Anexos` da Fase 42;
   - primeira superfície explícita de `REQ-EXPOR-001` da Fase 43.
5. Para `REQ-EXPOR-001`, não interpretar `dados tabulares relevantes` como obrigação de exportar toda tabela existente. Só apontar nova lacuna se uma superfície adicional tiver simultaneamente:
   - processo real documentado;
   - usuário beneficiado claro;
   - tabela/relatório atual suficientemente definido;
   - colunas/filtros/formato objetivos;
   - ausência comprovada da feature;
   - independência de Q-001..Q-025/PENDING;
   - prioridade material para o MVP.
6. Revisar SHOULDs restantes sem promover itens explicitamente colocados em fase posterior pelo `scope.md`. Em especial não puxar automaticamente estoque mínimo, compras avançadas, código de barras, PWA refinada ou dashboards avançados.
7. Separar rigorosamente:
   - lacuna funcional concreta;
   - melhoria/otimização opcional;
   - requisito `PENDING`/condicionado;
   - bloqueio operacional, como cutover real e #75.
8. Se houver **uma** lacuna inequívoca não-PENDING, abrir exatamente uma Issue e definir a menor vertical slice; implementar somente se o boundary e critério de aceite estiverem claros.
9. Se não houver lacuna funcional inequívoca, não abrir feature por inércia. Registrar o MVP/núcleo como reconciliado e deixar a próxima ação condicionada aos bloqueios reais ou a nova prioridade explícita do produto.
10. Não modificar Supabase se a Fase 44 for apenas reconciliação. Se alguma nova feature realmente exigir Supabase, seguir o workflow normal: docs atuais, branch/PR, CI verde antes de Production, migration versionada para DDL.
11. Não criar deploy Vercel intermediário.
12. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` no final.

## Critério de conclusão da Fase 44

- matriz do MVP reconciliada depois das Fases 42–43;
- `REQ-EXPOR-001` avaliado sem expansão automática para `exportar tudo`;
- nenhum `PENDING` promovido sem decisão;
- nenhuma fase posterior puxada por conveniência;
- exatamente uma lacuna funcional concreta escolhida ou conclusão explícita de que não há nova frente funcional justificada;
- #75 preservada enquanto as condições operacionais não forem atendidas;
- continuidade atualizada para o próximo chat.

## Fase 43 — não refazer

A exportação de contas a pagar usa:

- `payable_installment_summary` sob `security_invoker`;
- sessão/RLS normal;
- filtro Organization explícito;
- paginação 500 a 500;
- CSV BOM UTF-8/CRLF;
- escaping + formula-injection protection;
- decimais exatos;
- UX `manageFinance`.

Não existe migration da Fase 43 e não deve ser criada retrospectivamente.

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
- não reabrir Fases 41–43 sem regressão concreta;
- não transformar exportação em infraestrutura global sem processo real;
- não criar XLSX/PDF por conveniência;
- não promover item `PENDING`;
- não ativar/fechar #75 sem evidência real;
- não restaurar Production para teste;
- não manipular Storage por SQL;
- não criar migration sem necessidade;
- não criar deploy Vercel só para auditoria;
- não importar dados reais/cutover.
