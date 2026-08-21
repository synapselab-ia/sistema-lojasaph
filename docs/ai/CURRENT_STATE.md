# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 39 — `REQ-SEC-005 — Cancelamento/estorno` — **atendido no escopo atual; auditoria transversal concluída sem finding funcional**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main` de entrada da auditoria: `2518dab61825c103d763b23187da04ae075b5778`
- PR #89: evidência de `REQ-SEC-005`
- Issue corretiva para `REQ-SEC-005`: nenhuma, porque não houve gap reproduzível
- Issue #75: continua aberta e desarmada até ativação segura do backup Production
- Supabase Production: `fhbvwyttikrbeaanatlr`
- nenhum deployment Vercel criado nesta auditoria
- nenhuma mutation/DDL de negócio executada em Production

## Resultado de REQ-SEC-005

Evidência consolidada em `docs/qa/cancellation-reversal.md`.

### Banco / hardening

Introspecção read-only de Production confirmou:

- RLS habilitado nas relações críticas revisadas;
- `authenticated` sem `DELETE` direto;
- `anon` sem `DELETE` direto;
- `audit_logs` sem `INSERT`/`UPDATE`/`DELETE` direto para `authenticated`;
- commands públicos críticos `SECURITY DEFINER`, `search_path=''`, executáveis por `authenticated` e não por `anon`;
- wrappers públicos revalidando autenticação, papel e escopo antes da implementação privada.

`supabase/tests/security_hardening.sql` continua sendo a regressão transversal que falha se `authenticated` recuperar `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` ou `MAINTAIN` em tabelas públicas de aplicação.

### Padrões de correção críticos

- Compras: `cancel_purchase_order` preserva pedido e recebimentos; lifecycle `cancelled` + audit.
- Financeiro: `cancel_payable_document` preserva documento; `reverse_installment_payment` cria novo evento `reversal` ligado ao pagamento original.
- Caixa: `cancel_cash_session` preserva sessão e histórico; lifecycle `cancelled` + audit.
- Inventário: `cancel_inventory_count` preserva sessão; confirmado é imutável.
- Estoque: devolução cria novo `return_in` ligado à retirada por `reversal_of_movement_id`; retirada original permanece imutável.

Os commands alteram estado/criam evento e escrevem `audit_logs` no mesmo boundary PostgreSQL; retries são idempotentes ou conflitos explícitos.

### Runtime

Gateways e telas persistentes usam RPCs de command para cancelar/estornar/devolver. Não foi encontrado Data API `DELETE` em caminho crítico revisado.

O `delete next[item.id]` da tela de Compras é somente limpeza de uma chave do estado React local após recebimento; não toca Supabase.

### Testes reutilizados

- `supabase/tests/security_hardening.sql`;
- `supabase/tests/purchase_orders.sql`;
- `supabase/tests/finance_payables.sql`;
- `supabase/tests/cash_sessions.sql`;
- `supabase/tests/inventory_count.sql`;
- `supabase/tests/inventory_count_cancel.sql`;
- `supabase/tests/stock_return.sql`;
- `supabase/tests/audit_trail.sql`.

Não foi criado teste artificial porque as garantias necessárias já estão cobertas pelas suítes estabilizadas.

## Backup Production / Issue #75

A Fase 38 continua válida e não foi refeita.

Política aprovada:

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

Adiado deliberadamente até computador pessoal/confiável:

- OAuth Google Drive/rclone;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real + archive/checksum off-site;
- fechamento da #75.

A #75 permanece aberta, mas não bloqueia frentes independentes.

## Próxima ação

Fase 40 — auditar `REQ-PLAT-003 — Validação de dados`.

Objetivo: provar que regras essenciais não dependem apenas da UI e permanecem validadas em domínio/servidor/RPC/banco conforme o tipo de regra, usando os fluxos críticos atuais como baseline e abrindo Issue somente se houver gap reproduzível.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não reabrir `REQ-SEC-005` sem regressão concreta;
- não inventar soft-delete genérico ou nova taxonomia de reversão;
- não pedir/receber secrets de backup no chat;
- não ativar `BACKUP_AUTOMATION_ENABLED` antes dos secrets restantes;
- não fechar #75 sem primeiro run real;
- não restaurar backup real sobre Production para teste;
- não contratar plano/add-on sem autorização;
- não criar deployment Vercel sem necessidade real;
- não reaplicar migrations existentes;
- não importar dados reais/cutover.
