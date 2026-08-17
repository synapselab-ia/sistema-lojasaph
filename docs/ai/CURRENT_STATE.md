# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 0 — Fundação e governança do projeto, pronta para revisão e integração.

## Issue em andamento

#1 — Fase 0 — Fundação e governança do projeto.

## Branch atual

`agent/project-foundation`

## Concluído nesta fase

- Repositório privado criado no GitHub.
- Issue #1 criada para a fundação.
- Branch de trabalho criada.
- `AGENTS.md` criado para orientar novos chats/agentes.
- `docs/00-START-HERE.md` criado como ponto de entrada.
- visão do produto documentada;
- escopo inicial documentado;
- glossário inicial criado;
- arquitetura inicial documentada;
- workflow para múltiplos chats criado;
- handoff criado;
- seis planilhas de origem registradas;
- README atualizado para orientar continuidade.

## Validação desta fase

Não há aplicação nem toolchain de código ainda, portanto lint, typecheck, testes e build ainda não existem para executar.

A validação da Fase 0 consiste em verificar que um novo chat consegue localizar a documentação, entender o objetivo, recuperar o estado atual e identificar o próximo passo sem depender do histórico da conversa anterior.

## Ainda não iniciado

- Código da aplicação.
- Configuração de Next.js/TypeScript.
- Modelo de dados detalhado.
- Supabase.
- Autenticação.
- Migração das planilhas.
- Módulos funcionais.

## Decisões vigentes

1. GitHub é a fonte oficial de verdade do projeto.
2. Chats do ChatGPT são sessões temporárias de execução e análise.
3. O sistema deve modelar processos reais, não reproduzir abas de Excel.
4. A arquitetura inicial será um monólito modular web.
5. O domínio e o modelo de dados serão definidos antes da decisão definitiva sobre Supabase.
6. O sistema deve nascer preparado para múltiplas unidades e permissões por escopo.
7. Dados operacionais reais das planilhas não devem ser enviados ao repositório automaticamente; preferir documentação e fixtures anonimizadas.

## Próximo passo após integração da Fase 0

Executar a Fase 1: engenharia reversa completa das seis planilhas de origem e transformar campos, fórmulas, relações e fluxos em requisitos e regras de negócio documentadas.

## Regra para o próximo chat

Antes de qualquer trabalho, ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo e `docs/ai/WORKFLOW.md`.