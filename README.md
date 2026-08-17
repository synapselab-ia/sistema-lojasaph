# Sistema Lojasaph

Sistema de gestão operacional das lojas, cobrindo estoque, compras, fornecedores, financeiro, caixa e gestão.

## Estado atual

O projeto está na fase de fundação e engenharia de requisitos. O código funcional ainda não foi iniciado.

## Para qualquer novo chat ou agente

Leia obrigatoriamente, nesta ordem:

1. `AGENTS.md`
2. `docs/00-START-HERE.md`
3. `docs/ai/CURRENT_STATE.md`
4. `docs/ai/WORKFLOW.md`

O GitHub é a fonte oficial de verdade do projeto. O histórico de uma conversa do ChatGPT não deve ser necessário para continuar o desenvolvimento.

## Visão

O Sistema Lojasaph será uma aplicação web profissional para substituir progressivamente os controles fragmentados em planilhas por processos integrados, rastreáveis e adequados à operação das lojas.

## Documentação

- Visão do produto: `docs/product/vision.md`
- Escopo: `docs/product/scope.md`
- Glossário: `docs/product/glossary.md`
- Arquitetura inicial: `docs/architecture/overview.md`
- Estado atual: `docs/ai/CURRENT_STATE.md`
- Handoff: `docs/ai/HANDOFF.md`
- Workflow entre chats: `docs/ai/WORKFLOW.md`
- Dados de origem: `docs/source-data/README.md`

## Tecnologia

A direção inicial é Next.js + React + TypeScript em arquitetura de monólito modular. O banco será relacional e o uso de Supabase/PostgreSQL será avaliado após a modelagem do domínio.