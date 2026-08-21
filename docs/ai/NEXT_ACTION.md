# Next Action — Sistema Lojasaph

## Contexto

Fase 40 — revalidação de `REQ-PLAT-003 — Validação de dados` — foi concluída sem finding funcional.

`REQ-PLAT-003` já havia sido considerado atendido na Fase 29. A revalidação comparou o baseline `370b37161150bcf2eac3afb4afb9d8bb80d96e10` com a `main` pós-Fase 39 e confirmou que não houve mudança em `src/**`; as mudanças funcionais posteriores de banco (`membership_rls_initplan` e `critical_config_audit`) não enfraqueceram os boundaries de validação. A evidência está em `docs/qa/data-validation.md`.

Não reabrir `REQ-PLAT-003` sem regressão concreta.

A Issue #75 de backup Production continua aberta/desarmada. OAuth/rclone/App Password + primeiro run real permanecem deliberadamente adiados até o operador estar em computador pessoal/confiável. Isso não bloqueia a próxima frente independente.

## Objetivo ativo

**Fase 41 — Reconciliar o escopo MVP restante e selecionar a próxima vertical slice explícita.**

A fase deve evitar tanto retrabalho quanto expansão arbitrária. Antes de criar nova funcionalidade, comparar o MVP documentado com o estado real do produto e escolher **uma única lacuna comprovada**, implementável sem depender de questões `PENDING`.

## Baseline a reutilizar

Requisitos transversais já fechados/auditados não devem voltar à fila sem regressão:

- `REQ-PLAT-001` responsividade;
- `REQ-PLAT-002` idempotência;
- `REQ-PLAT-003` validação de dados;
- `REQ-PLAT-004` migrations;
- `REQ-PLAT-006` logs/erros;
- `REQ-PLAT-007` ambientes;
- `REQ-SEC-003` auditoria;
- `REQ-SEC-004` segredos;
- `REQ-SEC-005` cancelamento/estorno;
- `REQ-IMP-001..004` foundation de importação/dry-run.

`REQ-PLAT-005` continua representado pela Issue #75 e só volta a ser a frente ativa quando houver computador pessoal/confiável para concluir secrets/OAuth e o primeiro backup real.

O núcleo operacional atual já cobre Organização, Cadastros, Estoque, Lotes/Validades, Compras, Financeiro, Caixa e Dashboard básico. O próximo passo não deve reimplementar essas áreas por presunção.

## Candidatos explícitos a verificar primeiro

A comparação inicial entre `docs/product/scope.md`, `docs/product/requirements.md` e a árvore atual não encontrou implementação aparente para:

1. `REQ-FIN-008 — Anexos` (**SHOULD**) — o escopo MVP menciona NF/PDF/XML/boleto/comprovante, e a árvore atual não apresenta camada de attachment/storage do Financeiro;
2. `REQ-EXPOR-001 — Exportação` (**SHOULD**) — o escopo MVP prevê exportação onde fizer sentido, e não foi encontrado fluxo CSV/Excel atual.

Esses são **candidatos para verificação**, não prioridade pré-decidida. Também verificar se existe outro gap explícito de MVP mais fundamental antes de escolher.

## Fazer agora

1. Ler continuidade padrão, `WORKFLOW`, `docs/product/scope.md`, `docs/product/requirements.md` e documentação dos módulos atuais.
2. Conferir estado real de `main`, Issues/PRs/branches/CI e confirmar o estado da #75.
3. Montar uma matriz curta dos itens do **MVP profissional** contra evidência real de implementação/homologação.
4. Marcar cada item como:
   - entregue;
   - parcialmente entregue com gap concreto;
   - não entregue e implementável agora;
   - `PENDING`/fase posterior — não implementar;
   - bloqueado por operação/decisão explícita.
5. Não reabrir requisito já fechado por mera ausência de documento recente.
6. Verificar especificamente `REQ-FIN-008` e `REQ-EXPOR-001` no código/histórico antes de tratá-los como lacuna.
7. Excluir do candidato qualquer item que dependa de Q-001..Q-025 ou decisão de negócio ainda não aprovada.
8. Escolher uma única próxima vertical slice usando, nesta ordem:
   - pertinência explícita ao MVP;
   - processo real já documentado;
   - ausência comprovada na implementação;
   - critério de aceite objetivo;
   - independência de decisão pendente.
9. Se houver uma lacuna clara, abrir **uma única Issue** com evidência, branch própria e critério de aceite. Executar a implementação mínima se ela puder ser concluída com segurança na mesma sessão.
10. Se a reconciliação não produzir candidato inequívoco, não inventar prioridade: documentar o bloqueio e deixar a decisão específica no handoff.
11. Usar Supabase/Vercel somente quando a vertical slice realmente exigir; não criar infraestrutura/deploy apenas para a auditoria de escopo.
12. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão da Fase 41

- mapa do MVP atual reconciliado com evidência real;
- requisitos já entregues não são refeitos;
- itens `PENDING` não são promovidos por inferência;
- próxima lacuna é concreta, rastreável a requisito/escopo e possui critério de aceite;
- no máximo uma frente funcional nova é aberta;
- #75 permanece preservada até poder ser concluída no ambiente seguro aprovado.

## Backup Production / #75

Somente quando o operador estiver em computador pessoal/confiável:

1. configurar OAuth Google Drive/rclone;
2. criar `BACKUP_RCLONE_CONFIG_B64`;
3. criar `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
4. criar `BACKUP_AUTOMATION_ENABLED=true`;
5. executar `Production Database Backup` manualmente;
6. comprovar archive + `.sha256` no Drive;
7. registrar evidência e fechar #75.

## Segurança / operação

- não pedir/receber secrets no chat;
- não versionar dump/config/token;
- não ativar backup antes dos secrets restantes;
- não restaurar Production para teste;
- não fechar #75 sem run real;
- não reabrir `REQ-PLAT-003`, `REQ-SEC-005` ou outros requisitos fechados sem regressão concreta;
- não implementar requisito `PENDING` por inferência;
- não reaplicar migrations existentes;
- não criar deployment Vercel apenas para auditoria;
- não importar dados reais/cutover.
