# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 50 / Issue #138 (`REQ-ITEM-003`) concluída. Não existe nova frente funcional ativa.**

Integração confirmada:

- PR #139 merged;
- Issue #138 closed;
- `main=f30137355fe1b8958cbfe36cf1cd6e515c647558`;
- CI pós-merge #500 / `33118720928`: success;
- nenhum PR aberto;
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

A Fase 41 já havia fechado o núcleo sem novo MUST funcional pendente. As frentes SHOULD que ainda eram independentes foram posteriormente entregues: anexos financeiros, exportação, condições/produtos de fornecedor, estoque mínimo, Dashboard de estoque, Dashboard de compras/fornecedores e agora EAN/dados fiscais.

O que resta é condicionado:

### #75/#121 — `REQ-PLAT-005`

PostgreSQL Production já possui backup off-site/restauração comprovados. Storage/anexos permanece ON HOLD aguardando evidência real.

Último estado válido:

- 0 buckets;
- 0 anexos Production;
- 0 runs `automatic_storage`.

Gatilhos de retomada:

1. primeira execução **agendada** do `Production Storage Backup`, janela esperada em **2026-08-28 03:47 America/Sao_Paulo**;
2. primeiro anexo legítimo no produto;
3. incidente/regressão real.

Não antecipar com dispatch manual ou fixture.

### Importação/cutover real

`REQ-IMP-001..004` possuem fundação de staging/dry-run/idempotência/relatório. O cutover real não é uma lacuna técnica pronta para implementação genérica: depende de fontes congeladas, regras aprovadas, resolução das questões aplicáveis, reconciliação e validação do cliente.

### PENDING

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

Se ainda for antes do gatilho da #121 ou não houver anexo/incidente novo, **não criar Fase 51** e não mexer no produto por inércia.

Quando o primeiro horário agendado da #121 já tiver passado, fazer uma única reconciliação do workflow agendado e da persistência `automatic_storage`; seguir a Issue conforme a evidência real, sem dispatch artificial.

Se surgir nova prioridade explícita, bug/regressão, fonte final de migração ou decisão de negócio para um PENDING, isso pode se tornar a próxima frente via Issue → branch → PR.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
