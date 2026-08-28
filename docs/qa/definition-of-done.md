# Definition of Done Técnica e de Produto

Uma Issue de implementação só pode ser considerada concluída quando, quando aplicável:

## Base técnica

- requisito/critério de aceite foi atendido;
- regras de negócio afetadas estão documentadas;
- tipos e validações foram implementados;
- permissões/escopo foram considerados;
- regras críticas de estoque, financeiro, segurança e auditoria não dependem apenas da UI;
- testes relevantes foram criados/atualizados;
- `npm run lint` passa;
- `npm run typecheck` passa;
- `npm run test` passa;
- `npm run build` passa;
- não foram adicionados segredos ao repositório;
- ADR/documentação foi atualizada se houve decisão estrutural;
- `CURRENT_STATE.md`, `HANDOFF.md` e `NEXT_ACTION.md` refletem o estado real antes do encerramento da sessão.

## Gate adicional para Issues com UI/UX

Uma mudança de interface não está concluída apenas porque renderiza, é responsiva por CSS ou passa build. Quando aplicável, validar também:

- objetivo/jornada do usuário está identificado;
- arquitetura da informação e navegação aprovadas são respeitadas;
- linguagem exibida é de negócio/operação e não expõe detalhes técnicos desnecessários;
- estados de loading, vazio, erro e sucesso são tratados;
- ações possuem feedback claro;
- ações destrutivas, cancelamentos e estornos possuem confirmação/contexto apropriado;
- labels, foco e operação por teclado foram considerados;
- controles de toque permanecem utilizáveis;
- comportamento foi verificado em desktop, tablet e/ou celular conforme criticidade da jornada;
- tabelas e formulários densos possuem estratégia mobile deliberada, sem depender apenas de overflow horizontal quando isso prejudicar a tarefa;
- componentes/padrões do design system existente são reutilizados quando aplicáveis;
- IDs internos, UUIDs, nomes de provider, RLS, migrations, fases e outros termos de engenharia não são expostos ao usuário sem necessidade operacional real;
- para entidades complexas, a solução considera o padrão `lista → detalhe → ação` e URLs estáveis quando ele reduzir complexidade;
- browser/jornada real foi validada quando a ferramenta e o ambiente permitirem.

Para fluxos críticos, dizer apenas que "mobile foi considerado" não constitui evidência suficiente.

## Gate de produto

A existência de schema, domínio, RPC/gateway e uma tela mínima não prova por si só que um requisito está pronto como produto. Em reconciliações de fechamento, a pergunta deve ser:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação, sem depender de conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Se a resposta for não, o gap deve ser classificado e registrado como UI/UX, administrabilidade, regra PENDING, migração/cutover ou outra categoria real; não declarar a necessidade como plenamente concluída apenas porque o backend existe.

Falha conhecida ou validação não executada deve ser registrada explicitamente; nunca declarar uma tarefa concluída apenas porque o código foi escrito.

Consulte `docs/product/product-completion-ux-roadmap.md` durante a Fase 51 e a consolidação de produto.
