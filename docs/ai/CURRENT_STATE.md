# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 23 foi concluída, homologada e integrada na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #60 — merged
- Issue #59 — closed/completed
- merge commit funcional: `bdfc450c1095bd42e814fa1fee50dfcaad51a37e`
- head funcional final validado pré-merge: `608541980cc5264d17cbb847c13919d805699518`
- `CI` #273 — success
- `Inventory Count Integration` #165 — success
- `Business Transactions Integration` #148 — success
- próxima Issue: #61 — `Fase 24 — filtro de Setor no dashboard gerencial`

## Fase 23 — retirada de estoque vinculada ao Setor operacional

`REQ-STK-004` foi fechado na command surface persistente para registrar explicitamente o Setor de consumo/operação, preservando data, quantidade e responsável já existentes.

Implementado:

- `record_stock_withdrawal` agora exige `p_sector_id` explícito;
- Setor deve estar ativo, pertencer à mesma Organization e estar dentro do escopo autorizado pelo helper `private.has_sector_role`;
- o local de origem continua validado independentemente por `private.has_stock_location_role`;
- `stock_movements.sector_id` é persistido na retirada, mas permanece nullable no ledger global;
- `sector_id` entra no `audit_logs.after_data` e na semântica do command ID;
- retry com mesmo payload/Setor permanece idempotente; reutilização da chave com Setor divergente gera `IDEMPOTENCY_KEY_CONFLICT`;
- assinaturas pública e privada legadas sem Setor foram removidas, eliminando bypass autenticado;
- implementação privada permanece sem EXECUTE para `authenticated`;
- gateway, runtime provider e `/workspace/estoque` exigem `sectorId`;
- a UI lista somente `workspace.sectors` já filtrados pela autorização vigente e não cria/inventa Setor default;
- o núcleo `private.record_stock_outflow` continua responsável por saldo, custo, lote preferido, FEFO, política de estoque negativo, locks e rollback;
- `stock_return.sql` foi alinhado para criar a retirada de origem com Setor explícito;
- nova suíte `stock_withdrawal_sector_scope.sql` comprova escopo setorial sem duplicar a semântica da Fase 14;
- os três workflows PostgreSQL executam a nova regressão.

## Validação funcional

Head `608541980cc5264d17cbb847c13919d805699518` passou 3/3:

- `CI` #273 — lint, typecheck, Vitest, production build, backup/restore e suites PostgreSQL — success;
- `Inventory Count Integration` #165 — success;
- `Business Transactions Integration` #148 — success.

O gate `supabase/tests/security_hardening.sql` permaneceu verde. As regressões de retirada, devolução, perdas, transferências e inventário continuaram passando após a mudança.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Migration da Fase 23:

- `stock_withdrawal_sector` — versão remota `20260819184424`.

Baseline antes do DDL:

- 0 retiradas reais persistidas;
- `stock_movements.sector_id` nullable;
- assinatura pública legada sem Setor presente;
- assinatura nova ausente.

Depois do DDL:

- 0 retiradas reais, sem alteração histórica/backfill;
- `stock_movements.sector_id` continua nullable globalmente;
- assinatura pública/privada legada sem Setor não existe;
- nova assinatura setorial existe;
- `authenticated` possui EXECUTE somente na superfície pública necessária;
- `anon` não possui EXECUTE;
- `PUBLIC` não possui grant explícito;
- `authenticated` não executa a implementação privada.

Smoke sintético em `BEGIN/ROLLBACK` confirmou:

- retirada válida persiste Setor e responsável;
- audit `stock_withdrawal.recorded` contém `sector_id` e não duplica em retry;
- retry idêntico é idempotente;
- mesmo command ID com Setor diferente conflita;
- Setor ausente é rejeitado;
- Setor de outra Organization é rejeitado;
- Setor fora do membership autorizado é rejeitado com `INSUFFICIENT_SCOPE`;
- saldo e custo médio permanecem corretos;
- falhas não deixam movimento/audit parcial;
- rollback deixou zero Organization, movimento ou audit sintético.

Security e Performance Advisors foram executados após a migration. O novo wrapper aparece no warning genérico já conhecido de RPC `SECURITY DEFINER` executável por `authenticated`; sua exposição é intencional e continua protegida por auth, papel, escopo de local e Setor, `search_path=''` e implementação privada não executável pelo cliente. Nenhum sweep oportunista de débitos históricos foi feito.

A verificação de hardening remoto continua mostrando 45/45 tabelas `public` com RLS habilitado e o novo RPC sem EXECUTE para `anon`.

## Próxima lacuna MUST real

A Issue #61 registra a próxima lacuna objetiva: `REQ-DASH-002` exige escopos gerenciais relevantes por unidade/setor, enquanto o Dashboard atual possui apenas `unitId?` + `horizonDays`.

Evidência atual:

- `DashboardFilter` não possui `sectorId`;
- `SupabaseDashboardQuery.load(...)` não recebe Setor;
- a UI/documentação do Dashboard oferece Unidade + horizonte, sem filtro setorial;
- `payable_installment_summary` já expõe `sector_id`;
- `stock_locations` possui `sector_id` explícito;
- `cash_registers` não possui `sector_id`, portanto Caixa não deve ser artificialmente atribuído a Setor;
- existem 3 Setores ativos no dataset remoto atual;
- filtros de Dashboard por Setor ficaram explicitamente fora do escopo da Fase 23.

A Fase 24 deve fechar somente a dimensão Setor de `REQ-DASH-002`, sem inventar vínculos para fontes sem granularidade setorial e sem criar novos KPIs.

## Hardening vigente

A Issue #54 permanece concluída e `supabase/tests/security_hardening.sql` continua gate permanente. Objetos novos em `public` devem nascer deny-by-default e receber RLS/policies/grants explícitos. RPC público novo/substituído deve ter superfície mínima e não deixar assinatura legada autenticada como bypass.

## Vercel

`vercel.json` continua com `git.deploymentEnabled=false`. Nenhum deploy Vercel foi usado na Fase 23. CI permanece o gate principal.

## Não repetir

- não reabrir Fases 22/23, Issues #57/#59 ou hardening/Issue #54;
- não reaplicar migrations antigas;
- não alterar/backfillar retiradas históricas;
- não tornar `stock_movements.sector_id` globalmente `NOT NULL`;
- não remover/afrouxar `security_hardening.sql`;
- não reativar auto-deploy Vercel;
- não inventar Setor para Caixa ou outra fonte sem relação explícita;
- não criar novos KPIs na Fase 24;
- não implementar empréstimo enquanto Q-005 estiver aberta;
- não inferir Q-001..Q-025;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade.
