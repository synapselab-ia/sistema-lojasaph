# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Transição da Validação P0 para a Fase 2 — modelo de domínio, dados e ADRs fundamentais.

A Fase 1 de engenharia reversa das seis planilhas foi concluída e integrada à `main` pelo PR #5.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue de validação: #6 — Validação P0 — estrutura do negócio e regras críticas
- Próxima Issue: #8 — Fase 2 — Modelo de domínio, dados e ADRs fundamentais
- Branch desta transição: `agent/business-validation-q1`
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

### Validação P0 / defaults de arquitetura

O usuário autorizou adotar a interpretação mais provável quando a solução puder permanecer configurável e reversível, evitando bloquear o projeto por detalhes que ainda não foram confirmados com o cliente final.

Foi criado `docs/decisions/ADR-001-organizational-and-p0-defaults.md` com os seguintes defaults:

1. arquitetura multi-negócio: `Organization → Business → Unit → Sector/StockLocation`;
2. Tabatinga, Capricórnio e Barba Negra tratados inicialmente como unidades/operações sob a mesma Organization;
3. Cozinha, Quiosque e Empório tratados inicialmente como setores/áreas operacionais;
4. estrutura jurídica/CNPJ não será inferida nem hardcoded;
5. checkbox legado sem significado será preservado apenas como metadado de importação até eventual confirmação;
6. `em haver` será tratado como indicador de conciliação interna, separado do saldo físico de estoque;
7. transferência e empréstimo serão processos distintos;
8. `SalesItem` e `StockItem` serão conceitos separados;
9. o MVP de caixa trabalhará com totais consolidados e permitirá integração futura com PDV/POS;
10. custo médio ponderado será o default de valorização gerencial, preservando custos de compra/lote para auditoria.

## Princípio de expansão

O sistema não será desenhado apenas para as unidades atuais. O mesmo produto deverá suportar novos restaurantes, quiosques, lojas, marcas ou outros negócios do mesmo proprietário sem reconstrução estrutural.

## Ainda não iniciado

- código da aplicação;
- Next.js/TypeScript;
- schema físico de banco;
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
6. O sistema nasce multi-negócio e multi-unidade.
7. Dados reais das planilhas não são versionados automaticamente.
8. Defaults revisáveis podem ser usados para não bloquear o projeto quando não houver risco estrutural alto.
9. `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` devem refletir o GitHub real.

## Próxima ação

Consulte `docs/ai/NEXT_ACTION.md`. A próxima etapa é a Issue #8.

## Regra para o próximo chat

Ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md`, `WORKFLOW.md` e os ADRs; conferir Issue/branch/PR reais; então executar a ação documentada.