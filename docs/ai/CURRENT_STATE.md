# Current State — Sistema Lojasaph

Última atualização: 2026-08-19

## Estado atual

A Fase 25 foi concluída, homologada e integrada na `main`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- PR #64 — merged
- Issue #63 — closed/completed
- merge commit funcional: `e345401fa80e98c6c3433fc98843c44c146a74fb`
- head funcional final validado pré-merge: `7040d7ec7faf356504ce3dd10f2dd4628ea69ca0`
- `CI` #281 — success
- `Inventory Count Integration` #167 — success
- `Business Transactions Integration` #150 — success
- próxima Issue: #65 — `Fase 26 — convite seguro do primeiro owner para homologação persistente`

## Fase 25 — período gerencial explícito no Dashboard

A dimensão período de `REQ-DASH-002` foi fechada sem transformar métricas cumulativas ou snapshots em números temporalmente falsos.

Implementado:

- `DashboardFilter`/query/UI aceitam período opcional `dateFrom` + `dateTo`;
- período exige par completo, datas ISO `YYYY-MM-DD` reais, `dateFrom <= dateTo` e limites inclusivos;
- `horizonDays` permanece conceito separado do período;
- Financeiro usa `due_date` da obrigação como data canônica;
- `net_paid_amount` continua cumulativo das obrigações selecionadas e a UI não o chama de pagamento realizado no período;
- caixas abertos permanecem estado atual; fechamentos/divergências usam `cash_sessions.business_date`;
- pedidos pendentes permanecem estado atual; alertas de entrega usam `expected_delivery_date` conhecida;
- transferências em trânsito e inventários em andamento permanecem snapshots atuais;
- validades usam `inventory_batches.expiration_date`;
- Unit + Setor da Fase 24, incluindo Transferências por endpoint e Caixa Unit-level, foram preservados;
- UI diferencia explicitamente Horizonte, Período e Estado atual;
- nenhuma migration, view, RPC, grant ou policy nova foi necessária.

## Validação da Fase 25

Head `7040d7ec7faf356504ce3dd10f2dd4628ea69ca0` passou 3/3:

- `CI` #281 — lint, typecheck, Vitest, production build, backup/restore e todas as suítes PostgreSQL — success;
- `Inventory Count Integration` #167 — success;
- `Business Transactions Integration` #150 — success.

`supabase/tests/security_hardening.sql` permaneceu verde.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17. Nenhum DDL foi aplicado na Fase 25.

Homologação read-only confirmou:

- timezone da Organization demo: `America/Sao_Paulo`;
- Financeiro: 0 parcelas;
- Caixa: 0 sessões;
- Compras: 0 pedidos;
- Transferências: 0;
- Inventários: 0;
- 2 lotes ativos com validade: `2026-08-20` e `2026-08-28`;
- intervalo `2026-08-20`..`2026-08-20` retorna 1 lote;
- intervalo `2026-08-21`..`2026-08-27` retorna 0;
- intervalo `2026-08-28`..`2026-08-28` retorna 1 lote.

Um usuário/membership sintético foi usado somente dentro de `BEGIN/ROLLBACK`; pós-smoke confirmou 0 resíduo e os 2 lotes reais permaneceram intactos.

## RLS/hardening vigente

Auditoria remota recente continua mostrando:

- 45/45 tabelas `public` com RLS habilitado;
- nenhuma tabela sem policy;
- nenhum DML para `anon`/`PUBLIC`;
- nenhuma policy permissiva suspeita;
- 0 leaks em smoke como `authenticated` sem membership;
- `payable_installment_summary` com `security_invoker=true`.

Os warnings conhecidos do Security Advisor para RPCs `SECURITY DEFINER` autenticados permanecem uma superfície separada e intencional; não fazer sweep oportunista.

## Próxima lacuna objetiva — acesso persistente inicial

A Issue #65 registra o bloqueio real para homologar o Workspace persistente.

Estado verificado:

- Supabase remoto possui 1 Organization ativa, **0 usuários Auth**, **0 memberships ativos** e **0 owners ativos**;
- `/login` possui login por e-mail/senha e recuperação, sem signup público;
- `/bootstrap` já existe e exige sessão válida cujo e-mail coincide com `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
- `bootstrapOwnerAction` usa admin client server-only para criar somente o membership `owner` + audit, após comprovar ausência de owner ativo;
- o bootstrap não cria a identidade Supabase Auth, criando um chicken-and-egg para a primeira conta;
- `.env.example` já documenta as variáveis server-only de bootstrap.

A Fase 26 deve adicionar um caminho de **convite Auth inicial** restrito ao e-mail configurado server-side, sem cadastro público, senha padrão ou INSERT direto em `auth.users`, e depois reutilizar o bootstrap de membership existente.

## Vercel

Projeto `sistema-lojasaph` conectado. O último deployment Production observado está `READY` no commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`, anterior às Fases 25/26. `vercel.json` continua com `git.deploymentEnabled=false`.

Nenhum deploy Vercel foi disparado nesta sessão. Não fazer deployment rotineiro; deployment intencional só quando necessário para homologação final.

## Não repetir

- não reabrir Fases 24/25, Issues #61/#63 ou hardening/Issue #54;
- não reaplicar migrations antigas;
- não regredir Unit/Setor/período do Dashboard;
- não inventar granularidade temporal/setorial;
- não criar usuário diretamente em `auth.users` por SQL;
- não habilitar signup público;
- não versionar ou registrar senha/segredo;
- não criar conta/convite real sem e-mail explicitamente fornecido pelo operador;
- não alterar RLS/grants para facilitar onboarding;
- não reativar deploy Vercel por commit;
- não importar dados reais;
- não inferir Q-001..Q-025;
- não fazer sweep de advisors antigos sem causalidade.
