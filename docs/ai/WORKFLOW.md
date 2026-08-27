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

## Regra de ON HOLD

Uma frente deve ser marcada como **ON HOLD** quando o próximo passo depende de uma condição externa objetiva que ainda não existe, por exemplo cron futuro, dado legítimo ainda inexistente, aprovação operacional, credencial/configuração externa ou janela de produção.

Quando uma frente estiver ON HOLD:

- ela **não é a frente ativa**;
- não executar trabalho artificial para fabricar a condição de retomada;
- não disparar manualmente automações apenas para antecipar evidência quando a própria Issue proibir isso;
- não criar fixtures/dados Production para desbloquear prova operacional;
- não revalidar repetidamente o mesmo estado sem evidência nova;
- não alterar código, infraestrutura ou documentação dessa frente por inércia;
- promover a próxima Issue independente e viável para frente ativa;
- continuar o roadmap enquanto houver trabalho viável;
- retomar a frente ON HOLD somente quando seu gatilho objetivo estiver satisfeito ou quando surgir regressão/incidente diretamente relacionado.

Uma frente ON HOLD pode permanecer aberta no GitHub. `open` não significa `ativa`.

Se todas as Issues existentes estiverem concluídas ou ON HOLD, reconciliar `requirements`, roadmap e código real e abrir a próxima Issue somente quando houver um gap ou prioridade real; não criar atividade artificial.

## Encerramento da sessão

Atualizar `docs/ai/CURRENT_STATE.md` com:

- data;
- fase;
- Issue;
- branch;
- concluído;
- em andamento;
- frentes ON HOLD e respectivos gatilhos de retomada;
- pendências;
- decisões;
- validações/testes;
- próximo passo exato.

Usar `docs/ai/HANDOFF.md` quando houver contexto temporário ou operacional que o próximo chat precise receber.

## Regra de trabalho concorrente

Enquanto o projeto estiver sendo desenvolvido pelo usuário em chats não simultâneos, manter apenas uma frente principal marcada como em andamento.

Frentes ON HOLD não contam como frente principal em andamento e não bloqueiam a promoção de uma nova frente ativa.

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

Quando uma Issue ficar ON HOLD antes da conclusão, registrar o gatilho de retomada e seguir para outra Issue; não é necessário criar commit/PR vazio apenas para representar espera.

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