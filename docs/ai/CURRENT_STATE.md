# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 9 — estoque transacional completo no Supabase — Issue #24 em andamento.

A primeira entrega, Fase 9A, está no PR #25: retirada persistente com FEFO, lote preferido, idempotência, locks, política configurável de estoque negativo e auditoria.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #24 — Fase 9 — estoque transacional completo no Supabase
- Branch atual: `agent/stock-transactional-runtime`
- PR atual: #25 — Fase 9A — retirada transacional com FEFO
- A Issue #24 deve permanecer aberta após o PR #25; a próxima entrega é transferência transacional.

## Fases concluídas

- Fase 0: governança e continuidade entre chats.
- Fase 1: engenharia reversa das seis planilhas.
- Fase 2: domínio, modelo lógico, ERD e ADRs fundamentais.
- Fase 3: fundação Next.js/React/TypeScript, testes e CI.
- Fase 4: cadastros base e fornecedores in-memory.
- Fase 5: ledger de estoque, entrada, retirada, transferência e custo médio no domínio/in-memory.
- Fase 6: lotes, validades, FEFO e inventário físico no domínio/in-memory.
- Fase 7: PostgreSQL/Supabase, migrations, RLS, projeto remoto, adapters reais e entrada transacional.
- Fase 8: Auth SSR, membership/Organization e workspace persistente.

## Workspace persistente

Persistente hoje:

- produtos;
- fornecedores/contatos;
- categorias, unidades de medida, locais e saldos;
- lotes ativos para seleção operacional;
- entrada de estoque via `record_stock_entry`;
- retirada via `record_stock_withdrawal` após integração do PR #25.

Ainda não persistente no workspace:

- transferência/recebimento;
- inventário físico;
- demais ajustes específicos ainda sem command RPC.

`/cadastros` continua disponível como demonstração in-memory para esses fluxos até haver paridade transacional real.

## Fase 9A — retirada transacional

### RPC

`record_stock_withdrawal(...)`:

- exige `auth.uid()`;
- papéis: `owner`, `admin`, `manager`, `inventory`;
- command ID idempotente;
- advisory transaction lock serializa retries concorrentes do mesmo command ID;
- idempotência compara Organization, item, local, quantidade, lote preferido e observação;
- saldo é bloqueado com `FOR UPDATE`;
- lotes candidatos são bloqueados em ordem determinística;
- lote preferido, quando informado, é consumido primeiro;
- restante usa FEFO: validade mais próxima, depois recebimento mais antigo;
- saída preserva custo médio vigente no `unit_cost_snapshot`;
- saldo, movimento, item, alocações de lote e audit log ficam na mesma transação;
- lote com saldo zero vira `depleted`;
- cliente continua sem escrita direta nas tabelas do ledger.

### Estoque negativo

O antigo `CHECK quantity_on_hand >= 0` tornava `StockLocation.allow_negative_stock` inoperante. A migration substitui o check global por integridade orientada ao local:

- saldo negativo somente se o local estiver explicitamente configurado;
- itens rastreados por lote/validade continuam sem saída acima do estoque físico disponível;
- não é possível desativar `allow_negative_stock` enquanto houver qualquer saldo negativo no local.

### Aplicação

- `SupabaseStockWithdrawalGateway`;
- leitura persistente de lotes ativos;
- provider autenticado expõe `recordWithdrawal` somente aos papéis permitidos;
- `/workspace/estoque` possui retirada real;
- ausência de lote preferido significa FEFO automático;
- a ordem de lotes mostrada ao usuário segue FEFO.

## Validação

PR #25 teve CI verde:

### Aplicação

- npm ci;
- lint;
- typecheck;
- testes unitários;
- production build.

### Banco

- PostgreSQL 17 limpo;
- todas as migrations;
- seed demo;
- smoke tests de schema/RLS;
- matriz de roles/Organization;
- suíte `stock_withdrawal.sql`.

A suíte de retirada valida:

- FEFO;
- lote preferido;
- retry idempotente sem duplicação;
- conflito quando command ID é reutilizado com payload diferente;
- estoque insuficiente com rollback atômico;
- viewer sem permissão;
- membro de outra Organization sem permissão;
- anon sem EXECUTE;
- estoque negativo bloqueado por default;
- negativo permitido somente quando o local autoriza;
- bloqueio de desativação da política com saldo negativo existente.

## Supabase remoto

A migration `transactional_stock_withdrawal` foi aplicada ao projeto homologado em `sa-east-1`.

Teste remoto executado dentro de transação com `ROLLBACK`:

- saldo inicial do item demo: 100;
- retirada teste: 10;
- saldo/lote dentro da transação: 90;
- repetição do mesmo command ID não duplicou movimento/audit;
- após rollback: saldo 100, lote 100, zero movimentos de teste e zero usuários de teste residuais.

Security Advisor mostra dois warnings conhecidos/intencionais para `record_stock_entry` e `record_stock_withdrawal` por serem `SECURITY DEFINER` executáveis por `authenticated`. Ambos validam identidade, papel, inputs e referências, e `PUBLIC`/`anon` não têm EXECUTE.

Os avisos de performance remanescentes são informativos e majoritariamente pré-existentes; nenhuma regressão específica da retirada foi identificada.

## Próxima ação

Depois de integrar o PR #25, manter a Issue #24 aberta e iniciar uma nova branch a partir da `main` para transferência transacional em duas etapas:

1. dispatch/expedição;
2. receive/recebimento parcial ou total;
3. preservação de custo, lote e validade;
4. locks/idempotência/auditoria;
5. testes SQL/RLS;
6. somente então integrar transferência ao workspace real.

Consulte `docs/ai/NEXT_ACTION.md`, `docs/modules/inventory.md`, ADR-002, ADR-003 e ADR-006.
