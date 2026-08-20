# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

Fase 36 — auditoria de `REQ-SEC-003 — Auditoria` — **gap identificado, corrigido e aplicado ao Supabase; aguardando validação final do head documental e merge do PR #84**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline da fase: `main` em `f761aa5f028f1752784b122c56fa09054e07bee3`
- Issue #83 — `REQ-SEC-003 — auditar configurações críticas persistidas por Data API`
- branch `agent/critical-config-audit`
- PR #84 — `fix(audit): trace critical inventory configuration changes`
- migration remota/canônica: `20260820192526 / critical_config_audit`
- evidência: `docs/qa/audit-trail.md`
- Issue #75 de backup continua aberta e bloqueada por decisões operacionais
- nenhum deployment Vercel foi criado
- nenhuma carga/importação de dados reais foi executada

## Auditoria de REQ-SEC-003

A trilha existente foi revalidada no código e no Supabase hospedado.

`public.audit_logs`:

- RLS habilitada;
- `authenticated` possui somente SELECT direto;
- policy de leitura limita a owner/admin Organization-wide;
- `anon` sem acesso;
- clientes normais sem INSERT/UPDATE/DELETE direto.

Os command paths críticos já auditavam no mesmo fluxo transacional:

- Estoque: entrada, retirada, perda/vencimento, devolução e transferências;
- Inventário: início, contagem de linha, confirmação e cancelamento;
- Compras: criação, emissão, recebimento e cancelamento;
- Financeiro: documento, pagamento, estorno e cancelamento;
- Caixa: configuração via RPC, abertura, totais, movimentos, fechamento e cancelamento.

A inspeção de payloads confirmou contexto suficiente de Organization/ator/recurso e snapshots operacionais sem copiar secrets. Financeiro não copia access key/payment reference para a auditoria dos commands inspecionados.

## Gap encontrado e corrigido

A auditoria encontrou configuração crítica persistida diretamente via Data API/RLS e, portanto, fora dos RPCs já auditados.

`SupabaseStockItemRepository.save()` usa `upsert` direto em `stock_items`. Além disso:

- `stock_items` controla tracking de lote/validade, retornabilidade, unidade/categoria/tipo/status;
- `stock_locations.allow_negative_stock` altera regra crítica do ledger;
- `stock_loss_reasons` controla classificação/ativação usada em baixas.

As três tabelas aceitavam INSERT/UPDATE autenticado, mas não tinham trigger de auditoria.

A migration `20260820192526_critical_config_audit.sql` adiciona uma função privada `SECURITY DEFINER`, `search_path=''`, sem EXECUTE para API roles, usada por três triggers `AFTER INSERT OR UPDATE`.

Os snapshots são whitelisted. UPDATE semanticamente idêntico não gera evento, mesmo quando o trigger de `updated_at` altera fisicamente a linha. Isso preserva retries do `upsert` sem audit noise.

## Teste de regressão

`supabase/tests/audit_trail.sql` cobre:

- create/update de StockItem, StockLocation e StockLossReason;
- ator autenticado;
- before/after dos campos críticos;
- retry/no-op de upsert sem duplicação;
- rollback conjunto da mutation e do audit event;
- whitelist dos snapshots;
- presença dos três triggers;
- função privada não executável pelos API roles;
- RLS/grants de `audit_logs` sem regressão.

O CI principal passa a executar essa suíte.

## Validação técnica

Head funcional inicial `94be4f6d71c4f1a743bd737d976f1cc5538cdf9a`:

- CI #332 — database + validate success;
- Business Transactions Integration #163 — success;
- Inventory Count Integration #179 — success.

O database gate aplicou toda a cadeia de migrations e passou `audit_trail.sql`, RLS/hardening, Auth/Organization isolation e todas as suites transacionais existentes.

Após os gates verdes, a migration foi aplicada no Supabase. O remoto registrou `20260820192526`, e o filename local foi reconciliado ao mesmo version sem alterar o SQL já validado.

O head final documental/reconciliado deve permanecer verde antes do squash merge; consultar o PR #84 para o run final.

## Supabase pós-DDL

Revalidação read-only confirmou:

- três triggers exatamente nas tabelas previstas;
- função privada com `SECURITY DEFINER` + `search_path=""`;
- `anon`, `authenticated` e `service_role` sem EXECUTE direto nessa função;
- `audit_logs` continua SELECT-only para authenticated;
- a contagem de audit events reais permaneceu em 5 antes/depois da DDL, portanto a homologação não fabricou eventos Production.

Security Advisor não adicionou finding para a nova função privada. Permanecem warnings históricos das RPCs públicas SECURITY DEFINER intencionais e leaked-password protection. Performance Advisor mantém recomendações históricas de índices/FKs, fora desta correção.

## REQ-PLAT-005 / Issue #75

A frente de backup continua bloqueada por RPO, RTO, destino off-site, retenção, proteção e alertas ainda não definidos. Não inventar configuração nem fechar #75 sem backup automático real.

## Próxima ação

Após integrar a Fase 36, auditar `REQ-SEC-004 — Segredos`, reutilizando o hardening já existente de `.gitignore`, `.env.example`, fronteira server/client do Supabase, política de ambientes e redaction de observabilidade. A tarefa deve começar como auditoria e só abrir Issue se houver exposição concreta/reproduzível.

## Não repetir

- não reabrir REQ-SEC-003 sem regressão concreta;
- não transformar todo CRUD mestre em audit trail por conveniência;
- não redesenhar as RPCs SECURITY DEFINER só por warning genérico;
- não reaplicar `critical_config_audit`;
- não gerar audit events artificiais em Production para teste;
- não importar dados reais/cutover;
- não fechar #75 sem decisões e automação real;
- não criar deployment Vercel rotineiro;
- não inferir Q-001..Q-025.
