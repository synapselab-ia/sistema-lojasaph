# Next Action — Sistema Lojasaph

## Contexto

A Fase 36 auditou `REQ-SEC-003 — Auditoria`.

Resultado:

- trilha `audit_logs` continua protegida por RLS/grants e fechada para escrita direta do cliente;
- Estoque, Inventário, Compras, Financeiro e Caixa já possuem audit events nos command paths críticos;
- foi encontrado um gap concreto em configurações críticas de estoque persistidas por Data API/RLS;
- Issue #83 / PR #84 adicionou auditoria transacional para `stock_items`, `stock_locations` e `stock_loss_reasons`;
- migration canônica/remota: `20260820192526 / critical_config_audit`;
- retries/no-op de `upsert` não duplicam eventos;
- rollback reverte mutation e audit juntos;
- snapshots são whitelisted e não incluem secrets nem campos fiscais desnecessários;
- nenhuma homologação remota criou evento sintético de Production;
- evidência: `docs/qa/audit-trail.md`.

Não reabrir REQ-SEC-003 sem evidência concreta de regressão.

## Issue #75 — continuar bloqueada

Antes de qualquer trabalho de backup, verificar se #75 recebeu decisões novas sobre RPO/RTO/destino/retenção/proteção/alerta.

Se continuar sem essas decisões, não inventar cron/storage e não interromper a próxima auditoria independente.

## Objetivo ativo

**Auditar `REQ-SEC-004 — Segredos`: tokens, chaves e senhas não podem ser versionados no GitHub nem expostos indevidamente ao browser/logs.**

A tarefa começa como auditoria transversal. Não rotacionar credenciais, alterar envs ou criar fornecedores/serviços por precaução sem encontrar exposição concreta.

## Baseline existente

Reutilizar antes de criar trabalho novo:

- `.gitignore` ignora `.env*` com exceção deliberada de `.env.example`;
- `.env.example` documenta nomes/formatos sem valor secreto real;
- integração Supabase separa publishable key de `SUPABASE_SECRET_KEY` server-only;
- Fase 18 / ADR-008 implementou fronteira Development/Preview/Production e bloqueio de admin secret fora de Production por padrão;
- `/health` não revela URL/ref/key/secret;
- Fase 17 / ADR-007 implementou redaction de logs para tokens, JWTs, connection strings e PII comum;
- Fase 34 revalidou RLS/grants; não reabrir RLS nesta auditoria salvo exposição concreta;
- Vercel mantém Git auto-deploy desabilitado; não criar deployment só para verificar secrets.

## Fazer agora

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, este arquivo, `WORKFLOW`, `requirements.md`, ADR-007 e ADR-008.
2. Conferir `main`, Issue #75, demais Issues/PRs/branches e CI reais.
3. Confirmar a integração da Fase 36 / PR #84 / Issue #83 e a migration `20260820192526`; não reaplicar.
4. Se #75 continuar sem decisões, mantê-la bloqueada.
5. Auditar o repositório e histórico/configuração disponível sem revelar valores sensíveis:
   - `.gitignore` e `.env.example`;
   - arquivos tracked com nomes suspeitos (`.env`, pem/key/cert, dumps, backups);
   - referências a `SUPABASE_SECRET_KEY`, service role/secret keys, database URLs/passwords e tokens;
   - qualquer variável `NEXT_PUBLIC_*` que pudesse carregar privilégio administrativo;
   - código client-side/import graph para garantir que admin client/secret não seja empacotado no browser;
   - workflows/scripts para evitar echo de secrets ou inclusão em artefatos;
   - logs/observability redaction e mensagens públicas de erro.
6. Diferenciar corretamente:
   - Supabase publishable key: identificador público de cliente, protegido por RLS;
   - secret/service-role/database credentials: server-only e nunca versionados/expostos.
7. Usar Vercel connector se necessário para verificar **nomes/targets/metadados**, nunca retornar valores de env no chat/docs. Se a conexão continuar incapaz de enumerar env vars com segurança, registrar como não observável em vez de inferir.
8. Usar Supabase read-only quando necessário para confirmar configurações estruturais; não imprimir keys/connection strings.
9. Verificar que `/health`, logs estruturados e respostas públicas não vazam configuração sensível.
10. Não tratar placeholders sintéticos/documentais como credenciais reais.
11. Se houver secret real versionado ou exposição browser/log reproduzível:
    - abrir uma única Issue;
    - conter a exposição no código/configuração;
    - registrar necessidade de rotação sem publicar o segredo comprometido;
    - não reutilizar o valor em testes ou documentação.
12. Se `REQ-SEC-004` estiver atendido, criar apenas documentação/evidência, sem Issue artificial.
13. Não criar deployment Vercel para esta auditoria salvo necessidade real e única de runtime hospedado.
14. Se houver patch, exigir lint, typecheck, Vitest, build e gates aplicáveis antes do merge.
15. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION` ao final.

## Critério de conclusão

`REQ-SEC-004` pode ser considerado atendido quando houver evidência de que:

- nenhum secret real está versionado nos arquivos rastreados relevantes;
- arquivos locais de env/backup/credencial permanecem ignorados;
- segredos administrativos e database credentials são server-only;
- nenhuma variável pública carrega segredo privilegiado;
- o browser não recebe admin client/secret;
- logs e erros públicos redigem/omitem secrets;
- workflows/scripts não publicam credenciais em log/artefato por desenho;
- qualquer limitação de observabilidade de envs externos fica explicitamente registrada sem inferência.

## Segurança / operação

- nunca colar valores de secrets no chat, Issue, PR ou documentação;
- não fazer rotação preventiva sem exposição concreta e autorização operacional adequada;
- não usar secret real como fixture;
- não reabrir RLS/observabilidade/ambientes sem evidência de regressão;
- não fechar #75 sem backup automático real;
- não importar dados reais/cutover;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
