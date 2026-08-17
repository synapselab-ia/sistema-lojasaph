# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 0 — Fundação e governança do projeto: concluída e integrada à `main`.

Próxima fase: Fase 1 — engenharia reversa das planilhas de origem.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Fase 0 integrada por Pull Request.
- Não existe aplicação/toolchain de código ainda.

## Concluído

- Repositório privado criado no GitHub.
- Governança inicial criada.
- `AGENTS.md` criado para orientar novos chats/agentes.
- `docs/00-START-HERE.md` criado como ponto de entrada.
- visão do produto documentada;
- escopo inicial documentado;
- glossário inicial criado;
- arquitetura inicial documentada;
- workflow para múltiplos chats criado;
- handoff criado;
- protocolo `NEXT_ACTION.md` adotado;
- seis planilhas de origem registradas;
- README atualizado para orientar continuidade.

## Validação

Ainda não há aplicação nem toolchain, portanto lint, typecheck, testes e build ainda não existem para executar.

A fundação é considerada válida quando um novo chat consegue localizar a documentação, entender o objetivo, recuperar o estado atual e identificar uma próxima ação concreta sem depender de conversas anteriores.

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
8. Todo ciclo relevante deve terminar com `CURRENT_STATE.md`, `HANDOFF.md` e `NEXT_ACTION.md` coerentes com o estado real do GitHub.

## Próxima ação

Consulte `docs/ai/NEXT_ACTION.md`.

## Regra para o próximo chat

Antes de qualquer trabalho, ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `docs/ai/HANDOFF.md`, `docs/ai/NEXT_ACTION.md` e `docs/ai/WORKFLOW.md`; depois conferir Issue, branch e estado real do repositório.