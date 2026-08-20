# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

A Fase 27 foi concluída. `REQ-PLAT-001 — Responsivo` recebeu revisão transversal e a Issue #69 foi fechada pelo merge do PR #70.

- Repositório: `synapselab-ia/sistema-lojasaph`
- Issue #69 — closed/completed
- PR #70 — merged
- head funcional da Fase 27: `f1c454d0c7dc4658c59829774c1effa4fe859839`
- merge da Fase 27: `7fe0f574504a1cb7080a54e8391cb1f26ca31ce2`
- CI #297 — success
- Business Transactions Integration #152 — success
- nenhuma migration/DDL
- nenhuma alteração de RLS, grants, roles, RPCs, Auth ou regra transacional

## Fase 27 — evidência

A auditoria cobriu as superfícies persistentes mínimas definidas na Issue #69:

- `/login`;
- `/workspace`;
- Produtos;
- Fornecedores;
- Funcionários;
- Estoque;
- Baixas;
- Devoluções;
- Transferências;
- Inventários;
- Compras;
- Financeiro;
- Caixa.

Foram preservadas as tabelas largas que já possuem `overflow-x-auto` local. Não houve conversão oportunista para cards.

Correções aplicadas:

- grids fixos `grid-cols-2`/`grid-cols-3` passam a uma coluna abaixo de 640px, cobrindo os casos comprovados em Produtos, Fornecedores, Transferências e Caixa;
- cabeçalhos recorrentes `flex` com `justify-between` podem quebrar linha em celular;
- inputs/selects/textareas/buttons têm contenção intrínseca de largura;
- dispositivos de ponteiro grosseiro recebem alvo mínimo de 44px nos controles principais, preservando checkbox/radio;
- `RuntimeShell` ganhou touch targets explícitos, quebra segura do nome/perfis da organização, navegação horizontal local e padding mobile menor;
- `/login` empilha os links auxiliares no celular;
- `src/app/responsive-contract.test.ts` protege o contrato CSS de mobile/touch.

As regras são restritas ao layout; semântica do Dashboard, permissões e operações persistentes não foram alteradas.

## Supabase remoto

Projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17, permanece `ACTIVE_HEALTHY`.

Nenhuma alteração remota foi necessária na Fase 27. O baseline de advisors de segurança continua contendo avisos sobre RPCs `SECURITY DEFINER` executáveis por `authenticated` e proteção de senha vazada desabilitada; eles não foram misturados à fase de responsividade porque exigem decisão própria de segurança e os RPCs atuais possuem autorização interna testada pelo CI.

Estado operacional preservado da Fase 26:

- 1 Organization ativa;
- 1 Auth user confirmado;
- 1 membership ativo;
- 1 owner ativo;
- bootstrap desabilitado em Production.

## Vercel Production

Auto-deploy continua desabilitado por `vercel.json` (`git.deploymentEnabled=false`).

Último Production intencional permanece:

- deployment `dpl_824q6umKyUyRhYzAmxLREjNeoFK1` — READY;
- commit funcional hospedado `046c4a3392f85e2361c6ddeac0ae3ee1817145c5`;
- `/health`: Supabase allowed e admin blocked;
- `/bootstrap`: desabilitado.

Nenhum deployment foi gasto na Fase 27. O código responsivo está na `main`, mas só chegará ao Production quando houver uma publicação intencional futura.

## Próximo MUST auditado

O próximo MUST verificável na ordem de plataforma é `REQ-PLAT-002 — Proteção contra duplicidade`.

Já existe evidência concreta de idempotência em caminhos críticos. Exemplo: `record_stock_entry(p_command_id, ...)` consulta o movimento pelo command ID, retorna o resultado existente em retry compatível e rejeita reutilização conflitante com `IDEMPOTENCY_KEY_CONFLICT`.

Entretanto, ainda não foi produzida uma matriz transversal comprovando esse comportamento em **todos** os write paths críticos de Estoque, Inventário, Compras, Financeiro e Caixa. Portanto nenhuma nova Issue foi criada por inferência.

A próxima ação é auditar `REQ-PLAT-002` ponta a ponta; somente se aparecer lacuna concreta deve ser criada uma nova fase/Issue.

## Não repetir

- não reabrir Fase 26 ou Fase 27;
- não refazer PRs #66/#67/#68/#70;
- não recolocar bootstrap/admin secret em Production;
- não reativar auto-deploy Vercel;
- não alterar RLS/grants por conveniência de UI;
- não criar nova Issue para `REQ-PLAT-002` antes da auditoria transversal;
- não importar dados reais;
- não inferir Q-001..Q-025.
