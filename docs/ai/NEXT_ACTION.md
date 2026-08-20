# Next Action — Sistema Lojasaph

## Contexto

A Fase 29 concluiu a auditoria de `REQ-PLAT-003 — Validação de dados` sem encontrar lacuna reproduzível.

`REQ-PLAT-003` é considerado atendido/verificado. A evidência está em `docs/qa/data-validation.md`.

Estado preservado:

- nenhuma Issue/branch funcional criada na Fase 29;
- nenhuma mudança de código;
- nenhuma migration/DDL/RLS/grant/Auth/data change;
- Supabase remoto usado somente em leitura;
- nenhum deployment Vercel;
- última validação funcional: CI #301, Business Transactions Integration #153 e Inventory Count Integration #169 — success.

## O que já foi concluído — não repetir

Não refazer a auditoria transversal de `REQ-PLAT-003`.

Já foi comprovado que regras essenciais amostradas de cadastros, Estoque, Transferências, Inventário, Compras, Financeiro e Caixa possuem barreiras autoritativas em domínio/RPC/banco e não dependem exclusivamente da UI.

O saldo negativo de `inventory_balances` também já foi esclarecido: o check global original foi substituído intencionalmente pelo trigger `inventory_balances_negative_policy`, condicionado por `stock_locations.allow_negative_stock`.

## Objetivo ativo

**Auditar `REQ-PLAT-004 — Migrações de banco`: toda mudança estrutural deve ser versionada.**

A tarefa começa como auditoria de reprodutibilidade e linhagem. Não alterar migrations ou histórico hospedado até existir drift concreto e compreendido.

## Pista concreta

A introspecção read-only da Fase 29 encontrou diferença de numeração histórica: no projeto hospedado, a migration `inventory` está registrada como versão `20260817214649`, enquanto o repositório atual possui `20260817191000_inventory.sql` com a definição histórica correspondente.

Isso pode ser apenas consequência de como migrations antigas foram aplicadas/nomeadas. Não classificar como defeito antes da comparação completa.

## Fazer agora

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` (`REQ-PLAT-004`);
   - `docs/qa/data-validation.md` apenas como contexto da pista encontrada.
2. Conferir estado real de `main`, branches, Issues, PRs e workflows.
3. Inventariar, em ordem, todos os arquivos `supabase/migrations/*.sql`, incluindo arquivos vazios/históricos se existirem.
4. Ler `supabase_migrations.schema_migrations` no projeto hospedado somente em modo leitura e montar correspondência por:
   - versão;
   - nome;
   - ordem;
   - conteúdo/efeito estrutural quando o timestamp não coincidir.
5. Não comparar apenas pelo número do arquivo. Identificar renomeações/renumerações históricas sem perder a relação semântica.
6. Verificar se o schema hospedado atual contém objetos estruturais que não possam ser explicados por migrations versionadas do repositório.
7. Verificar o inverso: migrations versionadas que deveriam estar refletidas no remoto mas não estão.
8. Auditar `.github/workflows/ci.yml` e workflows PostgreSQL aplicáveis para confirmar que um banco limpo aplica todas as migrations ordenadas antes das suites.
9. Usar a CI verde existente como evidência, mas não confundir “aplica do zero” com “histórico hospedado alinhado”.
10. Conferir scripts de backup/restore apenas no que afeta reconstrução estrutural; não reabrir `REQ-PLAT-005` nesta fase.
11. Se a divergência for apenas histórica e a reconstrução for determinística:
   - documentar a matriz de linhagem;
   - considerar `REQ-PLAT-004` atendido;
   - não criar Issue artificial.
12. Se houver drift real, migration ausente ou risco de `db push`/upgrade:
   - registrar evidência reproduzível;
   - abrir uma única Issue;
   - criar branch dedicada a partir de `main`;
   - corrigir a fonte de verdade com mudança mínima e reversível;
   - nunca editar manualmente a tabela de migration history sem plano explícito e justificativa.
13. Se houver patch, validar lint/typecheck/Vitest/build e workflows PostgreSQL relevantes antes de merge.
14. Não fazer deploy Vercel durante auditoria/iteração.
15. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao encerrar.

## Critério de conclusão

Deve ser possível explicar a linhagem do schema atual e reconstruir um banco novo de forma determinística a partir do repositório, sem depender de DDL manual não versionado.

Diferença de timestamp/nome histórico, isoladamente, não é falha. Falha é existir estrutura necessária sem migration versionada, migration necessária ausente no ambiente alvo ou histórico que torne upgrade/reprodução inseguro.

## Segurança / operação

- Supabase remoto em leitura até existir correção justificada;
- não executar `repair migration`, `db push` ou alteração de history por tentativa;
- não modificar RLS/grants fora do escopo de uma migration realmente faltante;
- não reativar bootstrap;
- não usar dados Production como fixture;
- não disparar Vercel.

## Não fazer

- não reabrir `REQ-PLAT-003`;
- não criar Issue só porque timestamps diferem;
- não apagar/renumerar migrations atuais sem análise de dependência;
- não aplicar migration vazia para “zerar diferença”;
- não editar `supabase_migrations.schema_migrations` diretamente;
- não inferir Q-001..Q-025;
- não reativar auto-deploy Vercel.
