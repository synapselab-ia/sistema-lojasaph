# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 1 — engenharia reversa das planilhas: análise documental concluída na branch `agent/spreadsheet-analysis`, pronta para integração.

Próximo passo após integração: validar as questões críticas P0 com o cliente/usuário antes do modelo de domínio definitivo.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #4 — Fase 1 — Engenharia reversa das planilhas
- Branch da Issue: `agent/spreadsheet-analysis`
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

Entregáveis criados/atualizados:

- `docs/source-data/spreadsheets-map.md`;
- `docs/source-data/field-catalog.md`;
- `docs/source-data/migration-plan.md`;
- `docs/product/business-rules.md`;
- `docs/product/open-questions.md`;
- `docs/product/requirements.md`;
- `docs/product/glossary.md` refinado;
- `docs/architecture/preliminary-domain-model.md`.

## Descobertas relevantes

1. O fluxo Tabatinga ↔ Capricórnio mistura transferência, devolução, empréstimo, itens próximos do vencimento e possível acerto financeiro (`em haver`).
2. Existem referências a Barba Negra, portanto a estrutura não pode assumir somente dois locais.
3. A coluna de checkbox no controle Tabatinga ↔ Capricórnio não possui significado documentado e precisa de validação.
4. O `Gabarito` parece representar catálogo de venda/POS diferente dos itens de estoque/retirada; não deve ser unificado automaticamente.
5. Retiradas por setor usam abas mensais e texto livre, com custos frequentemente ausentes.
6. Caixa deve ser normalizado por data/sessão; o MODELO diverge das abas reais e existe fórmula inconsistente.
7. O financeiro mistura nota/documento, parcela e pagamento na mesma linha e usa fórmulas específicas do Google Sheets que aparecem quebradas como `#NAME?` no Excel analisado.
8. `Parcela` é exibida como `n/total` mas armazenada por artifício de formatação de data; o novo sistema deve usar campos próprios.
9. `Pix/Boleto` contém referências/códigos de pagamento e não deve ser modelado apenas como método.
10. A planilha de validades é apenas template; o novo sistema deve usar lote + quantidade + validade + local.
11. Fornecedores precisam de cadastro único com múltiplos contatos e condições comerciais.

## Validação técnica desta fase

Ainda não existe aplicação, portanto lint, typecheck, testes e build não se aplicam.

A validação da Fase 1 foi documental: inventário de abas/campos/fórmulas, comparação estrutural, identificação de inconsistências e separação explícita entre regra comprovada, evidência e questão pendente.

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
8. Regras inferidas permanecem identificadas como pendentes até validação.
9. `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` devem sempre refletir o GitHub real.

## Próxima ação

Consulte `docs/ai/NEXT_ACTION.md`.

## Regra para o próximo chat

Ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md` e `WORKFLOW.md`; conferir Issue/branch/PR reais; então executar a ação documentada.