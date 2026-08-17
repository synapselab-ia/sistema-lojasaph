# AGENTS.md — Sistema Lojasaph

Este arquivo define as regras obrigatórias para qualquer agente de IA ou novo chat trabalhando neste repositório.

## Antes de qualquer alteração

1. Leia `docs/00-START-HERE.md`.
2. Leia `docs/ai/CURRENT_STATE.md`.
3. Leia `docs/ai/HANDOFF.md`.
4. Leia `docs/ai/NEXT_ACTION.md`.
5. Leia `docs/ai/WORKFLOW.md`.
6. Verifique o estado real do repositório, a Issue e a branch em andamento.
7. Consulte a documentação do módulo afetado e os ADRs relacionados.
8. Inspecione o código existente antes de propor mudanças.

## Fonte de verdade

O GitHub é a fonte oficial de verdade do projeto. Conversas do ChatGPT não são documentação permanente.

Toda decisão relevante deve ser refletida no repositório: requisitos, regras de negócio, arquitetura, estado atual, pendências e testes.

`docs/ai/NEXT_ACTION.md` define a próxima ação operacional. Se houver divergência, primeiro confronte `CURRENT_STATE.md`, Issue/PR/branch reais e o estado do repositório; corrija a documentação antes de prosseguir.

## Regras de desenvolvimento

- Não inventar requisitos de negócio.
- Não reproduzir literalmente planilhas quando o processo puder ser modelado de forma normalizada.
- Não alterar decisões arquiteturais importantes silenciosamente; registrar ADR quando necessário.
- Não armazenar segredos, tokens, senhas ou chaves no repositório.
- Manter TypeScript estrito e evitar `any` sem justificativa.
- Preferir módulos coesos e baixo acoplamento.
- Regras críticas de permissão, financeiro e estoque não podem depender apenas da interface.
- Registros operacionais relevantes devem ser rastreáveis; preferir estorno/cancelamento a exclusão física quando aplicável.
- Toda mudança de banco deverá ser versionada por migration quando o banco for adotado.

## Validação antes de concluir uma tarefa

Quando as ferramentas existirem no projeto, executar no mínimo:

- lint
- typecheck
- testes relevantes
- build

Se algum comando não existir ainda, registrar isso em `docs/ai/CURRENT_STATE.md`.

## Encerramento de cada sessão

Antes de encerrar trabalho relevante:

1. Atualize `docs/ai/CURRENT_STATE.md`.
2. Atualize `docs/ai/HANDOFF.md` com o contexto necessário ao próximo chat.
3. Atualize `docs/ai/NEXT_ACTION.md` com uma ação concreta e executável.
4. Atualize a documentação afetada.
5. Informe claramente o que foi feito, o que foi validado e qual é o próximo passo.

## Regra de continuidade

O projeto foi desenhado para ser desenvolvido em múltiplos chats não simultâneos. Um novo chat deve conseguir continuar o trabalho sem depender do histórico da conversa anterior.