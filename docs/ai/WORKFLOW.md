# Workflow de IA e múltiplos chats

## Objetivo

Permitir que o Sistema Lojasaph seja desenvolvido ao longo de múltiplos chats não simultâneos sem depender da memória de uma conversa específica.

## Início de uma nova sessão

Todo novo chat deve:

1. localizar o repositório `synapselab-ia/sistema-lojasaph`;
2. ler `AGENTS.md`;
3. ler `docs/00-START-HERE.md`;
4. ler `docs/ai/CURRENT_STATE.md`;
5. verificar a Issue e branch em andamento;
6. ler os documentos do módulo relacionado;
7. inspecionar os arquivos existentes antes de editar.

## Durante a sessão

- trabalhar apenas no escopo da Issue atual, salvo bloqueio real;
- registrar novas decisões importantes em documentação ou ADR;
- não confiar em detalhes de conversas anteriores que não estejam no repositório;
- não criar requisitos silenciosamente;
- manter o estado do repositório coerente com o que está sendo informado ao usuário.

## Encerramento da sessão

Atualizar `docs/ai/CURRENT_STATE.md` com:

- data;
- fase;
- Issue;
- branch;
- concluído;
- em andamento;
- pendências;
- decisões;
- validações/testes;
- próximo passo exato.

Usar `docs/ai/HANDOFF.md` quando houver contexto temporário ou operacional que o próximo chat precise receber.

## Regra de trabalho concorrente

Enquanto o projeto estiver sendo desenvolvido pelo usuário em chats não simultâneos, manter apenas uma frente principal marcada como em andamento.

## Git workflow esperado

```text
Issue
  ↓
branch de trabalho
  ↓
implementação/documentação
  ↓
validação
  ↓
Pull Request
  ↓
review
  ↓
merge
```

## Commit e Pull Request

- commits devem descrever a intenção da mudança;
- Pull Requests devem explicar o que mudou, por quê e como foi validado;
- alterações grandes não devem entrar silenciosamente direto na `main`;
- a `main` deve representar estado integrado e compreensível do projeto.

## Quando houver dúvida de negócio

Se a resposta puder ser obtida das planilhas ou documentação, pesquisar primeiro.

Se for uma decisão real do cliente ainda não registrada, marcar explicitamente como questão aberta. Não inventar comportamento.

## Prompt mínimo para um novo chat

O usuário poderá iniciar uma conversa com algo simples como:

> Continue o Sistema Lojasaph pelo GitHub. Leia o AGENTS.md e siga o estado atual do projeto.

O restante do contexto deve ser recuperável pelo próprio repositório.