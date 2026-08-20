# Handoff — Sistema Lojasaph

## Estado

A Fase 36 auditou `REQ-SEC-003 — Auditoria`, encontrou uma lacuna concreta em configurações críticas de estoque persistidas diretamente via Data API e implementou a correção mínima na Issue #83 / PR #84.

Estado da frente:

- baseline: `main` em `f761aa5f028f1752784b122c56fa09054e07bee3`;
- Issue #83 — `REQ-SEC-003 — auditar configurações críticas persistidas por Data API`;
- branch `agent/critical-config-audit`;
- PR #84 — `fix(audit): trace critical inventory configuration changes`;
- migration Supabase aplicada: `20260820192526 / critical_config_audit`;
- evidência detalhada: `docs/qa/audit-trail.md`;
- Issue #75 de backup permanece aberta/bloqueada;
- nenhum deployment Vercel;
- nenhum dado real/importação/cutover.

## O que já estava correto

`public.audit_logs` já era append-only para clientes normais e protegido por RLS/grants:

- authenticated: SELECT apenas;
- leitura somente para owner/admin Organization-wide;
- anon sem acesso;
- sem INSERT/UPDATE/DELETE direto do cliente.

Os command paths críticos existentes escrevem audit event dentro das próprias transações:

- Estoque: entrada, retirada, perda/vencimento, devolução e transferência;
- Inventário: início, linhas, confirmação e cancelamento;
- Compras: criação, emissão, recebimento e cancelamento;
- Financeiro: documento, pagamento, estorno e cancelamento;
- Caixa: configuração via RPC, abertura, totais, movimentos, fechamento e cancelamento.

Os payloads inspecionados são operacionais e não copiam secrets. Em Financeiro, access key/payment reference não são incluídos nos audit snapshots dos commands correspondentes.

## Gap da Issue #83

`SupabaseStockItemRepository.save()` usa Data API com `upsert` direto. Também existem writes diretos protegidos por RLS em `stock_locations` e `stock_loss_reasons`.

Essas tabelas controlam comportamento crítico:

- StockItem: tracking de lote/validade, retornabilidade, unidade/categoria/tipo/status;
- StockLocation: `allow_negative_stock` e estado/localização;
- StockLossReason: `movement_type` e ativação usados por `record_stock_loss`.

Antes da Fase 36, nenhuma das três possuía trigger de auditoria.

## Correção aplicada

Migration canônica local/remota:

`supabase/migrations/20260820192526_critical_config_audit.sql`

Ela cria `private.audit_critical_inventory_configuration()`:

- trigger function privada;
- SECURITY DEFINER;
- `search_path=""`;
- sem EXECUTE direto para anon/authenticated/service_role;
- snapshots por whitelist;
- comparação semântica em UPDATE, ignorando timestamps.

Triggers:

- `stock_items_critical_config_audit`;
- `stock_locations_critical_config_audit`;
- `stock_loss_reasons_critical_config_audit`.

Ações:

- `stock_item.created` / `stock_item.updated`;
- `stock_location.created` / `stock_location.updated`;
- `stock_loss_reason.created` / `stock_loss_reason.updated`.

O no-op é importante: `updated_at` muda em todo UPDATE, mas um retry de `upsert` com os mesmos campos de negócio não deve criar auditoria duplicada.

## Testes

Nova suíte: `supabase/tests/audit_trail.sql`.

Cobre:

- create/update das três configurações;
- actor via `auth.uid()`;
- before/after;
- no-op upsert sem duplicação;
- rollback de mutation + audit;
- whitelist sem EAN/NCM/CEST/timestamps no snapshot de StockItem;
- três triggers presentes;
- trigger function não executável diretamente por API roles;
- audit_logs continua fechado para escrita do cliente.

`.github/workflows/ci.yml` executa a suíte no database gate.

## Validação

Head técnico inicial `94be4f6d71c4f1a743bd737d976f1cc5538cdf9a`:

- CI #332 — success;
- Business Transactions Integration #163 — success;
- Inventory Count Integration #179 — success.

Após esses gates, a migration foi aplicada ao Supabase e registrada como `20260820192526 / critical_config_audit`. O arquivo local foi renomeado para o mesmo version antes da validação final.

Revalidação remota read-only:

- 3/3 triggers presentes;
- função privada SECURITY DEFINER + search_path vazio;
- API roles sem EXECUTE;
- audit_logs continua SELECT-only para authenticated;
- total de audit events Production permaneceu 5 antes/depois da DDL; nenhum evento sintético foi gerado remotamente.

Advisors:

- Security: nova função privada não gerou warning; permanecem RPCs públicas SECURITY DEFINER intencionais e leaked-password protection;
- Performance: recomendações históricas de FKs/índices, sem finding novo desta migration.

O PR #84 deve ser mergeado somente após o head final reconciliado/documental ficar verde. Consultar o PR para os runs finais.

## Issue #75

Continua sem comentários/decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta. Não iniciar backup automático por inferência.

## Próximo chat

1. Ler continuidade padrão e conferir estado real de main/Issues/PRs/CI.
2. Confirmar que PR #84 está mergeado e Issue #83 encerrada; se não estiver, concluir apenas o fechamento já validado, sem refazer a implementação.
3. Confirmar `20260820192526_critical_config_audit.sql` em main e no histórico remoto; não reaplicar.
4. Checar #75 primeiro; sem decisões novas, mantê-la bloqueada.
5. Executar a próxima auditoria: `REQ-SEC-004 — Segredos`.
6. Reutilizar as entregas existentes de persistência/Auth, RLS hardening, ambientes e observabilidade antes de criar trabalho novo.
7. Auditar repositório/config/runtime sem expor valores de secrets: `.gitignore`, `.env.example`, uso de `NEXT_PUBLIC_*`, `SUPABASE_SECRET_KEY`, admin client server-only, Vercel env targets quando observáveis, workflows e redaction de logs.
8. Verificar que nenhum secret real está versionado ou enviado ao browser/logs. Diferenciar publishable key de secret key.
9. Não copiar valores de env/secrets para GitHub/docs/chat.
10. Se SEC-004 estiver atendido, documentar sem Issue artificial; se houver exposição concreta, uma única Issue + branch + fix mínimo.
11. Não criar deploy Vercel rotineiro.
12. Atualizar continuidade ao final.

## Não fazer

- não reabrir Fase 36 sem regressão concreta;
- não auditar todo master data por conveniência;
- não reaplicar migration remota;
- não criar eventos Production para homologação;
- não redesenhar observabilidade;
- não fechar #75 sem backup automático real;
- não importar dados reais/cutover;
- não reativar auto-deploy Vercel;
- não inferir Q-001..Q-025.
