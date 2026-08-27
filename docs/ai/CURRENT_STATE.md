# Current State — Sistema Lojasaph

Última atualização: 2026-08-27

## Estado atual

**Fase 46 está integrada. Frente ativa: Issue #132 — Fase 47, estoque mínimo por local e alertas de reposição (`REQ-STK-011`).**

Branch ativa: `agent/stock-minimum-alerts`.

A antiga frente Storage permanece aberta na Issue #121, porém está **ON HOLD**. Ela não é a frente ativa e não deve receber trabalho até existir o gatilho objetivo de retomada.

## Regra operacional de continuidade

`docs/ai/WORKFLOW.md` agora define explicitamente:

- Issue ON HOLD não bloqueia o roadmap;
- não fabricar evidência, fixture, dispatch ou mudança para desbloquear espera externa;
- não revalidar repetidamente uma frente parada sem evidência nova;
- promover a próxima frente independente e viável;
- retomar ON HOLD somente quando o gatilho registrado existir ou houver regressão/incidente relacionado.

## GitHub / baseline viva

- `main`: `1da51fdcb4b5730b63f5f30491a2e54390943a7e` (#131);
- Issue #75: aberta como umbrella de proteção de dados, não é a frente ativa;
- Issue #121: aberta e ON HOLD;
- Issue #132: aberta e ativa;
- branch ativa: `agent/stock-minimum-alerts`;
- nenhum PR aberto na promoção da Fase 47;
- repositório temporariamente `public` por decisão operacional; não alterar automaticamente.

CI pós-merge do head atual de `main`:

- CI `33103269753`: success.

Não rerodar CI de `main` sem mudança/regressão.

## Issue #121 — ON HOLD

Storage Production já possui tooling, guardrails e infraestrutura integrados/armados. Não refazer:

- manifesto `lojasaph-storage-backup-v1`;
- reconciliação metadata↔objeto e SHA-256;
- transporte Supabase S3 → Cloudflare R2;
- restore isolado pela Storage API/S3;
- persistência `automatic_storage` / `coverage=storage`;
- CI end-to-end local;
- allowlist `finance-attachments`;
- caps de 1000 objetos / 1 GiB total / 10 MiB por objeto;
- S3 Production dedicado e R2 lifecycle/lock 30d já confirmados;
- `STORAGE_BACKUP_AUTOMATION_ENABLED=true`.

Última revalidação read-only de Production em 2026-08-27:

- 1 Organization;
- 0 buckets Storage;
- 0 objetos;
- 0 `finance_attachments`;
- 0 bytes declarados;
- 0 runs `automatic_storage`.

### Gatilhos objetivos de retomada da #121

Retomar a #121 somente quando ocorrer um destes eventos:

1. existir a primeira execução **agendada** do `Production Storage Backup` após o armamento — próxima janela esperada em 2026-08-28 06:47 UTC / 03:47 America/Sao_Paulo; inspecionar uma vez e registrar o resultado sanitizado;
2. surgir um anexo Production legítimo pelo fluxo normal do produto; então validar backup automático do objeto e restore isolado do mesmo snapshot;
3. ocorrer falha/incidente/regressão real do pipeline Storage.

Enquanto nenhum desses eventos existir: **não mexer na #121**.

Um run vazio futuro pode provar apenas operação sobre inventário vazio; recuperação binária completa continua exigindo anexo Production legítimo + `automatic_storage=succeeded` + `restore_drill coverage=storage=succeeded`.

## Fase 47 — Issue #132

`REQ-STK-011` exige permitir estoque mínimo e alertas de reposição.

Gap confirmado:

- `inventory_balances` já é por `stock_item_id + stock_location_id`;
- não existe threshold de estoque mínimo em `stock_items`, `stock_locations` ou `inventory_balances`;
- não existe policy/tabela equivalente para política de reposição;
- o Dashboard não pode gerar alerta autoritativo de estoque crítico sem essa configuração.

Decisão inicial da slice:

- estoque mínimo é por **item + local de estoque**;
- ausência de política significa `não configurado`, não zero;
- `minimum_quantity` deve ser decimal exato e não negativo;
- saldo crítico é derivado por `quantity_on_hand < minimum_quantity`;
- saldo igual ao mínimo não é crítico;
- não criar compra automática, previsão de demanda ou sugestão de quantidade nesta fase.

## Ordem de trabalho

Salvo bug/regressão ou nova prioridade explícita:

1. **Fase 47 / #132 — estoque mínimo por local + alertas**;
2. evolução de Dashboard de estoque (`REQ-DASH-004`) usando thresholds, ledger, inventários e validades reais;
3. evolução de fornecedores/compras (`REQ-DASH-005`) sobre histórico já persistido;
4. refinamento de cadastro com EAN/dados fiscais (`REQ-ITEM-003`), sem promover itens PENDING/POS por inferência.

A #121 pode ser retomada quando seu gatilho aparecer, mas esperar cron/dado externo não pausa essa ordem.

## Próximo trabalho exato

Na branch `agent/stock-minimum-alerts`, executar a Issue #132 sem tocar #121:

1. inspecionar modelo/fixtures/adapters atuais de `stock_items`, `stock_locations`, `inventory_balances` e Dashboard;
2. definir a persistência mínima de política por item/local com constraints e RLS escopada;
3. versionar migration seguindo o histórico Supabase atual;
4. adicionar regressões PostgreSQL antes de aplicar remotamente;
5. implementar adapter/UI de configuração e alerta do Dashboard;
6. rodar lint, typecheck, testes, build e workflows aplicáveis;
7. somente com CI verde aplicar/homologar a migration em Production sem inventar thresholds para dados existentes;
8. atualizar handoff e abrir PR.

## Não fazer

- não mexer na #121 enquanto estiver ON HOLD sem gatilho real;
- não disparar `workflow_dispatch` Storage apenas para antecipar prova;
- não criar fixture Storage em Production;
- não restaurar Production;
- não inventar valores de estoque mínimo para registros existentes;
- não criar compra automática/previsão de demanda na Fase 47;
- não alterar papéis/escopos sem necessidade comprovada;
- não registrar secrets;
- não tornar o repositório private automaticamente;
- não fazer deploy Vercel rotineiro.