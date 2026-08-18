# Handoff — Sistema Lojasaph

## Estado

Fase 12 — Caixa: sessões, meios de pagamento e fechamento diário — concluída tecnicamente no PR #34.

Ao integrar o PR #34:

- fechar a Issue #33 como completed;
- manter a Issue #35 como próxima frente única;
- iniciar Fase 13 — Dashboard operacional, alertas e KPIs.

## Não repetir

- engenharia reversa e modelo lógico consolidados;
- Auth SSR/membership/RLS base;
- estoque, transferência e inventário persistentes;
- Compras da Fase 10;
- Financeiro da Fase 11;
- Caixa da Fase 12 após o merge do PR #34;
- reparo da transferência do PR #30;
- write direto em tabelas críticas;
- recriação dos shells vazios de migration removidos da Fase 12.

## Caixa — arquivos principais

- `supabase/migrations/20260818130358_cash_sessions_flow.sql`;
- `supabase/tests/cash_sessions.sql`;
- `src/modules/cash/adapters/supabase-cash-gateway.ts`;
- `src/app/workspace/(operacao)/caixa/page.tsx`;
- `docs/modules/cash.md`.

## Regras que devem permanecer

- primeira versão trabalha com totais consolidados, não vendas individuais;
- fundo inicial é valor da sessão, não saldo financeiro da empresa;
- esperado e contado são distintos; divergência é derivada;
- somente meios com `affects_cash_drawer=true` entram no dinheiro físico esperado;
- taxas são configuráveis/versionadas;
- Voucher é opcional/habilitável;
- `employee_consumption` fica separado do faturamento e do esperado enquanto Q-009 estiver aberta;
- entrada/sangria são eventos append-only;
- sessão fechada/cancelada não recebe novas mutações operacionais;
- correção preserva trilha; não apagar operação crítica;
- retry com mesmo command ID e payload diferente conflita.

Fórmula validada:

`expected = opening_float + drawer payment methods + cash_in - cash_out`

`difference = counted - expected`

## Permissões

- configuração: `owner/admin/manager`;
- operação: `owner/admin/manager/cashier`;
- viewer permanece leitura;
- `anon` sem acesso;
- RLS limita leitura à Organization;
- mutations críticas ficam nos RPCs validados.

## Validação da Fase 12

PostgreSQL 17 limpo:

- migrations + seed;
- schema/RLS/roles;
- estoque/transferência/inventário;
- compras;
- financeiro;
- caixa.

Aplicação:

- lint;
- typecheck;
- testes unitários;
- production build.

A primeira execução da suíte de Caixa detectou referência PL/pgSQL ambígua em `close_cash_session`; a correção qualificou `cash_movements` com alias explícito sem alterar a regra. O gate seguinte passou integralmente.

## Supabase remoto

- migration `cash_sessions_flow` aplicada;
- versão remota atual `20260818135623`;
- Security Advisor apenas com warnings intencionais dos command RPCs `SECURITY DEFINER`;
- Performance Advisor com INFO de FKs/índices e índices sem uso;
- homologação em rollback passou taxa, bruto/líquido, abertura, retries, entrada/sangria, Consumo Funcionários, esperado/contado/divergência e cancelamento;
- zero resíduos após rollback.

## Higiene de migrations

O job temporário de geração foi removido do workflow. Runs antigos ainda criaram alguns arquivos vazios depois da primeira limpeza; eles também foram removidos. Não restaurar esses shells.

A migration canônica no GitHub é somente `20260818130358_cash_sessions_flow.sql`.

## Próxima fase — Issue #35

Dashboard deve partir de:

- REQ-DASH-001 a REQ-DASH-005;
- read models previstos no modelo lógico;
- dados já persistidos de Estoque, Compras, Financeiro e Caixa.

Defaults registrados na Issue #35:

- priorizar pendências acionáveis antes de gráficos decorativos;
- não inventar zero/métrica quando o dado não existe;
- reutilizar status/cálculos centrais dos módulos, não duplicar regra na UI;
- filtros por período/unidade apenas onde a origem suporta;
- timezone da Organization governa datas de negócio;
- dashboard respeita RLS e nunca cria bypass;
- read models são reconstruíveis e não substituem transações de origem.

Escopo inicial previsto:

- financeiro vencido/vencendo/pago/saldo;
- sessões de caixa abertas e divergências;
- pedidos pendentes/entregas previstas;
- transferências em trânsito/inventários abertos/validades quando disponíveis;
- links diretos para ação.

Não incluir previsão/IA, POS/PDV, BI externo, notificações externas ou estoque mínimo sem regra implementada.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho seguro/reversível. Escalar apenas decisão estrutural realmente aberta, custo relevante ou credencial externa inevitável.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.
