# Handoff — Sistema Lojasaph

## Estado

A Fase 29 — auditoria de `REQ-PLAT-003 — Validação de dados` — foi concluída sem necessidade de Issue, branch funcional, patch ou migration.

`REQ-PLAT-003` é considerado atendido/verificado. A matriz consolidada está em `docs/qa/data-validation.md`.

Estado de referência:

- baseline no início da Fase 29: `6c9ec5d9efb527f1df4fe7eff183444527442a4b`;
- matriz de QA versionada em `370b37161150bcf2eac3afb4afb9d8bb80d96e10`;
- Issues abertas ao iniciar: 0;
- PRs abertos ao iniciar: 0;
- nenhuma Issue criada nesta auditoria;
- nenhuma alteração funcional ou de banco;
- nenhum deployment Vercel.

A última alteração funcional continua sendo a Fase 28 / PR #72, validada por CI #301, Business Transactions Integration #153 e Inventory Count Integration #169.

## Fase 29 — o que foi comprovado

A auditoria não tratou validação de formulário como prova suficiente. Foram confrontadas as regras essenciais com domínio/value objects, adapters/RPCs, definições `private.*` hospedadas, constraints/triggers/FKs e suites SQL existentes.

### Domínio

- `Money`: representação canônica em centavos, até 2 casas, formato/overflow protegidos;
- `Quantity`: representação canônica em milésimos, até 3 casas, formato/overflow protegidos;
- Estoque: positividade, não negatividade e invariantes de transferência/inventário no serviço de domínio;
- item: categoria/nome/unidade obrigatórios e normalizados;
- fornecedor: nome obrigatório e no máximo um contato primário no domínio.

### Banco e RPCs

Foi confirmada proteção autoritativa para:

- campos obrigatórios e enums de cadastros;
- referências cross-org por FKs compostas e buscas RPC no escopo da Organization;
- quantidades, dinheiro e precisão;
- item/local/fornecedor/meio de pagamento ativos;
- lifecycle de transferência, inventário, compra, financeiro e caixa;
- parcelas completas e numeradas, datas de pagamento/estorno, regras de taxa;
- limites de recebimento e retorno;
- lote/validade e disponibilidade de estoque;
- sessão de caixa aberta para mutações operacionais.

O caso aparentemente divergente de saldo negativo foi esclarecido: `inventory_balances_quantity_on_hand_check` foi removido intencionalmente por migration posterior e substituído pelo trigger `inventory_balances_negative_policy`, que consulta `stock_locations.allow_negative_stock`. O trigger existe no Supabase hospedado.

### Testes existentes

A conclusão reutiliza, entre outras, `schema_smoke.sql`, suites de retirada/devolução/perda/transferência, `inventory_count.sql`, `purchase_orders.sql`, `finance_payables.sql`, `cash_sessions.sql`, permissões e hardening. Não foi criada cobertura duplicada só para fechar requisito.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17.

Todas as consultas desta Fase 29 foram introspecções somente leitura. Não houve DDL, DML operacional, alteração de migration history, RLS, grants, Auth ou configuração.

## Próximo chat — fazer

1. Ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `WORKFLOW`, `requirements.md` e `docs/qa/data-validation.md`.
2. Conferir estado real de `main`, Issues, PRs, branches e CI antes de editar.
3. Não repetir a auditoria de `REQ-PLAT-003` salvo nova regressão concreta.
4. Auditar `REQ-PLAT-004 — Migrações de banco`.
5. Comparar a lista ordenada de `supabase/migrations/*.sql` com `supabase_migrations.schema_migrations` no projeto hospedado.
6. Não assumir que timestamps divergentes são erro: comparar nome, conteúdo/efeito e ordem histórica antes de classificar drift.
7. Verificar se todas as mudanças estruturais atuais são reconstruíveis do zero usando somente as migrations versionadas e seed/test bootstrap do repositório.
8. Confirmar que CI aplica todas as migrations em ordem a PostgreSQL limpo e não depende de DDL manual externo.
9. Procurar objetos/constraints/functions hospedados sem ancestral versionado ou migrations versionadas ausentes no remoto.
10. Só abrir Issue/branch se houver divergência concreta que ameace reprodutibilidade, upgrade ou rollback operacional.
11. Não editar manualmente `supabase_migrations.schema_migrations` e não aplicar migration remota apenas para alinhar timestamp.
12. Não fazer deploy Vercel durante auditoria.
13. Atualizar continuidade ao encerrar.

## Pista para REQ-PLAT-004

Durante a auditoria de validação foi observado que a migration hospedada `inventory` aparece em `supabase_migrations.schema_migrations` como versão `20260817214649`, enquanto o repositório atual contém `20260817191000_inventory.sql` com a definição histórica correspondente.

Isso é apenas **pista de auditoria**, não defeito confirmado. O próximo chat deve comparar a linhagem completa antes de propor qualquer alteração.

## Não fazer

- não criar Issue retroativa para a Fase 29;
- não alterar regras já protegidas apenas para duplicar validação de UI;
- não remover a política configurável de saldo negativo;
- não reabrir #69/#71;
- não reativar bootstrap ou auto-deploy Vercel;
- não usar dados/credenciais reais em testes;
- não inferir Q-001..Q-025.
