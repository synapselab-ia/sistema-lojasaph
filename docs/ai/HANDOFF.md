# Handoff — Sistema Lojasaph

Este arquivo registra contexto operacional que um próximo chat precisa receber. O estado permanente do projeto continua em `CURRENT_STATE.md`; a ação concreta a executar fica em `NEXT_ACTION.md`.

## Estado do handoff

Fase 0 concluída e integrada à `main`.

## Contexto atual

A fundação de governança está pronta. O projeto ainda não possui aplicação, banco ou Supabase. A prioridade agora é compreender integralmente os processos existentes nas seis planilhas antes de definir o modelo de domínio detalhado ou escrever telas funcionais.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.

## Questões abertas relevantes

- Modelo detalhado de unidades, setores e locais ainda será validado a partir das planilhas e, quando necessário, com o cliente.
- Supabase ainda não foi escolhido definitivamente.
- Autenticação, hospedagem e observabilidade ainda não foram escolhidas.
- O modelo definitivo de saldo de estoque exigirá ADR após a modelagem de domínio.
- Regras inferidas das planilhas devem ser classificadas entre confirmadas e pendentes de validação; não assumir regra de negócio apenas porque uma fórmula ou layout sugere algo.

## Regra

Se houver divergência entre documentação e GitHub real, conferir Issue, PR, branch e arquivos atuais; corrigir a documentação antes de continuar. `CURRENT_STATE.md` descreve o estado e `NEXT_ACTION.md` descreve o próximo trabalho executável.