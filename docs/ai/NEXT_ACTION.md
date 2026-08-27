# Next Action — Sistema Lojasaph

## Estado

**Não existe frente funcional ativa após a Fase 50.**

A Fase 50 / Issue #138 (`REQ-ITEM-003`) foi integrada pelo PR #139.

Baseline confirmada:

- `main=f30137355fe1b8958cbfe36cf1cd6e515c647558`;
- PR #139 merged;
- Issue #138 closed;
- CI pós-merge #500 / `33118720928`: success;
- nenhum PR aberto;
- únicas Issues abertas: #75 e #121, ambas ON HOLD na trilha `REQ-PLAT-005`.

Não refazer Fase 50 e **não inventar Fase 51**.

## Próxima ação objetiva

### 1. Reconciliar o GitHub real

Em qualquer retomada:

1. confirmar `main` real;
2. confirmar PRs/Issues abertos;
3. verificar se houve bug/regressão ou nova prioridade explícita;
4. verificar se algum gatilho da #121 ocorreu desde este handoff.

### 2. #121 — somente quando houver gatilho

Último estado válido em 2026-08-27:

- 0 buckets Storage;
- 0 anexos financeiros Production;
- 0 runs `automatic_storage`.

Gatilhos válidos:

1. primeira execução **agendada** do `Production Storage Backup` — janela esperada em **2026-08-28 03:47 America/Sao_Paulo**;
2. primeiro anexo Production legítimo criado pelo fluxo normal;
3. incidente/regressão real do pipeline Storage.

Se nenhum gatilho ocorreu, **não tocar #121**.

Não fazer:

- `workflow_dispatch` para antecipar a prova;
- fixture/objeto sintético em Production;
- repetição da mesma introspecção vazia;
- alteração de tooling, R2, guardrails ou secrets por inércia.

### 3. Quando o primeiro horário agendado já tiver passado

Fazer **uma única reconciliação** da evidência real:

1. localizar a execução agendada do workflow `Production Storage Backup`;
2. verificar status/conclusão e logs sanitizados apenas quando necessário;
3. verificar a evidência autoritativa de `automatic_storage` correspondente, sem criar DML manual;
4. se o run falhou, tratar como incidente/regressão da #121 e corrigir somente a causa real;
5. se o run teve sucesso sobre Storage vazio, registrar que a automação executou corretamente o snapshot vazio, mas **não** declarar recuperação binária comprovada;
6. se não existir run agendado quando deveria existir, investigar scheduling/armamento/configuração sem substituir a prova por dispatch manual;
7. manter a Issue #121 aberta até existir a evidência exigida por ela, inclusive restore real de pelo menos um objeto Production legítimo para cobertura completa.

### 4. Outros eventos que podem abrir nova frente

Se #121 continuar ON HOLD, só abrir nova Issue quando houver um destes fatos:

- bug/regressão real;
- prioridade nova explícita do usuário/negócio;
- fontes de migração finais congeladas + regras aprovadas suficientes para um cutover específico;
- resposta registrada a uma questão aberta que desbloqueie requisito `PENDING`;
- gap MUST/SHOULD novo comprovado por mudança de requisito/escopo.

A reconciliação pós-Fase 50 não encontrou outro MUST/SHOULD funcional independente pendente.

## Importação real

A infraestrutura `REQ-IMP-001..004` já existe, mas o cutover continua bloqueado por condições externas: fontes congeladas, transformações aprovadas, questões de negócio aplicáveis resolvidas, reconciliação e validação do cliente.

Não criar importador/cutover genérico sem uma fonte e regra final aprovadas.

## PENDING — não promover por inferência

- `REQ-ITEM-004` — produto de venda/POS, depende de Q-006;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — cardinalidade final de pagamentos;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas.

## Restrições

- GitHub é a fonte de continuidade;
- RLS continua sendo boundary de acesso;
- nenhum secret em browser/Git/docs/chat;
- não fabricar evidência Production;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente;
- não criar atividade técnica apenas para manter o roadmap andando.
