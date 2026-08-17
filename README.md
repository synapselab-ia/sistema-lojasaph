# Sistema Lojasaph

Sistema web de gestão operacional multi-negócio e multi-unidade para estoque, fornecedores, compras, financeiro, caixa e gestão.

## Estado atual

A modelagem do domínio está concluída e a fundação técnica da aplicação está em desenvolvimento na Issue #10.

O projeto usa GitHub como fonte oficial de verdade. Supabase ainda não foi adotado.

## Para qualquer novo chat ou agente

Leia obrigatoriamente, nesta ordem:

1. `AGENTS.md`
2. `docs/00-START-HERE.md`
3. `docs/ai/CURRENT_STATE.md`
4. `docs/ai/HANDOFF.md`
5. `docs/ai/NEXT_ACTION.md`
6. `docs/ai/WORKFLOW.md`
7. ADRs e documentação do módulo afetado

Depois confira Issue, branch e PR reais no GitHub antes de alterar o projeto.

## Stack da fundação

- Next.js 16.2.12
- React 19.2.8
- TypeScript 5.x em modo strict
- Tailwind CSS 4.x
- ESLint 9.x
- Vitest 4.1.10
- npm
- Node.js >= 20.9

Detalhes: `docs/architecture/technical-foundation.md`.

## Desenvolvimento local

Pré-requisito: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

Health endpoint:

```text
GET /health
```

## Validações

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Ou tudo em sequência:

```bash
npm run check
```

Pull Requests executam as mesmas validações via GitHub Actions.

## Arquitetura

A aplicação é um monólito modular. O domínio não depende do Next.js nem de um banco específico.

A persistência seguirá contratos de repositories/adapters. Nesta fase há adapters in-memory para permitir evolução e testes sem decidir Supabase prematuramente.

Documentos principais:

- modelo de domínio: `docs/architecture/domain-model.md`
- modelo lógico: `docs/architecture/data-model.md`
- ERD: `docs/architecture/erd.md`
- fundação técnica: `docs/architecture/technical-foundation.md`
- decisões: `docs/decisions/`
- requisitos: `docs/product/requirements.md`
- engenharia reversa: `docs/source-data/`
- Definition of Done: `docs/qa/definition-of-done.md`

## Segurança

Nunca versionar senhas, tokens, chaves ou dados operacionais sensíveis. `.env.example` contém apenas nomes/exemplos seguros de variáveis.
