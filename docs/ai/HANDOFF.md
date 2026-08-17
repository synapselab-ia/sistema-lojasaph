# Handoff — Sistema Lojasaph

Este arquivo registra contexto operacional para o próximo chat. `CURRENT_STATE.md` descreve o estado; `NEXT_ACTION.md` determina o trabalho imediato.

## Estado do handoff

Fase 1 analisada na Issue #4 / branch `agent/spreadsheet-analysis`.

## Contexto que não pode ser perdido

As seis planilhas já foram analisadas. Não reiniciar a engenharia reversa do zero salvo se surgirem novos arquivos ou houver necessidade específica de verificação.

Antes do schema definitivo existem questões críticas em `docs/product/open-questions.md`.

As principais são:

- natureza organizacional de Tabatinga, Capricórnio e Barba Negra;
- se Cozinha/Quiosque/Empório são setores ou operações independentes;
- significado do checkbox sem título nas transferências;
- significado financeiro de `em haver`;
- diferença entre transferência e empréstimo;
- natureza do `Gabarito` versus itens de estoque;
- escopo de vendas/PDV;
- método desejado de custeio de estoque.

## Descobertas arquiteturalmente importantes

- não modelar planilhas mensais como tabelas mensais;
- não unificar `Gabarito` com estoque automaticamente;
- não tratar devolução como registro isolado sem possibilidade de vínculo;
- não hardcodar Tabatinga/Capricórnio;
- não usar status financeiro das células como fonte primária;
- não importar dashboards/abas auxiliares como tabelas transacionais;
- não criar Supabase antes da validação/modelagem;
- lote/validade deve ser separado do cadastro mestre do item.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.

## Segurança

Os arquivos Excel reais não foram adicionados ao repositório. A documentação registra estruturas, regras e problemas sem publicar os dados operacionais completos.

## Regra

Se documentação e GitHub real divergirem, conferir primeiro Issue, PR, branch e arquivos atuais; corrigir o estado documental antes de seguir.