# Next Action — Sistema Lojasaph

## Contexto

Fases 41–42 concluídas:

- o MVP foi reconciliado contra requisitos/escopo e estado real;
- nenhum novo MUST funcional do núcleo apareceu sem cobertura;
- `REQ-FIN-008 — Anexos` foi implementado no PR #93 e a Issue #92 foi fechada;
- `main` pós-Fase 42: `7f38ecedb2d4e8662ef0e2e8c01dda8b20dd0a84`;
- head funcional final `3885c15989c3787c627c9f0c2008e20466f63abc` passou CI #369, Business Transactions #176 e Inventory Count #192;
- Supabase Production possui migration `20260822195823_finance_attachments` e homologação relacional sintética/rollback concluída;
- Issue #75 continua aberta/desarmada e não bloqueia trabalho independente.

O SHOULD explícito restante confirmado pela Fase 41 é:

`REQ-EXPOR-001 — Exportação`: **dados tabulares relevantes devem poder ser exportados em CSV/Excel; PDF quando fizer sentido para relatório/documento.**

O escopo MVP diz apenas `exportação onde fizer sentido`. A regra contra expansão descontrolada exige processo real, usuário beneficiado e critério de aceite identificável.

## Objetivo ativo

**Fase 43 — delimitar `REQ-EXPOR-001` a uma única vertical slice de exportação explicitamente justificável e, somente se houver candidato inequívoco, abrir/implementar essa frente.**

Não começar por uma infraestrutura genérica de “exportar tudo”. A fase deve descobrir qual tabela/relatório operacional já existente tem necessidade de exportação mais clara no MVP atual.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW`, `docs/product/scope.md`, `docs/product/requirements.md` e `docs/qa/mvp-reconciliation.md`.
2. Conferir estado real de `main`, Issues/PRs/branches/CI. Confirmar que #92 está fechada e #75 continua aberta/desarmada.
3. Não reabrir anexos: `REQ-FIN-008` já está entregue no PR #93. Ler `docs/modules/finance.md` somente se necessário para evitar regressão.
4. Inventariar as superfícies **tabulares/relatórios já implementados** que poderiam legitimamente ser exportados, por exemplo sem assumir prioridade:
   - estoque/saldos/movimentações;
   - inventário;
   - compras/recebimentos;
   - financeiro/parcelas/pagamentos;
   - caixa/fechamentos;
   - cadastros quando houver uso operacional claro.
5. Para cada candidato relevante, verificar no código real:
   - dados já disponíveis e filtros existentes;
   - papel/escopo de acesso;
   - volume/paginação;
   - se a exportação precisa refletir exatamente filtros ativos;
   - se há risco de dados sensíveis;
   - se CSV é suficiente ou se Excel/PDF tem justificativa concreta.
6. Aplicar os critérios de seleção da Fase 41:
   - relevância explícita ao MVP;
   - processo real já documentado;
   - ausência comprovada da feature;
   - usuário beneficiado claro;
   - critério de aceite objetivo;
   - independência de Q-001..Q-025/PENDING;
   - não depender de cutover/backup #75.
7. Escolher **exatamente uma** superfície somente se houver um candidato claramente superior. Não usar conveniência técnica como prioridade.
8. Se houver candidato inequívoco:
   - abrir uma única Issue funcional vinculada a `REQ-EXPOR-001`;
   - definir colunas, filtros, autorização e formato mínimo no próprio critério de aceite;
   - criar branch;
   - implementar a menor vertical slice segura se for viável na mesma sessão;
   - reutilizar os boundaries de autorização/dados existentes;
   - testar escaping/encoding/formatação e escopo;
   - não criar migration/Supabase change se exportação puder ser derivada dos read models atuais;
   - não adicionar biblioteca de Excel/PDF sem necessidade comprovada; CSV UTF-8 é aceitável quando satisfizer o processo escolhido.
9. Se **não** houver candidato inequívoco:
   - não abrir Issue genérica;
   - registrar a matriz curta e o ponto de decisão no handoff;
   - deixar `REQ-EXPOR-001` como gap conhecido aguardando priorização concreta.
10. Rodar CI/testes correspondentes para qualquer mudança funcional e mergear somente verde.
11. Usar Supabase apenas se a implementação realmente exigir verificação de dados/permissões; evitar DDL/migration sem necessidade.
12. Não criar deploy Vercel intermediário apenas para testar exportação; preservar a política de deploy limitado.
13. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão da Fase 43

- superfícies atuais de dados tabulares relevantes foram confrontadas com `REQ-EXPOR-001`;
- nenhuma exportação já existente foi duplicada;
- nenhum requisito PENDING foi promovido;
- exatamente uma próxima vertical slice foi escolhida **ou** a falta de prioridade inequívoca foi documentada;
- se uma Issue foi aberta, possui usuário/processo, colunas/filtros/formato e autorização objetivos;
- no máximo uma nova frente funcional ficou ativa;
- #75 permaneceu preservada.

## Fase 42 — não refazer

`REQ-FIN-008` está fechado. Production possui a migration de metadata e o servidor provisiona o bucket privado via Storage API no primeiro upload autorizado. O conector usado na homologação não expõe mutação de Storage, portanto não tentar “completar” isso escrevendo em `storage.buckets` ou `storage.objects` via SQL.

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
- não ativar backup nem fechar #75 sem evidência real;
- não restaurar Production para teste;
- não reabrir anexos sem regressão;
- não manipular Storage por SQL;
- não implementar exportação global/genérica sem processo real;
- não promover item `PENDING` por inferência;
- não criar migration sem necessidade;
- não criar deployment Vercel apenas para auditoria/feature intermediária;
- não importar dados reais/cutover.
