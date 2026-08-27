# Handoff — Sistema Lojasaph

## Frente ativa

**Issue #132 — Fase 47: estoque mínimo por local e alertas de reposição (`REQ-STK-011`).**

Branch ativa: `agent/stock-minimum-alerts`.

Fase 46 já está integrada. Não refazer fases anteriores sem regressão concreta.

## ON HOLD

### Issue #121 — Supabase Storage backup/recovery

A #121 está **ON HOLD** e não deve ser tratada como frente ativa.

Não mexer até existir evidência nova. Gatilhos válidos:

1. primeira execução agendada do `Production Storage Backup` depois do armamento — próxima janela esperada: 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo;
2. primeiro anexo Production legítimo criado pelo fluxo normal, para prova binária completa;
3. falha/incidente/regressão real do pipeline Storage.

Sem um desses gatilhos:

- não usar `workflow_dispatch` só para antecipar a prova;
- não criar bucket/anexo sintético em Production;
- não revalidar a mesma ausência de run repetidamente;
- não refazer tooling, S3, R2, guardrails ou PostgreSQL;
- não alterar UI de cobertura Storage.

Storage já está armada e os gates externos foram confirmados pelo operador. Preservar `STORAGE_BACKUP_AUTOMATION_ENABLED=true`.

A Issue #75 continua aberta como umbrella de proteção de dados, mas não é a frente principal enquanto #121 aguarda seu gatilho.

## Regra nova de continuidade

`docs/ai/WORKFLOW.md` foi atualizado para formalizar:

- Issue ON HOLD não bloqueia roadmap;
- ON HOLD não conta como frente ativa;
- nenhuma atividade artificial para desbloquear espera externa;
- próxima Issue independente deve ser promovida;
- retomar ON HOLD somente quando o gatilho registrado aparecer ou houver regressão/incidente.

Essa regra deve ser aplicada a qualquer frente futura, não apenas backup.

## Estado GitHub

Na promoção da Fase 47:

- `main=1da51fdcb4b5730b63f5f30491a2e54390943a7e` (#131);
- CI pós-merge `33103269753`: success;
- #121 aberta / ON HOLD;
- #132 aberta / ativa;
- branch ativa `agent/stock-minimum-alerts`;
- nenhum PR aberto antes do início da Fase 47.

## Evidência do gap da Fase 47

Production foi inspecionada read-only em 2026-08-27:

- `inventory_balances` possui saldo por `stock_item_id + stock_location_id`;
- `stock_items` não possui coluna de mínimo;
- `stock_locations` não possui coluna de mínimo;
- `inventory_balances` não possui threshold de reposição;
- não existe tabela equivalente de política de estoque mínimo.

Policies atuais relevantes:

- leitura de `inventory_balances` usa `private.can_read_stock_location(...)`;
- leitura de `stock_locations` usa o mesmo boundary por local;
- configurações de estoque já possuem helpers escopados; a nova slice deve reutilizá-los, não criar bypass.

## Decisão da Fase 47

Configurar estoque mínimo por **item + local de estoque**.

Regras iniciais:

- `minimum_quantity >= 0` com tipo decimal exato;
- uma política por item/local;
- ausência de política = não configurado;
- alerta quando `quantity_on_hand < minimum_quantity`;
- igualdade não gera alerta;
- nunca gerar compra automaticamente;
- não inventar mínimo para dados existentes.

## Ordem depois da #132

Se não houver bug/regressão/nova prioridade:

1. `REQ-DASH-004` — evolução de Dashboard/relatórios de estoque;
2. `REQ-DASH-005` — evolução de compras/fornecedores e variação histórica;
3. `REQ-ITEM-003` — EAN/código de barras e dados fiscais já modelados no schema.

Frente ON HOLD pode ser retomada quando o gatilho aparecer, mas isso não cancela a frente ativa nem exige parar o projeto.

## Próxima ação exata

Executar #132 na branch `agent/stock-minimum-alerts`:

1. revisar migrations/modelo/adapters/UI atuais de estoque e Dashboard;
2. desenhar persistência mínima por item/local, com FK composta/constraints/RLS coerentes;
3. criar migration versionada e testes PostgreSQL;
4. implementar leitura/manutenção sob sessão autenticada + RLS;
5. adicionar alerta acionável no Dashboard preservando Unit/Sector;
6. rodar CI completo;
7. aplicar/homologar Production somente após CI verde e sem criar thresholds reais por inferência;
8. atualizar docs/handoff e abrir PR.

## Restrições

- não tocar #121 sem gatilho;
- não usar service/admin key no browser;
- não criar compra automática;
- não antecipar previsão de demanda/IA;
- não alterar Q-001..Q-025 por inferência;
- não colocar secrets no GitHub/docs/chat;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente.