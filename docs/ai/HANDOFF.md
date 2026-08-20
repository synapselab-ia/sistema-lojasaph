# Handoff — Sistema Lojasaph

## Estado

A Fase 27 / Issue #69 foi concluída e integrada à `main`.

- PR #70 — merged
- Issue #69 — closed/completed
- head funcional: `f1c454d0c7dc4658c59829774c1effa4fe859839`
- merge: `7fe0f574504a1cb7080a54e8391cb1f26ca31ce2`
- CI #297 — success
- Business Transactions Integration #152 — success
- sem DDL/RLS/grants/RPC/Auth changes

## O que mudou na Fase 27

A revisão transversal cobriu `/login`, `/workspace`, Produtos, Fornecedores, Funcionários, Estoque, Baixas, Devoluções, Transferências, Inventários, Compras, Financeiro e Caixa.

Problemas objetivos corrigidos:

- grids fixos de 2/3 colunas em celular;
- cabeçalhos recorrentes sem wrap em largura estreita;
- controles com largura intrínseca capaz de pressionar a viewport;
- touch targets inconsistentes em dispositivos touch;
- shell mobile com alvos/navegação e padding pouco explícitos;
- links auxiliares do login sem estratégia mobile.

Tabelas largas já possuíam scroll horizontal local e foram preservadas. O teste `src/app/responsive-contract.test.ts` protege as regras transversais de mobile/touch.

## Backend / Supabase

Projeto `fhbvwyttikrbeaanatlr` segue `ACTIVE_HEALTHY` em PostgreSQL 17.

Não houve alteração de banco nesta fase. Estado operacional preservado:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- bootstrap Production desabilitado.

Os advisors ainda reportam avisos genéricos sobre RPCs `SECURITY DEFINER` expostos ao papel `authenticated` e leaked-password protection desabilitada. Não tratar isso dentro de uma fase de UI; qualquer mudança precisa de auditoria de segurança própria porque os RPCs atuais implementam autorização interna e possuem testes de RLS/transação.

## Vercel

`git.deploymentEnabled=false` continua intacto.

Último Production permanece `dpl_824q6umKyUyRhYzAmxLREjNeoFK1`, no código funcional da Fase 26 (`046c4a3392f85e2361c6ddeac0ae3ee1817145c5`). Nenhum deployment foi feito para a Fase 27, evitando gasto de quota sem necessidade operacional.

A `main` agora contém a Fase 27; Production só deve ser atualizado por deployment intencional quando houver motivo real de homologação/publicação.

## Próximo MUST — auditoria antes de nova Issue

Próximo requisito verificável: `REQ-PLAT-002 — Proteção contra duplicidade`.

Evidência já confirmada:

- `record_stock_entry` recebe `p_command_id`;
- retry com o mesmo comando compatível retorna o resultado já persistido;
- reutilização conflitante gera `IDEMPOTENCY_KEY_CONFLICT`.

Isso prova o padrão em um caminho crítico, mas ainda falta uma matriz transversal dos write paths. O próximo chat deve auditar antes de criar Issue.

Cobrir pelo menos:

- entrada, retirada, baixa/perda e devolução de estoque;
- despacho e recebimento de transferência;
- início, linha, confirmação e cancelamento de inventário;
- criação, emissão, recebimento e cancelamento de compra;
- criação/cancelamento de documento financeiro, pagamento e estorno;
- configuração/operação de Caixa, movimentos, fechamento e cancelamento;
- geração/reutilização de command IDs nos adapters/clientes;
- testes de retry e conflito no PostgreSQL/CI.

Se todos estiverem comprovadamente idempotentes, registrar `REQ-PLAT-002` como atendido e avançar ao próximo MUST sem abrir Issue. Se houver lacuna concreta, criar a próxima Issue apenas para ela.

## Branch esperada

Ao iniciar o próximo chat, conferir `main` e `agent/responsive-workspace`. A branch de continuidade deve ser sincronizada com o commit documental final desta sessão antes de qualquer novo patch.

## Não fazer

- não reabrir #65 ou #69;
- não refazer PRs #66/#67/#68/#70;
- não criar Issue de idempotência sem auditoria transversal;
- não reativar bootstrap ou auto-deploy;
- não alterar RLS/grants sem regressão comprovada;
- não usar credenciais reais em automação;
- não importar dados reais;
- não inferir Q-001..Q-025.
