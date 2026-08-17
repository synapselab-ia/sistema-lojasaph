# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Validação P0 — estrutura do negócio e regras críticas.

A Fase 1 de engenharia reversa das seis planilhas foi concluída e integrada à `main` pelo PR #5.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue em andamento: #6 — Validação P0 — estrutura do negócio e regras críticas
- Branch de trabalho: `agent/business-validation`
- Ainda não existe aplicação/toolchain de código.

## Concluído

### Fase 0

- governança inicial;
- `AGENTS.md`;
- `docs/00-START-HERE.md`;
- protocolo `CURRENT_STATE` + `HANDOFF` + `NEXT_ACTION`;
- visão, escopo, glossário e arquitetura inicial.

### Fase 1

As seis planilhas foram analisadas estruturalmente sem versionar os arquivos reais no GitHub.

Entregáveis existentes:

- `docs/source-data/spreadsheets-map.md`;
- `docs/source-data/field-catalog.md`;
- `docs/source-data/migration-plan.md`;
- `docs/product/business-rules.md`;
- `docs/product/open-questions.md`;
- `docs/product/requirements.md`;
- `docs/product/glossary.md`;
- `docs/architecture/preliminary-domain-model.md`.

## Descobertas relevantes

1. O fluxo Tabatinga ↔ Capricórnio mistura transferência, devolução, empréstimo, itens próximos do vencimento e possível acerto financeiro (`em haver`).
2. Existem referências a Barba Negra, portanto a estrutura não pode assumir somente dois locais.
3. A coluna de checkbox no controle Tabatinga ↔ Capricórnio não possui significado documentado e precisa de validação.
4. O `Gabarito` parece representar catálogo de venda/POS diferente dos itens de estoque/retirada; não deve ser unificado automaticamente.
5. Retiradas por setor usam abas mensais e texto livre, com custos frequentemente ausentes.
6. Caixa deve ser normalizado por data/sessão; o MODELO diverge das abas reais e existe fórmula inconsistente.
7. O financeiro mistura documento, parcela e pagamento e possui fórmulas de Google Sheets que aparecem quebradas no Excel analisado.
8. Validades exigem lote + quantidade + validade + local.
9. Fornecedores precisam de cadastro único com múltiplos contatos e condições comerciais.

## Objetivo da Issue #6

Validar Q-001 a Q-008 de `docs/product/open-questions.md` em pequenos blocos. Cada resposta confirmada deve virar regra documentada e, quando necessário, ajustar o modelo de domínio preliminar.

## Ainda não iniciado

- código da aplicação;
- Next.js/TypeScript;
- schema de banco definitivo;
- Supabase;
- autenticação;
- migração real;
- módulos funcionais.

## Decisões vigentes

1. GitHub é a fonte oficial de verdade do projeto.
2. Chats são sessões temporárias.
3. O sistema modela processos, não abas de Excel.
4. Arquitetura inicial: monólito modular web.
5. Modelo do domínio vem antes da decisão definitiva sobre Supabase.
6. Múltiplas unidades e permissões por escopo são requisitos arquiteturais.
7. Dados reais das planilhas não são versionados automaticamente.
8. Regras inferidas permanecem pendentes até validação explícita.
9. `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` devem refletir o GitHub real.

## Próxima ação

Consulte `docs/ai/NEXT_ACTION.md`. A primeira validação é Q-001.

## Regra para o próximo chat

Ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md` e `WORKFLOW.md`; conferir Issue/branch/PR reais; então executar a ação documentada.