# Next Action — Sistema Lojasaph

## Estado

**Não existe frente funcional ativa após a Fase 50.**

A Fase 50 / Issue #138 (`REQ-ITEM-003`) foi integrada pelo PR #139.

Baseline confirmada:

- `main=e65d333f2410960b5201669014b062f5e1380542`;
- PR #139 merged;
- Issue #138 closed;
- PR #140 integrou a reconciliação documental pós-Fase 50;
- CI pós-merge #502 / `33119305469`: success;
- nenhum PR funcional aberto;
- únicas Issues abertas: #75 e #121, ambas ON HOLD na trilha `REQ-PLAT-005`.

Não refazer Fase 50 e **não inventar Fase 51**.

## Decisão explícita do operador — 2026-08-28

A trilha completa de proteção de dados `REQ-PLAT-005` (#75 e #121), incluindo investigação de scheduling do GitHub Actions, backup de Supabase Storage, restore binário e evidência automática, fica **TOTALMENTE ON HOLD até o Sistema Lojasaph estar 100% concluído**.

Essa decisão substitui os gatilhos automáticos anteriores de retomada por cron, primeiro anexo ou incidente do pipeline enquanto o sistema ainda estiver em desenvolvimento.

Até o marco de sistema 100% concluído:

- não investigar ausência de execução agendada dos workflows de backup;
- não fazer `workflow_dispatch` para obter prova;
- não criar fixture, bucket, objeto ou anexo sintético em Production;
- não alterar workflows, variables, secrets, S3/R2, retenção, lock/WORM ou guardrails de backup;
- não repetir introspecções de Storage/protection runs por rotina;
- não abrir slice técnica de backup/proteção apenas porque um cron, anexo ou alerta apareceu;
- manter #75 e #121 abertas e ON HOLD;
- só retomar antes desse marco se o operador der uma nova instrução explícita revogando este hold.

### Evidência preservada antes do hold total

A reconciliação única de 2026-08-28, após a janela esperada dos schedules, encontrou:

- nenhum `automatic_storage` novo no Supabase;
- nenhum `automatic_database` novo correspondente ao schedule daquele dia;
- último `automatic_database` autoritativo conhecido: `succeeded` em 2026-08-27, com integridade verificada;
- ausência de evidência suficiente para declarar que o schedule de 2026-08-28 executou corretamente.

Essa pendência deve ser retomada **somente no fechamento/homologação final do sistema**, não investigada agora.

## Próxima ação objetiva

### 1. Reconciliar o GitHub real

Em qualquer retomada:

1. confirmar `main` real;
2. confirmar PRs/Issues abertos;
3. verificar se houve bug/regressão funcional ou nova prioridade explícita do usuário/negócio;
4. ignorar #75/#121 como frente ativa enquanto o marco de sistema 100% não tiver sido atingido, salvo instrução explícita do operador.

### 2. Abrir nova frente somente por trabalho real de produto

Enquanto #75/#121 estiverem no hold total, só abrir nova Issue quando houver um destes fatos:

- bug/regressão funcional real;
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

## Retomada futura de REQ-PLAT-005

Somente quando o sistema estiver 100% concluído — ou se o operador revogar explicitamente o hold antes — reconciliar #75/#121 e então:

1. localizar/validar os schedules reais de PostgreSQL e Storage;
2. investigar a ausência de evidência de 2026-08-28;
3. comprovar backup automático dentro do RPO;
4. comprovar Storage com objeto Production legítimo quando existir;
5. executar restore drill isolado conforme critérios das Issues;
6. fechar #121/#75 somente com os critérios de aceite efetivamente atendidos.

## Restrições

- GitHub é a fonte de continuidade;
- RLS continua sendo boundary de acesso;
- nenhum secret em browser/Git/docs/chat;
- não fabricar evidência Production;
- não fazer deploy Vercel rotineiro;
- não tornar o repositório private automaticamente;
- não criar atividade técnica apenas para manter o roadmap andando;
- **não retomar REQ-PLAT-005 antes do sistema 100% sem nova instrução explícita do operador**.
