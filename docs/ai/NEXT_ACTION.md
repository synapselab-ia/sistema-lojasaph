# Next Action — Sistema Lojasaph

Este arquivo define a ação concreta que o próximo chat/agente deve executar. Ele deve permanecer curto, operacional e alinhado ao estado real do repositório.

## Objetivo atual

Iniciar a Fase 1 — engenharia reversa completa das seis planilhas de origem.

## Fazer agora

1. Criar/confirmar a Issue da Fase 1 e trabalhar em uma única branch dedicada.
2. Analisar estruturalmente as seis planilhas de origem já registradas em `docs/source-data/README.md`.
3. Mapear abas, colunas, fórmulas, listas, relações, repetições, inconsistências e regras de negócio implícitas.
4. Separar dado mestre, lançamento operacional, cálculo, relatório e configuração.
5. Criar `docs/source-data/spreadsheets-map.md` com o inventário consolidado.
6. Criar ou atualizar documentação de requisitos e regras de negócio derivadas da análise.
7. Registrar dúvidas que dependam de confirmação do cliente, sem inventar respostas.
8. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este `NEXT_ACTION.md` ao concluir a etapa.

## Não fazer ainda

- Não implementar telas funcionais.
- Não criar Supabase.
- Não escolher autenticação ou hospedagem definitiva.
- Não migrar dados reais para banco.
- Não copiar as planilhas literalmente para a arquitetura do sistema.

## Critério de conclusão

A Fase 1 estará pronta quando o repositório documentar, de forma rastreável, o que cada planilha controla, quais entidades e processos existem, quais regras podem ser inferidas com segurança e quais pontos ainda exigem validação do cliente.
