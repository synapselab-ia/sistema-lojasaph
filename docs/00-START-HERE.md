# Sistema Lojasaph — Comece aqui

## Missão

Construir um sistema web profissional para centralizar a operação das lojas do cliente em Caraguatatuba, substituindo progressivamente controles fragmentados em planilhas por uma fonte única de operação.

## Fonte de verdade

O GitHub é a fonte oficial do projeto. Chats são sessões temporárias de trabalho.

## Ordem obrigatória de leitura para um novo chat

1. `AGENTS.md`
2. `docs/00-START-HERE.md`
3. `docs/ai/CURRENT_STATE.md`
4. `docs/ai/HANDOFF.md`
5. `docs/ai/NEXT_ACTION.md`
6. `docs/ai/WORKFLOW.md`
7. documentação do módulo em trabalho
8. ADRs relacionados em `docs/decisions/`

Quando a frente ativa for a Fase 51 / consolidação de produto, também é obrigatória a leitura de `docs/product/product-completion-ux-roadmap.md` antes de alterar UI, navegação ou jornadas.

## Escopo macro

O sistema deverá evoluir para cobrir:

- unidades, setores e locais de estoque;
- produtos e categorias;
- fornecedores e compras;
- estoque, retiradas, transferências, devoluções, perdas e inventários;
- lotes e validades;
- notas fiscais, parcelas, contas a pagar e pagamentos;
- caixa e divergências;
- funcionários, usuários, perfis e permissões;
- auditoria, anexos, dashboards, relatórios, alertas, importação e exportação.

## Princípios

- Modelar os processos reais da empresa, não copiar as abas das planilhas.
- Nascer preparado para múltiplas unidades.
- Separar regras de negócio da interface e do provedor de dados.
- Manter rastreabilidade para estoque e financeiro.
- Priorizar experiência rápida em desktop, tablet e celular.
- Avaliar conclusão de produto pela capacidade de executar jornadas reais, não apenas pela existência de schema/backend/tela mínima.
- Organizar navegação e telas pelo modelo mental da operação, não pela decomposição interna do código.
- Evitar expor ao usuário normal IDs internos, nomes de provider, RLS, migrations, fases e outros detalhes de engenharia sem necessidade operacional.
- Evitar complexidade prematura, mantendo arquitetura profissional.
- PostgreSQL é o modelo físico relacional; Supabase é o provedor hospedado inicial preferido e revisável conforme `ADR-006`.
- Migrations versionadas no GitHub, RLS e adapters preservam a independência do domínio em relação ao provedor.

## Arquitetura atual

A direção é um monólito modular web com Next.js, React e TypeScript, camada de domínio/serviços, repositories/adapters e PostgreSQL. O Supabase fornece inicialmente Postgres, Auth e a Data API protegida por RLS; credenciais privilegiadas permanecem exclusivamente server-side.

Consulte `docs/architecture/overview.md`, `docs/architecture/persistence.md` e `docs/decisions/ADR-006-postgresql-supabase-persistence.md` para detalhes e restrições.

## Estado e continuidade

- `docs/ai/CURRENT_STATE.md`: onde o projeto está.
- `docs/ai/HANDOFF.md`: contexto necessário entre sessões.
- `docs/ai/NEXT_ACTION.md`: o que executar agora.
- `docs/product/product-completion-ux-roadmap.md`: régua e ordem da consolidação de produto/UX iniciada após a Fase 50.

Um novo chat deve partir desses arquivos, conferir o estado real do GitHub e executar a próxima ação documentada.

## Dados de origem

O projeto começou a partir de seis planilhas operacionais do cliente, cobrindo retiradas, caixa, notas fiscais, validades e fornecedores. A engenharia reversa completa está documentada em `docs/source-data/`; dados reais não devem ser migrados antes da homologação dos fluxos persistentes e da reconciliação planejada.
