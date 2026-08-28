# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 50 / Issue #138 (`REQ-ITEM-003`) concluída. Não existe nova frente funcional ativa.**

Integração confirmada:

- PR #139 merged;
- Issue #138 closed;
- PR #140 integrou a reconciliação documental pós-Fase 50;
- `main=e65d333f2410960b5201669014b062f5e1380542` antes desta atualização de hold;
- CI pós-merge #502 / `33119305469`: success;
- nenhum PR funcional aberto;
- Issues abertas: somente #75 e #121, ambas da proteção de dados e ON HOLD.

Não refazer #138/#139.

## O que a Fase 50 entregou

EAN/NCM/CEST já existiam no schema de `stock_items`; a fase somente os tornou utilizáveis na aplicação.

Arquivos funcionais centrais:

- `src/modules/catalog/domain/stock-item.ts`;
- `src/modules/catalog/domain/stock-item.test.ts`;
- `src/modules/catalog/adapters/supabase-stock-item-repository.ts`;
- `src/app/workspace/(operacao)/produtos/page.tsx`.

Contrato final:

- EAN, NCM e CEST opcionais;
- `trim` apenas; branco = ausência / `NULL`;
- update omisso preserva o valor; branco explícito limpa;
- EAN mantém unicidade por Organization já existente no PostgreSQL;
- sem lookup externo, máscara, GTIN/check-digit ou validação tributária;
- sessão autenticada + RLS, sem service/admin key no browser;
- sem migration/view/RPC/fixture Production.

Production read-only em 2026-08-27: 3 itens, nenhum com EAN/NCM/CEST preenchido. Nada foi mutado para criar evidência.

Validação do PR:

- head `f638abebe844473013d043e6c1bc213878124bd2`;
- CI #499 / `33118596139`: success;
- Business Transactions #225 / `33118596143`: success;
- Inventory Count #241 / `33118596171`: success;
- pós-merge CI #500 / `33118720928`: success.

## Q-006 continua sem resposta

O `Gabarito` pode representar catálogo de venda/POS separado de item de estoque. A Fase 50 não respondeu essa questão.

Não:

- criar produto de venda por inferência;
- importar EAN/NCM/CEST do `Gabarito` automaticamente;
- redefinir `internal_code`;
- promover `REQ-ITEM-004` sem validação real.

## Reconciliação do roadmap

Após a Fase 50, a revisão de requirements + Issues + código não encontrou outro MUST/SHOULD funcional independente para promover.

A Fase 41 já havia fechado o núcleo sem novo MUST funcional pendente. As frentes SHOULD que ainda eram independentes foram posteriormente entregues: anexos financeiros, exportação, condições/produtos de fornecedor, estoque mínimo, Dashboard de estoque, Dashboard de compras/fornecedores e EAN/dados fiscais.

O que resta é condicionado por fonte/decisão de negócio ou está explicitamente em hold.

## Decisão operacional — 2026-08-28

**#75 e #121 / `REQ-PLAT-005` ficam TOTALMENTE ON HOLD até o Sistema Lojasaph estar 100% concluído.**

Essa é uma decisão explícita de prioridade do operador e substitui a orientação anterior de retomar automaticamente ao ocorrer cron, primeiro anexo ou incidente do pipeline.

Antes do marco de sistema 100%:

- não investigar scheduling de backup;
- não retomar #121 por cron, anexo ou alerta;
- não executar `workflow_dispatch` para obter evidência;
- não criar fixture/bucket/anexo sintético em Production;
- não alterar workflows, S3/R2, secrets, variables, retenção, lock/WORM ou guardrails de `REQ-PLAT-005`;
- não repetir introspecções de Storage/protection runs por rotina;
- manter #75/#121 abertas e ON HOLD;
- só retomar se o operador der nova instrução explícita revogando o hold ou quando o sistema estiver 100% concluído.

### Evidência registrada antes do hold total

A reconciliação única de 2026-08-28, depois das janelas agendadas, encontrou:

- 0 novos runs `automatic_storage`;
- 0 novos runs `automatic_database` correspondentes aos schedules daquele dia;
- último `automatic_database` autoritativo conhecido: `succeeded` em 2026-08-27 com integridade verificada;
- schedule de 2026-08-28 não comprovado como executado corretamente.

Não corrigir/investigar isso agora. Preservar como pendência para homologação/finalização.

## Importação/cutover real

`REQ-IMP-001..004` possuem fundação de staging/dry-run/idempotência/relatório. O cutover real não é uma lacuna técnica pronta para implementação genérica: depende de fontes congeladas, regras aprovadas, resolução das questões aplicáveis, reconciliação e validação do cliente.

## PENDING

Não promover por inferência:

- `REQ-ITEM-004` / produto de venda;
- `REQ-ITEM-005` / ficha técnica;
- `REQ-STK-007` / empréstimo;
- `REQ-STK-010` / custeio;
- `REQ-EXP-004` / FEFO;
- `REQ-FIN-004` / pagamento parcial/múltiplo final;
- `REQ-CASH-007` / consumo de funcionários;
- `REQ-CASH-008` / integração com vendas.

## Próximo chat

O próximo chat deve primeiro consultar GitHub real e `NEXT_ACTION`.

**Não escolher #75/#121 como próxima frente enquanto o sistema não estiver 100% concluído**, mesmo que exista cron perdido, anexo novo ou alerta relacionado à proteção de dados. Só uma nova instrução explícita do operador pode antecipar a retomada.

Se surgir nova prioridade explícita, bug/regressão funcional, fonte final de migração ou decisão de negócio para um PENDING, isso pode se tornar a próxima frente via Issue → branch → PR.

Quando o sistema estiver 100% concluído, retomar `REQ-PLAT-005` como etapa de homologação final e reconciliar scheduling, backup automático, Storage, restore e critérios de fechamento das Issues.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
