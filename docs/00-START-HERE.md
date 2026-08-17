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
- Evitar complexidade prematura, mantendo arquitetura profissional.
- Supabase é uma opção futura; a decisão final depende da modelagem e dos requisitos estabilizados.

## Arquitetura inicial

A direção atual é um monólito modular web com Next.js, React e TypeScript, uma camada de domínio/serviços e abstração de persistência por repositories. O modelo será relacional e preparado para PostgreSQL.

Consulte `docs/architecture/overview.md` para detalhes e restrições.

## Estado e continuidade

- `docs/ai/CURRENT_STATE.md`: onde o projeto está.
- `docs/ai/HANDOFF.md`: contexto necessário entre sessões.
- `docs/ai/NEXT_ACTION.md`: o que executar agora.

Um novo chat deve partir desses arquivos, conferir o estado real do GitHub e executar a próxima ação documentada.

## Dados de origem

O projeto começou a partir de seis planilhas operacionais do cliente, cobrindo retiradas, caixa, notas fiscais, validades e fornecedores. A engenharia reversa completa será documentada em `docs/source-data/` antes da migração.