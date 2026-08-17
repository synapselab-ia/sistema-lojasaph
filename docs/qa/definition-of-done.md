# Definition of Done Técnica

Uma Issue de implementação só pode ser considerada concluída quando, quando aplicável:

- requisito/critério de aceite foi atendido;
- regras de negócio afetadas estão documentadas;
- tipos e validações foram implementados;
- permissões/escopo foram considerados;
- testes relevantes foram criados/atualizados;
- `npm run lint` passa;
- `npm run typecheck` passa;
- `npm run test` passa;
- `npm run build` passa;
- comportamento mobile/responsivo foi considerado para UI;
- não foram adicionados segredos ao repositório;
- ADR/documentação foi atualizada se houve decisão estrutural;
- `CURRENT_STATE.md`, `HANDOFF.md` e `NEXT_ACTION.md` refletem o estado real antes do encerramento da sessão.

Falha conhecida ou validação não executada deve ser registrada explicitamente; nunca declarar uma tarefa concluída apenas porque o código foi escrito.
