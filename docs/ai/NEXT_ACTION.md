# Next Action — Sistema Lojasaph

## Contexto

Fase 39 / `REQ-SEC-005 — Cancelamento/estorno` foi auditada no PR #89 e está **atendida no escopo atual**.

A evidência está em `docs/qa/cancellation-reversal.md`. Não reabrir essa frente nem adicionar soft-delete/reversão genérica sem regressão concreta.

A Issue #75 de backup Production continua aberta e desarmada. OAuth/rclone/App Password + primeiro run real permanecem deliberadamente adiados até o operador estar em computador pessoal/confiável. Isso não bloqueia a próxima auditoria independente.

## Objetivo ativo

**Fase 40 — Auditar `REQ-PLAT-003 — Validação de dados`: regras essenciais devem ser validadas no servidor/domínio e, quando aplicável, no banco.**

A tarefa começa como auditoria transversal. Não mover toda validação para o banco, não duplicar regras indiscriminadamente e não tratar validação de UI como boundary de segurança.

## Baseline existente a reutilizar

- value objects de domínio como `Money`, `Quantity` e `EntityId` já concentram invariantes locais;
- gateways transformam erros de RPC em `DomainError` para feedback consistente;
- commands PostgreSQL críticos validam estado, cardinalidade, escopo, quantidades, valores, relações e lifecycle;
- constraints/indexes/FKs protegem invariantes estruturais e concorrência onde apropriado;
- UIs fazem validação de conveniência, mas os fluxos críticos persistentes já passam por RPCs/constraints;
- suítes SQL exercitam entradas inválidas, autorização, idempotência, concorrência/lifecycle e rollback;
- Vitest cobre domínio/adapters/client boundary sem depender de dados reais.

## Fazer agora

1. Ler continuidade padrão, `WORKFLOW`, `docs/product/requirements.md` e documentação dos módulos críticos.
2. Conferir estado real de `main`, Issues/PRs/branches/CI e confirmar #75 sem refazer backup.
3. Mapear regras essenciais por fluxo atual, no mínimo:
   - cadastro/configuração crítica de estoque;
   - entrada, retirada, transferência, perda e devolução;
   - inventário físico;
   - compras e recebimentos;
   - financeiro/pagamentos/estornos;
   - caixa;
   - dados organizacionais/cadastros que sejam pré-condição desses fluxos.
4. Para cada regra relevante, identificar o boundary efetivo:
   - domínio/value object;
   - command/RPC/server;
   - constraint/index/FK/check no PostgreSQL;
   - UI apenas como ergonomia, nunca como única defesa quando a regra precisa sobreviver a chamada direta.
5. Procurar especificamente por validações críticas que existam **somente** em `page.tsx`/form/client e possam ser contornadas chamando gateway/RPC/Data API diretamente.
6. Inspecionar commands/RPCs e constraints para quantidades/valores inválidos, referências cross-Organization, lifecycle ilegal, cardinalidade, duplicidade e estados impossíveis.
7. Diferenciar corretamente:
   - validação de formato/UX que pode ficar no cliente;
   - invariante de domínio que deve sobreviver fora da UI;
   - autorização/escopo, que pertence a `REQ-SEC-002` e não deve ser redesenhada sem finding;
   - idempotência, já coberta por `REQ-PLAT-002`.
8. Reutilizar as suítes SQL/Vitest existentes antes de criar teste novo. Se faltar apenas uma prova negativa barata de um invariant já implementado, adicionar o teste mínimo.
9. Usar Supabase Production somente read-only para introspecção de constraints, funções, grants e estado estrutural; não inserir dados de teste nem disparar commands críticos remotamente.
10. Se houver gap reproduzível em requisito essencial, abrir **uma única Issue** com reprodução e impacto; criar branch específica e implementar a correção mínima no boundary correto.
11. Se não houver gap, não criar Issue artificial: produzir matriz/evidência em `docs/qa/` e atualizar continuidade.
12. Não usar Vercel/deploy para provar validação de dados salvo necessidade real e única.
13. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão de REQ-PLAT-003

- invariantes essenciais persistem mesmo com UI contornada;
- payload inválido crítico é rejeitado antes de deixar estado inconsistente;
- relações/escopos estruturais relevantes não aceitam referência incompatível;
- transitions de lifecycle inválidas são rejeitadas;
- quantidades/valores críticos respeitam precisão, sinal e cardinalidade esperados;
- banco protege invariantes que exigem atomicidade/concorrência/relacionamento;
- UI não é a única defesa de nenhuma regra essencial encontrada;
- testes negativos existentes ou mínimos demonstram as garantias sem dados reais;
- nenhuma duplicação desnecessária de regra entre camadas é introduzida.

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
- não reabrir `REQ-SEC-005`, `REQ-SEC-003/004` ou `REQ-PLAT-002` sem regressão concreta;
- não reaplicar migrations existentes;
- não criar deployment Vercel apenas para auditoria;
- não importar dados reais/cutover.
