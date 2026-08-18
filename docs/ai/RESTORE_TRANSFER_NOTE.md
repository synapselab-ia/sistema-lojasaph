# Registro corretivo — restauração da transferência

Data: 2026-08-18

Durante a validação da Fase 10 foi comprovado que o PR #26, embora tecnicamente validado e referido como integrado na documentação posterior, permaneceu aberto e não entrou na `main`.

Consequências observadas:

- ausência da migration `20260817224800_transactional_stock_transfer.sql` no GitHub `main`;
- ausência das suítes `stock_transfer.sql` e `stock_transfer_multibatch.sql`;
- ausência do gateway/runtime persistente de transferência;
- workflow de inventário referenciando testes inexistentes;
- Fase 10 dependendo do helper de custeio definido naquela migration.

A correção não redefine regras de negócio. Ela restaura os artefatos originalmente validados do PR #26 sobre a `main` atual e concilia apenas CI, navegação e lint do inventário.

Após o reparo verde e integrado, a Issue #24 pode voltar a `completed`; a Issue #28 retoma como única frente funcional.
