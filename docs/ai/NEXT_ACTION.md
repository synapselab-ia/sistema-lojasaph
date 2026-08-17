# Next Action — Sistema Lojasaph

## Contexto

- Issue em andamento: #6 — Validação P0 — estrutura do negócio e regras críticas
- Branch: `agent/business-validation`

## Objetivo atual

Validar as questões críticas P0 antes de transformar o modelo preliminar em modelo de domínio/schema definitivo.

## Fazer agora

1. Ler `docs/product/open-questions.md`.
2. Validar Q-001 a Q-008 com o usuário/cliente, preferencialmente uma pergunta por vez ou em pequenos blocos.
3. Para cada resposta confirmada, atualizar `docs/product/business-rules.md` e marcar/remover a questão correspondente de `open-questions.md`.
4. Atualizar `docs/architecture/preliminary-domain-model.md` quando a resposta alterar entidades ou relações.
5. Quando Q-001 a Q-008 estiverem suficientemente resolvidas, encerrar a Issue #6 e criar a Issue da Fase 2 para formalizar modelo de dados e ADRs.
6. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo.

## Não fazer ainda

- Não criar Supabase.
- Não implementar telas funcionais.
- Não migrar dados reais.
- Não inventar respostas para perguntas do negócio.

## Primeira pergunta a fazer

**Q-001 — Tabatinga, Capricórnio e Barba Negra são lojas/unidades da mesma empresa, empresas diferentes, locais de estoque ou outra coisa?**

## Critério de conclusão

As questões P0 necessárias ao modelo inicial estão respondidas e documentadas, permitindo iniciar a Fase 2 sem decisões estruturais baseadas em suposição.