# Handoff — Sistema Lojasaph

## Estado

A Fase 37 auditou `REQ-SEC-004 — Segredos` a partir da `main` real em `2ff5a421624c0f6dbf199ae16f77f9ab7f510626`.

Resultado: **requisito atendido no escopo auditável; nenhum segredo real versionado ou vazamento browser/log reproduzível encontrado**.

Frente atual:

- branch `agent/secrets-audit`;
- Issue funcional nova: nenhuma;
- evidência: `docs/qa/secrets-audit.md`;
- Issue #75 permanece aberta/bloqueada;
- nenhuma migration/DDL/DML nesta fase;
- nenhum deployment Vercel;
- nenhum secret/key/connection string solicitado ou publicado.

## Fase 36 — já concluída

PR #84 foi squash-mergeado e Issue #83 foi fechada.

Main de entrada da Fase 37:

`2ff5a421624c0f6dbf199ae16f77f9ab7f510626`

Migration remota/canônica existente:

`20260820192526 / critical_config_audit`

Não reaplicar.

Validação final histórica do PR #84:

- CI #334 — success;
- Business Transactions Integration #165 — success;
- Inventory Count Integration #181 — success.

## Auditoria REQ-SEC-004

### Git / arquivos

A árvore recursiva completa da `main` foi enumerada (`truncated=false`).

- apenas `.env.example` entre arquivos `.env*`;
- placeholders de env vazios;
- nenhum env local/Production rastreado;
- nenhum PEM/certificado/chave privada/container de chave rastreado;
- nenhum dump/backup real rastreado;
- nenhuma planilha real rastreada.

`.gitignore` mantém `.env*` salvo `.env.example`, `/backups/` e `*.pem`.

Não ampliar ignores apenas por precaução sem artefato/exposição concreta.

### Histórico observável

Buscas de commits por `.env`, `secret`, `credential`, `password` e commits de introdução do Supabase foram revisadas.

- initial commit: somente README;
- Fase 7: `.env.example` já nasceu com URL/publishable/secret vazios;
- helper histórico usava apenas `process.env.SUPABASE_SECRET_KEY`, sem literal de credencial;
- hardening posterior marcou fachadas/admin como `server-only` e adicionou testes de fronteira;
- nenhuma evidência de commit de remoção/rotação por leak.

Limitação: o conector atual não expõe GitHub Secret Scanning nem grep arbitrário de todos os blobs históricos. Portanto a conclusão é “nenhuma exposição concreta encontrada no histórico observável”, não “scan exaustivo de todo DAG”.

### Browser/server

- browser usa apenas `NODE_ENV` e `NEXT_PUBLIC_*`;
- browser Supabase recebe URL + publishable key;
- `SUPABASE_SECRET_KEY` é lida em `src/lib/runtime/server.ts`, marcado `server-only`;
- `src/lib/supabase/env.ts` e `src/lib/supabase/server.ts` também são `server-only`;
- admin client só existe no servidor e passa pela policy de ambiente;
- `client-boundary.test.ts` protege a fronteira;
- Client Components recebem somente `SupabasePublicConfig`.

### Password/log/error

- senha de login/update vai diretamente de Server Action ao Supabase Auth e não entra em log/redirect;
- logger redige campos sensíveis e texto livre (Bearer/JWT/chaves Supabase/credentialed URLs/query params sensíveis);
- `instrumentation.ts` remove query string e não copia headers;
- `toPublicError()` oculta falhas internas/persistência;
- error boundaries mostram somente mensagem genérica + digest/referência.

### Health/Vercel

Deployment Production continua no commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5` por política manual. O arquivo `/health` tem o mesmo blob nesse commit e na main (`76220c627485d9b70b3281a23b426c7ed9ab246d`).

Fetch read-only em 2026-08-20: HTTP 200 e apenas status/service/environment/supabaseAccess/supabaseReason/adminAccess. Sem URL/ref/key/secret.

O conector Vercel atual não expõe listagem de env vars. Não inferir nomes/targets/valores a partir disso e não criar deploy para verificar.

### Workflows/scripts

- workflows não ecoam secrets nem sobem env/backup artifacts;
- `postgres/postgres` é fixture do serviço PostgreSQL efêmero de CI, não credencial real;
- export de backup recebe DB URL por ambiente, não a imprime, recusa output dentro do Git e usa `umask 077`;
- restore drill usa temp dir, `chmod 600` e cleanup.

### Supabase

Read-only: migration `20260820192526 / critical_config_audit` continua presente.

Nenhuma key/secret/database credential foi solicitada. Nenhuma mutation foi feita.

## Issue #75

Continua sem comentários/decisões de RPO, RTO, destino, retenção, proteção, owner/alerta e drill hospedado.

Não inventar cron/storage e não fechar sem backup automático real.

## Próximo chat

1. Ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `WORKFLOW` e requirements.
2. Conferir estado real de `main`, #75, Issues/PRs/branches e CI.
3. Confirmar merge da Fase 37 e não repetir SEC-004.
4. Confirmar migration `20260820192526` read-only; não reaplicar.
5. Se #75 continuar sem decisões, mantê-la bloqueada.
6. Executar `REQ-SEC-005 — Cancelamento/estorno`.
7. Reutilizar os fluxos já existentes de cancelamento/reversão e `audit_logs`; não criar nova taxonomia por conveniência.
8. Mapear por domínio registros críticos e provar que o cliente não possui DELETE destrutivo direto.
9. Validar cancelamentos/estornos como novos estados/eventos ou registros relacionados, preservando histórico e ator.
10. Se houver delete destrutivo/lifecycle sem trilha concreta, abrir uma única Issue + branch + correção mínima.
11. Se atendido, documentação apenas, sem Issue artificial.
12. Não criar deployment Vercel para essa auditoria salvo necessidade real e única.
13. Atualizar continuidade e validar CI antes do merge.

## Não fazer

- não reabrir REQ-SEC-003/004 sem evidência concreta;
- não rotacionar secret preventivamente;
- não publicar valores de env;
- não reaplicar migration Supabase;
- não fechar #75 por inferência;
- não importar dados reais/cutover;
- não reativar Git auto-deploy;
- não inferir Q-001..Q-025.
